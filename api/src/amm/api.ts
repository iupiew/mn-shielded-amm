/**
 * API for a deployed AMM pool contract.
 *
 * Platform-agnostic — works from Node (CLI/MCP) and browser (UI); callers
 * supply their own provider implementations (see `./node.ts` for the Node
 * wiring). All swap maths live in `./math.ts` and mirror the circuit exactly;
 * state reads come from the contract ledger state (colors/paused are derived
 * locally — no view transactions).
 * @module
 */

import {
  ChargedState,
  CompactTypeBoolean,
  CompactTypeBytes,
  CompactTypeUnsignedInteger,
  CostModel,
  dummyContractAddress,
  persistentCommit,
  QueryContext,
  queryLedgerState,
  StateValue,
  type ContractAddress,
} from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { type Logger } from 'pino';
import { defer, firstValueFrom, from, map, type Observable, switchMap } from 'rxjs';
import * as Pool from '../../../contract/managed/pool/contract/index.js';
import {
  type AddLiquidityOptions,
  type AddLiquidityQuote,
  type AddLiquidityResult,
  type CoinSource,
  type DeployedPoolContract,
  type FaucetOptions,
  type PoolBalance,
  type PoolColors,
  type PoolCoin,
  type PoolProviders,
  type PoolPrivateState,
  type PoolState,
  type Quote,
  type RemoveLiquidityOptions,
  type RemoveLiquidityQuote,
  type RemoveLiquidityResult,
  type SeedOptions,
  type SeedResult,
  type SwapOptions,
  type SwapResult,
  type SwapSide,
  type WalletCoin,
  AmmError,
  bytesToHex,
  hexToBytes,
  poolPrivateStateKey,
  randomBytes32,
} from './types.js';
import { getAmountOut, getAmountsOut, getLpOut, integerSqrt, minAmountOut } from './math.js';
import type { PolicyAction, PolicyAmounts, PolicyGuard } from '../policy/index.js';

const DEFAULT_FAUCET_AMOUNT = 1000000n;
/**
 * Wallet cache sync can trail chain inclusion (the serve process flushes its
 * own view of the shared cache file), so swap coin selection re-reads a few
 * times before giving up.
 */
const SWAP_COIN_ATTEMPTS = 6;
const SWAP_COIN_RETRY_DELAY_MS = 10000;

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** Among coins of at least `amountIn`: prefer exact (no split), else smallest fit. */
function selectSpendableCoin(coins: readonly WalletCoin[], amountIn: bigint): WalletCoin {
  const exact = coins.find((c) => c.value === amountIn);
  if (exact) return exact;
  return coins.reduce((best, c) => (c.value < best.value ? c : best));
}

export interface AmmConnectOptions {
  readonly providers: PoolProviders;
  readonly contractAddress: ContractAddress;
  /** Compiled pool contract: `CompiledContract.make('pool', Pool.Contract).pipe(withWitnesses, withCompiledFileAssets)`. */
  readonly compiledContract: any;
  readonly initialPrivateState: PoolPrivateState;
  readonly privateStateId?: string;
  /** Source of the wallet's unspent shielded coins (used for balance + swap coin selection). */
  readonly coins: CoinSource;
  /**
   * Optional server-side policy guard (Phase 2): gates swap/faucet/addLiquidity/
   * removeLiquidity. Omitted by the browser UI; constructed from the operator's
   * policy file by the Node wirings (node.ts / preprod.ts).
   */
  readonly policy?: PolicyGuard;
  readonly logger?: Logger;
}

/**
 * Extract the JS representation of a circuit's return value from a finalized
 * call transaction result (shape verified live: `private.result` with a
 * `result` fallback, mirroring the harness's extraction rule).
 */
function callResult<T>(result: unknown): T {
  const r = result as { private?: { result?: unknown }; result?: unknown } | undefined;
  const value = r?.private?.result ?? r?.result;
  if (value === undefined) throw new Error('unexpected call transaction result: missing private.result');
  return value as T;
}

/** Extract the chain tx id from a finalized call transaction result. */
function callTxId(result: unknown): string {
  const r = result as { public?: { txId?: string }; txId?: string } | undefined;
  return r?.public?.txId ?? r?.txId ?? '';
}

