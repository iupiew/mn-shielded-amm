/**
 * Node-side transport wiring for {@link AmmApi}.
 *
 * Assembled from `.spike/m3-harness.mjs`, which was verified live against the
 * local devnet (deploy, faucet, seed, swap, views). Uses the globally running
 * `midnight-wallet-cli serve` JSON-RPC endpoint (ws://127.0.0.1:9932) for
 * wallet operations, the local indexer for state, and the local proof-server.
 *
 * UNVERIFIED (node-only, marked where used): wallet coin cache refresh relies
 * on spawning `midnight-wallet-cli balance` to sync the on-disk zswap state;
 * verified end-to-end by `.spike/api-smoke.mjs` after build.
 * @module
 */

import { CompiledContract } from '@midnight-ntwrk/compact-js';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { toHex, fromHex } from '@midnight-ntwrk/midnight-js-utils';
import { Transaction } from '@midnight-ntwrk/midnight-js-types';
import { type ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { ZswapLocalState } from '@midnight-ntwrk/ledger-v8';
import { type Logger } from 'pino';
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import * as PoolContract from '../../../contract/managed/pool/contract/index.js';
import { createLeaderboardPrivateState, witnesses } from '../../../contract/src/witnesses.js';
import { AmmApi } from './api.js';
import { type CoinSource, type PoolProviders, type WalletCoin, poolPrivateStateKey } from './types.js';

const DEFAULT_SERVE_URL = 'ws://127.0.0.1:9932';
const DEFAULT_INDEXER_URL = 'http://localhost:8088/api/v4/graphql';
const DEFAULT_INDEXER_WS_URL = 'ws://localhost:8088/api/v4/graphql/ws';
const DEFAULT_PROOF_URL = 'http://localhost:6300';
const DEFAULT_MANAGED_DIR = 'contract/managed/pool';
const DEFAULT_WALLET = 'devnet-main';
/** Guards the api's own level store (not the wallet's); keep stable across runs. */
const PRIVATE_STORAGE_PASSWORD = 'mn-contract-default-pwd-16ch';

export interface NodeAmmOptions {
  readonly contractAddress: ContractAddress;
  /** Wallet name passed to `midnight-wallet-cli` when refreshing coins. Default 'devnet-main'. */
  readonly wallet?: string;
  /** Midnight network id (cache subdirectory). Default 'undeployed'. */
  readonly networkId?: string;
  readonly serveUrl?: string;
  readonly indexerUrl?: string;
  readonly indexerWsUrl?: string;
  readonly proofUrl?: string;
  /** Compiled artifacts dir, cwd-relative. Default 'contract/managed/pool'. */
  readonly managedDir?: string;
  /** Spawn `midnight-wallet-cli balance` before every coin read to refresh state. Default true. */
  readonly syncWallet?: boolean;
  /** Suffix isolating this instance's private-state store (also honored via PSSUFFIX). */
  readonly storeSuffix?: string;
  readonly logger?: Logger;
}

export interface NodeAmm {
  readonly api: AmmApi;
  /** Closes the serve RPC connection. */
  close(): void;
}

/** Minimal JSON-RPC client over Node's built-in WebSocket (no `ws` dependency). */
class ServeRpc {
  private ws: WebSocket | undefined;
  private nextId = 0;
  private readonly pending = new Map<number, { resolve: (value: any) => void; reject: (error: Error) => void }>();

  async connect(url: string): Promise<void> {
    await new Promise<void>((resolveConnect, reject) => {
      const ws = new WebSocket(url);
      const onError = () => reject(new Error(`mn serve unreachable at ${url} (is 'midnight-wallet-cli serve' running?)`));
      ws.addEventListener('error', onError, { once: true });
      ws.addEventListener(
        'open',
        () => {
          ws.removeEventListener('error', onError);
          this.ws = ws;
          ws.addEventListener('message', (event) => this.onMessage(event));
          ws.addEventListener('close', () => {
            for (const { reject: rejectPending } of this.pending.values()) rejectPending(new Error('mn serve connection closed'));
            this.pending.clear();
          });
          resolveConnect();
        },
        { once: true },
      );
    });
  }

  private onMessage(event: MessageEvent): void {
    const handle = (text: string): void => {
      let message: { id?: number; result?: unknown; error?: { message?: string } };
      try {
        message = JSON.parse(text);
      } catch {
        return;
      }
      if (typeof message.id !== 'number') return;
      const waiter = this.pending.get(message.id);
      if (!waiter) return;
      this.pending.delete(message.id);
      if (message.error) waiter.reject(new Error(message.error.message || JSON.stringify(message.error)));
      else waiter.resolve(message.result);
    };
    if (typeof event.data === 'string') handle(event.data);
    else if (event.data instanceof Blob) void event.data.text().then(handle);
  }

  call<T>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    const ws = this.ws;
    if (!ws) return Promise.reject(new Error('mn serve RPC not connected'));
    const id = ++this.nextId;
    return new Promise<T>((resolveCall, reject) => {
      this.pending.set(id, { resolve: resolveCall, reject });
      ws.send(JSON.stringify({ jsonrpc: '2.0', id, method, params }));
    });
  }

  close(): void {
    this.ws?.close();
    this.ws = undefined;
  }
}

