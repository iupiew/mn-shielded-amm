/**
 * Local API bridge — exposes the api/ workspace over HTTP for the React UI.
 *
 * Registered as a vite dev-server middleware, so `npm run dev` starts the app
 * and the bridge in one process (no extra daemon, no CORS). All AMM logic
 * lives in the api workspace; this file only routes, validates and serializes.
 *
 * Every api operation runs behind a single mutex: wallet coin selection,
 * proofs and submissions must never interleave (a swap fans out several
 * concurrent proof requests and the local proof server is memory-constrained).
 *
 * Configuration (shell env): AMM_CONTRACT, AMM_WALLET, AMM_NETWORK_ID.
 * The contract defaults to the local devnet deployment.
 */
import { existsSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { join, resolve } from 'node:path';
import type { Plugin } from 'vite';
import type {
  AmmApi,
  PoolState,
  PoolBalance,
  Quote,
  SwapResult,
  SwapSide,
  WalletCoin,
} from '@midnight-ntwrk/leaderboard-api';

const CONTRACT =
  process.env.AMM_CONTRACT?.trim() ||
  'bf823a56c3b5a231c168ba39ffc46a80b39e3195709a88eb594cc011899eccc1';
const WALLET = process.env.AMM_WALLET ?? 'devnet-main';
const NETWORK_ID = process.env.AMM_NETWORK_ID ?? 'undeployed';
const CONNECT_TIMEOUT_MS = 90_000;

type ApiModule = typeof import('@midnight-ntwrk/leaderboard-api');
type NodeModule = typeof import('@midnight-ntwrk/leaderboard-api/dist/api/src/amm/node.js');
type NodeAmm = Awaited<ReturnType<NodeModule['createNodeAmm']>>;

type Health = {
  state: 'connecting' | 'ready' | 'error';
  message?: string;
  contract: string;
  wallet: string;
  networkId: string;
};

class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

let health: Health = { state: 'connecting', contract: CONTRACT, wallet: WALLET, networkId: NETWORK_ID };
let api: AmmApi | null = null;
let apiModule: ApiModule | null = null;
let nodeModule: NodeModule | null = null;
let connectAttempt: Promise<NodeAmm> | null = null;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isAmmError(error: unknown): error is Error & { code: string } {
  return error instanceof Error && error.name === 'AmmError' && typeof (error as { code?: unknown }).code === 'string';
}

function findManagedDir(): string {
  const candidates = [
    resolve(process.cwd(), 'contract/managed/pool'),
    resolve(process.cwd(), '../contract/managed/pool'),
    resolve(process.cwd(), '../../contract/managed/pool'),
  ];
  for (const dir of candidates) {
    if (existsSync(join(dir, 'keys', 'faucet.verifier'))) return dir;
  }
  throw new Error(`cannot find compiled contract artifacts (looked in: ${candidates.join(', ')})`);
}

/**
 * `isPaused` is a view circuit that is submitted as a transaction (~24s for
 * inclusion) and touches dust accounting, so it must stay on the main queue.
 * We cache it and refresh in the background: pool-state stays fast, and the
 * queue only absorbs one slow window per TTL.
 */
let pausedCache: boolean | null = null;
let pausedAt = 0;
let pausedRefresh: Promise<void> | null = null;
const PAUSED_TTL_MS = 60_000;

function refreshPaused(): Promise<void> {
  if (pausedRefresh) return pausedRefresh;
  if (!api) return Promise.resolve();
  pausedRefresh = serialize(async () => {
    try {
      pausedCache = await api!.isPaused();
      pausedAt = Date.now();
      console.error(`[bridge] paused refreshed: ${pausedCache}`);
    } catch (error) {
      console.error(`[bridge] paused refresh failed: ${errorMessage(error)}`);
    } finally {
      pausedRefresh = null;
    }
  });
  return pausedRefresh;
}

function setPaused(value: boolean): void {
  pausedCache = value;
  pausedAt = Date.now();
}

function connect(): Promise<NodeAmm> {
  if (connectAttempt) return connectAttempt;
  health = { state: 'connecting', contract: CONTRACT, wallet: WALLET, networkId: NETWORK_ID };
  connectAttempt = (async () => {
    try {
      apiModule = await import('@midnight-ntwrk/leaderboard-api');
      nodeModule = await import('@midnight-ntwrk/leaderboard-api/dist/api/src/amm/node.js');
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`connect timed out after ${CONNECT_TIMEOUT_MS / 1000}s (a wrong contract address hangs silently here)`)),
          CONNECT_TIMEOUT_MS,
        ),
      );
      const created = await Promise.race([
        nodeModule.createNodeAmm({
          contractAddress: CONTRACT,
          wallet: WALLET,
          networkId: NETWORK_ID,
          syncWallet: false,
          managedDir: findManagedDir(),
        }),
        timeout,
      ]);
      api = created.api;
      // Initial paused read (direct — not via serialize, to avoid deadlocking
      // with requests already queued on requireApi()).
      pausedCache = await created.api.isPaused();
      pausedAt = Date.now();
      health = { state: 'ready', contract: CONTRACT, wallet: WALLET, networkId: NETWORK_ID };
      return created;
    } catch (error) {
      api = null;
      connectAttempt = null;
      health = { state: 'error', message: errorMessage(error), contract: CONTRACT, wallet: WALLET, networkId: NETWORK_ID };
      throw error;
    }
  })();
  return connectAttempt;
}

