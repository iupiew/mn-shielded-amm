/**
 * AMM core types shared by api consumers (CLI, MCP, UI, strategies).
 * @module
 */

import { type MidnightProviders } from '@midnight-ntwrk/midnight-js-types';
import { type FoundContract } from '@midnight-ntwrk/midnight-js-contracts';
import { type LeaderboardPrivateState } from '../../../contract/src/index.js';

export const poolPrivateStateKey = 'poolPrivateState';
export type PoolPrivateStateId = typeof poolPrivateStateKey;

export type PoolCircuitKeys =
  | 'faucet'
  | 'seed'
  | 'swap'
  | 'pause'
  | 'unpause'
  | 'getReserves'
  | 'getColors'
  | 'getIsPaused';

/** The pool contract's private state reuses the template's secret-key shape. */
export type PoolPrivateState = LeaderboardPrivateState;

export type PoolProviders = MidnightProviders<PoolCircuitKeys, PoolPrivateStateId, PoolPrivateState>;

/** Found pool contract (callTx typed per circuit via `as any`, as in LeaderboardAPI). */
export type DeployedPoolContract = FoundContract<any>;

/** A shielded coin as the contract circuits see it (contract-owned or minted). */
export interface PoolCoin {
  readonly nonce: Uint8Array;
  readonly color: Uint8Array;
  readonly value: bigint;
}

/** An unspent wallet coin, hex-encoded as read from the wallet zswap state. */
export interface WalletCoin {
  readonly nonceHex: string;
  readonly colorHex: string;
  readonly value: bigint;
}

/**
 * Platform-supplied source of the wallet's unspent shielded coins.
 * Implementations are expected to refresh any on-disk cache they read from.
 */
export type CoinSource = () => Promise<WalletCoin[]>;

export interface PoolColors {
  readonly colorA: Uint8Array;
  readonly colorB: Uint8Array;
}

export interface PoolState {
  readonly reserveA: bigint;
  readonly reserveB: bigint;
  /** True once both reserves are non-zero (the seed() circuit has run). */
  readonly seeded: boolean;
  readonly colorAHex: string;
  readonly colorBHex: string;
}

/** Swap direction relative to the pool's (colorA, colorB) token pair. */
export type SwapSide = 'AtoB' | 'BtoA';

export interface Quote {
  readonly side: SwapSide;
  readonly amountIn: bigint;
  readonly reserveIn: bigint;
  readonly reserveOut: bigint;
  /** Output computed by the exact circuit formula (0.3% fee retained in pool). */
  readonly amountOut: bigint;
  /** amountOut after slippage tolerance; pass to swap() as minAmountOut. */
  readonly minAmountOut: bigint;
}

export interface PoolBalance {
  readonly coinA: readonly WalletCoin[];
  readonly coinB: readonly WalletCoin[];
  readonly totalA: bigint;
  readonly totalB: bigint;
  /** Wallet coins in colors other than the pool pair (left untouched). */
  readonly otherCoins: readonly WalletCoin[];
}

export interface SwapOptions {
  readonly side: SwapSide;
  /** Must equal the value of an unspent pool-colored coin (circuits swap whole coins). */
  readonly amountIn: bigint;
  /** Slippage tolerance in basis points (0–10000). Default 0. */
  readonly slippageBps?: number;
  /**
   * Optional: the exact coin to spend, e.g. returned by faucet(). Bypasses the
   * wallet coin cache (useful right after minting, before the cache syncs).
   * Must match the pool color for `side` and hold exactly `amountIn`.
   */
  readonly coin?: WalletCoin;
}

export interface SwapResult {
  readonly txId: string;
  readonly quote: Quote;
  /** The exact coin consumed by the swap. */
  readonly coin: WalletCoin;
}

export interface FaucetOptions {
  /** Devnet-only mint amount for color A. Default 1000000n. */
  readonly amountA?: bigint;
  /** Devnet-only mint amount for color B. Default 1000000n. */
  readonly amountB?: bigint;
}

export type AmmErrorCode =
  | 'NOT_SEEDED'
  | 'ZERO_AMOUNT'
  | 'VALUE_TOO_LARGE'
  | 'NO_OUTPUT'
  | 'EXCEEDS_RESERVE'
  | 'BAD_SLIPPAGE'
  | 'NO_EXACT_COIN'
  | 'PAUSED'
  | 'NOT_IMPLEMENTED';

/**
 * Error with a machine-readable code so CLI/MCP layers can map to exit
 * codes / structured failures without string matching.
 */
export class AmmError extends Error {
  constructor(
    readonly code: AmmErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'AmmError';
  }
}

export function bytesToHex(bytes: Uint8Array): string {
  let hex = '';
  for (const b of bytes) hex += b.toString(16).padStart(2, '0');
  return hex;
}

export function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) throw new Error(`hex string has odd length: ${hex.length}`);
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

export function randomBytes32(): Uint8Array {
  return globalThis.crypto.getRandomValues(new Uint8Array(32));
}

/** Convert a circuit coin (faucet output) to the hex form used by SwapOptions.coin. */
export function poolCoinToWalletCoin(coin: PoolCoin): WalletCoin {
  return { nonceHex: bytesToHex(coin.nonce), colorHex: bytesToHex(coin.color), value: coin.value };
}