function derivePoolState(data: unknown, colors: PoolColors): PoolState {
  const ledger = Pool.ledger(data as Parameters<typeof Pool.ledger>[0]);
  const colorAHex = bytesToHex(colors.colorA);
  const colorBHex = bytesToHex(colors.colorB);
  const colorLpHex = bytesToHex(colors.colorLp);
  const reserveA = ledger._coins.member(colors.colorA) ? ledger._coins.lookup(colors.colorA).value : 0n;
  const reserveB = ledger._coins.member(colors.colorB) ? ledger._coins.lookup(colors.colorB).value : 0n;
  return {
    reserveA,
    reserveB,
    seeded: reserveA > 0n && reserveB > 0n,
    colorAHex,
    colorBHex,
    colorLpHex,
    lpSupply: ledger._lpSupply,
  };
}

const TEXT_ENCODER = new TextEncoder();

/** Compact `pad(32, s)`: short ASCII string zero-padded to a 32-byte Bytes value. */
function pad32(s: string): Uint8Array {
  const bytes = new Uint8Array(32);
  bytes.set(TEXT_ENCODER.encode(s), 0);
  return bytes;
}

/**
 * Derive the pool's token colors locally — mirrors the contract's
 * `tokenColorA/B/lp` circuits: `tokenType(pad(32, "mn-amm:tokenX"), kernel.self())`
 * = `persistentCommit([sep, contractAddressBytes], pad(32, "midnight:derive_token"))`
 * (generated wrapper `_tokenType_0`). Byte-identical to on-chain circuit
 * output (verified against the deployed contract's minted-coin colors), so no
 * view transaction is needed.
 */
function derivePoolColors(contractAddress: ContractAddress): PoolColors {
  const bytes32 = new CompactTypeBytes(32);
  const pairDescriptor = {
    alignment: () => bytes32.alignment().concat(bytes32.alignment()),
    toValue: (value: readonly [Uint8Array, Uint8Array]) =>
      bytes32.toValue(value[0]).concat(bytes32.toValue(value[1])),
  };
  const addressBytes = hexToBytes(contractAddress);
  const opening = pad32('midnight:derive_token');
  return {
    colorA: persistentCommit(pairDescriptor as never, [pad32('mn-amm:tokenA'), addressBytes], opening),
    colorB: persistentCommit(pairDescriptor as never, [pad32('mn-amm:tokenB'), addressBytes], opening),
    colorLp: persistentCommit(pairDescriptor as never, [pad32('mn-amm:lp'), addressBytes], opening),
  };
}

/**
 * Read the OZ Pausable `_paused` flag straight from contract state — a public
 * ledger read (indexer/RPC), no proving and no transaction (state struct field
 * index 4, matching the `_isPaused` ledger position).
 */
function pausedFromState(stateOrChargedState: unknown): boolean {
  const isStateValue = stateOrChargedState instanceof StateValue;
  const chargedState = isStateValue
    ? new ChargedState(stateOrChargedState)
    : (stateOrChargedState as ChargedState);
  const circuitContext = {
    currentQueryContext: new QueryContext(chargedState, dummyContractAddress()),
    costModel: CostModel.initialCostModel(),
  };
  const partialProofData = {
    input: { value: [], alignment: [] },
    output: undefined,
    publicTranscript: [],
    privateTranscriptOutputs: [],
  };
  const indexDescriptor = new CompactTypeUnsignedInteger(255n, 1);
  const results = queryLedgerState(
    circuitContext as never,
    partialProofData as never,
    [
      { dup: { n: 0 } },
      {
        idx: {
          cached: false,
          pushPath: false,
          path: [
            { tag: 'value', value: { value: indexDescriptor.toValue(4n), alignment: indexDescriptor.alignment() } },
          ],
        },
      },
      { popeq: { cached: false, result: undefined } },
    ] as never,
  ) as unknown as { value: unknown };
  return CompactTypeBoolean.fromValue(results.value as never);
}

/**
 * High-level AMM operations: quote, swap, pool state, wallet balance,
 * faucet/dev helpers, pause control, LP deposit/withdrawal (M3).
 *
 * Every mutating method resolves only after the transaction is included
 * on-chain (the underlying `callTx` blocks on finalization).
 */
