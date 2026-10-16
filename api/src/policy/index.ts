/**
 * Server-side policy guard for agent trading actions (Phase 2).
 *
 * Gates the four agent-facing mutators — `swap`, `faucet`, `addLiquidity`,
 * `removeLiquidity` — with operator-configured limits; every violation throws
 * `AmmError('POLICY_DENIED')` (CLI exit code 3). The owner surface (`seed`,
 * `pause`, `unpause`, deploy) is intentionally not gated here: those stay on
 * the owner wallet, which the agent never receives (surface split, Phase 2
 * slices 3–4).
 *
 * Pure module: no Node built-ins — safe to bundle into the browser UI (the UI
 * simply constructs AmmApi without a guard). File persistence lives in
 * `./file-guard.ts`, which only the Node wirings import.
 *
 * Checks, in order: halt flag → per-tx caps → color allowlist → rolling
 * window (action count and per-action amount sums). Window entries are pruned
 * on every check, so expired activity never blocks.
 * @module
 */

import { AmmError } from '../amm/types.js';

/** Agent-facing actions subject to policy. Owner actions are excluded by design. */
export type PolicyAction = 'swap' | 'faucet' | 'addLiquidity' | 'removeLiquidity';

/** Per-transaction caps in atomic units; omitted = uncapped. */
export interface PolicyCaps {
  readonly swapIn?: bigint;
  readonly faucetA?: bigint;
  readonly faucetB?: bigint;
  readonly addA?: bigint;
  readonly addB?: bigint;
  readonly removeLp?: bigint;
}

export interface PolicyConfig {
  /** Global kill switch: when true every gated action is rejected. */
  readonly halted: boolean;
  readonly caps: PolicyCaps;
  /** Hex coin colors the agent may spend (lowercase). Undefined = no restriction. */
  readonly allowedColors?: readonly string[];
  /** Rolling-window length in seconds. Undefined = no window enforcement. */
  readonly windowSeconds?: number;
  /** Max gated actions inside the window. */
  readonly maxWindowActions?: number;
  /** Max summed size inside the window, per action. */
  readonly maxWindowAmount?: Partial<Record<PolicyAction, bigint>>;
  /** Where the file guard persists window entries. Default: AMM_POLICY_STATE env or <cwd>/policy-state.json. */
  readonly statePath?: string;
}

/** Sizes submitted with a gated action; only the fields relevant to the action are set. */
export interface PolicyAmounts {
  readonly amountIn?: bigint;
  readonly amountA?: bigint;
  readonly amountB?: bigint;
  readonly lpAmount?: bigint;
}

/** One recorded gated action for rolling-window accounting. */
export interface WindowEntry {
  /** Epoch milliseconds. */
  readonly t: number;
  readonly action: PolicyAction;
  /** Primary size: swapIn, faucetA+amountB, addA+amountB, or lpAmount. */
  readonly amount: bigint;
}

export interface PolicyGuard {
  /** Throws AmmError('POLICY_DENIED') when the action violates the policy. */
  check(action: PolicyAction, amounts: PolicyAmounts, spendColorHex?: readonly string[]): Promise<void>;
  /** Records a settled action for window accounting. Never throws on persistence failure (the tx is already on-chain). */
  record(action: PolicyAction, amount: bigint): Promise<void>;
}

export function denied(reason: string): AmmError {
  return new AmmError('POLICY_DENIED', reason);
}

export const PERMISSIVE_POLICY: PolicyConfig = { halted: false, caps: {} };

const DECIMAL = /^\d+$/;
const COLOR_HEX = /^[0-9a-f]{64}$/i;

function optionalAmount(raw: unknown, label: string): bigint | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw !== 'string' || !DECIMAL.test(raw)) {
    throw new Error(`policy config: ${label} must be a non-negative decimal string, got: ${JSON.stringify(raw)}`);
  }
  return BigInt(raw);
}

function optionalCount(raw: unknown, label: string): number | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw !== 'number' || !Number.isInteger(raw) || raw <= 0) {
    throw new Error(`policy config: ${label} must be a positive integer, got: ${JSON.stringify(raw)}`);
  }
  return raw;
}

const ACTIONS: readonly PolicyAction[] = ['swap', 'faucet', 'addLiquidity', 'removeLiquidity'];

/** Parse raw policy JSON (amounts as decimal strings) into a typed config. Throws on malformed values. */
export function parsePolicyConfig(raw: unknown): PolicyConfig {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('policy config: must be a JSON object');
  }
  const obj = raw as Record<string, unknown>;
  const capsRaw = (obj.caps ?? {}) as Record<string, unknown>;
  if (typeof capsRaw !== 'object' || capsRaw === null || Array.isArray(capsRaw)) {
    throw new Error('policy config: caps must be an object');
  }
  let allowedColors: string[] | undefined;
  if (obj.allowedColors !== undefined && obj.allowedColors !== null) {
    if (!Array.isArray(obj.allowedColors) || obj.allowedColors.some((c) => typeof c !== 'string' || !COLOR_HEX.test(c))) {
      throw new Error('policy config: allowedColors must be an array of 64-hex color strings');
    }
    allowedColors = obj.allowedColors.map((c) => String(c).toLowerCase());
  }
  let maxWindowAmount: Partial<Record<PolicyAction, bigint>> | undefined;
  if (obj.maxWindowAmount !== undefined && obj.maxWindowAmount !== null) {
    const raw2 = obj.maxWindowAmount as Record<string, unknown>;
    if (typeof raw2 !== 'object' || Array.isArray(raw2)) throw new Error('policy config: maxWindowAmount must be an object');
    maxWindowAmount = {};
    for (const [action, value] of Object.entries(raw2)) {
      if (!ACTIONS.includes(action as PolicyAction)) throw new Error(`policy config: maxWindowAmount has unknown action "${action}"`);
      const amount = optionalAmount(value, `maxWindowAmount.${action}`);
      if (amount !== undefined) maxWindowAmount[action as PolicyAction] = amount;
    }
  }
  const windowSeconds = optionalCount(obj.windowSeconds, 'windowSeconds');
  return {
    halted: obj.halted === true,
    caps: {
      swapIn: optionalAmount(capsRaw.swapIn, 'caps.swapIn'),
      faucetA: optionalAmount(capsRaw.faucetA, 'caps.faucetA'),
      faucetB: optionalAmount(capsRaw.faucetB, 'caps.faucetB'),
      addA: optionalAmount(capsRaw.addA, 'caps.addA'),
      addB: optionalAmount(capsRaw.addB, 'caps.addB'),
      removeLp: optionalAmount(capsRaw.removeLp, 'caps.removeLp'),
    },
    allowedColors,
    windowSeconds,
    maxWindowActions: optionalCount(obj.maxWindowActions, 'maxWindowActions'),
    maxWindowAmount,
    statePath: typeof obj.statePath === 'string' && obj.statePath.length > 0 ? obj.statePath : undefined,
  };
}

