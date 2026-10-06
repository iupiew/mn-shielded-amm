import { describe, expect, it } from 'vitest';
import {
  BPS_DENOMINATOR,
  FEE_DENOMINATOR,
  FEE_NUMERATOR,
  MAX_U64,
  getAmountOut,
  minAmountOut,
  quotientRangeHolds,
  satisfiesKInvariant,
} from '../amm/math.js';
import { AmmError } from '../amm/types.js';

describe('getAmountOut', () => {
  it('matches the chain-verified vector: [1M, 1M, 1M] -> 499248', () => {
    expect(getAmountOut(1000000n, 1000000n, 1000000n)).toBe(499248n);
  });

  it('matches the post-swap vector: [1M, 2M, 500752] -> 166583', () => {
    expect(getAmountOut(1000000n, 2000000n, 500752n)).toBe(166583n);
  });

  it('keeps the 0.3% fee in the pool (strictly worse than no-fee output)', () => {
    const withFee = getAmountOut(1000000n, 1000000n, 1000000n);
    const noFee = (1000000n * 1000000n) / (1000000n + 1000000n);
    expect(withFee).toBeLessThan(noFee);
  });

  it('always satisfies the circuit quotient range check and k-invariant', () => {
    const cases: Array<[bigint, bigint, bigint]> = [
      [1000n, 1000000n, 1000000n],
      [12345n, 987654n, 555555n],
      [10n ** 9n, 10n ** 12n, 3n * 10n ** 11n],
      [10n ** 12n, 10n ** 9n, 777n * 10n ** 9n],
      [MAX_U64 - 1n, MAX_U64 - 1n, 1000000n],
      [500752n, 2000000n, 999999n],
    ];
    for (const [amountIn, reserveIn, reserveOut] of cases) {
      const amountOut = getAmountOut(amountIn, reserveIn, reserveOut);
      const numerator = amountIn * FEE_NUMERATOR * reserveOut;
      const denominator = reserveIn * FEE_DENOMINATOR + amountIn * FEE_NUMERATOR;
      expect(quotientRangeHolds(numerator, denominator, amountOut)).toBe(true);
      expect(satisfiesKInvariant(reserveIn, reserveOut, amountIn, amountOut)).toBe(true);
      expect(amountOut).toBeLessThanOrEqual(reserveOut);
    }
  });

  it('is monotonic in amountIn for fixed reserves', () => {
    let previous = 0n;
    for (const amountIn of [1000n, 50000n, 1000000n, 5000000n]) {
      const out = getAmountOut(amountIn, 2000000n, 500752n);
      expect(out).toBeGreaterThan(previous);
      previous = out;
    }
  });

  it('throws ZERO_AMOUNT for non-positive input', () => {
    expect(() => getAmountOut(0n, 1000n, 1000n)).toThrowError(AmmError);
    expect(() => getAmountOut(-1n, 1000n, 1000n)).toThrowError(/positive/);
  });

  it('throws NOT_SEEDED for empty reserves', () => {
    expect(() => getAmountOut(1000n, 0n, 1000n)).toThrowError(/not seeded/i);
    expect(() => getAmountOut(1000n, 1000n, 0n)).toThrowError(/not seeded/i);
  });

  it('throws VALUE_TOO_LARGE at the circuit uint64 bound', () => {
    expect(() => getAmountOut(MAX_U64, 1000n, 1000n)).toThrowError(/2\^64/);
    expect(() => getAmountOut(1000n, MAX_U64, 1000n)).toThrowError(/2\^64/);
    expect(() => getAmountOut(1000n, 1000n, MAX_U64)).toThrowError(/2\^64/);
    expect(getAmountOut(MAX_U64 - 1n, MAX_U64 - 1n, MAX_U64 - 1n)).toBeGreaterThan(0n);
  });

  it('throws NO_OUTPUT when the input rounds to zero output', () => {
    expect(() => getAmountOut(1n, 10n ** 18n, 10n ** 18n)).toThrowError(/rounds to zero/);
  });

  it('exposes AmmError codes for machine-readable handling', () => {
    try {
      getAmountOut(0n, 1n, 1n);
      expect.unreachable('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(AmmError);
      expect((error as AmmError).code).toBe('ZERO_AMOUNT');
    }
  });
});

describe('quotientRangeHolds', () => {
  it('accepts the exact floor quotient', () => {
    expect(quotientRangeHolds(10n, 3n, 3n)).toBe(true);
    expect(quotientRangeHolds(9n, 3n, 3n)).toBe(true);
  });

  it('rejects quotients off by one in either direction', () => {
    expect(quotientRangeHolds(10n, 3n, 2n)).toBe(false);
    expect(quotientRangeHolds(10n, 3n, 4n)).toBe(false);
  });

  it('rejects degenerate inputs', () => {
    expect(quotientRangeHolds(10n, 0n, 1n)).toBe(false);
    expect(quotientRangeHolds(10n, 3n, -1n)).toBe(false);
  });
});

describe('satisfiesKInvariant', () => {
  it('holds with equality only when no value is extracted', () => {
    expect(satisfiesKInvariant(1000n, 1000n, 0n, 0n)).toBe(true);
  });

  it('fails when the swap drains the output reserve beyond available', () => {
    expect(satisfiesKInvariant(1000n, 1000n, 1000n, 1001n)).toBe(false);
  });

  it('holds for a fee-bearing swap (pool keeps the fee)', () => {
    const amountOut = getAmountOut(1000000n, 1000000n, 1000000n);
    expect(satisfiesKInvariant(1000000n, 1000000n, 1000000n, amountOut)).toBe(true);
  });
});

describe('minAmountOut', () => {
  it('returns the full amount at 0 bps', () => {
    expect(minAmountOut(499248n, 0)).toBe(499248n);
  });

  it('applies the floor after the slippage reduction', () => {
    expect(minAmountOut(499248n, 50)).toBe(496751n);
    expect(minAmountOut(1000000n, 500)).toBe(950000n);
  });

  it('allows a full-drain tolerance at 10000 bps', () => {
    expect(minAmountOut(499248n, BPS_DENOMINATOR)).toBe(0n);
  });

  it('rejects out-of-range slippage', () => {
    expect(() => minAmountOut(1n, 10001)).toThrowError(AmmError);
    expect(() => minAmountOut(1n, -1)).toThrowError(/slippage/i);
    try {
      minAmountOut(1n, 20000);
      expect.unreachable('should have thrown');
    } catch (error) {
      expect((error as AmmError).code).toBe('BAD_SLIPPAGE');
    }
  });
});
