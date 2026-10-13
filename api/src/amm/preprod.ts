/**
 * Preprod transport for {@link AmmApi} — the CLI's "alpha" path.
 *
 * Ports the verified wallet-less pipeline from scripts/preprod-deploy.mjs so
 * contract *calls* (not just deploys) can run against the deployed pool:
 *
 * - keys derived from the agent seed file (.spike/agent-seed-export.json),
 *   same owner rule as the deploy (pause/unpause owner circuits work here);
 * - balanceTx/submitTx: when `midnight serve` runs with the agent wallet
 *   (`midnight serve --network preprod --wallet mn-amm-agent …`, same seed →
 *   same keys), the DApp-Connector signs intents AND adds the user's coin
 *   inputs — required by seed/swap, whose receiveShielded outputs nothing
 *   paid for; otherwise fall back to intent-signing + ProofStation POST
 *   /balance-only (balances fees/dust but cannot fund shielded receives);
 * - submitTx: unsigned `midnight.sendMnTransaction` over the preprod RPC via
 *   @polkadot/api;
 * - live coins from the `midnight-wallet-cli` shielded cache
 *   (`balance --shielded --force-shielded --network preprod` writes
 *   ~/.midnight/cache/preprod/shielded-*.json — the only enumeration of
 *   unspent custom-color coins; the connector facade does not track them),
 *   with the file-backed vault (~/.mn-amm/preprod-vault.json) as fallback
 *   when the wallet CLI or its cache is unavailable.
 *
 * UNVERIFIED: the intent-signing + /balance-only path was verified for the
 * deploy transaction (scripts/preprod-deploy.mjs); call transactions use the
 * same submitTxCore pipeline, exercised by `mn-amm faucet --execute
 * --network-id preprod`.
 *
 * Reads are free: connect() derives colors locally and reads pause/reserves
 * from contract state — only real circuits (faucet/seed/swap/…) prove and
 * submit, so plain status commands return in seconds. Wallet coin reads also
 * spawn `midnight balance --shielded` (≈20s incremental, cached for 10s;
 * first-ever full scan ~5min).
 * @module
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { CompiledContract } from '@midnight-ntwrk/compact-js';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { getNetworkId, setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { fromHex, parseCoinPublicKeyToHex, toHex } from '@midnight-ntwrk/midnight-js-utils';
import { type ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { type UnboundTransaction, Transaction } from '@midnight-ntwrk/midnight-js-types';
import { HDWallet, Roles } from '@midnight-ntwrk/wallet-sdk-hd';
import { createKeystore } from '@midnight-ntwrk/wallet-sdk-unshielded-wallet';
import { Intent, Proof, PreBinding, SignatureEnabled, Binding, ZswapSecretKeys } from '@midnight-ntwrk/ledger-v8';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { u8aToHex } from '@polkadot/util';
import { type Logger } from 'pino';
import * as PoolContract from '../../../contract/managed/pool/contract/index.js';
import { createLeaderboardPrivateState, witnesses } from '../../../contract/src/witnesses.js';
import { AmmApi } from './api.js';
import { withProveRetry } from './prove-retry.js';
import { ServeRpc } from './serve-rpc.js';
import { readWalletCoins, shieldedSyncRequired } from './wallet-cache.js';
import { createPersistentVault, type Vault, type VaultStorage } from './vault.js';
import { type CoinSource, type PoolProviders, hexToBytes, poolPrivateStateKey } from './types.js';

export const PREPROD_NETWORK_ID = 'preprod';
// Preprod indexer/RPC moved to Blockfrost on 2026-10-09 (Midnight-hosted
// endpoints decommissioned). Set BLOCKFROST_PROJECT_ID (Midnight Preprod
// project, id starts with "nightpreprod") to target Blockfrost; the legacy
// defaults remain for older environments that still proxy the hosted URLs.
/** Read `name` from process.env, falling back to the gitignored `.env` found
 *  by walking up from this module (repo root). Never commits the token. */
