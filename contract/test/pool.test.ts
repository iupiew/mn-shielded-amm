/**
 * Pool circuit unit tests (M3 safety gating).
 *
 * Runs entirely off-chain against the compiled JS module — no node, indexer,
 * or proof server needed (Kapa-verified impureCircuits pattern). Covers the
 * deploy-time faucet gate, the pause gate (incl. the new faucet pause check),
 * owner-only pause/unpause, and the core AMM math/assert paths.
 */
import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import * as RT from '@midnight-ntwrk/compact-runtime';
import { Contract, ledger } from '../managed/pool/contract/index.js';
import { witnesses } from '../src/witnesses.js';

// Owner derivation mirrors the app: wit_secretNonce returns the private
// state's secretKey, and the agent wallets set it to the coin public key
// bytes, so id = SHA256(pk, pk) (see scripts/preprod-deploy.mjs owner rule).
// Here pk = COIN = 32 zero bytes.
const COIN = '0'.repeat(64);
const ADDR = RT.sampleContractAddress();
const PK_BYTES = new Uint8Array(32);
const OWNER_NONCE = PK_BYTES;
const OWNER_ID = new Uint8Array(
  createHash('sha256').update(PK_BYTES).update(PK_BYTES).digest(),
);
const SALT = new Uint8Array(32).fill(7);

const key = (n: number): Uint8Array => {
  const a = new Uint8Array(32);
  a[31] = n;
  return a;
};

let nonceCounter = 0;
const freshNonce = (): Uint8Array => {
  nonceCounter += 1;
  const a = new Uint8Array(32);
  new DataView(a.buffer).setUint32(28, nonceCounter, false);
  return a;
};

type Coin = { nonce: Uint8Array; color: Uint8Array; value: bigint };

const setup = (faucetOpen = true, secretKey: Uint8Array = OWNER_NONCE) => {
  const contract = new Contract(witnesses);
  const ctor = contract.initialState(
    RT.createConstructorContext({ secretKey }, COIN),
    OWNER_ID,
    SALT,
    faucetOpen,
  );
  const ctx = RT.createCircuitContext(ADDR, COIN, ctor.currentContractState, {
    secretKey,
  });
  return { contract, ctx };
};

type Pool = ReturnType<typeof setup>;

// Seed parameters shared by the AMM tests: reserves 1e6 / 4e6, LP 2e6.
const SEED_A = 1_000_000n;
const SEED_B = 4_000_000n;
const SEED_LP = 2_000_000n;

const mintPair = ({ contract, ctx }: Pool) => {
  const call = contract.impureCircuits.faucet(ctx, SEED_A, SEED_B, freshNonce(), freshNonce());
  const [coinA, coinB] = call.result as [Coin, Coin];
  return { ...setupPool(contract, call.context), coinA, coinB };
};

// Re-wrap a contract+context pair without re-running the constructor.
const setupPool = (
  contract: Pool['contract'],
  ctx: Pool['ctx'],
): Pool => ({ contract, ctx });

const seeded = (faucetOpen = true) => {
  const minted = mintPair(setup(faucetOpen));
  const seedCall = minted.contract.impureCircuits.seed(
    minted.ctx, minted.coinA, minted.coinB, SEED_LP, freshNonce(),
  );
  const lpCoin = seedCall.result as Coin;
  return { ...setupPool(minted.contract, seedCall.context), coinA: minted.coinA, coinB: minted.coinB, lpCoin };
};

// floor(v * 997 * rOut / (rIn * 1000 + v * 997))
const swapOut = (v: bigint, rIn: bigint, rOut: bigint): bigint =>
  (v * 997n * rOut) / (rIn * 1000n + v * 997n);

