/**
 * Node-only file persistence for the policy guard: loads the operator's
 * config (JSON, amounts as decimal strings) and keeps rolling-window
 * entries in a gitignored state file with atomic writes (tmp + rename).
 *
 * No policy file → no guard (fully permissive, zero overhead). A corrupt
 * state file is treated as empty (window limits restart; caps and halt stay
 * enforced from the config).
 * @module
 */

import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  type PolicyConfig,
  type PolicyGuard,
  type WindowEntry,
  createPolicyGuard,
  parsePolicyConfig,
  pruneWindow,
} from './index.js';

/** Config path: AMM_POLICY_FILE env, else <cwd>/policy.json. */
export function policyConfigPath(): string {
  return resolve(process.env.AMM_POLICY_FILE ?? 'policy.json');
}

/** State path: config.statePath, else AMM_POLICY_STATE env, else <cwd>/policy-state.json. */
export function policyStatePath(config: PolicyConfig): string {
  return resolve(config.statePath ?? process.env.AMM_POLICY_STATE ?? 'policy-state.json');
}

/** Emergency kill switch: AMM_POLICY_HALT=1|true forces `halted` without editing the config file. */
function haltOverride(config: PolicyConfig): PolicyConfig {
  const raw = process.env.AMM_POLICY_HALT;
  if (raw === '1' || raw === 'true') return { ...config, halted: true };
  return config;
}

/** Read + parse the policy config; undefined when no config file exists. */
export function loadPolicyConfig(path: string = policyConfigPath()): PolicyConfig | undefined {
  if (!existsSync(path)) return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, 'utf8'));
  } catch (cause) {
    throw new Error(`policy config: ${path} is not valid JSON: ${cause instanceof Error ? cause.message : String(cause)}`);
  }
  return haltOverride(parsePolicyConfig(parsed));
}

function readEntries(path: string): WindowEntry[] {
  if (!existsSync(path)) return [];
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8')) as { entries?: unknown };
    if (!Array.isArray(raw.entries)) return [];
    return raw.entries.flatMap((entry): WindowEntry[] => {
      const e = entry as { t?: unknown; action?: unknown; amount?: unknown };
      if (typeof e.t !== 'number' || typeof e.action !== 'string' || typeof e.amount !== 'string' || !/^\d+$/.test(e.amount)) {
        return [];
      }
      return [{ t: e.t, action: e.action as WindowEntry['action'], amount: BigInt(e.amount) }];
    });
  } catch {
    return [];
  }
}

function writeEntries(path: string, entries: readonly WindowEntry[]): void {
  const tmp = `${path}.tmp-${process.pid}`;
  const body = `${JSON.stringify(
    { entries: entries.map((e) => ({ t: e.t, action: e.action, amount: e.amount.toString() })) },
    null,
    2,
  )}\n`;
  writeFileSync(tmp, body);
  renameSync(tmp, path);
}

/**
 * Build the file-backed guard for the current environment. Returns undefined
 * when no policy is configured (config file absent) — callers treat that as
 * "no policy enforcement".
 */
export function createFilePolicyGuard(configPath: string = policyConfigPath()): PolicyGuard | undefined {
  const config = loadPolicyConfig(configPath);
  if (!config) return undefined;
  const statePath = policyStatePath(config);
  return createPolicyGuard(
    config,
    async () => readEntries(statePath),
    async (entries) => writeEntries(statePath, entries),
  );
}

/** JSON-friendly snapshot of the effective policy (amounts as decimal strings). */
export interface PolicyStatus {
  readonly enforced: boolean;
  readonly configPath: string;
  readonly halted: boolean;
  readonly caps: Record<string, string | undefined>;
  readonly allowedColors?: readonly string[];
  readonly window?: {
    readonly seconds: number;
    readonly maxActions?: number;
    readonly maxAmount?: Record<string, string | undefined>;
  };
  readonly statePath?: string;
  /** Window entries within the configured window (empty when no window). */
  readonly activeWindow?: {
    readonly entryCount: number;
    /** Summed recorded size per action inside the window. */
    readonly sums: Record<string, string>;
  };
}

/** Read-only policy snapshot for operators/agents (e.g. MCP `amm_policy_status`). */
export function policyStatus(configPath: string = policyConfigPath()): PolicyStatus {
  const config = loadPolicyConfig(configPath);
  if (!config) {
    return { enforced: false, configPath, halted: false, caps: {} };
  }
  const statePath = policyStatePath(config);
  const entries = pruneWindow(readEntries(statePath), config.windowSeconds, Date.now());
  const sums: Record<string, string> = {};
  for (const entry of entries) {
    sums[entry.action] = (BigInt(sums[entry.action] ?? '0') + entry.amount).toString();
  }
  return {
    enforced: true,
    configPath,
    halted: config.halted,
    caps: {
      swapIn: config.caps.swapIn?.toString(),
      faucetA: config.caps.faucetA?.toString(),
      faucetB: config.caps.faucetB?.toString(),
      addA: config.caps.addA?.toString(),
      addB: config.caps.addB?.toString(),
      removeLp: config.caps.removeLp?.toString(),
    },
    allowedColors: config.allowedColors,
    window:
      config.windowSeconds === undefined
        ? undefined
        : {
            seconds: config.windowSeconds,
            maxActions: config.maxWindowActions,
            maxAmount: config.maxWindowAmount
              ? Object.fromEntries(
                  Object.entries(config.maxWindowAmount).map(([action, amount]) => [action, amount?.toString()]),
                )
              : undefined,
          },
    statePath,
    activeWindow: { entryCount: entries.length, sums },
  };
}