function loadRepoEnv(name: string): string | undefined {
  const existing = process.env[name]?.trim();
  if (existing) return existing;
  let dir = new URL('.', import.meta.url).pathname;
  for (let i = 0; i < 6; i++) {
    try {
      const line = readFileSync(dir + '.env', 'utf8')
        .split(/\r?\n/)
        .find((l) => l.startsWith(`${name}=`));
      if (line) return line.slice(name.length + 1).trim().replace(/^["']|["']$/g, '');
    } catch { /* no .env at this level */ }
    dir += '../';
  }
  return undefined;
}
const BLOCKFROST_PROJECT_ID = loadRepoEnv('BLOCKFROST_PROJECT_ID');
const withBlockfrostKey = (url: string): string =>
  BLOCKFROST_PROJECT_ID ? `${url}?project_id=${encodeURIComponent(BLOCKFROST_PROJECT_ID)}` : url;
const DEFAULT_INDEXER_URI =
  process.env.AMM_INDEXER_URI ??
  (BLOCKFROST_PROJECT_ID
    ? withBlockfrostKey('https://midnight-preprod.blockfrost.io/api/v0')
    : 'https://indexer.preprod.midnight.network/api/v4/graphql');
const DEFAULT_INDEXER_WS_URI =
  process.env.AMM_INDEXER_WS_URI ??
  (BLOCKFROST_PROJECT_ID
    ? withBlockfrostKey('wss://midnight-preprod.blockfrost.io/api/v0/ws')
    : 'wss://indexer.preprod.midnight.network/api/v4/graphql/ws');
const DEFAULT_RPC_URI =
  process.env.AMM_RPC_URI ??
  (BLOCKFROST_PROJECT_ID
    ? withBlockfrostKey('wss://rpc.midnight-preprod.blockfrost.io')
    : 'wss://rpc.preprod.midnight.network');
const DEFAULT_PROOF_SERVER_URI = 'https://api-preprod.1am.xyz';
/** `midnight serve` DApp-Connector for the agent wallet (9933 keeps localnet's 9932 free). */
const DEFAULT_SERVE_URL = 'ws://127.0.0.1:9933';
const DEFAULT_MANAGED_DIR = 'contract/managed/pool';
const DEFAULT_SEED_PATH = '.spike/agent-seed-export.json';
const DEFAULT_VAULT_PATH = `${homedir()}/.mn-amm/preprod-vault.json`;

/**
 * The deployed pool (scripts/preprod-deploy.mjs → .spike/preprod-deploy.json).
 * Re-point after every redeploy (Phase 3 will change it).
 */
export const DEFAULT_PREPROD_CONTRACT = '2f557cf5ff4bb0220abd42669bf63ad73ca5e00bffdf5d5e41acd2a5a1634712';

/** ProofStation /check|/prove timeout — the 300 s default is too short for the 19 MB faucet/swap proving keys. */
const PROOF_TIMEOUT_MS = 900_000;
/** Guards the api's own level store; stable across runs (same rule as node.ts). */
const PRIVATE_STORAGE_PASSWORD = 'mn-contract-default-pwd-16ch';

export interface PreprodAmmOptions {
  /** Deployed pool contract address (64 hex). Default: {@link DEFAULT_PREPROD_CONTRACT}. */
  readonly contractAddress?: ContractAddress;
  /** Compiled artifacts dir, cwd-relative. Default 'contract/managed/pool'. */
  readonly managedDir?: string;
  /** Agent seed file with { seedHex }. Default '.spike/agent-seed-export.json' (or AMM_SEED_PATH). */
  readonly seedPath?: string;
  /** File-backed vault path. Default '~/.mn-amm/preprod-vault.json' (or AMM_VAULT_PATH). */
  readonly vaultPath?: string;
  readonly proofServerUri?: string;
  readonly indexerUri?: string;
  readonly indexerWsUri?: string;
  readonly rpcUri?: string;
  /** `midnight serve` DApp-Connector WS for wallet funding. Default ws://127.0.0.1:9933 (or AMM_SERVE_URL). */
  readonly serveUrl?: string;
  /** `midnight-wallet-cli` wallet name whose shielded cache lists live coins (must share the agent seed). Default AMM_WALLET env or 'mn-amm-agent'. */
  readonly wallet?: string;
  readonly logger?: Logger;
}

export interface PreprodAmm {
  readonly api: AmmApi;
  /** Persistent coin vault (file-backed) — record faucet outputs, consume swap inputs. */
  readonly vault: Vault;
  readonly coinPublicKey: string;
  /** Nothing to release: the polkadot client connects per submit; the level store is shared. */
  close(): void;
}

/** File-backed Storage adapter: one JSON object keyed by storage key. */
function fileVaultStorage(filePath: string): VaultStorage {
  const readAll = (): Record<string, string> => {
    try {
      const parsed: unknown = JSON.parse(readFileSync(filePath, 'utf8'));
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, string>;
    } catch {
      // missing/corrupt file → treat as empty
    }
    return {};
  };
  const writeAll = (data: Record<string, string>): void => {
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
  };
  return {
    getItem: (key) => readAll()[key] ?? null,
    setItem: (key, value) => {
      const data = readAll();
      data[key] = value;
      writeAll(data);
    },
    removeItem: (key) => {
      const data = readAll();
      delete data[key];
      writeAll(data);
    },
  };
}

function normalizeHex(value: string): string {
  return String(value).trim().replace(/^0x/i, '').toLowerCase();
}

/**
 * Derive the agent wallet's keys from the seed file (same derivation as
 * scripts/preprod-deploy.mjs: account 0, roles Zswap/NightExternal/Dust).
 */
function deriveAgentKeys(seedPath: string): {
  coinPublicKey: string;
  encryptionPublicKey: string;
  signData: (payload: Uint8Array) => ReturnType<ReturnType<typeof createKeystore>['signData']>;
} {
  if (!existsSync(seedPath)) {
    throw new Error(`missing seed file: ${seedPath} (expected { seedHex }; see scripts/preprod-deploy.mjs inputs)`);
  }
  const raw = JSON.parse(readFileSync(seedPath, 'utf8')) as { seedHex?: unknown };
  const seedHex = normalizeHex(String(raw.seedHex ?? ''));
  if (!/^[0-9a-f]{64}$/.test(seedHex)) throw new Error(`seed file ${seedPath} must contain a 64-hex seedHex`);

  const hdResult = HDWallet.fromSeed(hexToBytes(seedHex));
  if (hdResult.type !== 'seedOk') throw new Error('failed to derive wallet keys from seed');
  const derived = hdResult.hdWallet.selectAccount(0).selectRoles([Roles.Zswap, Roles.NightExternal, Roles.Dust]).deriveKeysAt(0);
  hdResult.hdWallet.clear();
  if (derived.type !== 'keysDerived') throw new Error('failed to derive role keys');

  const shieldedSecretKeys = ZswapSecretKeys.fromSeed(derived.keys[Roles.Zswap]);
  const unshieldedKeystore = createKeystore(derived.keys[Roles.NightExternal], getNetworkId());
  return {
    coinPublicKey: String(shieldedSecretKeys.coinPublicKey),
    encryptionPublicKey: String(shieldedSecretKeys.encryptionPublicKey),
    signData: (payload) => unshieldedKeystore.signData(payload),
  };
}

/**
 * ProofStation /balance-only: balance the transaction and sponsor its fees.
 *
 * The server allows ONE balance transaction in flight at a time and answers
 * 429 ("already pending") until it observes the previous one on-chain — which
 * lags our own submit by seconds-to-minutes. Wait for its /health sponsor
 * wallet to report pending 0 (with backoff fallback) and retry within a
 * bounded budget instead of failing the whole command.
 */
const BALANCE_WAIT_BUDGET_MS = 600_000;
const BALANCE_POLL_MS = 5_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

/** ProofStation's own view of in-flight sponsored balance txs (undefined when unreachable). */
async function sponsorPending(proofServerUri: string): Promise<number | undefined> {
  try {
    const response = await fetch(`${proofServerUri}/health`, { signal: AbortSignal.timeout(10_000) });
    const health = (await response.json()) as {
      cluster?: Array<{ wallet_status?: { pendingTxs?: { pending?: number } } }>;
    };
    return health?.cluster?.[0]?.wallet_status?.pendingTxs?.pending;
  } catch {
    return undefined;
  }
}

async function balanceOnly(
  proofServerUri: string,
  signedTxBytes: Uint8Array,
  apiKey: string | undefined,
): Promise<{ tx: string; txHash?: string; txId?: string }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/octet-stream' };
  if (apiKey) headers['X-API-Key'] = apiKey;
  // Stage logs go to stderr so `--json` stdout stays machine-readable.
  const deadline = Date.now() + BALANCE_WAIT_BUDGET_MS;
  let backoffMs = 0;
  let lastError: Error | undefined;

  for (;;) {
    console.error(`[amm:preprod] balance-only → ${proofServerUri}`);
    const started = Date.now();
    const response = await fetch(`${proofServerUri}/balance-only`, {
      method: 'POST',
      headers,
      // Raw bytes body (deploy used Buffer.from); copy for an ArrayBuffer-backed view.
      body: new Uint8Array(signedTxBytes),
      signal: AbortSignal.timeout(60_000),
    });
    const text = await response.text();
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      throw new Error(`ProofStation balance-only non-JSON (${response.status}): ${text.slice(0, 200)}`);
    }

    if (response.ok) {
      const pick = (field: string): string | undefined => {
        const record = body as Record<string, unknown>;
        if (typeof record[field] === 'string') return record[field];
        for (const container of ['data', 'result']) {
          const nested = record[container] as Record<string, unknown> | undefined;
          if (nested && typeof nested === 'object' && typeof nested[field] === 'string') return nested[field];
        }
        return undefined;
      };
      const tx = pick('tx') ?? pick('txBytes') ?? pick('transactionBytes');
      if (!tx) throw new Error(`ProofStation returned invalid balance response: ${JSON.stringify(body).slice(0, 300)}`);
      console.error(`[amm:preprod] balance-only ok in ${Date.now() - started}ms`, { txId: pick('txId'), txHash: pick('txHash') });
      return { tx, txHash: pick('txHash'), txId: pick('txId') };
    }

    const record = body as Record<string, unknown>;
    const message = String(record.message ?? record.error ?? text.slice(0, 200));
    console.error(`[amm:preprod] balance-only failed (${response.status}) after ${Date.now() - started}ms`, body);
    lastError = new Error(`ProofStation balance-only failed (${response.status}): ${message}`);
    if (response.status !== 429 || Date.now() >= deadline) throw lastError;

    // 429: a balance tx is still pending server-side until it lands on-chain.
    // Back off (15s → 120s), waking early only when /health shows a real
    // 1 → 0 transition — a constant 0 (health doesn't track this lock) is not
    // proof that the gate reopened.
    console.error('[amm:preprod] balance pending server-side — waiting for it to clear…');
    const minWaitMs = backoffMs || 15_000;
    const waitStart = Date.now();
    let sawPending = false;
    while (Date.now() < Math.min(deadline, waitStart + minWaitMs + 60_000)) {
      await sleep(BALANCE_POLL_MS);
      const pending = await sponsorPending(proofServerUri);
      if (pending === undefined) continue;
      if (pending > 0) sawPending = true;
      if (pending === 0 && sawPending && Date.now() - waitStart >= minWaitMs) break;
    }
    backoffMs = Math.min(120_000, (backoffMs || 15_000) * 2);
  }
}

