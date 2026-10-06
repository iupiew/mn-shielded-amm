/**
 * HTTP client for the local AMM bridge (vite dev middleware, see bridge.ts).
 * Responses mirror the api workspace: bigints travel as decimal strings.
 * All AMM logic lives in api/; this module only fetches and unwraps.
 */

export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface Health {
  state: 'connecting' | 'ready' | 'error';
  message?: string;
  contract: string;
  wallet: string;
  networkId: string;
}

export interface Coin {
  nonceHex: string;
  colorHex: string;
  value: string;
}

export interface PoolStateView {
  reserveA: string;
  reserveB: string;
  seeded: boolean;
  colorAHex: string;
  colorBHex: string;
  paused: boolean;
}

export interface BalanceView {
  totalA: string;
  totalB: string;
  coinA: Coin[];
  coinB: Coin[];
  otherCoins: Coin[];
}

export interface QuoteView {
  side: SwapSide;
  amountIn: string;
  /** Present on flat GET /quote responses; absent on quotes nested in swap results. */
  slippageBps?: number;
  reserveIn: string;
  reserveOut: string;
  amountOut: string;
  minAmountOut: string;
}

export interface SwapPreview {
  dryRun: true;
  paused: boolean;
  quote: QuoteView;
  exactCoinAvailable: boolean;
  availableValues: string[];
}

export interface SwapExecuted {
  dryRun: false;
  txId: string;
  quote: QuoteView;
}

export type SwapResponse = (SwapPreview | SwapExecuted) & { side: SwapSide; amountIn: string; slippageBps: number };

export type SwapSide = 'AtoB' | 'BtoA';

export interface FaucetPreview {
  ok: true;
  amountA: string;
  amountB: string;
  dryRun: true;
  paused: boolean;
  wouldMint: { amountA: string; amountB: string };
}

export interface FaucetMinted {
  ok: true;
  amountA: string;
  amountB: string;
  dryRun: false;
  coinA: Coin;
  coinB: Coin;
}

export interface SeedPreview {
  ok: true;
  dryRun: true;
  paused: boolean;
  wouldMint: { amountA: string; amountB: string };
}

export interface SeedDone {
  ok: true;
  dryRun: false;
  seedTxId: string;
  minted: { coinA: Coin; coinB: Coin };
}

export interface StateOpPreview {
  ok: true;
  command: string;
  dryRun: true;
  currentPaused: boolean;
  wouldSetPaused: boolean;
}

export interface StateOpDone {
  ok: true;
  command: string;
  dryRun: false;
  alreadyInState: boolean;
  txId: string | null;
  paused?: boolean;
}

interface OkEnvelope {
  ok: true;
  [key: string]: unknown;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, init);
  } catch (cause) {
    throw new ApiError('BRIDGE_UNREACHABLE', `bridge unreachable (is the dev server running?): ${String(cause)}`, 0);
  }
  let payload: OkEnvelope | { ok: false; error?: { code?: string; message?: string } };
  try {
    payload = (await response.json()) as OkEnvelope & { ok: false; error?: { code?: string; message?: string } };
  } catch {
    throw new ApiError('BAD_RESPONSE', `bridge returned non-JSON (HTTP ${response.status})`, response.status);
  }
  if (payload.ok !== true) {
    throw new ApiError(payload.error?.code ?? 'HTTP', payload.error?.message ?? `HTTP ${response.status}`, response.status);
  }
  return payload as T;
}

function post<T>(path: string, body: Record<string, unknown>): Promise<T> {
  return request<T>(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}

export const bridge = {
  health: () => request<{ health: Health }>('/health').then((r) => r.health),
  poolState: () => request<{ ok: true } & PoolStateView>('/pool-state'),
  balance: (sync = false) => request<{ ok: true } & BalanceView>(`/balance?sync=${sync ? 1 : 0}`),
  quote: (side: SwapSide, amountIn: string, slippageBps?: number) =>
    request<{ ok: true } & QuoteView>(
      `/quote?side=${side}&amountIn=${amountIn}${slippageBps !== undefined ? `&slippageBps=${slippageBps}` : ''}`,
    ),
  swap: (body: { side: SwapSide; amountIn: string; slippageBps?: number; execute: boolean }) => post<SwapResponse>('/swap', body),
  faucet: (body: { amountA?: string; amountB?: string; execute: boolean }) =>
    post<FaucetPreview | FaucetMinted>('/faucet', body),
  seed: (execute: boolean) => post<SeedPreview | SeedDone>('/seed', { execute }),
  pause: (execute: boolean) => post<StateOpPreview | StateOpDone>('/pause', { execute }),
  unpause: (execute: boolean) => post<StateOpPreview | StateOpDone>('/unpause', { execute }),
  reconnect: () => post<{ health: Health }>('/reconnect', {}),
};

export function friendlyError(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'USAGE':
        return error.message;
      case 'PAUSED':
        return 'The pool is paused — unpause it before trading.';
      case 'NO_EXACT_COIN':
        return `No coin with the exact input value: ${error.message}`;
      case 'BRIDGE_UNREACHABLE':
        return error.message;
      default:
        return `[${error.code}] ${error.message}`;
    }
  }
  return error instanceof Error ? error.message : String(error);
}
