/**
 * mn-amm-mcp — MCP tool definitions over mn-amm-api (stdio transport lives in
 * ./main.ts).
 *
 * Surface = the *agent* role only: pool/quote/balance/policy reads plus the
 * four policy-gated writes (swap, add/remove liquidity, faucet), each
 * **dry-run by default** — set `execute: true` to submit. Owner operations
 * (deploy, seed, pause, unpause) are deliberately not exposed; the agent
 * wallet never receives them and the contract's owner witness is the guard
 * rail. The server-side policy guard rides along automatically (node wiring
 * builds it from `policy.json`; no file = permissive), so a violating write
 * fails as `{code: "POLICY_DENIED"}` before any transaction is built.
 *
 * Every tool call is audited as one JSONL line (`AMM_MCP_AUDIT_FILE`, default
 * <cwd>/mcp-audit.jsonl): `{ts, tool, args, ok, code?, durationMs}`.
 * @module
 */

import { appendFileSync } from 'node:fs';
import { McpServer, type ToolCallback } from '@modelcontextprotocol/server';
import { z } from 'zod';
import type { AmmApi } from 'mn-amm-api/dist/api/src/amm/api.js';
import { AmmError, type SwapSide } from 'mn-amm-api/dist/api/src/amm/types.js';
import { resolvePool } from 'mn-amm-api/dist/api/src/amm/registry.js';
import { policyStatus, type PolicyStatus } from 'mn-amm-api/dist/api/src/policy/file-guard.js';

export const SERVER_INFO = { name: 'mn-amm-mcp', version: '0.1.0' } as const;

/** One JSONL audit line per tool call. */
export interface AuditLine {
  ts: string;
  tool: string;
  args: unknown;
  ok: boolean;
  code?: string;
  durationMs: number;
}

/** A connected pool API plus its teardown. */
export interface Connected {
  readonly api: AmmApi;
  /** Resolved pool address actually connected (echoed in results). */
  readonly contractAddress: string;
  close(): void;
}

export interface McpDeps {
  /** Connect to the pool for one tool call (mirrors the CLI's contract resolution). Default: node/preprod wiring from env. */
  connect?(target: { pool?: string; contract?: string }): Promise<Connected>;
  /** Snapshot for `amm_policy_status`. Default: file-guard `policyStatus()`. */
  policyStatus?(): PolicyStatus;
  /** Audit sink. Default: JSONL append (best-effort; failures go to stderr). */
  audit?(line: AuditLine): void;
}

/** Non-AmmError, non-fatal failure caused by the caller's arguments. */
export class UsageError extends Error {
  readonly code = 'USAGE';
  constructor(message: string) {
    super(message);
    this.name = 'UsageError';
  }
}

const HEX64 = /^[0-9a-fA-F]{64}$/;
const DECIMAL = /^\d+$/;

/** Bigints → decimal strings, so results are stable JSON for MCP clients. */
function toJson(value: unknown): string {
  return JSON.stringify(value, (_key, raw) => (typeof raw === 'bigint' ? raw.toString() : raw), 2);
}

/** Coin values (descending) — the CLI's `availableValues` shape. */
function valuesOf(coins: readonly { value: bigint }[]): bigint[] {
  return coins.map((coin) => coin.value).sort((a, b) => (a === b ? 0 : a > b ? -1 : 1));
}

function defaultAudit(line: AuditLine): void {
  const path = process.env.AMM_MCP_AUDIT_FILE ?? 'mcp-audit.jsonl';
  try {
    appendFileSync(path, `${JSON.stringify(line)}\n`);
  } catch (cause) {
    console.error(`mn-amm-mcp: audit write to ${path} failed: ${cause instanceof Error ? cause.message : String(cause)}`);
  }
}

