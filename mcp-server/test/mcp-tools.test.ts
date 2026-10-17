import { describe, expect, it, vi } from 'vitest';
import { resolve } from 'node:path';
import { AmmError } from 'mn-amm-api/dist/api/src/amm/types.js';
import { policyStatus } from 'mn-amm-api/dist/api/src/policy/file-guard.js';
import { callTool, createMcpServer, type AuditLine, type Connected, type McpDeps } from '../src/server.ts';

const CONTRACT = 'f'.repeat(64);

function fakeApi(overrides: Record<string, unknown> = {}) {
  return {
    poolState: vi.fn(async () => ({
      reserveA: 1_000_000n,
      reserveB: 990_129n,
      seeded: true,
      colorAHex: 'a'.repeat(64),
      colorBHex: 'b'.repeat(64),
      colorLpHex: 'c'.repeat(64),
      lpSupply: 995_062n,
    })),
    isPaused: vi.fn(async () => false),
    balance: vi.fn(async () => ({
      coinA: [{ value: 1_000_000n }],
      coinB: [{ value: 500n }],
      totalA: 1_000_000n,
      totalB: 500n,
      lpCoins: [{ value: 42n }],
      totalLp: 42n,
      otherCoins: [],
    })),
    quote: vi.fn(async () => ({
      side: 'AtoB',
      amountIn: 100n,
      reserveIn: 1_000_000n,
      reserveOut: 990_129n,
      amountOut: 98n,
      minAmountOut: 98n,
    })),
    quoteAddLiquidity: vi.fn(async () => ({
      amountA: 100n,
      amountB: 99n,
      reserveA: 1_000_000n,
      reserveB: 990_129n,
      lpSupply: 995_062n,
      lpOut: 99n,
      minLpOut: 99n,
    })),
    quoteRemoveLiquidity: vi.fn(async () => ({
      lpAmount: 10n,
      reserveA: 1_000_000n,
      reserveB: 990_129n,
      lpSupply: 995_062n,
      aOut: 10n,
      bOut: 10n,
      minA: 10n,
      minB: 10n,
    })),
    swap: vi.fn(async () => ({ txId: '00dead', quote: {} })),
    addLiquidity: vi.fn(async () => ({ txId: '00beef', quote: {} })),
    removeLiquidity: vi.fn(async () => ({ txId: '00cafe', quote: {} })),
    faucet: vi.fn(async () => [{}, {}]),
    ...overrides,
  };
}

function setup(overrides: Partial<McpDeps> = {}, apiOverrides: Record<string, unknown> = {}) {
  const api = fakeApi(apiOverrides);
  const audit: AuditLine[] = [];
  const closed: boolean[] = [];
  const deps: McpDeps = {
    connect: vi.fn(async (): Promise<Connected> => ({ api: api as any, contractAddress: CONTRACT, close: () => closed.push(true) })),
    audit: (line) => audit.push(line),
    ...overrides,
  };
  const { tools } = createMcpServer(deps);
  return { tools, api, audit, closed, deps };
}

describe('tool surface', () => {
  it('exposes exactly the eight agent-safe tools (no owner operations)', async () => {
    const { tools } = setup();
    expect(Object.keys(tools).sort()).toEqual([
      'amm_add_liquidity',
      'amm_balance',
      'amm_faucet',
      'amm_policy_status',
      'amm_pool_state',
      'amm_quote',
      'amm_remove_liquidity',
      'amm_swap',
    ]);
    for (const ownerTool of ['amm_deploy', 'amm_seed', 'amm_pause', 'amm_unpause', 'deploy', 'seed', 'pause', 'unpause']) {
      expect(tools[ownerTool]).toBeUndefined();
    }
  });
});

