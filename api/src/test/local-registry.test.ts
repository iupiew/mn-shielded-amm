import { describe, expect, it } from 'vitest';
import {
  addLocalPool,
  loadLocalPools,
  LOCAL_POOLS_STORAGE_KEY,
  mergePools,
  parseLocalPools,
  removeLocalPool,
  saveLocalPools,
  serializeLocalPools,
  type LocalPoolEntry,
  type LocalPoolStorage,
  type PoolLike,
} from '../amm/local-registry.js';
import { validateContract, validatePoolName } from '../amm/registry-schema.js';

function memoryStorage(initial: Record<string, string> = {}): LocalPoolStorage & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

const CONTRACT = '2f557cf5ff4bb0220abd42669bf63ad73ca5e00bffdf5d5e41acd2a5a1634712';
const OTHER = '9264c59e85cb1df87c1af282ed8421adeba2ac251feb891e53918c262996e769';

const base: PoolLike[] = [{ name: 'main', contract: OTHER, addedAt: '2026-10-09T00:00:00.000Z' }];

describe('registry-schema', () => {
  it('accepts valid names/contracts and rejects invalid ones', () => {
    expect(() => validatePoolName('preprod-open')).not.toThrow();
    expect(() => validatePoolName('a')).not.toThrow();
    expect(() => validatePoolName('')).toThrow(/invalid pool name/);
    expect(() => validatePoolName('My Pool')).toThrow(/invalid pool name/);
    expect(() => validatePoolName('-leading')).toThrow(/invalid pool name/);
    expect(() => validatePoolName('x'.repeat(33))).toThrow(/invalid pool name/);
    expect(() => validateContract(CONTRACT)).not.toThrow();
    expect(() => validateContract(CONTRACT.toUpperCase())).not.toThrow();
    expect(() => validateContract('zz'.repeat(32))).toThrow(/64 hex/);
    expect(() => validateContract(CONTRACT.slice(0, 63))).toThrow(/64 hex/);
  });
});

describe('parseLocalPools', () => {
  it('reads missing/garbage/non-array content as empty', () => {
    expect(parseLocalPools(null)).toEqual([]);
    expect(parseLocalPools('not json')).toEqual([]);
    expect(parseLocalPools('{"pools":{}}')).toEqual([]);
  });

  it('skips malformed entries, lowercases contracts, dedupes by name', () => {
    const raw = JSON.stringify([
      { name: 'ok', contract: CONTRACT.toUpperCase(), addedAt: '2026-10-10T00:00:00.000Z' },
      { name: 'ok', contract: OTHER },
      { contract: OTHER },
      { name: 42, contract: OTHER },
      null,
    ]);
    expect(parseLocalPools(raw)).toEqual([
      { name: 'ok', contract: CONTRACT, addedAt: '2026-10-10T00:00:00.000Z' },
    ]);
  });
});

describe('addLocalPool / removeLocalPool / mergePools', () => {
  it('adds a validated, lowercased entry', () => {
    const next = addLocalPool([], base, 'mine', CONTRACT.toUpperCase());
    expect(next).toHaveLength(1);
    expect(next[0].name).toBe('mine');
    expect(next[0].contract).toBe(CONTRACT);
    expect(next[0].addedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('rejects invalid name and contract', () => {
    expect(() => addLocalPool([], base, 'Bad Name', CONTRACT)).toThrow(/invalid pool name/);
    expect(() => addLocalPool([], base, 'mine', 'nope')).toThrow(/64 hex/);
  });

  it('rejects a name that already exists in base or local', () => {
    expect(() => addLocalPool([], base, 'main', CONTRACT)).toThrow(/already exists/);
    const local: LocalPoolEntry[] = [{ name: 'mine', contract: CONTRACT, addedAt: '' }];
    expect(() => addLocalPool(local, base, 'mine', OTHER)).toThrow(/already exists/);
  });

  it('rejects a contract already registered (any casing)', () => {
    expect(() => addLocalPool([], base, 'mine', OTHER.toUpperCase())).toThrow(/already registered as "main"/);
    const local: LocalPoolEntry[] = [{ name: 'mine', contract: CONTRACT, addedAt: '' }];
    expect(() => addLocalPool(local, base, 'second', CONTRACT)).toThrow(/already registered as "mine"/);
  });

  it('removes a local pool and throws for unknown names', () => {
    const local = addLocalPool([], base, 'mine', CONTRACT);
    expect(removeLocalPool(local, 'mine')).toEqual([]);
    expect(() => removeLocalPool(local, 'main')).toThrow(/unknown browser-registered/);
  });

  it('merges base first, then local; base entries are copied, not aliased', () => {
    const local = addLocalPool([], base, 'mine', CONTRACT);
    const merged = mergePools(base, local);
    expect(merged.map((p) => p.name)).toEqual(['main', 'mine']);
    expect(merged[0]).not.toBe(base[0]);
  });
});

describe('storage round-trip', () => {
  it('saves and loads through a Storage-compatible slot', () => {
    const storage = memoryStorage();
    const local = addLocalPool([], base, 'mine', CONTRACT);
    saveLocalPools(storage, local);
    expect(storage.data.get(LOCAL_POOLS_STORAGE_KEY)).toBe(serializeLocalPools(local));
    expect(loadLocalPools(storage)).toEqual(local);
  });

  it('reads a missing key as empty and survives a throwing getItem', () => {
    expect(loadLocalPools(memoryStorage())).toEqual([]);
    const hostile: LocalPoolStorage = {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {},
      removeItem: () => {},
    };
    expect(loadLocalPools(hostile)).toEqual([]);
  });
});
