/**
 * On-disk wallet coin cache: refresh + read.
 *
 * `midnight-wallet-cli balance --shielded --force-shielded --network <net>`
 * scans the zswap ledger for the wallet's coins and writes
 * `~/.midnight/cache/<net>/shielded-<pk20>.json` (`coinPublicKeyHex` +
 * `zswapState`). That file is the only enumeration of unspent shielded coins
 * on hosted networks: `balance` itself only reports NIGHT fee coins, and the
 * DApp-Connector facade does not track custom-color tokens.
 *
 * UNVERIFIED: filename scheme matched by content (`coinPublicKeyHex`), not by
 * naming assumptions; cache freshness relies on `midnight-wallet-cli balance`
 * being installed and pointed at the same network.
 * @module
 */

import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { ZswapLocalState } from '@midnight-ntwrk/ledger-v8';
import { type WalletCoin } from './types.js';

export const DEFAULT_WALLET = 'devnet-main';

/** `balance` skips shielded sync on these networks unless --force-shielded is passed. */
const FORCE_SHIELDED_NETWORKS = new Set(['preview', 'preprod']);

/**
 * Reuse a just-synced cache for this long. An incremental shielded sync costs
 * ~20s (silence/idle detection), a first full scan ~5min — too expensive for
 * every poll, while 10s still beats the swap coin-retry delay (10s) so each
 * retry re-syncs.
 */
const SHIELDED_SYNC_TTL_MS = 10_000;

/** First full scan of a hosted network takes ~5min; plain local syncs are fast. */
const SHIELDED_SYNC_TIMEOUT_MS = 600_000;
const PLAIN_SYNC_TIMEOUT_MS = 120_000;

/** True when `balance` needs `--shielded --force-shielded` for this network. */
export function shieldedSyncRequired(networkId: string): boolean {
  return FORCE_SHIELDED_NETWORKS.has(networkId);
}

export interface SyncWalletCacheOptions {
  /** Passed as `--network <id>` so the CLI writes the same cache dir we read. */
  readonly networkId?: string;
  /** Also sync shielded coins (`--shielded --force-shielded`), needed on preview/preprod. */
  readonly shieldedSync?: boolean;
}

/**
 * Refresh the on-disk wallet cache by spawning `midnight-wallet-cli balance`.
 *
 * Synchronous by design (callers serialize coin operations anyway); spawn
 * failures are swallowed — callers fall back to whatever cache exists.
 */
export function syncWalletCache(wallet = DEFAULT_WALLET, opts: SyncWalletCacheOptions = {}): void {
  const args = ['balance', '--json', '--wallet', wallet];
  if (opts.networkId) args.push('--network', opts.networkId);
  if (opts.shieldedSync) args.push('--shielded', '--force-shielded');
  spawnSync('midnight-wallet-cli', args, {
    encoding: 'utf8',
    timeout: opts.shieldedSync ? SHIELDED_SYNC_TIMEOUT_MS : PLAIN_SYNC_TIMEOUT_MS,
  });
}

interface WalletCacheFile {
  readonly zswapState?: string;
  readonly coinPublicKeyHex?: string;
}

interface WalletCacheLookup {
  readonly cache?: WalletCacheFile;
  readonly path?: string;
  readonly candidates: readonly string[];
}

function findWalletCache(cacheDir: string, pk: string): WalletCacheLookup {
  let candidates: string[];
  try {
    candidates = readdirSync(cacheDir).filter((name) => name.startsWith('shielded-') && name.endsWith('.json'));
  } catch (cause) {
    throw new Error(`cannot read wallet cache dir at ${cacheDir} (wallet sync may have failed): ${String(cause)}`);
  }
  for (const name of candidates) {
    const path = join(cacheDir, name);
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as WalletCacheFile;
    if (parsed.coinPublicKeyHex?.toLowerCase() === pk) return { cache: parsed, path, candidates };
  }
  return { candidates };
}

function isFresh(path: string | undefined, ttlMs: number): boolean {
  if (!path) return false;
  try {
    return Date.now() - statSync(path).mtimeMs < ttlMs;
  } catch {
    return false;
  }
}

export interface ReadWalletCoinsOptions {
  /** Run `midnight-wallet-cli balance` first to refresh the cache. */
  readonly syncWallet: boolean;
  /**
   * Sync shielded coins too (`--shielded --force-shielded --network <id>`) and
   * skip the spawn while the cache file is younger than 10s. Required on
   * preview/preprod; leave unset elsewhere to keep sync-on-every-read.
   */
  readonly shieldedSync?: boolean;
  readonly wallet: string;
  /** Network id = cache subdirectory under `~/.midnight/cache/`. */
  readonly networkId: string;
  readonly shieldedCoinPublicKey: string;
}

/**
 * Read the wallet's unspent shielded coins from the on-disk zswap cache,
 * optionally refreshing it first via `midnight-wallet-cli balance`.
 *
 * UNVERIFIED: cache is only refreshed when a wallet operation runs against the
 * node, so (unless disabled) we spawn `midnight-wallet-cli balance --json`
 * first; if that fails (CLI not on PATH) we fall back to the last known state.
 * The cache filename scheme is not stable across versions, so files are
 * matched by their `coinPublicKeyHex` field instead.
 */
export function readWalletCoins(options: ReadWalletCoinsOptions): Promise<WalletCoin[]> {
  const cacheDir = join(homedir(), '.midnight', 'cache', options.networkId);
  const pk = options.shieldedCoinPublicKey.toLowerCase();
  let found: WalletCacheLookup = { candidates: [] };
  let lookupError: unknown;
  let fresh = false;
  try {
    found = findWalletCache(cacheDir, pk);
    fresh = options.shieldedSync === true && isFresh(found.path, SHIELDED_SYNC_TTL_MS);
  } catch (cause) {
    // Missing cache dir on first run — a sync below creates it.
    lookupError = cause;
  }
  if (options.syncWallet && !fresh) {
    syncWalletCache(options.wallet, { networkId: options.networkId, shieldedSync: options.shieldedSync });
    found = findWalletCache(cacheDir, pk);
  } else if (lookupError) {
    throw lookupError;
  }
  if (!found.cache) {
    throw new Error(`no wallet coin cache in ${cacheDir} matching coinPublicKeyHex ${pk} (found: ${found.candidates.join(', ') || 'none'}); run 'midnight-wallet-cli balance' to sync`);
  }
  if (!found.cache.zswapState) throw new Error(`wallet coin cache for ${pk} has no zswapState field`);
  const state = ZswapLocalState.deserialize(Uint8Array.from(Buffer.from(found.cache.zswapState, 'hex')));
  const coins: WalletCoin[] = [...state.coins].map((coin) => ({ nonceHex: coin.nonce, colorHex: coin.type, value: coin.value }));
  return Promise.resolve(coins);
}
