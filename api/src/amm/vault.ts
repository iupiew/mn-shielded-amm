/**
 * Coin vault for the DApp-connector wallet.
 *
 * The DApp connector exposes no coin enumeration (no getShieldedCoins), so the
 * AMM tracks unspent pool coins itself: faucet() results are recorded,
 * swap() consumes the spent coin. The vault backs AmmApi's CoinSource.
 *
 * Two shapes: {@link createVault} (in-memory, e.g. tests) and
 * {@link createPersistentVault} (write-through to a Storage-compatible
 * snapshot, so browser reloads and CLI runs keep their coins).
 * @module
 */

import { type PoolCoin, type WalletCoin, poolCoinToWalletCoin, bytesToHex, hexToBytes } from './types.js';

export interface Vault {
  /** CoinSource for AmmApi.connect — always reflects the current vault contents. */
  readonly source: () => Promise<WalletCoin[]>;
  /** Record minted/refreshed coins (dedupes by nonce). */
  record(...coins: readonly (PoolCoin | WalletCoin)[]): void;
  /** Remove a spent coin (by nonceHex). */
  consume(coin: WalletCoin): void;
  /** Snapshot of current coins. */
  list(): WalletCoin[];
  /** Drop all coins (e.g. wallet re-connect). */
  clear(): void;
}

/** Storage-compatible persistence surface (window.localStorage, file-backed, test doubles). */
export interface VaultStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function isWalletCoin(coin: PoolCoin | WalletCoin): coin is WalletCoin {
  return typeof (coin as WalletCoin).nonceHex === 'string';
}

function coinKey(coin: WalletCoin): string {
  return `${coin.nonceHex}:${coin.colorHex}:${coin.value}`;
}

export function createVault(initial: readonly (PoolCoin | WalletCoin)[] = []): Vault {
  let coins: WalletCoin[] = [];
  const keys = new Set<string>();

  const record = (...newCoins: readonly (PoolCoin | WalletCoin)[]): void => {
    for (const coin of newCoins) {
      const walletCoin = isWalletCoin(coin) ? coin : poolCoinToWalletCoin(coin);
      const key = coinKey(walletCoin);
      if (keys.has(key)) continue;
      keys.add(key);
      coins.push(walletCoin);
    }
  };

  record(...initial);

  return {
    source: () => Promise.resolve(coins.slice()),
    record,
    consume: (coin: WalletCoin) => {
      const key = coinKey(coin);
      if (!keys.delete(key)) {
        // Fallback: match by nonce only (color/value may differ after sync).
        const index = coins.findIndex((c) => c.nonceHex === coin.nonceHex);
        if (index === -1) return;
        coins.splice(index, 1);
        return;
      }
      const index = coins.findIndex((c) => coinKey(c) === key);
      if (index !== -1) coins.splice(index, 1);
    },
    list: () => coins.slice(),
    clear: () => {
      coins = [];
      keys.clear();
    },
  };
}

/** JSON snapshot — bigint values become decimal strings (JSON.stringify throws on bigint). */
function serializeCoins(coins: readonly WalletCoin[]): string {
  return JSON.stringify(
    coins.map((coin) => ({ nonceHex: coin.nonceHex, colorHex: coin.colorHex, value: coin.value.toString() })),
  );
}

/** Revive a snapshot; corrupt/stale entries are skipped instead of throwing. */
function deserializeCoins(raw: string | null): WalletCoin[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const coins: WalletCoin[] = [];
  for (const entry of parsed as Array<Record<string, unknown> | null>) {
    if (!entry || typeof entry.nonceHex !== 'string' || typeof entry.colorHex !== 'string') continue;
    try {
      coins.push({ nonceHex: entry.nonceHex, colorHex: entry.colorHex, value: BigInt(String(entry.value)) });
    } catch {
      continue;
    }
  }
  return coins;
}

function readSnapshot(storage: VaultStorage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Vault that survives reloads/restarts: hydrates its snapshot from `storage`
 * and writes through on every mutation (per `storageKey`). Storage failures
 * degrade to in-memory — persistence is best-effort, trading never breaks
 * because storage broke.
 */
export function createPersistentVault(storageKey: string, storage: VaultStorage): Vault {
  const base = createVault(deserializeCoins(readSnapshot(storage, storageKey)));
  const persist = (): void => {
    try {
      storage.setItem(storageKey, serializeCoins(base.list()));
    } catch {
      // quota exceeded / storage disabled — keep the in-memory vault working.
    }
  };
  return {
    source: base.source,
    record: (...coins) => {
      base.record(...coins);
      persist();
    },
    consume: (coin) => {
      base.consume(coin);
      persist();
    },
    list: base.list,
    clear: () => {
      base.clear();
      try {
        storage.removeItem(storageKey);
      } catch {
        // storage disabled — nothing to remove.
      }
    },
  };
}

/** Convenience: WalletCoin → PoolCoin (for passing faucet output straight into seed()). */
export function walletCoinToPoolCoin(coin: WalletCoin): PoolCoin {
  return { nonce: hexToBytes(coin.nonceHex), color: hexToBytes(coin.colorHex), value: coin.value };
}

/** Hex helper re-export so wallet-layer code has one import for coin conversion. */
export { bytesToHex, hexToBytes };