/** Contract resolution, same precedence as the CLI: contract > pool > AMM_CONTRACT > preprod default. */
async function resolveContract(target: { pool?: string; contract?: string }, isPreprod: boolean): Promise<string> {
  if (target.contract !== undefined) {
    if (!HEX64.test(target.contract)) throw new UsageError(`contract must be 64 hex chars, got: ${target.contract}`);
    return target.contract;
  }
  if (target.pool !== undefined) {
    try {
      return resolvePool(target.pool).contract;
    } catch (cause) {
      throw new UsageError(cause instanceof Error ? cause.message : String(cause));
    }
  }
  const fromEnv = process.env.AMM_CONTRACT;
  if (fromEnv !== undefined) {
    if (!HEX64.test(fromEnv)) throw new UsageError(`AMM_CONTRACT must be 64 hex chars, got: ${fromEnv}`);
    return fromEnv;
  }
  if (isPreprod) {
    const { DEFAULT_PREPROD_CONTRACT } = await import('mn-amm-api/dist/api/src/amm/preprod.js');
    return DEFAULT_PREPROD_CONTRACT;
  }
  throw new UsageError('missing pool argument, contract argument, or AMM_CONTRACT env (localnet has no default pool)');
}

/** Default connection: localnet via createNodeAmm, preprod via createPreprodAmm — both env-driven (AMM_SERVE_URL, AMM_WALLET, AMM_NETWORK_ID…). */
function defaultConnect(): (target: { pool?: string; contract?: string }) => Promise<Connected> {
  return async ({ pool, contract }) => {
    const networkId = process.env.AMM_NETWORK_ID ?? 'undeployed';
    const isPreprod = networkId === 'preprod';
    const address = await resolveContract({ pool, contract }, isPreprod);
    if (isPreprod) {
      const { createPreprodAmm } = await import('mn-amm-api/dist/api/src/amm/preprod.js');
      const conn = await createPreprodAmm({ contractAddress: address });
      return { api: conn.api, contractAddress: address, close: () => conn.close() };
    }
    const { createNodeAmm } = await import('mn-amm-api/dist/api/src/amm/node.js');
    const conn = await createNodeAmm({ contractAddress: address, networkId });
    return { api: conn.api, contractAddress: address, close: () => conn.close() };
  };
}

type ToolResult = { content: { type: 'text'; text: string }[]; isError?: true };

const targetShape = {
  pool: z.string().optional().describe('Registered pool name from pools.json / AMM_POOLS_FILE (overridden by contract)'),
  contract: z.string().regex(HEX64).optional().describe('Pool contract address, 64 hex (overrides pool)'),
};

const slippageShape = z
  .number()
  .int()
  .min(0)
  .max(10000)
  .optional()
  .describe('Slippage tolerance in basis points (0–10000). Default 0');

const executeShape = z
  .boolean()
  .optional()
  .describe('Set true to submit the transaction on-chain (proving takes ~2–4 min). Default false = dry-run preview');

const amountShape = z.string().regex(DECIMAL).describe('Amount in atomic units, decimal string');

interface ToolDef<Schema extends z.ZodObject<z.ZodRawShape>> {
  description: string;
  inputSchema: Schema;
  run(args: z.output<Schema>, deps: McpDeps): Promise<unknown>;
}