/** Drop entries older than the window (keeps everything when no window is configured). */
export function pruneWindow(entries: readonly WindowEntry[], windowSeconds: number | undefined, now: number): WindowEntry[] {
  if (windowSeconds === undefined) return [...entries];
  const cutoff = now - windowSeconds * 1000;
  return entries.filter((entry) => entry.t >= cutoff);
}

/** Primary size recorded for an action: swapIn · faucetA+B · addA+B · lpAmount. */
export function actionSize(action: PolicyAction, amounts: PolicyAmounts): bigint {
  switch (action) {
    case 'swap':
      return amounts.amountIn ?? 0n;
    case 'faucet':
      return (amounts.amountA ?? 0n) + (amounts.amountB ?? 0n);
    case 'addLiquidity':
      return (amounts.amountA ?? 0n) + (amounts.amountB ?? 0n);
    case 'removeLiquidity':
      return amounts.lpAmount ?? 0n;
  }
}

function requireCap(label: string, cap: bigint | undefined, size: bigint): void {
  if (cap !== undefined && size > cap) {
    throw denied(`policy cap: ${label} ${size} exceeds cap ${cap}`);
  }
}

/**
 * Pure policy evaluation — throws AmmError('POLICY_DENIED') on the first
 * violation. `spendColorHex` lists the hex colors of coins the action would
 * spend (checked against `allowedColors` when configured).
 */
export function checkPolicy(
  config: PolicyConfig,
  entries: readonly WindowEntry[],
  action: PolicyAction,
  amounts: PolicyAmounts,
  spendColorHex: readonly string[] = [],
  now: number = Date.now(),
): void {
  if (config.halted) throw denied(`policy halted: ${action} rejected`);
  switch (action) {
    case 'swap':
      requireCap('swap amountIn', config.caps.swapIn, amounts.amountIn ?? 0n);
      break;
    case 'faucet':
      requireCap('faucet amountA', config.caps.faucetA, amounts.amountA ?? 0n);
      requireCap('faucet amountB', config.caps.faucetB, amounts.amountB ?? 0n);
      break;
    case 'addLiquidity':
      requireCap('addLiquidity amountA', config.caps.addA, amounts.amountA ?? 0n);
      requireCap('addLiquidity amountB', config.caps.addB, amounts.amountB ?? 0n);
      break;
    case 'removeLiquidity':
      requireCap('removeLiquidity lpAmount', config.caps.removeLp, amounts.lpAmount ?? 0n);
      break;
  }
  if (config.allowedColors) {
    const allowed = new Set(config.allowedColors);
    for (const color of spendColorHex) {
      if (!allowed.has(color.toLowerCase())) {
        throw denied(`policy color allowlist: spending color ${color} is not allowed`);
      }
    }
  }
  if (config.windowSeconds !== undefined && (config.maxWindowActions !== undefined || config.maxWindowAmount !== undefined)) {
    const active = pruneWindow(entries, config.windowSeconds, now);
    if (config.maxWindowActions !== undefined && active.length >= config.maxWindowActions) {
      throw denied(`policy window: ${action} rejected — ${active.length} actions already recorded in the last ${config.windowSeconds}s`);
    }
    const windowCap = config.maxWindowAmount?.[action];
    if (windowCap !== undefined) {
      const size = actionSize(action, amounts);
      const inWindow = active.filter((entry) => entry.action === action).reduce((sum, entry) => sum + entry.amount, 0n);
      if (inWindow + size > windowCap) {
        throw denied(`policy window: ${action} would bring the ${config.windowSeconds}s sum to ${inWindow + size}, over the cap ${windowCap}`);
      }
    }
  }
}

/**
 * Assemble a guard from a config plus entry persistence callbacks. `record`
 * prunes expired entries before appending, and skips persisting entirely when
 * no window is configured.
 */
export function createPolicyGuard(
  config: PolicyConfig,
  loadEntries: () => Promise<readonly WindowEntry[]>,
  saveEntries: (entries: readonly WindowEntry[]) => Promise<void>,
): PolicyGuard {
  return {
    async check(action, amounts, spendColorHex) {
      checkPolicy(config, await loadEntries(), action, amounts, spendColorHex);
    },
    async record(action, amount) {
      if (config.windowSeconds === undefined) return;
      const pruned = pruneWindow(await loadEntries(), config.windowSeconds, Date.now());
      await saveEntries([...pruned, { t: Date.now(), action, amount }]);
    },
  };
}
