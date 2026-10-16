import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AmmError } from '../amm/types.js';
import {
  type WindowEntry,
  PERMISSIVE_POLICY,
  actionSize,
  checkPolicy,
  createPolicyGuard,
  parsePolicyConfig,
  pruneWindow,
} from '../policy/index.js';
import { createFilePolicyGuard, loadPolicyConfig, policyConfigPath, policyStatePath } from '../policy/file-guard.js';

const COLOR_A = 'aa'.repeat(32);
const COLOR_B = 'bb'.repeat(32);
const COLOR_X = 'cc'.repeat(32);

const NOW = 1_700_000_000_000;

function expectDenied(fn: () => void, includes: string): void {
  try {
    fn();
    throw new Error('expected POLICY_DENIED');
  } catch (error) {
    expect(error).toBeInstanceOf(AmmError);
    expect((error as AmmError).code).toBe('POLICY_DENIED');
    expect((error as Error).message).toContain(includes);
  }
}

describe('checkPolicy', () => {
  it('permissive default allows everything', () => {
    checkPolicy(PERMISSIVE_POLICY, [], 'swap', { amountIn: 10n ** 18n }, [COLOR_A], NOW);
    checkPolicy(PERMISSIVE_POLICY, [], 'faucet', { amountA: 10n ** 18n, amountB: 10n ** 18n }, [], NOW);
  });

  it('halt blocks every action', () => {
    const config = { ...PERMISSIVE_POLICY, halted: true };
    expectDenied(() => checkPolicy(config, [], 'swap', { amountIn: 1n }, [], NOW), 'policy halted');
    expectDenied(() => checkPolicy(config, [], 'faucet', { amountA: 1n }, [], NOW), 'policy halted');
  });

  it('per-tx caps reject over-cap amounts and allow at-cap', () => {
    const config = parsePolicyConfig({ caps: { swapIn: '1000', faucetA: '10', faucetB: '20', addA: '5', addB: '6', removeLp: '7' } });
    expectDenied(() => checkPolicy(config, [], 'swap', { amountIn: 1001n }, [], NOW), 'swap amountIn 1001 exceeds cap 1000');
    checkPolicy(config, [], 'swap', { amountIn: 1000n }, [], NOW);
    expectDenied(() => checkPolicy(config, [], 'faucet', { amountA: 11n, amountB: 1n }, [], NOW), 'faucet amountA');
    expectDenied(() => checkPolicy(config, [], 'faucet', { amountA: 1n, amountB: 21n }, [], NOW), 'faucet amountB');
    expectDenied(() => checkPolicy(config, [], 'addLiquidity', { amountA: 6n, amountB: 1n }, [], NOW), 'addLiquidity amountA');
    expectDenied(() => checkPolicy(config, [], 'addLiquidity', { amountA: 1n, amountB: 7n }, [], NOW), 'addLiquidity amountB');
    expectDenied(() => checkPolicy(config, [], 'removeLiquidity', { lpAmount: 8n }, [], NOW), 'removeLiquidity lpAmount');
  });

  it('color allowlist restricts spendable colors (case-insensitive)', () => {
    const config = parsePolicyConfig({ allowedColors: [COLOR_A.toUpperCase(), COLOR_B] });
    checkPolicy(config, [], 'swap', { amountIn: 1n }, [COLOR_A], NOW);
    checkPolicy(config, [], 'addLiquidity', { amountA: 1n, amountB: 1n }, [COLOR_A, COLOR_B], NOW);
    expectDenied(() => checkPolicy(config, [], 'swap', { amountIn: 1n }, [COLOR_X], NOW), 'not allowed');
    expectDenied(() => checkPolicy(config, [], 'addLiquidity', { amountA: 1n, amountB: 1n }, [COLOR_A, COLOR_X], NOW), 'not allowed');
  });

  it('rolling window enforces action count and prunes expired entries', () => {
    const config = parsePolicyConfig({ windowSeconds: 60, maxWindowActions: 2 });
    const old: WindowEntry = { t: NOW - 120_000, action: 'swap', amount: 1n };
    const recent: WindowEntry = { t: NOW - 30_000, action: 'swap', amount: 1n };
    checkPolicy(config, [old, recent], 'swap', { amountIn: 1n }, [], NOW); // old pruned → 1 active < 2
    expectDenied(() => checkPolicy(config, [old, recent, { t: NOW - 10_000, action: 'faucet', amount: 1n }], 'swap', { amountIn: 1n }, [], NOW), 'already recorded');
  });

  it('rolling window enforces per-action amount sums', () => {
    const config = parsePolicyConfig({ windowSeconds: 60, maxWindowAmount: { swap: '100' } });
    const entries: WindowEntry[] = [{ t: NOW - 10_000, action: 'swap', amount: 60n }];
    checkPolicy(config, entries, 'swap', { amountIn: 40n }, [], NOW); // 60 + 40 = 100 at cap
    expectDenied(() => checkPolicy(config, entries, 'swap', { amountIn: 41n }, [], NOW), 'over the cap 100');
    checkPolicy(config, entries, 'faucet', { amountA: 10n ** 9n }, [], NOW); // other action unaffected
  });
});