/** Build the server: registers the eight agent-safe tools; `tools` exposes the raw handlers (used by tests). */
export function createMcpServer(deps: McpDeps = {}): {
  server: McpServer;
  tools: Record<string, (args: Record<string, unknown>) => Promise<ToolResult>>;
} {
  const audit = deps.audit ?? defaultAudit;
  const policyStatusFn = deps.policyStatus ?? (() => policyStatus());
  const connect = deps.connect ?? defaultConnect();
  const server = new McpServer(SERVER_INFO);
  const tools: Record<string, (args: Record<string, unknown>) => Promise<ToolResult>> = {};

  const register = <Schema extends z.ZodObject<z.ZodRawShape>>(name: string, def: ToolDef<Schema>): void => {
    // `rawArgs: any` is the single SDK boundary cast: the generic schema's
    // inferred output cannot be unified with the SDK's callback inference
    // inside a generic helper. Safety comes from re-parsing below (and the SDK
    // validates before invoking), so `parsed` is fully typed.
    const handler = async (rawArgs: any): Promise<ToolResult> => {
      const started = Date.now();
      try {
        const parsed: z.output<Schema> = def.inputSchema.parse(rawArgs);
        const value = await def.run(parsed, deps);
        audit({ ts: new Date().toISOString(), tool: name, args: rawArgs, ok: true, durationMs: Date.now() - started });
        return { content: [{ type: 'text', text: toJson(value) }] };
      } catch (cause) {
        const code =
          cause instanceof AmmError || cause instanceof UsageError
            ? cause.code
            : cause instanceof z.ZodError
              ? 'USAGE'
              : 'INTERNAL';
        audit({
          ts: new Date().toISOString(),
          tool: name,
          args: rawArgs,
          ok: false,
          code,
          durationMs: Date.now() - started,
        });
        const message = cause instanceof Error ? cause.message : String(cause);
        return { isError: true, content: [{ type: 'text', text: toJson({ error: { code, message } }) }] };
      }
    };
    tools[name] = handler;
    // The SDK types its callback as a conditional over the (generic) schema
    // type, which TypeScript refuses to relate to a concrete arrow function at
    // a generic call site; the assertion names the exact target type instead.
    server.registerTool(name, { description: def.description, inputSchema: def.inputSchema }, handler as ToolCallback<Schema>);
  };

  const withApi = async (
    target: { pool?: string; contract?: string },
    fn: (api: AmmApi) => Promise<unknown>,
  ): Promise<{ contractAddress: string; result: unknown }> => {
    const conn = await connect(target);
    try {
      return { contractAddress: conn.contractAddress, result: await fn(conn.api) };
    } finally {
      conn.close();
    }
  };

  register('amm_pool_state', {
    description:
      'Read pool state: reserves (atomic units), token colors, LP supply, seeded + paused flags. Read-only.',
    inputSchema: z.object({ ...targetShape }),
    run: async (args) => {
      const { contractAddress, result } = await withApi(args, async (api) => ({
        ...(await api.poolState()),
        paused: await api.isPaused(),
      }));
      return { contract: contractAddress, ...(result as object) };
    },
  });

  register('amm_quote', {
    description: 'Price a swap without spending: output for amountIn at the current reserves (0.3% fee, slippage applied to minAmountOut). Read-only.',
    inputSchema: z.object({
      side: z.enum(['AtoB', 'BtoA']).describe('Swap direction relative to the pool token pair'),
      amountIn: amountShape,
      slippageBps: slippageShape,
      ...targetShape,
    }),
    run: async (args, d) => {
      const { contractAddress, result } = await withApi(args, (api) =>
        api.quote(args.side as SwapSide, BigInt(args.amountIn), args.slippageBps),
      );
      return { contract: contractAddress, ...(result as object) };
    },
  });

  register('amm_balance', {
    description: 'Wallet balances for the connected pool: token A/B coins, LP shares, and other colors. Read-only.',
    inputSchema: z.object({ ...targetShape }),
    run: async (args) => {
      const { contractAddress, result } = await withApi(args, (api) => api.balance());
      return { contract: contractAddress, ...(result as object) };
    },
  });

  register('amm_policy_status', {
    description:
      'Effective server-side policy for agent actions: halt flag, per-tx caps, color allowlist, rolling-window config + current window sums. enforced:false means no policy file is configured. Read-only.',
    inputSchema: z.object({}),
    run: async () => policyStatusFn(),
  });

  register('amm_swap', {
    description:
      'Swap token A↔B. Dry-run by default (preview: quote, paused flag, spendable coin check — never submits). execute:true submits and is subject to the server-side policy (POLICY_DENIED).',
    inputSchema: z.object({
      side: z.enum(['AtoB', 'BtoA']).describe('Swap direction relative to the pool token pair'),
      amountIn: amountShape,
      slippageBps: slippageShape,
      execute: executeShape,
      ...targetShape,
    }),
    run: async (args) => {
      const execute = args.execute === true;
      const { contractAddress, result } = await withApi(args, async (api) => {
        const side = args.side as SwapSide;
        const amountIn = BigInt(args.amountIn);
        const quote = await api.quote(side, amountIn, args.slippageBps);
        const paused = await api.isPaused();
        if (!execute) {
          const balance = await api.balance();
          const poolCoins = side === 'AtoB' ? balance.coinA : balance.coinB;
          const availableValues = valuesOf(poolCoins);
          return {
            dryRun: true,
            executeHint: 'set execute:true to submit this swap',
            paused,
            quote,
            slippageBps: args.slippageBps ?? 0,
            spendableCoinAvailable: availableValues.some((value) => value >= amountIn),
            availableValues,
          };
        }
        const result = await api.swap({ side, amountIn, slippageBps: args.slippageBps });
        return { txId: result.txId, quote: result.quote };
      });
      return { contract: contractAddress, ...(result as object) };
    },
  });

  register('amm_add_liquidity', {
    description:
      'Deposit token A + B for LP shares. Dry-run by default (preview: LP quote + spendable coin check). execute:true submits and is subject to the server-side policy (POLICY_DENIED).',
    inputSchema: z.object({
      amountA: amountShape,
      amountB: amountShape,
      slippageBps: slippageShape,
      execute: executeShape,
      ...targetShape,
    }),
    run: async (args) => {
      const execute = args.execute === true;
      const { contractAddress, result } = await withApi(args, async (api) => {
        const amountA = BigInt(args.amountA);
        const amountB = BigInt(args.amountB);
        const quote = await api.quoteAddLiquidity(amountA, amountB, args.slippageBps);
        if (!execute) {
          const balance = await api.balance();
          return {
            dryRun: true,
            executeHint: 'set execute:true to submit this deposit',
            quote,
            slippageBps: args.slippageBps ?? 0,
            spendableCoinAvailable: {
              amountA: balance.coinA.some((coin) => coin.value >= amountA),
              amountB: balance.coinB.some((coin) => coin.value >= amountB),
            },
          };
        }
        const result = await api.addLiquidity({ amountA, amountB, slippageBps: args.slippageBps });
        return { txId: result.txId, quote: result.quote };
      });
      return { contract: contractAddress, ...(result as object) };
    },
  });

  register('amm_remove_liquidity', {
    description:
      'Burn LP shares for token A + B. Dry-run by default (preview: payout quote + LP coin check). execute:true submits and is subject to the server-side policy (POLICY_DENIED).',
    inputSchema: z.object({
      lpAmount: amountShape.describe('LP amount to redeem, decimal string'),
      slippageBps: slippageShape,
      execute: executeShape,
      ...targetShape,
    }),
    run: async (args) => {
      const execute = args.execute === true;
      const { contractAddress, result } = await withApi(args, async (api) => {
        const lpAmount = BigInt(args.lpAmount);
        const quote = await api.quoteRemoveLiquidity(lpAmount, args.slippageBps);
        if (!execute) {
          const balance = await api.balance();
          return {
            dryRun: true,
            executeHint: 'set execute:true to submit this withdrawal',
            quote,
            slippageBps: args.slippageBps ?? 0,
            spendableCoinAvailable: balance.lpCoins.some((coin) => coin.value >= lpAmount),
          };
        }
        const result = await api.removeLiquidity({ lpAmount, slippageBps: args.slippageBps });
        return { txId: result.txId, quote: result.quote };
      });
      return { contract: contractAddress, ...(result as object) };
    },
  });

  register('amm_faucet', {
    description:
      'Mint devnet/preprod faucet coins to the connected wallet. Dry-run by default (preview: would-mint amounts). execute:true submits and is subject to the server-side policy (POLICY_DENIED).',
    inputSchema: z.object({
      amountA: amountShape.optional().describe('Mint amount for token A. Default 1000000'),
      amountB: amountShape.optional().describe('Mint amount for token B. Default 1000000'),
      execute: executeShape,
      ...targetShape,
    }),
    run: async (args) => {
      const execute = args.execute === true;
      const amountA = BigInt(args.amountA ?? '1000000');
      const amountB = BigInt(args.amountB ?? '1000000');
      const { contractAddress, result } = await withApi(args, async (api) => {
        const paused = await api.isPaused();
        if (!execute) {
          return {
            dryRun: true,
            executeHint: 'set execute:true to submit this mint',
            paused,
            wouldMint: { amountA, amountB },
          };
        }
        await api.faucet({ amountA, amountB });
        return { minted: { amountA, amountB } };
      });
      return { contract: contractAddress, ...(result as object) };
    },
  });

  return { server, tools };
}

/** Convenience for tests: run a tool handler and parse its JSON payload. */
export async function callTool(
  tools: Record<string, (args: Record<string, unknown>) => Promise<ToolResult>>,
  name: string,
  args: Record<string, unknown>,
): Promise<{ ok: boolean; payload: any }> {
  const result = await tools[name](args);
  const text = result.content[0]?.text ?? '';
  return { ok: result.isError !== true, payload: JSON.parse(text) };
}