export class AmmApi {
  private colorsCache: PoolColors | undefined;

  private constructor(
    public readonly deployedContract: DeployedPoolContract,
    private readonly providers: PoolProviders,
    private readonly coins: CoinSource,
    private readonly policy: PolicyGuard | undefined,
    private readonly logger?: Logger,
  ) {
    this.contractAddress = deployedContract.deployTxData.public.contractAddress;
    providers.privateStateProvider.setContractAddress(this.contractAddress);
  }

  readonly contractAddress: ContractAddress;

  /** Connect to an already-deployed pool contract. Resolves once colors are read (fails fast). */
  static async connect(options: AmmConnectOptions): Promise<AmmApi> {
    const deployedContract = await findDeployedContract(options.providers as any, {
      contractAddress: options.contractAddress,
      compiledContract: options.compiledContract,
      privateStateId: options.privateStateId ?? poolPrivateStateKey,
      initialPrivateState: options.initialPrivateState,
    });
    const api = new AmmApi(deployedContract, options.providers, options.coins, options.policy, options.logger);
    await api.colors();
    return api;
  }

  /**
   * Enforce the policy guard before submitting a gated action (throws
   * AmmError('POLICY_DENIED')). No-op when no guard is configured.
   */
  private async enforcePolicy(action: PolicyAction, amounts: PolicyAmounts, spendColorHex: readonly string[] = []): Promise<void> {
    if (this.policy) await this.policy.check(action, amounts, spendColorHex);
  }

  /**
   * Record a settled gated action for rolling-window accounting. The
   * transaction is already on-chain at this point, so persistence failures
   * are logged and swallowed.
   */
  private async recordPolicy(action: PolicyAction, amount: bigint): Promise<void> {
    if (!this.policy) return;
    try {
      await this.policy.record(action, amount);
    } catch (cause) {
      this.logger?.warn({ action, err: cause instanceof Error ? cause.message : String(cause) }, 'policy state record failed');
    }
  }

  /** Pool token colors (derived locally from the contract address; cached). */
  async colors(): Promise<PoolColors> {
    if (!this.colorsCache) {
      this.colorsCache = derivePoolColors(this.contractAddress);
      this.logger?.debug(
        { colorAHex: bytesToHex(this.colorsCache.colorA), colorBHex: bytesToHex(this.colorsCache.colorB) },
        'derived pool colors',
      );
    }
    return this.colorsCache;
  }

  /**
   * Latest pool reserves from the contract ledger.
   * A missing coin (pre-seed) reads as reserve 0.
   */
  async poolState(): Promise<PoolState> {
    const colors = await this.colors();
    const contractState = await firstValueFrom(
      this.providers.publicDataProvider.contractStateObservable(this.contractAddress, { type: 'latest' }),
    );
    return derivePoolState(contractState.data, colors);
  }

  /** Stream of pool state updates (emits on every new contract state). */
  state$(): Observable<PoolState> {
    return defer(() => from(this.colors())).pipe(
      switchMap((colors) =>
        this.providers.publicDataProvider.contractStateObservable(this.contractAddress, { type: 'latest' }).pipe(
          map((contractState) => derivePoolState(contractState.data, colors)),
        ),
      ),
    );
  }

  /** Pause flag — read from contract state (no proving, no transaction). */
  async isPaused(): Promise<boolean> {
    const contractState = await firstValueFrom(
      this.providers.publicDataProvider.contractStateObservable(this.contractAddress, { type: 'latest' }),
    );
    return pausedFromState(contractState.data);
  }