/**
 * Private-state secret derivation, same rule as the wallet CLI
 * (`resolvePrivateStateSecretKey`): MN_PRIVATE_STATE_SECRET (64 hex) wins,
 * else bytes of the shielded coin public key.
 */
function resolveSecretKey(shieldedCoinPublicKey: string): Uint8Array {
  const env = process.env.MN_PRIVATE_STATE_SECRET;
  if (env && env.length >= 64) return hexToBytesLocal(env.slice(0, 64));
  if (shieldedCoinPublicKey && shieldedCoinPublicKey.length >= 64) return hexToBytesLocal(shieldedCoinPublicKey.slice(0, 64));
  return globalThis.crypto.getRandomValues(new Uint8Array(32));
}

function hexToBytesLocal(hex: string): Uint8Array {
  return Uint8Array.from(hex.match(/.{2}/g)!.map((b) => parseInt(b, 16)));
}

/**
 * Connect AmmApi to a deployed pool using local devnet services.
 * Requires: `midnight-wallet-cli serve` (wallet), local indexer + proof-server,
 * and compiled artifacts under the managed dir.
 */
export async function createNodeAmm(options: NodeAmmOptions): Promise<NodeAmm> {
  const networkId = options.networkId ?? 'undeployed';
  setNetworkId(networkId);

  const wallet = options.wallet ?? DEFAULT_WALLET;
  const managedDir = resolve(options.managedDir ?? DEFAULT_MANAGED_DIR);
  const storeSuffix = options.storeSuffix ?? (process.env.PSSUFFIX ? `_${process.env.PSSUFFIX}` : '');
  const privateStateId = poolPrivateStateKey + storeSuffix;

  const rpc = new ServeRpc();
  await rpc.connect(options.serveUrl ?? DEFAULT_SERVE_URL);
  try {
    const addresses = await rpc.call<{ shieldedCoinPublicKey: string; shieldedEncryptionPublicKey: string }>('getShieldedAddresses', {});
    const initialPrivateState = createLeaderboardPrivateState(resolveSecretKey(addresses.shieldedCoinPublicKey));

    const compiled = CompiledContract.make('pool', PoolContract.Contract).pipe(
      (c) => CompiledContract.withWitnesses(c, witnesses),
      (c) => CompiledContract.withCompiledFileAssets(c, managedDir),
    );

    const walletProvider = {
      getCoinPublicKey: () => addresses.shieldedCoinPublicKey ?? '',
      getEncryptionPublicKey: () => addresses.shieldedEncryptionPublicKey ?? '',
      async balanceTx(tx: { serialize(): Uint8Array }) {
        const response = await rpc.call<{ tx: string }>('balanceUnsealedTransaction', { tx: toHex(tx.serialize()) });
        return Transaction.deserialize('signature', 'proof', 'binding', fromHex(response.tx));
      },
      async submitTx(tx: { serialize(): Uint8Array; identifiers(): string[] }) {
        await rpc.call('submitTransaction', { tx: toHex(tx.serialize()) });
        return tx.identifiers()[0];
      },
    };

    const zkConfigProvider = new NodeZkConfigProvider(managedDir);
    const providers = {
      privateStateProvider: levelPrivateStateProvider({
        privateStateStoreName: privateStateId,
        privateStoragePasswordProvider: () => Promise.resolve(PRIVATE_STORAGE_PASSWORD),
        accountId: 'mn-contract-runner',
      }),
      publicDataProvider: indexerPublicDataProvider(options.indexerUrl ?? DEFAULT_INDEXER_URL, options.indexerWsUrl ?? DEFAULT_INDEXER_WS_URL),
      zkConfigProvider,
      proofProvider: httpClientProofProvider(options.proofUrl ?? DEFAULT_PROOF_URL, zkConfigProvider),
      walletProvider,
      midnightProvider: walletProvider,
    } as unknown as PoolProviders;

    const coinSource: CoinSource = async () => readWalletCoins({
      syncWallet: options.syncWallet !== false,
      wallet,
      networkId,
      shieldedCoinPublicKey: addresses.shieldedCoinPublicKey,
    });

    const api = await AmmApi.connect({
      providers,
      contractAddress: options.contractAddress,
      compiledContract: compiled,
      initialPrivateState,
      privateStateId,
      coins: coinSource,
      logger: options.logger,
    });
    return { api, close: () => rpc.close() };
  } catch (error) {
    rpc.close();
    throw error;
  }
}

