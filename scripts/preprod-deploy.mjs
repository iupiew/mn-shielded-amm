#!/usr/bin/env node
/**
 * Preprod deploy for contract/pool.compact using the workspace stack.
 *
 * Replaces `1am deploy`, which bundles compact-runtime 0.15.0 / ledger-v8 8.0.3
 * and rejects artifacts compiled by compact 0.31.1 (runtime 0.16.0).
 * Deploys the exact `contract/managed/pool` artifacts that localnet tests and
 * the ui proof bundle already use, against hosted ProofStation.
 *
 * Usage:
 *   node scripts/preprod-deploy.mjs              # dry-run (default)
 *   node scripts/preprod-deploy.mjs --execute    # submit deploy tx
 *
 * Inputs:
 *   .spike/agent-seed-export.json   { seedHex, mnemonic }
 *   .spike/preprod-deploy-args.json [ownerIdHex, instanceSaltHex]
 *
 * Outputs:
 *   .spike/preprod-deploy.json      { contractAddress, txId, ... }
 *
 * Owner rule: ownerId = sha256(agentCoinPk || agentCoinPk) - the CLI agent
 * wallet owns pause/unpause. The browser wallet has a different coin public
 * key, so owner circuits fail there; faucet/seed/swap are OPEN.
 *
 * PROOFSTATION_API_KEY: set if the hosted server requires auth
 * (request at support@1am.xyz). Try without first.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { WebSocket } from 'ws';

const NETWORK_ID = 'preprod';
// Preprod indexer/RPC moved to Blockfrost on 2026-10-09 (Midnight-hosted
// endpoints decommissioned). Set BLOCKFROST_PROJECT_ID (Midnight Preprod
// project token) or the per-endpoint AMM_* overrides.
function loadRepoEnv(name) {
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
const withBlockfrostKey = (url) => (BLOCKFROST_PROJECT_ID ? `${url}?project_id=${encodeURIComponent(BLOCKFROST_PROJECT_ID)}` : url);
const INDEXER_URI =
  process.env.AMM_INDEXER_URI ??
  (BLOCKFROST_PROJECT_ID ? withBlockfrostKey('https://midnight-preprod.blockfrost.io/api/v0') : 'https://indexer.preprod.midnight.network/api/v4/graphql');
const INDEXER_WS_URI =
  process.env.AMM_INDEXER_WS_URI ??
  (BLOCKFROST_PROJECT_ID ? withBlockfrostKey('wss://midnight-preprod.blockfrost.io/api/v0/ws') : 'wss://indexer.preprod.midnight.network/api/v4/graphql/ws');
const RPC_URI =
  process.env.AMM_RPC_URI ??
  (BLOCKFROST_PROJECT_ID ? withBlockfrostKey('wss://rpc.midnight-preprod.blockfrost.io') : 'wss://rpc.preprod.midnight.network');
const PROOF_SERVER_URI = 'https://api-preprod.1am.xyz';
const MANAGED_DIR = resolve('contract/managed/pool');
const SEED_PATH = resolve('.spike/agent-seed-export.json');
const ARGS_PATH = resolve('.spike/preprod-deploy-args.json');
const OUT_PATH = resolve('.spike/preprod-deploy.json');
const CONTRACT_NAME = 'pool';

const execute = process.argv.includes('--execute');
const apiKey = process.env.PROOFSTATION_API_KEY || undefined;

function hexToBytes(hex) {
  const normalized = String(hex).trim().replace(/^0x/i, '').toLowerCase();
  if (!/^[0-9a-f]*$/.test(normalized) || normalized.length % 2 !== 0) {
    throw new Error(`invalid hex string (len=${normalized.length})`);
  }
  const bytes = new Uint8Array(normalized.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(normalized.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

function normalizeHex(value) {
  return String(value).trim().replace(/^0x/i, '').toLowerCase();
}

function readJson(path) {
  if (!existsSync(path)) throw new Error(`missing file: ${path}`);
  return JSON.parse(readFileSync(path, 'utf8'));
}

async function balanceOnly(proofServerUrl, signedTxBytes, key) {
  const headers = { 'Content-Type': 'application/octet-stream' };
  if (key) headers['X-API-Key'] = key;
  const response = await fetch(`${proofServerUrl}/balance-only`, {
    method: 'POST',
    headers,
    body: Buffer.from(signedTxBytes),
    signal: AbortSignal.timeout(60_000),
  });
  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(`ProofStation balance-only non-JSON (${response.status}): ${text.slice(0, 200)}`);
  }
  if (!response.ok) {
    throw new Error(`ProofStation balance-only failed (${response.status}): ${String(body.message ?? body.error ?? text.slice(0, 200))}`);
  }
  const pick = (field) => {
    if (typeof body[field] === 'string') return body[field];
    for (const container of ['data', 'result']) {
      if (body[container] && typeof body[container] === 'object' && typeof body[container][field] === 'string') {
        return body[container][field];
      }
    }
    return undefined;
  };
  const tx = pick('tx') ?? pick('txBytes') ?? pick('transactionBytes');
  if (!tx) throw new Error(`ProofStation returned invalid balance response: ${JSON.stringify(body).slice(0, 300)}`);
  return { tx, txHash: pick('txHash'), txId: pick('txId') };
}

async function submitFinalizedTransaction(rpcUri, tx) {
  await import('@midnight-ntwrk/wallet-sdk-node-client/effect');
  const { ApiPromise, WsProvider } = await import('@polkadot/api');
  const { u8aToHex } = await import('@polkadot/util');
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
    const txHash = normalizeHex((await api.tx.midnight.sendMnTransaction(u8aToHex(tx.serialize())).send()).toString());
    return { nodeTxHash: txHash };
  } finally {
    await api.disconnect();
  }
}

async function main() {
  globalThis.WebSocket = WebSocket;

  const seedExport = readJson(SEED_PATH);
  const seedHex = normalizeHex(seedExport.seedHex);
  if (!/^[0-9a-f]{64}$/.test(seedHex)) throw new Error('agent-seed-export.json seedHex must be 64 hex chars');

  const rawArgs = readJson(ARGS_PATH);
  if (!Array.isArray(rawArgs) || rawArgs.length !== 2) throw new Error('preprod-deploy-args.json must be [ownerIdHex, instanceSaltHex]');
  const constructorArgs = rawArgs.map((v) => hexToBytes(v));
  for (const [i, arg] of constructorArgs.entries()) {
    if (arg.length !== 32) throw new Error(`constructor arg ${i} must be 32 bytes, got ${arg.length}`);
  }

  const managedOk =
    existsSync(join(MANAGED_DIR, 'contract', 'index.js')) &&
    existsSync(join(MANAGED_DIR, 'keys', 'faucet.prover')) &&
    existsSync(join(MANAGED_DIR, 'zkir', 'faucet.zkir'));
  if (!managedOk) throw new Error(`compiled artifacts missing under ${MANAGED_DIR} (run npm run compile:pool -w contract)`);

  console.log('=== preprod deploy (workspace stack) ===');
  console.log(`network:        ${NETWORK_ID}`);
  console.log(`managed dir:    ${MANAGED_DIR}`);
  console.log(`proof server:   ${PROOF_SERVER_URI}${apiKey ? ' (API key set)' : ' (no API key)'}`);
  console.log(`indexer:        ${INDEXER_URI}`);
  console.log(`rpc:            ${RPC_URI}`);
  console.log(`ownerId:        ${rawArgs[0]}`);
  console.log(`instanceSalt:   ${rawArgs[1]}`);
  console.log(`seed source:    ${SEED_PATH} (not printed)`);

  const { setNetworkId, getNetworkId } = await import('@midnight-ntwrk/midnight-js-network-id');
  const { HDWallet, Roles } = await import('@midnight-ntwrk/wallet-sdk-hd');
  const { createKeystore } = await import('@midnight-ntwrk/wallet-sdk-unshielded-wallet');
  const ledger = await import('@midnight-ntwrk/ledger-v8');
  const { CompiledContract } = await import('@midnight-ntwrk/compact-js');
  const { deployContract } = await import('@midnight-ntwrk/midnight-js-contracts');
  const { NodeZkConfigProvider } = await import('@midnight-ntwrk/midnight-js-node-zk-config-provider');
  const { httpClientProofProvider } = await import('@midnight-ntwrk/midnight-js-http-client-proof-provider');
  const { indexerPublicDataProvider } = await import('@midnight-ntwrk/midnight-js-indexer-public-data-provider');
  const { levelPrivateStateProvider } = await import('@midnight-ntwrk/midnight-js-level-private-state-provider');
  const { Transaction } = await import('@midnight-ntwrk/midnight-js-types');
  const poolMod = await import(pathToFileURLSafe(join(MANAGED_DIR, 'contract', 'index.js')));
  const witnessesMod = await import(pathToFileURLSafe(resolve('contract/dist/witnesses.js')));

  function pathToFileURLSafe(p) {
    return new URL(`file://${resolve(p)}`).href;
  }

  setNetworkId(NETWORK_ID);
  const networkId = getNetworkId();

  const hdResult = HDWallet.fromSeed(hexToBytes(seedHex));
  if (hdResult.type !== 'seedOk') throw new Error('failed to derive wallet keys from seed');
  const derived = hdResult.hdWallet
    .selectAccount(0)
    .selectRoles([Roles.Zswap, Roles.NightExternal, Roles.Dust])
    .deriveKeysAt(0);
  if (derived.type !== 'keysDerived') {
    hdResult.hdWallet.clear();
    throw new Error('failed to derive role keys');
  }
  hdResult.hdWallet.clear();

  const shieldedSecretKeys = ledger.ZswapSecretKeys.fromSeed(derived.keys[Roles.Zswap]);
  const coinPublicKey = String(shieldedSecretKeys.coinPublicKey);
  const encryptionPublicKey = String(shieldedSecretKeys.encryptionPublicKey);
  const unshieldedKeystore = createKeystore(derived.keys[Roles.NightExternal], networkId);

  console.log(`coinPublicKey:  ${coinPublicKey}`);
  console.log(`encPublicKey:   ${encryptionPublicKey}`);
  console.log(`unshielded:     ${unshieldedKeystore.getBech32Address().asString()}`);

  if (!execute) {
    console.log('\nDRY RUN - pass --execute to submit the deploy transaction.');
    return;
  }

  let lastBalanceResult = null;
  const privateStateDbName = join(tmpdir(), 'mn-preprod-deploy', `${CONTRACT_NAME}-${Date.now()}-${randomBytes(6).toString('hex')}`);
  const { validatePassword } = await import('@midnight-ntwrk/midnight-js-utils');
  function generatePrivateStatePassword() {
    for (let attempt = 0; attempt < 200; attempt++) {
      const password = `Mn!${randomBytes(24).toString('base64url')}`;
      try {
        validatePassword(password);
        return password;
      } catch {
        continue;
      }
    }
    throw new Error('failed to generate a private-state password that satisfies midnight-js-utils policy');
  }
  const privateStatePassword = process.env.MIDNIGHT_PRIVATE_STATE_PASSWORD || generatePrivateStatePassword();
  validatePassword(privateStatePassword);

  const walletProvider = {
    getCoinPublicKey: () => coinPublicKey,
    getEncryptionPublicKey: () => encryptionPublicKey,
    async balanceTx(provenUnboundTx) {
      const signFn = (payload) => unshieldedKeystore.signData(payload);
      if (provenUnboundTx.intents) {
        for (const [segment, intent] of provenUnboundTx.intents) {
          const cloned = ledger.Intent.deserialize('signature', 'proof', 'pre-binding', intent.serialize());
          const signature = signFn(cloned.signatureData(segment));
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
          provenUnboundTx.intents.set(segment, cloned);
        }
      }
      const balanced = await balanceOnly(PROOF_SERVER_URI, provenUnboundTx.serialize(), apiKey);
      lastBalanceResult = { txHash: balanced.txHash, txId: balanced.txId };
      return Transaction.deserialize('signature', 'proof', 'binding', hexToBytes(balanced.tx));
    },
  };

  const midnightProvider = {
    async submitTx(tx) {
      const nodeSubmitResult = await submitFinalizedTransaction(RPC_URI, tx);
      const identifiers = typeof tx.identifiers === 'function' ? tx.identifiers() : [];
      const txId = normalizeHex(identifiers[0] ?? lastBalanceResult?.txId ?? lastBalanceResult?.txHash ?? nodeSubmitResult.nodeTxHash);
      return txId;
    },
  };

  const zkConfigProvider = new NodeZkConfigProvider(MANAGED_DIR);
  const providers = {
    privateStateProvider: levelPrivateStateProvider({
      privateStateStoreName: `${CONTRACT_NAME}-state`,
      privateStoragePasswordProvider: () => Promise.resolve(privateStatePassword),
      accountId: `mn-preprod-deploy-${CONTRACT_NAME}`,
    }),
    publicDataProvider: indexerPublicDataProvider(INDEXER_URI, INDEXER_WS_URI),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(PROOF_SERVER_URI, zkConfigProvider),
    walletProvider,
    midnightProvider,
  };

  const compiledContract = CompiledContract.make(CONTRACT_NAME, poolMod.Contract).pipe(
    (c) => CompiledContract.withWitnesses(c, witnessesMod.witnesses),
    (c) => CompiledContract.withCompiledFileAssets(c, MANAGED_DIR),
  );

  const secretKey = hexToBytes(coinPublicKey.slice(0, 64));
  const initialPrivateState = witnessesMod.createLeaderboardPrivateState(secretKey);

  console.log('\nDeploying...');
  const deployed = await deployContract(providers, {
    compiledContract,
    privateStateId: `${CONTRACT_NAME}PrivateState`,
    initialPrivateState,
    args: constructorArgs,
  });

  const contractAddress = deployed?.deployTxData?.public?.contractAddress;
  if (!contractAddress || typeof contractAddress !== 'string') {
    throw new Error(`deploy returned invalid address payload: ${JSON.stringify(deployed?.deployTxData?.public ?? null)}`);
  }

  const result = {
    contractAddress,
    networkId: NETWORK_ID,
    ownerId: rawArgs[0],
    instanceSalt: rawArgs[1],
    coinPublicKey,
    encryptionPublicKey,
    proofServer: PROOF_SERVER_URI,
    indexer: INDEXER_URI,
    rpc: RPC_URI,
    managedDir: MANAGED_DIR,
    deployedAt: new Date().toISOString(),
    txId: lastBalanceResult?.txId ?? null,
    txHash: lastBalanceResult?.txHash ?? null,
  };
  writeFileSync(OUT_PATH, `${JSON.stringify(result, null, 2)}\n`);
  console.log(`\nContract address: ${contractAddress}`);
  console.log(`Recorded to:      ${OUT_PATH}`);
}

main().catch((error) => {
  console.error(`\nDeploy failed: ${error?.message ?? error}`);
  if (error?.cause) console.error(`cause: ${error.cause.message ?? error.cause}`);
  process.exit(1);
});
