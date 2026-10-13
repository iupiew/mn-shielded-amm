/**
 * Browser-side transport wiring for {@link AmmApi}.
 *
 * Connects a Midnight DApp-connector wallet (1AM preferred, Lace acceptable),
 * assembles providers, and delegates to AmmApi. All zk artifacts are fetched
 * over HTTP from `public/contract/compiled/pool/` (populated by
 * `1am proof bundle`), so no filesystem access is needed.
 *
 * UNVERIFIED (browser-only): provider fallback URIs below are copied from
 * 1am NETWORKS preprod defaults / Midnight docs; runtime `getConfiguration()`
 * takes precedence when the wallet supplies one.
 * @module
 */

import { CompiledContract } from '@midnight-ntwrk/compact-js';
import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { getNetworkId, setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { parseCoinPublicKeyToHex, toHex, fromHex } from '@midnight-ntwrk/midnight-js-utils';
import { Transaction, createProofProvider } from '@midnight-ntwrk/midnight-js-types';
import type { ConnectedAPI, Configuration, InitialAPI } from '@midnight-ntwrk/dapp-connector-api';
import type { ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import * as PoolContract from '../../../contract/managed/pool/contract/index.js';
import { createLeaderboardPrivateState, witnesses } from '../../../contract/src/witnesses.js';
import { AmmApi } from './api.js';
import { inMemoryPrivateStateProvider } from './in-memory-private-state-provider.js';
import { withProveRetry } from './prove-retry.js';
import { createPersistentVault, createVault, type Vault } from './vault.js';
import {
  type CoinSource,
  type PoolPrivateState,
  type PoolProviders,
  poolPrivateStateKey,
  hexToBytes,
} from './types.js';

/** Preferred wallet (1AM). */
export const PREFERRED_WALLET_RDNS = 'com.midnight.1am';

/** Connector API major versions we accept (4.x). */
const COMPATIBLE_CONNECTOR_API_VERSION_PREFIX = '4.';

/** UNVERIFIED fallbacks — overridden by wallet getConfiguration() when present. */
const FALLBACK_INDEXER_URI = 'https://indexer.preprod.midnight.network/api/v4/graphql';
const FALLBACK_INDEXER_WS_URI = 'wss://indexer.preprod.midnight.network/api/v4/graphql/ws';
const FALLBACK_PROVER_SERVER_URI = 'https://api-preprod.1am.xyz';
/**
 * The old preprod indexer was decommissioned 2026-10-09 (HTTP 410, "now
 * provided by Blockfrost"), but 1AM NETWORKS preprod defaults still point at
 * it — a wallet config referencing this host gets rewritten to Blockfrost.
 */
const DECOMMISSIONED_INDEXER_HOST = 'indexer.preprod.midnight.network';
const BLOCKFROST_INDEXER_HTTP = 'https://midnight-preprod.blockfrost.io/api/v0';
const BLOCKFROST_INDEXER_WS = 'wss://midnight-preprod.blockfrost.io/api/v0/ws';
/** ProofStation /check|/prove client timeout — the 300 s default is too short for the 19 MB faucet/swap proving keys. */
const PROOF_TIMEOUT_MS = 900_000;
/** Fall back to the wallet-native prover only on fast failures (<10 s); slow failures would just repeat the same way after a second long wait. */
const PROVE_FAST_FAIL_FALLBACK_MS = 10_000;

export const DEFAULT_NETWORK_ID = 'preprod';
/** zk artifacts served from vite's publicDir (1am proof bundle output). */
export const DEFAULT_ZK_BASE_PATH = '/contract/compiled/pool';

export interface WalletInfo {
  /** Key under window.midnight (rdns, UUID, or wallet-assigned). */
  readonly key: string;
  readonly rdns: string;
  readonly name: string;
  readonly icon?: string;
  readonly apiVersion: string;
}

export interface BrowserAmmOptions {
  /** Deployed pool contract address (bech32m, preprod). */
  readonly contractAddress: ContractAddress;
  /** Midnight network id. Default 'preprod'. */
  readonly networkId?: string;
  /** window.midnight key to connect to. Default: preferred wallet, else first 4.x. */
  readonly walletKey?: string;
  /** Base URL/path for zk artifacts. Default `${origin}${DEFAULT_ZK_BASE_PATH}`. */
  readonly zkBaseUri?: string;
  /** Blockfrost project id — required when the wallet config references the decommissioned preprod indexer. */
  readonly indexerProjectId?: string;
  /**
   * Proof server for in-browser proving. Overrides the wallet's
   * getConfiguration().proverServerUri; unset → wallet config, else the
   * hosted ProofStation. Point at the local proof server
   * (http://127.0.0.1:6300, CORS-open) to dodge hosted 524 timeouts.
   */
  readonly proverServerUri?: string;
}

export interface BrowserAmm {
  readonly api: AmmApi;
  readonly connected: ConnectedAPI;
  readonly wallet: WalletInfo;
  readonly vault: Vault;
  readonly networkId: string;
  readonly contractAddress: ContractAddress;
}

/** Scan window.midnight for connector APIs. Empty if no wallet injected yet. */
export function listWallets(): WalletInfo[] {
  const midnight = (window as unknown as { midnight?: Record<string, InitialAPI> }).midnight;
  if (!midnight) return [];
  return Object.entries(midnight)
    .filter(([, api]) => api && typeof api === 'object' && typeof api.apiVersion === 'string')
    .map(([key, api]) => ({
      key,
      rdns: api.rdns ?? '',
      name: api.name ?? key,
      icon: api.icon,
      apiVersion: api.apiVersion,
    }));
}

function isCompatible(api: InitialAPI | undefined): api is InitialAPI {
  return !!api && typeof api.apiVersion === 'string' && api.apiVersion.startsWith(COMPATIBLE_CONNECTOR_API_VERSION_PREFIX);
}

function pickInitialAPI(walletKey?: string): { key: string; api: InitialAPI } {
  const midnight = (window as unknown as { midnight?: Record<string, InitialAPI> }).midnight ?? {};
  if (walletKey) {
    const api = midnight[walletKey];
    if (!isCompatible(api)) throw new Error(`Wallet '${walletKey}' not found or incompatible (need apiVersion ${COMPATIBLE_CONNECTOR_API_VERSION_PREFIX}.x). Available: ${listWallets().map((w) => w.key).join(', ') || 'none'}`);
    return { key: walletKey, api };
  }
  const preferred = Object.entries(midnight).find(([, api]) => isCompatible(api) && api.rdns === PREFERRED_WALLET_RDNS);
  if (preferred) return { key: preferred[0], api: preferred[1] };
  const anyCompatible = Object.entries(midnight).find(([, api]) => isCompatible(api));
  if (anyCompatible) return { key: anyCompatible[0], api: anyCompatible[1] };
  throw new Error(
    'No Midnight wallet detected. Install and unlock the 1AM extension (https://1am.xyz), then reload. Detected wallets: ' +
      (listWallets().map((w) => `${w.name} (${w.apiVersion})`).join(', ') || 'none'),
  );
}

/**
 * Resolve the private-state secret key: bytes of the shielded coin public key
 * (same rule as node.ts / preprod-deploy.mjs). The connector spec returns
 * addresses in Bech32m — normalize via parseCoinPublicKeyToHex first so the
 * owner/coin witnesses derive from the same bytes as the deployer's.
 */
function resolveSecretKey(shieldedCoinPublicKey: string): Uint8Array {
  if (!shieldedCoinPublicKey) throw new Error('Wallet did not return a shielded coin public key');
  const hex = parseCoinPublicKeyToHex(shieldedCoinPublicKey, getNetworkId());
  return hexToBytes(hex.slice(0, 64));
}

/**
 * Resolve the indexer URIs from wallet config (empty config → fallback),
 * transparently replacing the decommissioned host with the Blockfrost
 * endpoint. Throws an actionable error when a rewrite is needed but no
 * `indexerProjectId` was supplied.
 */
function resolveIndexerUris(
  config: Pick<Configuration, 'indexerUri' | 'indexerWsUri'>,
  indexerProjectId?: string,
): { indexerUri: string; indexerWsUri: string } {
  const indexerUri = config.indexerUri || FALLBACK_INDEXER_URI;
  const indexerWsUri = config.indexerWsUri || FALLBACK_INDEXER_WS_URI;
  const decommissioned = (uri: string) => uri.includes(DECOMMISSIONED_INDEXER_HOST);
  if (!decommissioned(indexerUri) && !decommissioned(indexerWsUri)) return { indexerUri, indexerWsUri };
  if (!indexerProjectId) {
    throw new Error(
      `Wallet config references ${DECOMMISSIONED_INDEXER_HOST} (decommissioned 2026-10-09) and no Blockfrost project id is configured — set VITE_MN_BLOCKFROST_PROJECT_ID.`,
    );
  }
  const query = `project_id=${encodeURIComponent(indexerProjectId)}`;
  return {
    indexerUri: decommissioned(indexerUri) ? `${BLOCKFROST_INDEXER_HTTP}?${query}` : indexerUri,
    indexerWsUri: decommissioned(indexerWsUri) ? `${BLOCKFROST_INDEXER_WS}?${query}` : indexerWsUri,
  };
}

/**
 * Connect wallet + providers + AmmApi for a deployed pool.
 * Call after `listWallets()` shows the target wallet (or pass walletKey).
 */
export async function createBrowserAmm(options: BrowserAmmOptions): Promise<BrowserAmm> {
  const networkId = options.networkId ?? DEFAULT_NETWORK_ID;
  setNetworkId(networkId);

  const { key, api: initial } = pickInitialAPI(options.walletKey);
  const connected = await initial.connect(networkId);

  const config = await connected.getConfiguration();
  const { indexerUri, indexerWsUri } = resolveIndexerUris(config, options.indexerProjectId);
  const proverServerUri = options.proverServerUri || config.proverServerUri || FALLBACK_PROVER_SERVER_URI;

  const addresses = await connected.getShieldedAddresses();
  const coinPublicKey = addresses.shieldedCoinPublicKey ?? '';
  const encryptionPublicKey = addresses.shieldedEncryptionPublicKey ?? '';

  const zkBaseUri = options.zkBaseUri ?? `${window.location.origin}${DEFAULT_ZK_BASE_PATH}`;
  const zkConfigProvider = new FetchZkConfigProvider(zkBaseUri, fetch.bind(window));

  // ProofStation /prove first: verified CORS-open from the page origin, with a
  // 900 s client timeout for the 19 MB faucet/swap proving keys (300 s default
  // was too short). Transient Cloudflare 524/429/timeouts are retried inside
  // withProveRetry; the 1AM wallet-native prover (circuit-level, wrapped via
  // createProofProvider) is fallback for FAST failures only.
  const httpProofProvider = withProveRetry(
    httpClientProofProvider(proverServerUri, zkConfigProvider, { timeout: PROOF_TIMEOUT_MS }),
  );
  let walletFallback: PoolProviders['proofProvider'] | undefined;
  try {
    walletFallback = createProofProvider(await connected.getProvingProvider(zkConfigProvider));
  } catch {
    // Wallet exposes no native prover — HTTP provider only.
  }
  console.info('[amm:prove] proof provider ready', {
    proverServerUri,
    timeoutMs: PROOF_TIMEOUT_MS,
    walletFallback: walletFallback !== undefined,
  });
  const proofProvider: PoolProviders['proofProvider'] = walletFallback
    ? {
        async proveTx(unprovenTx, proveTxConfig) {
          const started = performance.now();
          console.info(`[amm:prove] http attempt → ${proverServerUri}`);
          try {
            const result = await httpProofProvider.proveTx(unprovenTx, proveTxConfig);
            console.info(`[amm:prove] http ok in ${Math.round(performance.now() - started)}ms`);
            return result;
          } catch (err) {
            const elapsedMs = Math.round(performance.now() - started);
            console.error(`[amm:prove] http failed after ${elapsedMs}ms`, err);
            if (elapsedMs >= PROVE_FAST_FAIL_FALLBACK_MS) {
              console.error('[amm:prove] slow failure — wallet prover fallback skipped');
              throw err;
            }
            console.warn('[amm:prove] fast failure — retrying via wallet-native prover', err);
            return walletFallback.proveTx(unprovenTx, proveTxConfig);
          }
        },
      }
    : httpProofProvider;

  // Reload persistence: hydrate the last snapshot for this contract+wallet
  // (bigint-safe JSON); fall back to an in-memory vault when storage is
  // unavailable (private mode / sandboxed frame).
  const vault = (() => {
    try {
      return createPersistentVault(`mn-amm:vault:${options.contractAddress}:${coinPublicKey}`, window.localStorage);
    } catch {
      return createVault();
    }
  })();
  const coins: CoinSource = vault.source;

  const initialPrivateState = createLeaderboardPrivateState(resolveSecretKey(coinPublicKey));
  const privateStateId = poolPrivateStateKey;

  const walletProvider = {
    getCoinPublicKey: () => coinPublicKey,
    getEncryptionPublicKey: () => encryptionPublicKey,
    async balanceTx(tx: { serialize(): Uint8Array }) {
      const started = performance.now();
      const attempt = async () => {
        const received = await connected.balanceUnsealedTransaction(toHex(tx.serialize()));
        // UNVERIFIED generic deserialize — mirrors template BrowserLeaderboardManager.
        return Transaction.deserialize('signature', 'proof', 'binding', fromHex(received.tx));
      };
      try {
        return await attempt();
      } catch (err) {
        const elapsedMs = Math.round(performance.now() - started);
        console.error(`[amm] wallet.balanceUnsealedTransaction failed after ${elapsedMs}ms, retrying once`, err);
        try {
          return await attempt();
        } catch (err2) {
          const totalMs = Math.round(performance.now() - started);
          throw new Error(`wallet.balanceUnsealedTransaction failed after ${totalMs}ms: ${String(err2)}`, {
            cause: err2,
          });
        }
      }
    },
    async submitTx(tx: { serialize(): Uint8Array; identifiers(): string[] }): Promise<string> {
      const started = performance.now();
      try {
        await connected.submitTransaction(toHex(tx.serialize()));
      } catch (err) {
        const elapsedMs = Math.round(performance.now() - started);
        throw new Error(`wallet.submitTransaction failed after ${elapsedMs}ms: ${String(err)}`, { cause: err });
      }
      return tx.identifiers()[0];
    },
  };

  const providers = {
    privateStateProvider: inMemoryPrivateStateProvider<typeof poolPrivateStateKey, PoolPrivateState>(),
    zkConfigProvider,
    proofProvider,
    publicDataProvider: indexerPublicDataProvider(indexerUri, indexerWsUri),
    walletProvider,
    midnightProvider: { submitTx: walletProvider.submitTx },
  } as unknown as PoolProviders;

  const compiledContract = CompiledContract.make('pool', PoolContract.Contract).pipe(
    (c) => CompiledContract.withWitnesses(c, witnesses),
  );

  const api = await AmmApi.connect({
    providers,
    contractAddress: options.contractAddress,
    compiledContract,
    initialPrivateState,
    privateStateId,
    coins,
  });

  return {
    api,
    connected,
    wallet: {
      key,
      rdns: initial.rdns ?? '',
      name: initial.name ?? key,
      icon: initial.icon,
      apiVersion: initial.apiVersion,
    },
    vault,
    networkId,
    contractAddress: options.contractAddress,
  };
}