/**
 * Read the wallet's unspent shielded coins from the on-disk zswap cache.
 *
 * UNVERIFIED: cache is only refreshed when a wallet operation runs against the
 * node, so (unless disabled) we spawn `midnight-wallet-cli balance --json`
 * first; if that fails (CLI not on PATH) we fall back to the last known state.
 * The cache filename scheme is not stable across versions, so files are
 * matched by their `coinPublicKeyHex` field instead.
 */
/**
 * Refresh the on-disk shielded coin cache by running `midnight-wallet-cli balance`.
 *
 * Exported so long-lived hosts (e.g. the UI bridge) can sync explicitly before
 * coin-sensitive operations while keeping non-coin reads sync-free.
 * Runs synchronously; output ignored — a fresh cache file is the success signal.
 */
export function syncWalletCache(wallet = DEFAULT_WALLET): void {
  spawnSync('midnight-wallet-cli', ['balance', '--json', '--wallet', wallet], { encoding: 'utf8', timeout: 120000 });
}

function readWalletCoins(options: { syncWallet: boolean; wallet: string; networkId: string; shieldedCoinPublicKey: string }): Promise<WalletCoin[]> {
  if (options.syncWallet) {
    syncWalletCache(options.wallet);
  }
  const cacheDir = join(homedir(), '.midnight', 'cache', options.networkId);
  let candidates: string[];
  try {
    candidates = readdirSync(cacheDir).filter((name) => name.startsWith('shielded-') && name.endsWith('.json'));
  } catch (cause) {
    throw new Error(`cannot read wallet cache dir at ${cacheDir} (wallet sync may have failed): ${String(cause)}`);
  }
  const pk = options.shieldedCoinPublicKey.toLowerCase();
  let cache: { zswapState?: string } | undefined;
  for (const name of candidates) {
    const parsed = JSON.parse(readFileSync(join(cacheDir, name), 'utf8')) as { zswapState?: string; coinPublicKeyHex?: string };
    if (parsed.coinPublicKeyHex?.toLowerCase() === pk) {
      cache = parsed;
      break;
    }
  }
  if (!cache) {
    throw new Error(`no wallet coin cache in ${cacheDir} matching coinPublicKeyHex ${pk} (found: ${candidates.join(', ') || 'none'}); run 'midnight-wallet-cli balance' to sync`);
  }
  if (!cache.zswapState) throw new Error(`wallet coin cache for ${pk} has no zswapState field`);
  const state = ZswapLocalState.deserialize(Uint8Array.from(Buffer.from(cache.zswapState, 'hex')));
  const coins: WalletCoin[] = [...state.coins].map((coin) => ({ nonceHex: coin.nonce, colorHex: coin.type, value: coin.value }));
  return Promise.resolve(coins);
}