describe('amm_pool_state / amm_balance / amm_quote (reads)', () => {
  it('returns pool state with the resolved contract, bigints as decimal strings', async () => {
    const { tools } = setup();
    const { ok, payload } = await callTool(tools, 'amm_pool_state', {});
    expect(ok).toBe(true);
    expect(payload.contract).toBe(CONTRACT);
    expect(payload.reserveA).toBe('1000000');
    expect(payload.lpSupply).toBe('995062');
    expect(payload.paused).toBe(false);
  });

  it('quotes a swap without touching mutators', async () => {
    const { tools, api } = setup();
    const { ok, payload } = await callTool(tools, 'amm_quote', { side: 'AtoB', amountIn: '100' });
    expect(ok).toBe(true);
    expect(payload.amountOut).toBe('98');
    expect(api.swap).not.toHaveBeenCalled();
  });

  it('rejects bad sides and negative amounts with USAGE', async () => {
    const { tools } = setup();
    const badSide = await callTool(tools, 'amm_quote', { side: 'Sideways', amountIn: '10' });
    expect(badSide.ok).toBe(false);
    expect(badSide.payload.error.code).toBe('USAGE');
    const badAmount = await callTool(tools, 'amm_quote', { side: 'AtoB', amountIn: '-5' });
    expect(badAmount.ok).toBe(false);
    expect(badAmount.payload.error.code).toBe('USAGE');
  });
});

describe('write tools (dry-run default)', () => {
  it('amm_swap previews without executing and reports spendable coins', async () => {
    const { tools, api, closed } = setup();
    const { ok, payload } = await callTool(tools, 'amm_swap', { side: 'AtoB', amountIn: '100' });
    expect(ok).toBe(true);
    expect(payload.dryRun).toBe(true);
    expect(payload.spendableCoinAvailable).toBe(true);
    expect(payload.availableValues).toEqual(['1000000']);
    expect(payload.quote.amountOut).toBe('98');
    expect(api.swap).not.toHaveBeenCalled();
    expect(api.quote).toHaveBeenCalledTimes(1);
    expect(closed).toEqual([true]);
  });

  it('amm_swap execute:true calls api.swap exactly once', async () => {
    const { tools, api } = setup();
    const { ok, payload } = await callTool(tools, 'amm_swap', { side: 'AtoB', amountIn: '100', execute: true });
    expect(ok).toBe(true);
    expect(api.swap).toHaveBeenCalledTimes(1);
    expect(payload.txId).toBe('00dead');
  });

  it('amm_add_liquidity dry-run never executes; execute:true does', async () => {
    const { tools, api } = setup();
    const dry = await callTool(tools, 'amm_add_liquidity', { amountA: '100', amountB: '600' });
    expect(dry.ok).toBe(true);
    expect(dry.payload.dryRun).toBe(true);
    expect(dry.payload.spendableCoinAvailable).toEqual({ amountA: true, amountB: false });
    expect(api.addLiquidity).not.toHaveBeenCalled();

    const exec = await callTool(tools, 'amm_add_liquidity', { amountA: '100', amountB: '99', execute: true });
    expect(exec.ok).toBe(true);
    expect(api.addLiquidity).toHaveBeenCalledTimes(1);
    expect(exec.payload.txId).toBe('00beef');
  });

  it('amm_remove_liquidity dry-run checks LP coins; execute:true submits', async () => {
    const { tools, api } = setup();
    const dry = await callTool(tools, 'amm_remove_liquidity', { lpAmount: '10' });
    expect(dry.ok).toBe(true);
    expect(dry.payload.spendableCoinAvailable).toBe(true);
    expect(api.removeLiquidity).not.toHaveBeenCalled();

    const exec = await callTool(tools, 'amm_remove_liquidity', { lpAmount: '10', execute: true });
    expect(exec.ok).toBe(true);
    expect(api.removeLiquidity).toHaveBeenCalledTimes(1);
    expect(exec.payload.txId).toBe('00cafe');
  });

  it('amm_faucet dry-run previews the default mint amounts', async () => {
    const { tools, api } = setup();
    const dry = await callTool(tools, 'amm_faucet', {});
    expect(dry.ok).toBe(true);
    expect(dry.payload.wouldMint).toEqual({ amountA: '1000000', amountB: '1000000' });
    expect(api.faucet).not.toHaveBeenCalled();

    const exec = await callTool(tools, 'amm_faucet', { amountA: '5', execute: true });
    expect(exec.ok).toBe(true);
    expect(api.faucet).toHaveBeenCalledWith({ amountA: 5n, amountB: 1000000n });
    expect(exec.payload.minted).toEqual({ amountA: '5', amountB: '1000000' });
  });
});