  /** Wallet coins split by pool color (A/B/LP), plus totals and untouched other-color coins. */
  async balance(): Promise<PoolBalance> {
    const colors = await this.colors();
    const colorAHex = bytesToHex(colors.colorA);
    const colorBHex = bytesToHex(colors.colorB);
    const colorLpHex = bytesToHex(colors.colorLp);
    const coins = await this.coins();
    const coinA = coins.filter((c) => c.colorHex === colorAHex);
    const coinB = coins.filter((c) => c.colorHex === colorBHex);
    const lpCoins = coins.filter((c) => c.colorHex === colorLpHex);
    const otherCoins = coins.filter(
      (c) => c.colorHex !== colorAHex && c.colorHex !== colorBHex && c.colorHex !== colorLpHex,
    );
    const total = (list: readonly WalletCoin[]): bigint =>
      list.reduce((sum, c) => sum + c.value, 0n);
    return {
      coinA,
      coinB,
      totalA: total(coinA),
      totalB: total(coinB),
      lpCoins,
      totalLp: total(lpCoins),
      otherCoins,
    };
  }

  /**
   * Quote a swap using the exact circuit formula against the latest reserves.
   *
   * NOTE: `amountIn` may be smaller than the input coin's value — swap() picks
   * a coin of at least `amountIn` and the circuit returns the remainder to the
   * caller in the same transaction.
   */
  async quote(side: SwapSide, amountIn: bigint, slippageBps = 0): Promise<Quote> {
    const state = await this.poolState();
    if (!state.seeded) throw new AmmError('NOT_SEEDED', 'pool has no reserves; run seed() first');
    const reserveIn = side === 'AtoB' ? state.reserveA : state.reserveB;
    const reserveOut = side === 'AtoB' ? state.reserveB : state.reserveA;
    const amountOut = getAmountOut(amountIn, reserveIn, reserveOut);
    return {
      side,
      amountIn,
      reserveIn,
      reserveOut,
      amountOut,
      minAmountOut: minAmountOut(amountOut, slippageBps),
    };
  }

  /**
   * Swap `amountIn` out of a pool-colored coin. Quotes fresh, then submits;
   * resolves after on-chain inclusion. A coin holding more than `amountIn`
   * works — the remainder comes back as change in the same transaction. Pause
   * is enforced in-circuit (and the UI gates on the connect-time flag) — no
   * extra pre-check tx.
   */
  async swap(options: SwapOptions): Promise<SwapResult> {
    const { side, amountIn, slippageBps = 0 } = options;
    const quote = await this.quote(side, amountIn, slippageBps);
    const spendColorHex = bytesToHex((await this.colors())[side === 'AtoB' ? 'colorA' : 'colorB']);
    const coin = options.coin
      ? await this.validateProvidedCoin(options.coin, spendColorHex, amountIn, `${side === 'AtoB' ? 'A' : 'B'}-color`)
      : await this.waitForColorCoin(spendColorHex, amountIn, `${side === 'AtoB' ? 'A' : 'B'}-color`);
    await this.enforcePolicy('swap', { amountIn }, [spendColorHex]);
    const result = await (this.deployedContract as any).callTx.swap(
      { nonce: hexToBytes(coin.nonceHex), color: hexToBytes(coin.colorHex), value: coin.value },
      amountIn,
      quote.amountOut,
      quote.minAmountOut,
    );
    await this.recordPolicy('swap', amountIn);
    this.logger?.info({ side, amountIn: amountIn.toString(), amountOut: quote.amountOut.toString(), txId: callTxId(result) }, 'swap settled');
    return { txId: callTxId(result), quote, coin };
  }

  /** Validate a caller-provided coin against the expected pool color and amountIn. */
  private async validateProvidedCoin(coin: WalletCoin, expectedColorHex: string, amountIn: bigint, label: string): Promise<WalletCoin> {
    if (coin.colorHex !== expectedColorHex) {
      throw new AmmError('INSUFFICIENT_COIN', `provided coin color ${coin.colorHex} is not the expected ${label} color (${expectedColorHex})`);
    }
    if (coin.value < amountIn) {
      throw new AmmError('INSUFFICIENT_COIN', `provided coin holds ${coin.value}, less than amountIn ${amountIn}`);
    }
    return coin;
  }