async function requireApi(): Promise<AmmApi> {
  if (api) return api;
  await connect();
  return api!;
}

/** Serializes every api call (proofs, wallet sync, submissions). */
let queue: Promise<unknown> = Promise.resolve();
function serialize<T>(operation: () => Promise<T>): Promise<T> {
  const run = queue.then(operation, operation);
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function syncWallet(): void {
  if (!nodeModule) throw new HttpError(500, 'INTERNAL', 'bridge not connected yet');
  nodeModule.syncWalletCache(WALLET);
}

// ── request parsing / validation ────────────────────────────────────────

function parseSide(raw: string | null | undefined): SwapSide {
  if (raw === 'AtoB' || raw === 'BtoA') return raw;
  throw new HttpError(400, 'USAGE', `side must be "AtoB" or "BtoA", got: ${raw ?? 'none'}`);
}

function parseUint(raw: string | null | undefined, name: string): bigint {
  if (raw === undefined || raw === null || raw === '') throw new HttpError(400, 'USAGE', `missing ${name}`);
  if (!/^\d+$/.test(raw)) throw new HttpError(400, 'USAGE', `${name} must be a non-negative integer (atomic units), got: ${raw}`);
  const value = BigInt(raw);
  if (value <= 0n) throw new HttpError(400, 'USAGE', `${name} must be positive, got: ${raw}`);
  return value;
}

function parseBps(raw: unknown): number | undefined {
  if (raw === undefined || raw === null || raw === '') return undefined;
  if (typeof raw !== 'string' && typeof raw !== 'number') throw new HttpError(400, 'USAGE', 'slippageBps must be an integer 0-10000');
  const text = String(raw);
  if (!/^\d+$/.test(text)) throw new HttpError(400, 'USAGE', `slippageBps must be an integer 0-10000, got: ${text}`);
  const bps = Number(text);
  if (bps > 10000) throw new HttpError(400, 'USAGE', `slippageBps must be within 0-10000, got: ${text}`);
  return bps;
}

function parseBool(raw: unknown, name: string): boolean {
  if (raw === undefined) return false;
  if (typeof raw === 'boolean') return raw;
  if (raw === 'true' || raw === '1') return true;
  if (raw === 'false' || raw === '0') return false;
  throw new HttpError(400, 'USAGE', `${name} must be a boolean, got: ${JSON.stringify(raw)}`);
}

async function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > 16_384) throw new HttpError(413, 'USAGE', 'request body too large');
    chunks.push(chunk as Buffer);
  }
  if (chunks.length === 0) return {};
  try {
    const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new HttpError(400, 'USAGE', 'request body must be a JSON object');
    }
    return parsed as Record<string, unknown>;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, 'USAGE', `invalid JSON body: ${errorMessage(error)}`);
  }
}