/**
 * Log per-segment unshielded offers + `Transaction.imbalances` to stderr.
 * The node rejects malformed balances with `Custom error: 138`
 * (BalanceCheckOverspend); this dump shows which segment/token is negative
 * and whether the imbalance was already present pre-balance or introduced by
 * ProofStation's /balance-only.
 */
function dumpSegments(label: string, tx: Transaction<SignatureEnabled, Proof, PreBinding> | Transaction<SignatureEnabled, Proof, Binding>): void {
  try {
    const intents = tx.intents;
    const report: Record<string, unknown> = {};
    const tokenKey = (type: unknown): string => {
      if (typeof type === 'string') return type;
      if (type instanceof Uint8Array || ArrayBuffer.isView(type)) return Buffer.from(type as Uint8Array).toString('hex');
      if (type && typeof type === 'object' && 'bytes' in type) {
        return Buffer.from((type as { bytes: Uint8Array }).bytes).toString('hex');
      }
      try {
        return JSON.stringify(type) ?? String(type);
      } catch {
        return String(type);
      }
    };
    const sum = (list: readonly { value: bigint; type: unknown }[] | undefined): Record<string, string> => {
      const totals = new Map<string, bigint>();
      for (const entry of list ?? []) {
        const key = tokenKey(entry.type);
        totals.set(key, (totals.get(key) ?? 0n) + entry.value);
      }
      return Object.fromEntries([...totals].map(([key, value]) => [key, value.toString()]));
    };
    const deltas = (map: Map<unknown, bigint> | undefined): Record<string, string> =>
      Object.fromEntries([...(map ?? [])].map(([token, value]) => [tokenKey(token), value.toString()]));
    for (const [segment, intent] of intents ?? []) {
      const guaranteed = intent.guaranteedUnshieldedOffer;
      const fallible = intent.fallibleUnshieldedOffer;
      const dust = intent.dustActions;
      report[String(segment)] = {
        guaranteed: guaranteed
          ? { inputs: sum(guaranteed.inputs), outputs: sum(guaranteed.outputs), signatures: guaranteed.signatures.length }
          : null,
        fallible: fallible
          ? { inputs: sum(fallible.inputs), outputs: sum(fallible.outputs), signatures: fallible.signatures.length }
          : null,
        dust: dust
          ? {
              spends: dust.spends.length,
              vFeeSum: dust.spends.reduce((total, spend) => total + spend.vFee, 0n).toString(),
              registrations: dust.registrations.length,
              allowSum: dust.registrations.reduce((total, reg) => total + reg.allowFeePayment, 0n).toString(),
            }
          : null,
        imbalances: Object.fromEntries([...tx.imbalances(segment)].map(([token, value]) => [tokenKey(token), value.toString()])),
        actions: intent.actions.length,
        ttl: intent.ttl.toISOString(),
      };
    }
    report['@tx'] = {
      guaranteedDeltas: tx.guaranteedOffer ? deltas(tx.guaranteedOffer.deltas) : null,
      fallibleDeltas: tx.fallibleOffer
        ? Object.fromEntries([...tx.fallibleOffer].map(([segment, offer]) => [String(segment), deltas(offer.deltas)]))
        : null,
    };
    console.error(`[amm:preprod] segments ${label}`, report);
  } catch (error) {
    console.error('[amm:preprod] segments dump failed', error);
  }
}

