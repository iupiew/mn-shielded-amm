/**
 * Named pool registry for the contract-per-pool model (M5 option A).
 *
 * A "pool" is one deployed pool contract instance; its token colors are
 * derived from that contract's address, so separate deployments are fully
 * isolated (distinct A/B/LP colors, independent reserves, independent pause).
 * This module is the shared config layer: the CLI reads/writes the registry
 * file, and any frontend can reuse the same load/save/resolve helpers.
 *
 * File location: `AMM_POOLS_FILE` env var, else `<cwd>/pools.json`.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CONTRACT_RE, POOL_NAME_RE, validateContract, validatePoolName } from './registry-schema.js';

export interface PoolRegistryEntry {
  /** 64-hex contract address. */
  readonly contract: string;
  /** Midnight network id the pool was deployed on (informational). */
  readonly networkId?: string;
  /** ISO timestamp of registration. */
  readonly addedAt: string;
}

export interface PoolRegistryFile {
  readonly pools: Record<string, PoolRegistryEntry>;
}

/** Registry file path: `AMM_POOLS_FILE` or `<cwd>/pools.json`. */
export function registryPath(): string {
  return process.env.AMM_POOLS_FILE ?? resolve(process.cwd(), 'pools.json');
}

/** Load the registry; a missing file reads as empty. Malformed content throws. */
export function loadRegistry(path: string = registryPath()): PoolRegistryFile {
  if (!existsSync(path)) return { pools: {} };
  const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));
  const file = parsed as PoolRegistryFile;
  if (typeof file !== 'object' || file === null || typeof file.pools !== 'object' || file.pools === null) {
    throw new Error(`malformed pool registry (expected { "pools": { ... } }): ${path}`);
  }
  for (const [name, entry] of Object.entries(file.pools)) {
    if (!POOL_NAME_RE.test(name)) throw new Error(`invalid pool name in registry: "${name}"`);
    if (!entry || typeof entry.contract !== 'string' || !CONTRACT_RE.test(entry.contract)) {
      throw new Error(`invalid contract for pool "${name}" in registry: ${path}`);
    }
  }
  return { pools: { ...file.pools } };
}

function saveRegistry(file: PoolRegistryFile, path: string): void {
  writeFileSync(path, `${JSON.stringify(file, null, 2)}\n`, 'utf8');
}

/** Register (or overwrite) a named pool. Validates name and address. */
export function addPool(
  name: string,
  contract: string,
  options: { networkId?: string; path?: string } = {},
): PoolRegistryEntry {
  validatePoolName(name);
  validateContract(contract);
  const path = options.path ?? registryPath();
  const file = loadRegistry(path);
  const entry: PoolRegistryEntry = {
    contract: contract.toLowerCase(),
    ...(options.networkId ? { networkId: options.networkId } : {}),
    addedAt: new Date().toISOString(),
  };
  saveRegistry({ pools: { ...file.pools, [name]: entry } }, path);
  return entry;
}

/** Remove a named pool. Returns true if it existed. */
export function removePool(name: string, path: string = registryPath()): boolean {
  const file = loadRegistry(path);
  if (!(name in file.pools)) return false;
  const pools = { ...file.pools };
  delete pools[name];
  saveRegistry({ pools }, path);
  return true;
}

/** Look up a pool by name; throws a readable error when unknown. */
export function resolvePool(name: string, path: string = registryPath()): PoolRegistryEntry {
  const entry = loadRegistry(path).pools[name];
  if (!entry) {
    const known = Object.keys(loadRegistry(path).pools);
    throw new Error(
      `unknown pool "${name}" (registered: ${known.length ? known.join(', ') : 'none'}; file: ${path})`,
    );
  }
  return entry;
}