function str(body: Record<string, unknown>, name: string): string | undefined {
  const value = body[name];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') throw new HttpError(400, 'USAGE', `${name} must be a string`);
  return value;
}

// ── response helpers ────────────────────────────────────────────────────

function send(res: ServerResponse, status: number, payload: unknown): void {
  const json = JSON.stringify(payload, (_key, value) => (typeof value === 'bigint' ? value.toString() : value));
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(json);
}

function sendOk(res: ServerResponse, payload: Record<string, unknown>): void {
  send(res, 200, { ok: true, ...payload });
}

function coinView(coin: { nonce: Uint8Array; color: Uint8Array; value: bigint }): {
  nonceHex: string;
  colorHex: string;
  value: bigint;
} {
  return {
    nonceHex: Buffer.from(coin.nonce).toString('hex'),
    colorHex: Buffer.from(coin.color).toString('hex'),
    value: coin.value,
  };
}

function balanceView(balance: PoolBalance): Record<string, unknown> {
  return {
    totalA: balance.totalA,
    totalB: balance.totalB,
    coinA: balance.coinA,
    coinB: balance.coinB,
    otherCoins: balance.otherCoins,
  };
}

// ── routes ──────────────────────────────────────────────────────────────

async function routeGet(pathname: string, query: URLSearchParams, res: ServerResponse): Promise<void> {
  switch (pathname) {
    case '/health':
      sendOk(res, { health });
      return;

    case '/pool-state': {
      const result = await serialize(async () => {
        const amm = await requireApi();
        return amm.poolState();
      });
      if (pausedCache !== null && Date.now() - pausedAt > PAUSED_TTL_MS) void refreshPaused();
      sendOk(res, {
        reserveA: result.reserveA,
        reserveB: result.reserveB,
        seeded: result.seeded,
        colorAHex: result.colorAHex,
        colorBHex: result.colorBHex,
        paused: pausedCache ?? false,
        pausedAt,
      });
      return;
    }

    case '/balance': {
      const sync = query.get('sync') === '1';
      const balance = await serialize(async () => {
        const amm = await requireApi();
        if (sync) syncWallet();
        return amm.balance();
      });
      sendOk(res, balanceView(balance));
      return;
    }

    case '/quote': {
      const side = parseSide(query.get('side'));
      const amountIn = parseUint(query.get('amountIn'), 'amountIn');
      const slippageBps = parseBps(query.get('slippageBps'));
      const quote = await serialize(async () => (await requireApi()).quote(side, amountIn, slippageBps));
      sendOk(res, { ...quote, side, amountIn, slippageBps: slippageBps ?? 0 });
      return;
    }

    default:
      throw new HttpError(404, 'USAGE', `unknown GET route: ${pathname}`);
  }
}