describe('pool contract (compiled circuits)', () => {
  describe('constructor / faucet gate', () => {
    it('stores the deploy-time faucet flag in ledger state', () => {
      expect(ledger(setup(true).ctx.currentQueryContext.state)._faucetOpen).toBe(true);
      expect(ledger(setup(false).ctx.currentQueryContext.state)._faucetOpen).toBe(false);
    });

    it('lets anyone mint while the faucet is open', () => {
      const { coinA, coinB } = mintPair(setup(true));
      expect(coinA.value).toBe(SEED_A);
      expect(coinB.value).toBe(SEED_B);
      expect(Uint8Array.from(coinA.color)).not.toEqual(Uint8Array.from(coinB.color));
    });

    it('rejects every mint when the faucet is closed', () => {
      const pool = setup(false);
      expect(() => mintPair(pool)).toThrow('AMM: faucet closed');
    });
  });

  describe('seed', () => {
    it('creates both pots and mints the initial LP supply', () => {
      const { ctx, coinA, lpCoin } = seeded();
      const L = ledger(ctx.currentQueryContext.state);
      expect(L._lpSupply).toBe(SEED_LP);
      expect(L._coins.member(coinA.color)).toBe(true);
      expect(lpCoin.value).toBe(SEED_LP);
    });

    it('rejects a second seed', () => {
      const { contract, ctx, coinA, coinB } = seeded();
      expect(() =>
        contract.impureCircuits.seed(ctx, coinA, coinB, SEED_LP, freshNonce()),
      ).toThrow('AMM: pool already seeded');
    });

    it('rejects a coin that is not tokenA', () => {
      const { contract, ctx, coinB } = mintPair(setup());
      expect(() =>
        contract.impureCircuits.seed(ctx, coinB, coinB, SEED_LP, freshNonce()),
      ).toThrow('AMM: coinA is not tokenA');
    });
  });

  describe('swap', () => {
    it('pays the constant-product amount and updates reserves', () => {
      const { contract, ctx, coinA, coinB } = seeded();
      const v = 10_000n;
      const out = swapOut(v, SEED_A, SEED_B);
      const call = contract.impureCircuits.swap(ctx, coinA, v, out, 0n);
      const L = ledger(call.context.currentQueryContext.state);
      expect(L._coins.lookup(coinA.color).value).toBe(SEED_A + v);
      expect(L._coins.lookup(coinB.color).value).toBe(SEED_B - out);
    });

    it('rejects an overpriced output', () => {
      const { contract, ctx, coinA } = seeded();
      const out = swapOut(10_000n, SEED_A, SEED_B);
      expect(() => contract.impureCircuits.swap(ctx, coinA, 10_000n, out + 1n, 0n)).toThrow(
        'AMM: output too high',
      );
    });

    it('enforces the minAmountOut slippage bound', () => {
      const { contract, ctx, coinA } = seeded();
      const out = swapOut(10_000n, SEED_A, SEED_B);
      expect(() => contract.impureCircuits.swap(ctx, coinA, 10_000n, out, out + 1n)).toThrow(
        'AMM: below minAmountOut',
      );
    });

    it('rejects a zero amountIn', () => {
      const { contract, ctx, coinA } = seeded();
      expect(() => contract.impureCircuits.swap(ctx, coinA, 0n, 1n, 0n)).toThrow(
        'AMM: zero amountIn',
      );
    });
  });

  describe('liquidity', () => {
    it('mints proportional LP on addLiquidity and reduces supply on removeLiquidity', () => {
      const { contract, ctx, coinA, coinB, lpCoin } = seeded();
      // Deposit at the pool ratio 1:4: lpOut = floor(50k * 2e6 / 1e6) = 100k.
      const add = contract.impureCircuits.addLiquidity(
        ctx, coinA, 50_000n, coinB, 200_000n, 100_000n, 100_000n, freshNonce(),
      );
      expect((add.result as Coin).value).toBe(100_000n);
      expect(ledger(add.context.currentQueryContext.state)._lpSupply).toBe(SEED_LP + 100_000n);

      // Remove the seed LP share: supply drops back to the depositor's 100k.
      const s = SEED_LP;
      const rA = SEED_A + 50_000n;
      const rB = SEED_B + 200_000n;
      const supply = SEED_LP + 100_000n;
      const aOut = (s * rA) / supply;
      const bOut = (s * rB) / supply;
      const exit = contract.impureCircuits.removeLiquidity(
        add.context, lpCoin, s, aOut, bOut, aOut, bOut, freshNonce(), freshNonce(),
      );
      expect(ledger(exit.context.currentQueryContext.state)._lpSupply).toBe(100_000n);
    });

    it('enforces the minLpOut slippage bound', () => {
      const { contract, ctx, coinA, coinB } = seeded();
      expect(() =>
        contract.impureCircuits.addLiquidity(
          ctx, coinA, 50_000n, coinB, 200_000n, 100_000n, 100_001n, freshNonce(),
        ),
      ).toThrow('AMM: below minLpOut');
    });

    it('rejects removeLiquidity with a non-LP coin', () => {
      const { contract, ctx, coinA, lpCoin } = seeded();
      expect(() =>
        contract.impureCircuits.removeLiquidity(
          ctx, coinA, 1n, 1n, 1n, 0n, 0n, freshNonce(), freshNonce(),
        ),
      ).toThrow('AMM: coin is not LP token');
      expect(lpCoin.value).toBe(SEED_LP);
    });
  });

  describe('pause / unpause (owner-gated)', () => {
    it('lets the owner pause once and rejects a stranger', () => {
      const { contract, ctx } = setup();
      const paused = contract.impureCircuits.pause(ctx);
      // second pause fails on the already-paused guard — proves the first landed.
      expect(() => contract.impureCircuits.pause(paused.context)).toThrow(
        'Pausable: paused',
      );
      const stranger = { ...ctx, currentPrivateState: { secretKey: key(9) } };
      expect(() => contract.impureCircuits.pause(stranger)).toThrow(
        'ZOwnablePK: caller is not the owner',
      );
    });

    it('blocks the faucet and swap while paused, then recovers on unpause', () => {
      const { contract, ctx, coinA } = seeded(true);
      const paused = contract.impureCircuits.pause(ctx).context;
      expect(() =>
        contract.impureCircuits.faucet(paused, 1n, 1n, freshNonce(), freshNonce()),
      ).toThrow('Pausable: paused');
      expect(() => contract.impureCircuits.swap(paused, coinA, 1n, 1n, 0n)).toThrow(
        'Pausable: paused',
      );
      const open = contract.impureCircuits.unpause(paused).context;
      const minted = contract.impureCircuits.faucet(open, 1n, 1n, freshNonce(), freshNonce());
      expect((minted.result as [Coin, Coin])[0].value).toBe(1n);
    });
  });
});