/**
 * Submit a finalized transaction over the preprod RPC — unsigned
 * `sendMnTransaction`, verified in scripts/preprod-deploy.mjs. The polkadot
 * client connects per call (create → send → disconnect).
 */
async function submitFinalizedTransaction(
  rpcUri: string,
  tx: { serialize(): Uint8Array },
): Promise<{ nodeTxHash: string }> {
  // Same side-effect import as the verified deploy path.
  await import('@midnight-ntwrk/wallet-sdk-node-client/effect');
  const url = new URL(rpcUri);
  if (url.protocol !== 'wss:' && url.protocol !== 'ws:') {
    throw new Error(`Midnight node URL must use ws:// or wss://. Received: ${rpcUri}`);
  }
  const api = await ApiPromise.create({
    provider: new WsProvider(url.toString()),
    throwOnConnect: false,
    noInitWarn: true,
  });
  try {
    console.error(`[amm:preprod] submitting via polkadot → ${rpcUri}`);
    const started = Date.now();
    const txHash = normalizeHex((await api.tx.midnight.sendMnTransaction(u8aToHex(tx.serialize())).send()).toString());
    console.error(`[amm:preprod] submitted in ${Date.now() - started}ms`, { nodeTxHash: txHash });
    return { nodeTxHash: txHash };
  } finally {
    await api.disconnect();
  }
}

