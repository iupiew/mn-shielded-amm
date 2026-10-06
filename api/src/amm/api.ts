/**
 * API for a deployed AMM pool contract.
 *
 * Platform-agnostic — works from Node (CLI/MCP) and browser (UI); callers
 * supply their own provider implementations (see `./node.ts` for the Node
 * wiring). All swap maths live in `./math.ts` and mirror the circuit exactly;
 * state reads come from the contract ledger + view circuits.
 * @module
 */

import { type ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { type Logger } from 'pino';
import { defer, firstValueFrom, from, map, type Observable, switchMap } from 'rxjs';
import * as Pool from '../../../contract/managed/pool/contract/index.js';
import {
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
import { getAmountOut, minAmountOut } from './math.js';

const DEFAULT_FAUCET_AMOUNT = 1000000n;
/**
 * Wallet cache sync can trail chain inclusion (the serve process flushes its
 * own view of the shared cache file), so swap coin selection re-reads a few
 * times before giving up.
 */
const SWAP_COIN_ATTEMPTS = 6;
const SWAP_COIN_RETRY_DELAY_MS = 10000;

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export interface AmmConnectOptions {
  readonly providers: PoolProviders;
  readonly contractAddress: ContractAddress;
  /** Compiled pool contract: `CompiledContract.make('pool', Pool.Contract).pipe(withWitnesses, withCompiledFileAssets)`. */
  readonly compiledContract: any;
  readonly initialPrivateState: PoolPrivateState;
  readonly privateStateId?: string;
  /** Source of the wallet's unspent shielded coins (used for balance + exact-coin swap selection). */
  readonly coins: CoinSource;
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
  const reserveA = ledger._coins.member(colors.colorA) ? ledger._coins.lookup(colors.colorA).value : 0n;
  const reserveB = ledger._coins.member(colors.colorB) ? ledger._coins.lookup(colors.colorB).value : 0n;
  return { reserveA, reserveB, seeded: reserveA > 0n && reserveB > 0n, colorAHex, colorBHex };
}

/**
 * High-level AMM operations: quote, swap, pool state, wallet balance,
 * faucet/dev helpers, pause control. Liquidity management (M6 LP circuits)
 * arrives as explicit NOT_IMPLEMENTED stubs until then.
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
    const api = new AmmApi(deployedContract, options.providers, options.coins, options.logger);
    await api.colors();
    return api;
  }

  /** Pool token colors (derived in-circuit from the contract address; cached). */
  async colors(): Promise<PoolColors> {
    if (!this.colorsCache) {
      const result = await (this.deployedContract as any).callTx.getColors();
      const [colorA, colorB] = callResult<[Uint8Array, Uint8Array]>(result);
      this.colorsCache = { colorA, colorB };
      this.logger?.debug({ colorAHex: bytesToHex(colorA), colorBHex: bytesToHex(colorB) }, 'resolved pool colors');
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

  /** Pause flag — not part of the ledger; read via view circuit. */
  async isPaused(): Promise<boolean> {
    const result = await (this.deployedContract as any).callTx.getIsPaused();
    return callResult<boolean>(result);
  }

  /** Wallet coins split by pool color, plus totals and untouched other-color coins. */
  async balance(): Promise<PoolBalance> {
    const colors = await this.colors();
    const colorAHex = bytesToHex(colors.colorA);
    const colorBHex = bytesToHex(colors.colorB);
    const coins = await this.coins();
    const coinA = coins.filter((c) => c.colorHex === colorAHex);
    const coinB = coins.filter((c) => c.colorHex === colorBHex);
    const otherCoins = coins.filter((c) => c.colorHex !== colorAHex && c.colorHex !== colorBHex);
    const total = (list: readonly WalletCoin[]): bigint =>
      list.reduce((sum, c) => sum + c.value, 0n);
    return { coinA, coinB, totalA: total(coinA), totalB: total(coinB), otherCoins };
  }

  /**
   * Quote a swap using the exact circuit formula against the latest reserves.
   *
   * NOTE: the swap circuit consumes the ENTIRE input coin — `amountIn` must
   * equal the value of an unspent pool-colored coin (swap() enforces this).
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
   * Swap the entire value of an exact-value pool coin. Quotes fresh, checks
   * pause state, then submits; resolves after on-chain inclusion.
   */
  async swap(options: SwapOptions): Promise<SwapResult> {
    const { side, amountIn, slippageBps = 0 } = options;
    const quote = await this.quote(side, amountIn, slippageBps);
    if (await this.isPaused()) throw new AmmError('PAUSED', 'pool is paused; unpause() before swapping');
    const coin = options.coin
      ? await this.validateProvidedCoin(options.coin, side, amountIn)
      : await this.waitForExactCoin(side, amountIn);
    const result = await (this.deployedContract as any).callTx.swap(
      { nonce: hexToBytes(coin.nonceHex), color: hexToBytes(coin.colorHex), value: coin.value },
      quote.amountOut,
      quote.minAmountOut,
    );
    this.logger?.info({ side, amountIn: amountIn.toString(), amountOut: quote.amountOut.toString(), txId: callTxId(result) }, 'swap settled');
    return { txId: callTxId(result), quote, coin };
  }

  /** Validate a caller-provided coin against the pool color for `side` and amountIn. */
  private async validateProvidedCoin(coin: WalletCoin, side: SwapSide, amountIn: bigint): Promise<WalletCoin> {
    const colors = await this.colors();
    const expectedHex = bytesToHex(side === 'AtoB' ? colors.colorA : colors.colorB);
    if (coin.colorHex !== expectedHex) {
      throw new AmmError('NO_EXACT_COIN', `provided coin color ${coin.colorHex} is not pool color ${side === 'AtoB' ? 'A' : 'B'} (${expectedHex})`);
    }
    if (coin.value !== amountIn) {
      throw new AmmError('NO_EXACT_COIN', `provided coin holds ${coin.value}, but amountIn is ${amountIn}`);
    }
    return coin;
  }

  /**
   * Select the exact-value coin from the wallet cache, re-syncing a bounded
   * number of times: the shared cache file can trail chain inclusion when the
   * serve process flushes its own (older) view.
   */
  private async waitForExactCoin(side: SwapSide, amountIn: bigint): Promise<WalletCoin> {
    let lastAvailable: readonly WalletCoin[] = [];
    for (let attempt = 1; attempt <= SWAP_COIN_ATTEMPTS; attempt++) {
      const balance = await this.balance();
      const poolCoins = side === 'AtoB' ? balance.coinA : balance.coinB;
      lastAvailable = poolCoins;
      const exact = poolCoins.filter((c) => c.value === amountIn);
      if (exact.length > 0) return exact[0];
      if (attempt < SWAP_COIN_ATTEMPTS) {
        this.logger?.warn({ attempt, side, amountIn: amountIn.toString() }, 'exact-value coin not in wallet cache yet; re-syncing');
        await delay(SWAP_COIN_RETRY_DELAY_MS);
      }
    }
    const available = lastAvailable.map((c) => c.value.toString()).join(', ') || 'none';
    throw new AmmError(
      'NO_EXACT_COIN',
      `swap consumes an entire coin: no ${side === 'AtoB' ? 'A' : 'B'}-color coin with value ${amountIn}; available values: [${available}]`,
    );
  }

  /**
   * Devnet helper: mint fresh colorA/colorB coins to this wallet.
   * Returns the two sent coins (safe to use as seed()/swap() inputs).
   */
  async faucet(options: FaucetOptions = {}): Promise<[PoolCoin, PoolCoin]> {
    const amountA = options.amountA ?? DEFAULT_FAUCET_AMOUNT;
    const amountB = options.amountB ?? DEFAULT_FAUCET_AMOUNT;
    const result = await (this.deployedContract as any).callTx.faucet(
      amountA,
      amountB,
      randomBytes32(),
      randomBytes32(),
    );
    const coins = callResult<[PoolCoin, PoolCoin]>(result);
    this.logger?.info({ amountA: amountA.toString(), amountB: amountB.toString() }, 'faucet minted');
    return coins;
  }

  /** Initialize pool reserves with two freshly minted (or existing) coins. */
  async seed(coinA: PoolCoin, coinB: PoolCoin): Promise<string> {
    const result = await (this.deployedContract as any).callTx.seed(coinA, coinB);
    const txId = callTxId(result);
    this.logger?.info({ txId }, 'pool seeded');
    return txId;
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

  /** M6: LP-share minting circuits. Not implemented yet. */
  async addLiquidity(_amountA: bigint, _amountB: bigint): Promise<never> {
    throw new AmmError('NOT_IMPLEMENTED', 'addLiquidity ships with the M6 LP circuits; not available yet');
  }

  /** M6: LP-share redemption circuits. Not implemented yet. */
  async removeLiquidity(_lpAmount: bigint): Promise<never> {
    throw new AmmError('NOT_IMPLEMENTED', 'removeLiquidity ships with the M6 LP circuits; not available yet');
  }
}
