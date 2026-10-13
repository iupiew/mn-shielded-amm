/**
 * Pure AMM math mirroring `contract/pool.compact`'s swap circuit 1:1.
 *
 * The circuit avoids division: it accepts the caller's `amountOut` and proves
 * `out * denom <= numer < (out + 1) * denom` (quotient range check) plus the
 * k-invariant, all in unsigned 64-bit-bounded integers. These helpers reproduce
 * the same formulas and checks so off-chain quotes can never disagree with the
 * circuit for the same inputs.
 * @module
 */

import { AmmError } from './types.js';

/** Uniswap-V2-style 0.3% fee: 997/1000 of input is credited to the pool. */
export const FEE_NUMERATOR = 997n;
export const FEE_DENOMINATOR = 1000n;
export const BPS_DENOMINATOR = 10000n;
/** Circuit asserts every value/operand fits in uint64 (< 2^64). */
export const MAX_U64 = 18446744073709551616n;

/**
 * Floor(amountIn * 997 * reserveOut / (reserveIn * 1000 + amountIn * 997)).
 *
 * @throws AmmError ZERO_AMOUNT if amountIn <= 0
 * @throws AmmError NOT_SEEDED if either reserve is <= 0
 * @throws AmmError VALUE_TOO_LARGE if any operand reaches 2^64 (circuit bound)
 * @throws AmmError NO_OUTPUT if the result rounds to zero (circuit permits 0;
 *         api surfaces it as an error because a 0-value swap is pointless)
 * @throws AmmError EXCEEDS_RESERVE if output exceeds reserveOut (cannot happen
 *         for a properly formed pool; guards caller bugs)
 */
export function getAmountOut(amountIn: bigint, reserveIn: bigint, reserveOut: bigint): bigint {
  if (amountIn <= 0n) throw new AmmError('ZERO_AMOUNT', `amountIn must be positive, got ${amountIn}`);
  if (reserveIn <= 0n || reserveOut <= 0n) {
    throw new AmmError('NOT_SEEDED', `pool not seeded: reserves [${reserveIn}, ${reserveOut}]`);
  }
  if (amountIn >= MAX_U64 || reserveIn >= MAX_U64 || reserveOut >= MAX_U64) {
    throw new AmmError('VALUE_TOO_LARGE', `operands must be < 2^64 (circuit bound): [${amountIn}, ${reserveIn}, ${reserveOut}]`);
  }
  const numerator = amountIn * FEE_NUMERATOR * reserveOut;
  const denominator = reserveIn * FEE_DENOMINATOR + amountIn * FEE_NUMERATOR;
  const amountOut = numerator / denominator;
  if (amountOut === 0n) {
    throw new AmmError('NO_OUTPUT', `input ${amountIn} is too small against reserves [${reserveIn}, ${reserveOut}] (output rounds to zero)`);
  }
  if (amountOut > reserveOut) {
    throw new AmmError('EXCEEDS_RESERVE', `computed output ${amountOut} exceeds reserveOut ${reserveOut}`);
  }
  return amountOut;
}

/** Division-free mirror of the circuit's quotient range check: q*d <= n < (q+1)*d. */
export function quotientRangeHolds(numerator: bigint, denominator: bigint, quotient: bigint): boolean {
  if (denominator <= 0n || quotient < 0n) return false;
  return quotient * denominator <= numerator && numerator < (quotient + 1n) * denominator;
}

/** Mirror of the circuit's post-swap k-invariant: (rIn + v) * (rOut - out) >= rIn * rOut. */
export function satisfiesKInvariant(reserveIn: bigint, reserveOut: bigint, amountIn: bigint, amountOut: bigint): boolean {
  if (amountOut > reserveOut) return false;
  return (reserveIn + amountIn) * (reserveOut - amountOut) >= reserveIn * reserveOut;
}