  /**
   * Select a spendable coin (value >= amountIn) of the given pool color from
   * the wallet cache, re-syncing a bounded number of times: the shared cache
   * file can trail chain inclusion when the serve process flushes its own
   * (older) view. Prefers an exact-value coin (no split); otherwise the
   * smallest fit.
   */
  private async waitForColorCoin(colorHex: string, amountIn: bigint, label: string): Promise<WalletCoin> {
    let lastAvailable: readonly WalletCoin[] = [];
    for (let attempt = 1; attempt <= SWAP_COIN_ATTEMPTS; attempt++) {
      const coins = await this.coins();
      const matching = coins.filter((c) => c.colorHex === colorHex);
      lastAvailable = matching;
      const spendable = matching.filter((c) => c.value >= amountIn);
      if (spendable.length > 0) return selectSpendableCoin(spendable, amountIn);
      if (attempt < SWAP_COIN_ATTEMPTS) {
        this.logger?.warn({ attempt, label, amountIn: amountIn.toString() }, 'no spendable coin in wallet cache yet; re-syncing');
        await delay(SWAP_COIN_RETRY_DELAY_MS);
      }
    }
    const available = lastAvailable.map((c) => c.value.toString()).join(', ') || 'none';
    throw new AmmError(
      'INSUFFICIENT_COIN',
      `no ${label} coin with value >= amountIn ${amountIn}; available values: [${available}]`,
    );
  }

  /**
   * Devnet helper: mint fresh colorA/colorB coins to this wallet.
   * Returns the two sent coins (safe to use as seed()/swap() inputs).
   */
  async faucet(options: FaucetOptions = {}): Promise<[PoolCoin, PoolCoin]> {
    const amountA = options.amountA ?? DEFAULT_FAUCET_AMOUNT;
    const amountB = options.amountB ?? DEFAULT_FAUCET_AMOUNT;
    await this.enforcePolicy('faucet', { amountA, amountB });
    const result = await (this.deployedContract as any).callTx.faucet(
      amountA,
      amountB,
      randomBytes32(),
      randomBytes32(),
    );
    const coins = callResult<[PoolCoin, PoolCoin]>(result);
    await this.recordPolicy('faucet', amountA + amountB);
    this.logger?.info({ amountA: amountA.toString(), amountB: amountB.toString() }, 'faucet minted');
    return coins;
  }

  /**
   * Initialize pool reserves with two freshly minted (or existing) coins and
   * mint the initial LP supply to this wallet. Default initialLp =
   * floor(sqrt(coinA·coinB)) (Uniswap-v2-style first mint; circuit floor 1000).
   */
  async seed(coinA: PoolCoin, coinB: PoolCoin, options: SeedOptions = {}): Promise<SeedResult> {
    if ((await this.poolState()).seeded) {
      throw new AmmError('ALREADY_SEEDED', 'pool already seeded');
    }
    const initialLp = options.initialLp ?? integerSqrt(coinA.value * coinB.value);
    const result = await (this.deployedContract as any).callTx.seed(coinA, coinB, initialLp, randomBytes32());
    const lpCoin = callResult<PoolCoin>(result);
    const txId = callTxId(result);
    this.logger?.info({ txId, initialLp: initialLp.toString() }, 'pool seeded');
    return { txId, lpCoin, initialLp };
  }

  /** Halt swaps/faucet (admin only — witness-derived owner). */
  async pause(): Promise<string> {
    const result = await (this.deployedContract as any).callTx.pause();
    return callTxId(result);
  }

  /** Resume operations. */
  async unpause(): Promise<string> {
    const result = await (this.deployedContract as any).callTx.unpause();
    return callTxId(result);
  }

  /**
   * Quote an LP deposit against the latest state: lpOut = min(floor(a·S/rA),
   * floor(b·S/rB)) — the exact addLiquidity circuit formula.
   */
  async quoteAddLiquidity(amountA: bigint, amountB: bigint, slippageBps = 0): Promise<AddLiquidityQuote> {
    const state = await this.poolState();
    if (!state.seeded) throw new AmmError('NOT_SEEDED', 'pool has no reserves; run seed() first');
    const lpOut = getLpOut(amountA, amountB, state.reserveA, state.reserveB, state.lpSupply);
    return {
      amountA,
      amountB,
      reserveA: state.reserveA,
      reserveB: state.reserveB,
      lpSupply: state.lpSupply,
      lpOut,
      minLpOut: minAmountOut(lpOut, slippageBps),
    };
  }

