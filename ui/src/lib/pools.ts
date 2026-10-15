/** Pool registry (`/pools.json`, copied from the repo root by scripts/sync-ui-zk.mjs). */

import {
  addLocalPool as addLocalEntry,
  loadLocalPools as loadStoredPools,
  mergePools as mergePoolLists,
  removeLocalPool as removeLocalEntry,
  saveLocalPools as saveStoredPools,
  type LocalPoolEntry,
} from 'mn-amm-api/dist/api/src/amm/local-registry.js';

export type { LocalPoolEntry };

export interface PoolRegistryEntry {
  /** Registry key / pool name (CLI argument). */
  readonly name: string;
  /** 64-hex contract address. */
  readonly contract: string;
  /** Absent means preprod (the only network this UI talks to). */
  readonly networkId?: string;
  readonly addedAt: string;
}

export type RegistryState =
  | { readonly status: 'loading' }
  | { readonly status: 'error'; readonly message: string }
  | { readonly status: 'ok'; readonly pools: readonly PoolRegistryEntry[] };

/** Selectable pools: preprod entries (missing networkId is treated as preprod). */
export function isSupportedPool(entry: PoolRegistryEntry): boolean {
  return entry.networkId === undefined || entry.networkId === 'preprod';
}

export async function fetchPoolRegistry(): Promise<PoolRegistryEntry[]> {
  const response = await fetch('/pools.json', { cache: 'no-store' });
  if (!response.ok) throw new Error(`pools.json unavailable (HTTP ${response.status})`);
  const parsed: unknown = await response.json();
  const pools = (parsed as { pools?: unknown } | null)?.pools;
  if (typeof pools !== 'object' || pools === null) {
    throw new Error('malformed pools.json (expected { "pools": { ... } })');
  }
  return Object.entries(pools as Record<string, unknown>).map(([name, raw]) => {
    const entry = raw as { contract?: unknown; networkId?: unknown; addedAt?: unknown } | null;
    if (!entry || typeof entry.contract !== 'string') {
      throw new Error(`malformed pool entry "${name}" (missing contract)`);
    }
    return {
      name,
      contract: entry.contract,
      networkId: typeof entry.networkId === 'string' ? entry.networkId : undefined,
      addedAt: typeof entry.addedAt === 'string' ? entry.addedAt : '',
    };
  });
}

// ── browser-local pools (localStorage; validation lives in the api workspace) ─

/** Load browser-registered pools; storage failures (private mode, quota) read as empty. */
export function loadLocalPools(): LocalPoolEntry[] {
  try {
    return loadStoredPools(window.localStorage);
  } catch {
    return [];
  }
}

/** Persist browser-registered pools; returns false when storage is unavailable. */
export function saveLocalPools(entries: readonly LocalPoolEntry[]): boolean {
  try {
    saveStoredPools(window.localStorage, entries);
    return true;
  } catch {
    return false;
  }
}

/** Validate + append (throws readable errors on name/contract collisions). */
export function addLocalPool(
  local: readonly LocalPoolEntry[],
  base: readonly PoolRegistryEntry[],
  name: string,
  contract: string,
): LocalPoolEntry[] {
  return addLocalEntry(local, base, name, contract);
}

/** Drop a browser-registered pool (throws when unknown). */
export function removeLocalPool(local: readonly LocalPoolEntry[], name: string): LocalPoolEntry[] {
  return removeLocalEntry(local, name);
}

/** Merged display list: pools.json entries first, then browser-local ones. */
export function mergePools(base: readonly PoolRegistryEntry[], local: readonly LocalPoolEntry[]): PoolRegistryEntry[] {
  return mergePoolLists(base, local);
}