describe('actionSize', () => {
  it('sums the primary size per action', () => {
    expect(actionSize('swap', { amountIn: 5n })).toBe(5n);
    expect(actionSize('faucet', { amountA: 2n, amountB: 3n })).toBe(5n);
    expect(actionSize('addLiquidity', { amountA: 7n, amountB: 8n })).toBe(15n);
    expect(actionSize('removeLiquidity', { lpAmount: 9n })).toBe(9n);
  });
});

describe('parsePolicyConfig', () => {
  it('rejects malformed values', () => {
    expect(() => parsePolicyConfig('nope')).toThrow(/must be a JSON object/);
    expect(() => parsePolicyConfig({ caps: { swapIn: '12.5' } })).toThrow(/decimal string/);
    expect(() => parsePolicyConfig({ allowedColors: ['short'] })).toThrow(/64-hex/);
    expect(() => parsePolicyConfig({ maxWindowAmount: { pause: '1' } })).toThrow(/unknown action/);
    expect(() => parsePolicyConfig({ windowSeconds: 0 })).toThrow(/positive integer/);
  });
});

describe('createPolicyGuard (in-memory persistence)', () => {
  it('check → record → window denial roundtrip', async () => {
    const config = parsePolicyConfig({ windowSeconds: 3600, maxWindowActions: 1 });
    const store: WindowEntry[] = [];
    const guard = createPolicyGuard(config, async () => store, async (entries) => void store.push(...entries));
    await guard.check('swap', { amountIn: 10n }, [COLOR_A]);
    await guard.record('swap', 10n);
    await expect(guard.check('swap', { amountIn: 10n }, [COLOR_A])).rejects.toMatchObject({ code: 'POLICY_DENIED' });
    expect(store).toHaveLength(1);
  });

  it('record is a no-op without a window', async () => {
    const store: WindowEntry[] = [];
    const guard = createPolicyGuard(PERMISSIVE_POLICY, async () => store, async (entries) => void store.push(...entries));
    await guard.record('swap', 10n);
    expect(store).toHaveLength(0);
  });
});

describe('file guard', () => {
  let dir: string;
  let configPath: string;
  let savedEnv: Record<string, string | undefined>;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'mn-policy-'));
    configPath = join(dir, 'policy.json');
    savedEnv = {
      AMM_POLICY_FILE: process.env.AMM_POLICY_FILE,
      AMM_POLICY_STATE: process.env.AMM_POLICY_STATE,
      AMM_POLICY_HALT: process.env.AMM_POLICY_HALT,
    };
  });

  afterEach(() => {
    for (const [key, value] of Object.entries(savedEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    rmSync(dir, { recursive: true, force: true });
  });

  it('returns undefined without a config file (permissive)', () => {
    expect(createFilePolicyGuard(join(dir, 'missing.json'))).toBeUndefined();
  });

  it('persists window entries atomically and denies at the action cap', async () => {
    const statePath = join(dir, 'state.json');
    writeFileSync(configPath, JSON.stringify({ windowSeconds: 3600, maxWindowActions: 1, statePath }));
    const guard = createFilePolicyGuard(configPath)!;
    await guard.check('swap', { amountIn: 10n });
    await guard.record('swap', 10n);
    const raw = JSON.parse(readFileSync(statePath, 'utf8')) as { entries: { amount: string }[] };
    expect(raw.entries).toHaveLength(1);
    expect(raw.entries[0].amount).toBe('10');
    expect(existsSync(`${statePath}.tmp-${process.pid}`)).toBe(false);
    await expect(guard.check('swap', { amountIn: 10n })).rejects.toMatchObject({ code: 'POLICY_DENIED' });
  });

  it('AMM_POLICY_HALT=1 forces halted without editing the file', () => {
    writeFileSync(configPath, JSON.stringify({ caps: { swapIn: '1000000' } }));
    process.env.AMM_POLICY_HALT = '1';
    const config = loadPolicyConfig(configPath)!;
    expect(config.halted).toBe(true);
    expect(config.caps.swapIn).toBe(1000000n);
  });

  it('treats a corrupt state file as empty (caps still enforced)', async () => {
    const statePath = join(dir, 'state.json');
    writeFileSync(configPath, JSON.stringify({ caps: { swapIn: '100' }, windowSeconds: 3600, statePath }));
    writeFileSync(statePath, 'not json');
    const guard = createFilePolicyGuard(configPath)!;
    await expect(guard.check('swap', { amountIn: 101n })).rejects.toMatchObject({ code: 'POLICY_DENIED' });
    await guard.check('swap', { amountIn: 100n });
    await guard.record('swap', 50n);
    const raw = JSON.parse(readFileSync(statePath, 'utf8')) as { entries: unknown[] };
    expect(raw.entries).toHaveLength(1); // rewrite replaced the corrupt content
  });

  it('policyConfigPath/policyStatePath honor env defaults', () => {
    delete process.env.AMM_POLICY_FILE;
    delete process.env.AMM_POLICY_STATE;
    expect(policyConfigPath()).toMatch(/policy\.json$/);
    expect(policyStatePath(PERMISSIVE_POLICY)).toMatch(/policy-state\.json$/);
    process.env.AMM_POLICY_FILE = '/tmp/custom-policy.json';
    expect(policyConfigPath()).toBe('/tmp/custom-policy.json');
  });
});

describe('pruneWindow', () => {
  it('keeps everything when no window is configured', () => {
    const entries: WindowEntry[] = [{ t: 0, action: 'swap', amount: 1n }];
    expect(pruneWindow(entries, undefined, NOW)).toEqual(entries);
  });
});