async function routePost(pathname: string, body: Record<string, unknown>, res: ServerResponse): Promise<void> {
  switch (pathname) {
    case '/swap': {
      const side = parseSide(str(body, 'side'));
      const amountIn = parseUint(str(body, 'amountIn'), 'amountIn');
      const slippageBps = parseBps(body.slippageBps);
      const execute = parseBool(body.execute, 'execute');
      const result = await serialize(async () => {
        const amm = await requireApi();
        if (!execute) {
          const quote = await amm.quote(side, amountIn, slippageBps);
          syncWallet();
          const balance = await amm.balance();
          const poolCoins: readonly WalletCoin[] = side === 'AtoB' ? balance.coinA : balance.coinB;
          const values = poolCoins.map((coin) => coin.value);
          return {
            dryRun: true as const,
            paused: pausedCache ?? false,
            quote,
            exactCoinAvailable: values.includes(amountIn),
            availableValues: values,
          };
        }
        syncWallet();
        const swap = await amm.swap({ side, amountIn, slippageBps });
        return { dryRun: false as const, txId: swap.txId, quote: swap.quote, coin: swap.coin };
      });
      sendOk(res, { side, amountIn, slippageBps: slippageBps ?? 0, ...result });
      return;
    }

    case '/faucet': {
      const amountA = parseUint(str(body, 'amountA') ?? '1000000', 'amountA');
      const amountB = parseUint(str(body, 'amountB') ?? '1000000', 'amountB');
      const execute = parseBool(body.execute, 'execute');
      const result = await serialize(async () => {
        const amm = await requireApi();
        if (!execute) {
          return { dryRun: true as const, paused: pausedCache ?? false, wouldMint: { amountA, amountB } };
        }
        const [coinA, coinB] = await amm.faucet({ amountA, amountB });
        return { dryRun: false as const, coinA: coinView(coinA), coinB: coinView(coinB) };
      });
      sendOk(res, { amountA, amountB, ...result });
      return;
    }

    case '/seed': {
      const execute = parseBool(body.execute, 'execute');
      const result = await serialize(async () => {
        const amm = await requireApi();
        if (!execute) {
          return {
            dryRun: true as const,
            paused: pausedCache ?? false,
            wouldMint: { amountA: 1_000_000n, amountB: 1_000_000n },
          };
        }
        syncWallet();
        const [coinA, coinB] = await amm.faucet();
        const seedTxId = await amm.seed(coinA, coinB);
        return { dryRun: false as const, seedTxId, minted: { coinA: coinView(coinA), coinB: coinView(coinB) } };
      });
      sendOk(res, result);
      return;
    }

    case '/pause':
    case '/unpause': {
      const target = pathname === '/pause';
      const execute = parseBool(body.execute, 'execute');
      const result = await serialize(async () => {
        const amm = await requireApi();
        if (!execute) return { dryRun: true as const, currentPaused: pausedCache ?? false, wouldSetPaused: target };
        const current = await amm.isPaused();
        if (current === target) {
          setPaused(target);
          return { dryRun: false as const, alreadyInState: target, txId: null };
        }
        const txId = target ? await amm.pause() : await amm.unpause();
        setPaused(target);
        return { dryRun: false as const, alreadyInState: false, txId, paused: target };
      });
      sendOk(res, { command: pathname.slice(1), ...result });
      return;
    }

    case '/reconnect':
      connectAttempt = null;
      api = null;
      void connect().catch(() => undefined);
      sendOk(res, { health });
      return;

    default:
      throw new HttpError(404, 'USAGE', `unknown POST route: ${pathname}`);
  }
}

async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
  let rawUrl = req.url ?? '/';
  if (rawUrl === '/api') rawUrl = '/api/';
  if (rawUrl.startsWith('/api/')) rawUrl = rawUrl.slice(4);
  const url = new URL(rawUrl, 'http://localhost');
  try {
    if (req.method === 'GET') {
      await routeGet(url.pathname, url.searchParams, res);
    } else if (req.method === 'POST') {
      const body = await readJsonBody(req);
      await routePost(url.pathname, body, res);
    } else {
      throw new HttpError(405, 'USAGE', `method not allowed: ${req.method}`);
    }
  } catch (error) {
    if (error instanceof HttpError) {
      send(res, error.status, { ok: false, error: { code: error.code, message: error.message } });
      return;
    }
    if (isAmmError(error)) {
      send(res, 422, { ok: false, error: { code: error.code, message: error.message } });
      return;
    }
    send(res, 500, { ok: false, error: { code: 'INTERNAL', message: errorMessage(error) } });
  }
}

/** Vite plugin: mounts the bridge at /api on the dev server. */
export function ammBridge(): Plugin {
  return {
    name: 'amm-bridge',
    configureServer(server) {
      server.middlewares.use('/api', (req, res) => {
        void handle(req, res);
      });
      // Warm the connection in the background so first page loads are fast.
      void connect().catch(() => undefined);
    },
  };
}
