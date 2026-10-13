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
import { type Logger } from 'pino';
import { resolve } from 'node:path';
import * as PoolContract from '../../../contract/managed/pool/contract/index.js';
import { createPoolPrivateState, witnesses } from '../../../contract/src/witnesses.js';
import { AmmApi } from './api.js';
import { ServeRpc } from './serve-rpc.js';
import { DEFAULT_WALLET, readWalletCoins, shieldedSyncRequired, syncWalletCache } from './wallet-cache.js';
import { type CoinSource, type PoolProviders, poolPrivateStateKey } from './types.js';

export { shieldedSyncRequired, syncWalletCache } from './wallet-cache.js';

const DEFAULT_SERVE_URL = 'ws://127.0.0.1:9932';
const DEFAULT_INDEXER_URL = 'http://localhost:8088/api/v4/graphql';
const DEFAULT_INDEXER_WS_URL = 'ws://localhost:8088/api/v4/graphql/ws';
const DEFAULT_PROOF_URL = 'http://localhost:6300';
const DEFAULT_MANAGED_DIR = 'contract/managed/pool';
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
  await rpc.connect(options.serveUrl ?? process.env.AMM_SERVE_URL ?? DEFAULT_SERVE_URL);
  try {
    const addresses = await rpc.call<{ shieldedCoinPublicKey: string; shieldedEncryptionPublicKey: string }>('getShieldedAddresses', {});
    const initialPrivateState = createPoolPrivateState(resolveSecretKey(addresses.shieldedCoinPublicKey));

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
      shieldedSync: shieldedSyncRequired(networkId),
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
