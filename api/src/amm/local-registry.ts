/**
 * Browser-local pool registry — pools the user registers from the dashboard,
 * persisted in a Storage-compatible slot (localStorage) instead of the repo's
 * `pools.json` (which the build copies into the UI; a browser cannot write
 * files). Merges with the build-time registry for display; names stay unique
 * across both so the merged view never shadows or collides.
 *
 * Pure logic: the caller owns the storage handle and the UI rendering.
 * @module
 */

import { validateContract, validatePoolName } from './registry-schema.js';

/** localStorage key holding the browser-local pool list. */
export const LOCAL_POOLS_STORAGE_KEY = 'mn-amm:custom-pools';

/** One browser-registered pool. */
export interface LocalPoolEntry {
  /** Registry key / pool name (`POOL_NAME_RE`). */
  readonly name: string;
  /** 64-hex contract address, lowercased. */
  readonly contract: string;
  /** ISO timestamp of registration. */
  readonly addedAt: string;
}

/** Minimal Storage surface (window.localStorage, test doubles). */
export interface LocalPoolStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Structural shape of a registry entry in the merged view. */
export interface PoolLike {
  readonly name: string;
  readonly contract: string;
  /** Absent means preprod (the only network the UI talks to). */
  readonly networkId?: string;
  readonly addedAt: string;
}

/**
 * Parse a stored JSON array. Tolerant by design: missing, non-JSON or
 * non-array content reads as empty, and malformed entries are skipped —
 * corrupted storage must never brick the Pools tab.
 */
export function parseLocalPools(raw: string | null): LocalPoolEntry[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const entries: LocalPoolEntry[] = [];
  const seen = new Set<string>();
  for (const item of parsed) {
    const entry = item as { name?: unknown; contract?: unknown; addedAt?: unknown } | null;
    if (!entry || typeof entry.name !== 'string' || typeof entry.contract !== 'string') continue;
    if (seen.has(entry.name)) continue;
    seen.add(entry.name);
    entries.push({
      name: entry.name,
      contract: entry.contract.toLowerCase(),
      addedAt: typeof entry.addedAt === 'string' ? entry.addedAt : '',
    });
  }
  return entries;
}

export function serializeLocalPools(entries: readonly LocalPoolEntry[]): string {
  return JSON.stringify(entries);
}

/** Read the local list from storage; any storage failure reads as empty. */
export function loadLocalPools(storage: LocalPoolStorage, key: string = LOCAL_POOLS_STORAGE_KEY): LocalPoolEntry[] {
  try {
    return parseLocalPools(storage.getItem(key));
  } catch {
    return [];
  }
}

/** Persist the local list; throws when storage is full/unavailable. */
export function saveLocalPools(
  storage: LocalPoolStorage,
  entries: readonly LocalPoolEntry[],
  key: string = LOCAL_POOLS_STORAGE_KEY,
): void {
  storage.setItem(key, serializeLocalPools(entries));
}

/**
 * Validate and append a pool. Rejects collisions against BOTH the base
 * registry (pools.json) and the local list: name and contract must each be
 * unique across the merged view. Returns the new local list.
 */
export function addLocalPool(
  local: readonly LocalPoolEntry[],
  base: readonly PoolLike[],
  name: string,
  contract: string,
): LocalPoolEntry[] {
  validatePoolName(name);
  validateContract(contract);
  const normalized = contract.toLowerCase();
  if (base.some((pool) => pool.name === name) || local.some((pool) => pool.name === name)) {
    throw new Error(`pool name "${name}" already exists`);
  }
  const clash = [...base, ...local].find((pool) => pool.contract.toLowerCase() === normalized);
  if (clash) throw new Error(`contract already registered as "${clash.name}"`);
  return [...local, { name, contract: normalized, addedAt: new Date().toISOString() }];
}

/** Drop a browser-registered pool. Throws when the name is not a local pool. */
export function removeLocalPool(local: readonly LocalPoolEntry[], name: string): LocalPoolEntry[] {
  const next = local.filter((pool) => pool.name !== name);
  if (next.length === local.length) throw new Error(`unknown browser-registered pool "${name}"`);
  return next;
}

/** Merged display list: base (pools.json) first, then browser-local pools. */
export function mergePools(base: readonly PoolLike[], local: readonly LocalPoolEntry[]): PoolLike[] {
  return [...base.map((pool) => ({ ...pool })), ...local];
}
