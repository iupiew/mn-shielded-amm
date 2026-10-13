import { describe, expect, it } from 'vitest';
import { createPersistentVault, type VaultStorage } from '../amm/vault.js';
import type { WalletCoin } from '../amm/types.js';

function memoryStorage(initial: Record<string, string> = {}): VaultStorage & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

const coin: WalletCoin = { nonceHex: 'aa'.repeat(32), colorHex: 'bb'.repeat(32), value: 1_000_000n };
const coin2: WalletCoin = { nonceHex: 'cc'.repeat(32), colorHex: 'bb'.repeat(32), value: 250_000n };

describe('createPersistentVault', () => {
  it('hydrates recorded coins from storage (bigint round-trip)', () => {
    const storage = memoryStorage();
    const vault = createPersistentVault('k', storage);
    vault.record(coin, coin2);
    vault.consume(coin2);

    const reloaded = createPersistentVault('k', storage);
    const list = reloaded.list();
    expect(list).toHaveLength(1);
    expect(list[0]).toEqual(coin);
    expect(list[0].value).toBe(1_000_000n); // bigint, not decimal string
  });

  it('persists consume across reloads', () => {
    const storage = memoryStorage();
    const vault = createPersistentVault('k', storage);
    vault.record(coin);
    vault.consume(coin);
    expect(createPersistentVault('k', storage).list()).toEqual([]);
  });

  it('hydrates PoolCoin records (faucet output shape)', () => {
    const storage = memoryStorage();
    const vault = createPersistentVault('k', storage);
    vault.record({ nonce: new Uint8Array(32).fill(0x11), color: new Uint8Array(32).fill(0x22), value: 7n });
    const reloaded = createPersistentVault('k', storage).list();
    expect(reloaded).toEqual([{ nonceHex: '11'.repeat(32), colorHex: '22'.repeat(32), value: 7n }]);
  });

  it('clear() removes the snapshot', () => {
    const storage = memoryStorage();
    const vault = createPersistentVault('k', storage);
    vault.record(coin);
    vault.clear();
    expect(storage.getItem('k')).toBeNull();
    expect(createPersistentVault('k', storage).list()).toEqual([]);
  });

  it('corrupt snapshots degrade to an empty vault', () => {
    expect(createPersistentVault('k', memoryStorage({ k: '{not json' })).list()).toEqual([]);
    expect(
      createPersistentVault('k', memoryStorage({ k: JSON.stringify([{ nonceHex: 'aa', colorHex: 'bb', value: 'x' }]) }))
        .list(),
    ).toEqual([]);
    expect(createPersistentVault('k', memoryStorage({ k: '"not an array"' })).list()).toEqual([]);
  });

  it('keeps working when storage access fails', () => {
    const failing: VaultStorage = {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('quota');
      },
      removeItem: () => {
        throw new Error('denied');
      },
    };
    const vault = createPersistentVault('k', failing);
    expect(() => vault.record(coin)).not.toThrow();
    expect(vault.list()).toEqual([coin]);
    expect(() => vault.clear()).not.toThrow();
    expect(vault.list()).toEqual([]);
  });
});