/** Slippage floor: amountOut * (10000 - bps) / 10000. bps in [0, 10000]. */
export function minAmountOut(amountOut: bigint, slippageBps: number | bigint): bigint {
  const bps = typeof slippageBps === 'bigint' ? slippageBps : BigInt(Math.trunc(slippageBps));
  if (bps < 0n || bps > BPS_DENOMINATOR) {
    throw new AmmError('BAD_SLIPPAGE', `slippageBps must be within [0, 10000], got ${bps}`);
  }
  return (amountOut * (BPS_DENOMINATOR - bps)) / BPS_DENOMINATOR;
}

/** Integer square root (floor) via Newton's method — for the seed initialLp default. */
export function integerSqrt(n: bigint): bigint {
  if (n < 0n) throw new AmmError('ZERO_AMOUNT', `integerSqrt requires n >= 0, got ${n}`);
  if (n < 2n) return n;
  let x = n;
  let y = (x + 1n) / 2n;
  while (y < x) {
    x = y;
    y = (x + n / x) / 2n;
  }
  return x;
}

function assertLpOperands(amounts: readonly bigint[], reserves: readonly bigint[], supply: bigint): void {
  if (amounts.some((a) => a <= 0n)) {
    throw new AmmError('ZERO_AMOUNT', `LP amounts must be positive, got [${amounts.join(', ')}]`);
  }
  if (reserves.some((r) => r <= 0n) || supply <= 0n) {
    throw new AmmError('NOT_SEEDED', `pool not seeded: reserves [${reserves.join(', ')}], supply ${supply}`);
  }
  if ([...amounts, ...reserves, supply].some((v) => v >= MAX_U64)) {
    throw new AmmError('VALUE_TOO_LARGE', `operands must be < 2^64 (circuit bound): [${[...amounts, ...reserves, supply].join(', ')}]`);
  }
}

/**
 * Mirror of addLiquidity: lpOut = min(floor(amountA·S/rA), floor(amountB·S/rB)).
 *
 * @throws AmmError ZERO_AMOUNT / NOT_SEEDED / VALUE_TOO_LARGE (circuit bounds)
 * @throws AmmError NO_OUTPUT if lpOut rounds to zero (circuit asserts > 0)
 */
export function getLpOut(
  amountA: bigint,
  amountB: bigint,
  reserveA: bigint,
  reserveB: bigint,
  supply: bigint,
): bigint {
  assertLpOperands([amountA, amountB], [reserveA, reserveB], supply);
  const qA = (amountA * supply) / reserveA;
  const qB = (amountB * supply) / reserveB;
  const lpOut = qA < qB ? qA : qB;
  if (lpOut === 0n) {
    throw new AmmError('NO_OUTPUT', `deposit [${amountA}, ${amountB}] is too small against reserves [${reserveA}, ${reserveB}] (lpOut rounds to zero)`);
  }
  return lpOut;
}

/**
 * Mirror of removeLiquidity: aOut = floor(amountLp·rA/S), bOut = floor(amountLp·rB/S).
 *
 * @throws AmmError ZERO_AMOUNT / NOT_SEEDED / VALUE_TOO_LARGE (circuit bounds)
 * @throws AmmError INSUFFICIENT_COIN if amountLp exceeds supply
 * @throws AmmError NO_OUTPUT if either payout rounds to zero (circuit asserts > 0)
 */
export function getAmountsOut(
  amountLp: bigint,
  reserveA: bigint,
  reserveB: bigint,
  supply: bigint,
): { aOut: bigint; bOut: bigint } {
  assertLpOperands([amountLp], [reserveA, reserveB], supply);
  if (amountLp > supply) {
    throw new AmmError('INSUFFICIENT_COIN', `amountLp ${amountLp} exceeds LP supply ${supply}`);
  }
  const aOut = (amountLp * reserveA) / supply;
  const bOut = (amountLp * reserveB) / supply;
  if (aOut === 0n || bOut === 0n) {
    throw new AmmError('NO_OUTPUT', `burn ${amountLp} of ${supply} is too small: payouts [${aOut}, ${bOut}] round to zero`);
  }
  return { aOut, bOut };
}