/**
 * Connect AmmApi to the deployed pool on preprod using the agent seed wallet
 * (keys from the seed file; live coin enumeration via midnight-wallet-cli).
 */
export async function createPreprodAmm(options: PreprodAmmOptions = {}): Promise<PreprodAmm> {
  setNetworkId(PREPROD_NETWORK_ID);
  const networkId = getNetworkId();

  const contractAddress = (options.contractAddress ?? DEFAULT_PREPROD_CONTRACT) as ContractAddress;
  const managedDir = resolve(options.managedDir ?? process.env.AMM_MANAGED_DIR ?? DEFAULT_MANAGED_DIR);
  const seedPath = resolve(options.seedPath ?? process.env.AMM_SEED_PATH ?? DEFAULT_SEED_PATH);
  const vaultPath = resolve(options.vaultPath ?? process.env.AMM_VAULT_PATH ?? DEFAULT_VAULT_PATH);
  const proofServerUri = options.proofServerUri ?? process.env.AMM_PROOF_SERVER ?? DEFAULT_PROOF_SERVER_URI;
  // /balance-only is a ProofStation sponsor feature (local proof servers 404 it);
  // keep them separable so /prove can run elsewhere (e.g. the local prover)
  // when the hosted gateway times out (524) on big proving keys.
  const balanceServerUri = process.env.AMM_BALANCE_SERVER ?? proofServerUri;
  const indexerUri = options.indexerUri ?? DEFAULT_INDEXER_URI;
  const indexerWsUri = options.indexerWsUri ?? DEFAULT_INDEXER_WS_URI;
  const rpcUri = options.rpcUri ?? DEFAULT_RPC_URI;
  const apiKey = process.env.PROOFSTATION_API_KEY || undefined;

  const managedOk =
    existsSync(join(managedDir, 'contract', 'index.js')) &&
    existsSync(join(managedDir, 'keys', 'faucet.prover')) &&
    existsSync(join(managedDir, 'zkir', 'faucet.zkir'));
  if (!managedOk) {
    throw new Error(`compiled artifacts missing under ${managedDir} (run: npm run compile:pool -w contract)`);
  }

  const { coinPublicKey, encryptionPublicKey, signData } = deriveAgentKeys(seedPath);
  console.error('[amm:preprod] agent keys derived', { seedPath, coinPublicKey });

  // Wallet-funding path: `midnight serve` (same seed → same keys) signs the
  // intents AND adds the shielded coin inputs that receiveShielded leaves out
  // (root cause of node errors 138/182 on the seed tx). The sponsor
  // /balance-only below only covers fees/dust — it stays as fallback for
  // funding-less calls (faucet re-mint, pause, views) and when serve is down.
  const serveUrl = options.serveUrl ?? process.env.AMM_SERVE_URL ?? DEFAULT_SERVE_URL;
  const serve = new ServeRpc();
  try {
    await serve.connect(serveUrl);
    console.error('[amm:preprod] wallet serve connected', { serveUrl });
  } catch (error) {
    console.error('[amm:preprod] wallet serve unavailable — shielded-receive calls will need it (seed/swap)', {
      serveUrl,
      error: String(error),
    });
  }

  let lastBalanceResult: { txHash?: string; txId?: string } | null = null;

  const finalize = (txHex: string): Transaction<SignatureEnabled, Proof, Binding> =>
    Transaction.deserialize<SignatureEnabled, Proof, Binding>('signature', 'proof', 'binding', fromHex(txHex));
  const submit = async (tx: { serialize(): Uint8Array; identifiers(): string[] }): Promise<string> => {
    const nodeSubmitResult = await submitFinalizedTransaction(rpcUri, tx);
    const identifiers = tx.identifiers();
    return normalizeHex(identifiers[0] ?? lastBalanceResult?.txId ?? lastBalanceResult?.txHash ?? nodeSubmitResult.nodeTxHash);
  };

  const walletProvider = {
    getCoinPublicKey: () => coinPublicKey,
    getEncryptionPublicKey: () => encryptionPublicKey,
    async balanceTx(tx: UnboundTransaction): Promise<Transaction<SignatureEnabled, Proof, Binding>> {
      dumpSegments('pre-balance', tx);
      // Keep raw bytes for offline introspection when the node rejects a tx.
      const txStamp = `${Date.now()}`;
      try {
        writeFileSync(`/tmp/opencode/mn-tx-${txStamp}-pre.hex`, Buffer.from(tx.serialize()).toString('hex'));
      } catch {
        // diagnostics only
      }

      // Preferred: wallet serve adds user coin inputs + signs (needed by
      // seed/swap); sponsor /balance-only below cannot fund shielded receives.
      // A tx this wallet just submitted keeps its DUST UTXOs locked until it
      // lands and the wallet re-applies its dust events; balance then fails
      // instantly with "Insufficient funds". Retry through that window rather
      // than dropping to the sponsor path (which cannot fund shielded receives
      // and earns 1010/170 InvalidDustSpendProof when its own dust state is stale).
      if (serve.connected) {
        for (let attempt = 1; attempt <= 4; attempt++) {
          const started = Date.now();
          try {
            const response = await serve.call<{ tx: string }>('balanceUnsealedTransaction', { tx: toHex(tx.serialize()) });
            console.error(`[amm:preprod] serve balance ok in ${Date.now() - started}ms`);
            try {
              writeFileSync(`/tmp/opencode/mn-tx-${txStamp}-serve-balanced.hex`, Buffer.from(finalize(response.tx).serialize()).toString('hex'));
            } catch {
              // diagnostics only
            }
            const finalized = finalize(response.tx);
            dumpSegments('serve-balanced', finalized);
            return finalized;
          } catch (error) {
            console.error(`[amm:preprod] serve balance failed after ${Date.now() - started}ms (attempt ${attempt}/4)`, error);
            if (attempt < 4) await sleep(15_000);
          }
        }
        console.error('[amm:preprod] serve balance exhausted retries — sponsor fallback');
      }

      // Sign unshielded intents with the agent Night key (verified shape in
      // scripts/preprod-deploy.mjs); shielded-only calls skip the loop.
      const intents = tx.intents;
      if (intents) {
        for (const [segment, intent] of intents) {
          const cloned = Intent.deserialize<SignatureEnabled, Proof, PreBinding>(
            'signature',
            'proof',
            'pre-binding',
            intent.serialize(),
          );
          const signature = signData(cloned.signatureData(segment));
          const fallibleOffer = cloned.fallibleUnshieldedOffer;
          if (fallibleOffer) {
            cloned.fallibleUnshieldedOffer = fallibleOffer.addSignatures(
              fallibleOffer.inputs.map((_, index) => fallibleOffer.signatures.at(index) ?? signature),
            );
          }
          const guaranteedOffer = cloned.guaranteedUnshieldedOffer;
          if (guaranteedOffer) {
            cloned.guaranteedUnshieldedOffer = guaranteedOffer.addSignatures(
              guaranteedOffer.inputs.map((_, index) => guaranteedOffer.signatures.at(index) ?? signature),
            );
          }
          intents.set(segment, cloned);
        }
      }
      const balanced = await balanceOnly(balanceServerUri, tx.serialize(), apiKey);
      lastBalanceResult = { txHash: balanced.txHash, txId: balanced.txId };
      try {
        writeFileSync(`/tmp/opencode/mn-tx-${txStamp}-balanced.hex`, balanced.tx);
      } catch {
        // diagnostics only
      }
      const finalized = finalize(balanced.tx);
      dumpSegments('balanced', finalized);
      return finalized;
    },
    async submitTx(tx: { serialize(): Uint8Array; identifiers(): string[] }): Promise<string> {
      const identifier = (): string => {
        const id = tx.identifiers()[0] ?? lastBalanceResult?.txId ?? lastBalanceResult?.txHash;
        if (!id) throw new Error('balanced transaction has no identifiers');
        return normalizeHex(id);
      };
      if (serve.connected) {
        const started = Date.now();
        try {
          await serve.call('submitTransaction', { tx: toHex(tx.serialize()) });
          console.error(`[amm:preprod] serve submit ok in ${Date.now() - started}ms`);
          return identifier();
        } catch (error) {
          console.error(`[amm:preprod] serve submit failed after ${Date.now() - started}ms`, error);
          // Only fall back when the connection itself dropped before the node
          // saw the tx — otherwise a retry could double-submit.
          if (serve.connected) throw error;
          console.error('[amm:preprod] serve dropped — submitting balanced tx via node RPC');
        }
      }
      return submit(tx);
    },
  };

  const zkConfigProvider = new NodeZkConfigProvider(managedDir);
  const providers = {
    privateStateProvider: levelPrivateStateProvider({
      privateStateStoreName: `${poolPrivateStateKey}_preprod`,
      privateStoragePasswordProvider: () => Promise.resolve(PRIVATE_STORAGE_PASSWORD),
      accountId: 'mn-preprod-cli',
    }),
    publicDataProvider: indexerPublicDataProvider(indexerUri, indexerWsUri),
    zkConfigProvider,
    proofProvider: withProveRetry(
      httpClientProofProvider(proofServerUri, zkConfigProvider, {
        timeout: PROOF_TIMEOUT_MS,
        ...(apiKey ? { headers: { 'X-API-Key': apiKey } } : {}),
      }),
      // CLI has no wallet-native prover fallback — retry connection blips too.
      // AMM_PROVE_ATTEMPTS raises the budget for Cloudflare-524'd big circuits.
      {
        retryFastFailures: true,
        attempts: Number(process.env.AMM_PROVE_ATTEMPTS ?? '3'),
      },
    ),
    walletProvider,
    midnightProvider: { submitTx: walletProvider.submitTx },
  } as unknown as PoolProviders;

  const compiledContract = CompiledContract.make('pool', PoolContract.Contract).pipe(
    (c) => CompiledContract.withWitnesses(c, witnesses),
    (c) => CompiledContract.withCompiledFileAssets(c, managedDir),
  );

  // Same private-state secret rule as browser.ts (Bech32m- and hex-aware).
  const secretKey = hexToBytes(parseCoinPublicKeyToHex(coinPublicKey, networkId).slice(0, 64));
  const initialPrivateState = createLeaderboardPrivateState(secretKey);

  const vault = createPersistentVault(`mn-amm:vault:${contractAddress}:${coinPublicKey}`, fileVaultStorage(vaultPath));
  // Live coins: `midnight balance --shielded --force-shielded` is the only
  // enumeration of unspent custom-color coins on preprod. The file vault stays
  // as fallback when the wallet CLI or its cache is unavailable (it may lag:
  // spent/received coins are not auto-reconciled).
  const walletName = options.wallet ?? process.env.AMM_WALLET ?? 'mn-amm-agent';
  const liveCoins: CoinSource = () =>
    readWalletCoins({
      syncWallet: true,
      shieldedSync: shieldedSyncRequired(networkId),
      wallet: walletName,
      networkId,
      shieldedCoinPublicKey: coinPublicKey,
    });
  const coins: CoinSource = async () => {
    try {
      return await liveCoins();
    } catch (cause) {
      options.logger?.warn({ cause: String(cause) }, 'live wallet cache unavailable; falling back to vault coins');
      return vault.source();
    }
  };

  const api = await AmmApi.connect({
    providers,
    contractAddress,
    compiledContract,
    initialPrivateState,
    privateStateId: poolPrivateStateKey,
    coins,
    logger: options.logger,
  });

  return {
    api,
    vault,
    coinPublicKey,
    close: () => {
      serve.close();
      // polkadot connects per submit; the level private-state store stays open
      // by design (same as node.ts).
    },
  };
}