describe('failures', () => {
  it('surfaces POLICY_DENIED from the guard as isError with the code', async () => {
    const { tools } = setup({
      connect: async () => ({
        api: fakeApi({
          swap: vi.fn(async () => {
            throw new AmmError('POLICY_DENIED', 'policy cap: swap amountIn 999 exceeds cap 100');
          }),
        }) as any,
        contractAddress: CONTRACT,
        close: () => {},
      }),
    });
    const { ok, payload } = await callTool(tools, 'amm_swap', { side: 'AtoB', amountIn: '999', execute: true });
    expect(ok).toBe(false);
    expect(payload.error.code).toBe('POLICY_DENIED');
    expect(payload.error.message).toContain('policy cap');
  });

  it('reports USAGE when no pool/contract is resolvable on localnet', async () => {
    const saved = process.env.AMM_CONTRACT;
    const savedNetwork = process.env.AMM_NETWORK_ID;
    delete process.env.AMM_CONTRACT;
    delete process.env.AMM_NETWORK_ID;
    try {
      // Real default connect: resolution fails before any connection attempt.
      const { tools } = createMcpServer({});
      const { ok, payload } = await callTool(tools, 'amm_pool_state', {});
      expect(ok).toBe(false);
      expect(payload.error.code).toBe('USAGE');
      expect(payload.error.message).toContain('AMM_CONTRACT');
    } finally {
      if (saved !== undefined) process.env.AMM_CONTRACT = saved;
      if (savedNetwork !== undefined) process.env.AMM_NETWORK_ID = savedNetwork;
    }
  });

  it('never throws out of a handler: unexpected errors become INTERNAL', async () => {
    const { tools } = setup({
      connect: async () => {
        throw new Error('serve down');
      },
    });
    const { ok, payload } = await callTool(tools, 'amm_balance', { contract: CONTRACT });
    expect(ok).toBe(false);
    expect(payload.error.code).toBe('INTERNAL');
    expect(payload.error.message).toContain('serve down');
  });
});

describe('audit', () => {
  it('writes one line per call with ok/code/duration', async () => {
    const { tools, audit } = setup();
    await callTool(tools, 'amm_pool_state', {});
    await callTool(tools, 'amm_quote', { side: 'Sideways', amountIn: '1' });
    expect(audit).toHaveLength(2);
    expect(audit[0]).toMatchObject({ tool: 'amm_pool_state', ok: true });
    expect(typeof audit[0].durationMs).toBe('number');
    expect(audit[1]).toMatchObject({ tool: 'amm_quote', ok: false, code: 'USAGE' });
    expect(audit[1].args).toEqual({ side: 'Sideways', amountIn: '1' });
  });
});

describe('amm_policy_status', () => {
  it('reports enforced:false without a policy file', () => {
    const status = policyStatus(resolve('/nonexistent', 'no-policy-here.json'));
    expect(status).toMatchObject({ enforced: false, halted: false, caps: {} });
  });

  it('parses the tracked example config (caps + window, decimal strings)', () => {
    const status = policyStatus(resolve(__dirname, '../../policy.example.json'));
    expect(status.enforced).toBe(true);
    expect(status.halted).toBe(false);
    expect(status.caps.swapIn).toBe('250000');
    expect(status.window).toMatchObject({ seconds: 3600, maxActions: 50 });
    expect(status.window?.maxAmount?.swap).toBe('2500000');
    expect(status.statePath).toContain('policy-state.json');
  });

  it('serves the status through the tool (no connection needed)', async () => {
    const { tools, deps } = setup({ policyStatus: () => policyStatus(resolve('/nonexistent', 'x.json')) });
    expect(deps.connect).not.toHaveBeenCalled();
    const { ok, payload } = await callTool(tools, 'amm_policy_status', {});
    expect(ok).toBe(true);
    expect(payload.enforced).toBe(false);
  });
});
