/**
 * Pure validation schema for pool registry entries — shared by the
 * filesystem registry (`registry.ts`, node-only) and the browser-local
 * registry (`local-registry.ts`, storage-backed). No I/O, no node builtins,
 * safe for browser bundles.
 * @module
 */

/** Pool names: lowercase, digits, `-`/`_`, 1–32 chars. */
export const POOL_NAME_RE = /^[a-z0-9][a-z0-9_-]{0,31}$/;
/** Contract addresses: exactly 64 hex chars. */
export const CONTRACT_RE = /^[0-9a-fA-F]{64}$/;

/** Throws a readable error when the pool name is invalid. */
export function validatePoolName(name: string): void {
  if (!POOL_NAME_RE.test(name)) {
    throw new Error(`invalid pool name "${name}" (want: [a-z0-9][a-z0-9_-]{0,31})`);
  }
}

/** Throws a readable error when the contract address is not 64 hex chars. */
export function validateContract(contract: string): void {
  if (!CONTRACT_RE.test(contract)) throw new Error(`pool contract must be 64 hex chars, got: ${contract}`);
}