  /**
   * Deposit token amounts and receive LP shares. Coins holding more than the
   * deposit amounts work — remainders return as change in the same
   * transaction (M2 partial-coin pattern). Quotes fresh, then submits;
   * resolves after on-chain inclusion.
   */
  async addLiquidity(options: AddLiquidityOptions): Promise<AddLiquidityResult> {
    const { amountA, amountB, slippageBps = 0 } = options;
    const quote = await this.quoteAddLiquidity(amountA, amountB, slippageBps);
    const colors = await this.colors();
    const [coinA, coinB] = await Promise.all([
      this.waitForColorCoin(bytesToHex(colors.colorA), amountA, 'A-color'),
      this.waitForColorCoin(bytesToHex(colors.colorB), amountB, 'B-color'),
    ]);
    await this.enforcePolicy('addLiquidity', { amountA, amountB }, [bytesToHex(colors.colorA), bytesToHex(colors.colorB)]);
    const result = await (this.deployedContract as any).callTx.addLiquidity(
      { nonce: hexToBytes(coinA.nonceHex), color: hexToBytes(coinA.colorHex), value: coinA.value },
      amountA,
      { nonce: hexToBytes(coinB.nonceHex), color: hexToBytes(coinB.colorHex), value: coinB.value },
      amountB,
      quote.lpOut,
      quote.minLpOut,
      randomBytes32(),
    );
    const lpCoin = callResult<PoolCoin>(result);
    await this.recordPolicy('addLiquidity', amountA + amountB);
    this.logger?.info(
      { amountA: amountA.toString(), amountB: amountB.toString(), lpOut: quote.lpOut.toString(), txId: callTxId(result) },
      'addLiquidity settled',
    );
    return { txId: callTxId(result), quote, lpCoin, coinA, coinB };
  }

  /**
   * Quote an LP withdrawal against the latest state: aOut = floor(lp·rA/S),
   * bOut = floor(lp·rB/S) — the exact removeLiquidity circuit formula.
   */
  async quoteRemoveLiquidity(lpAmount: bigint, slippageBps = 0): Promise<RemoveLiquidityQuote> {
    const state = await this.poolState();
    if (!state.seeded) throw new AmmError('NOT_SEEDED', 'pool has no reserves; run seed() first');
    const { aOut, bOut } = getAmountsOut(lpAmount, state.reserveA, state.reserveB, state.lpSupply);
    return {
      lpAmount,
      reserveA: state.reserveA,
      reserveB: state.reserveB,
      lpSupply: state.lpSupply,
      aOut,
      bOut,
      minA: minAmountOut(aOut, slippageBps),
      minB: minAmountOut(bOut, slippageBps),
    };
  }

  /**
   * Burn LP shares for a proportional slice of both reserves. An LP coin
   * holding more than `lpAmount` works — the remainder returns as change in
   * the same transaction. Quotes fresh, then submits; resolves after
   * on-chain inclusion.
   */
  async removeLiquidity(options: RemoveLiquidityOptions): Promise<RemoveLiquidityResult> {
    const { lpAmount, slippageBps = 0 } = options;
    const quote = await this.quoteRemoveLiquidity(lpAmount, slippageBps);
    const colors = await this.colors();
    const lpCoin = await this.waitForColorCoin(bytesToHex(colors.colorLp), lpAmount, 'LP');
    await this.enforcePolicy('removeLiquidity', { lpAmount }, [bytesToHex(colors.colorLp)]);
    const result = await (this.deployedContract as any).callTx.removeLiquidity(
      { nonce: hexToBytes(lpCoin.nonceHex), color: hexToBytes(lpCoin.colorHex), value: lpCoin.value },
      lpAmount,
      quote.aOut,
      quote.bOut,
      quote.minA,
      quote.minB,
      randomBytes32(),
      randomBytes32(),
    );
    const coins = callResult<[PoolCoin, PoolCoin]>(result);
    await this.recordPolicy('removeLiquidity', lpAmount);
    this.logger?.info(
      { lpAmount: lpAmount.toString(), aOut: quote.aOut.toString(), bOut: quote.bOut.toString(), txId: callTxId(result) },
      'removeLiquidity settled',
    );
    return { txId: callTxId(result), quote, lpCoin, coins };
  }
}
