#!/usr/bin/env node
/**
 * Prints the `--args` value for deploying contract/pool.compact.
 *
 * Reads the wallet's shielded coin public key from the running `mn serve`
 * RPC (ws://127.0.0.1:9932) and derives:
 *   ownerId      = sha256(pk || pk)
 *                  (persistentHash of pk with nonce = pk, i.e. the contract
 *                   owner check with the default private-state secret rule:
 *                   secretKey = bytes of the shielded coin public key)
 *   instanceSalt = 32 fresh random bytes
 *
 * Usage (with `mn serve` running):
 *   node scripts/owner-args.mjs
 *   node scripts/owner-args.mjs | xargs -0 true  # just run it and copy the output
 *
 * Then:
 *   mn contract deploy --managed contract/managed/pool --wallet devnet-main \
 *     --args '<printed value>'
 *
 * Note: if you set MN_PRIVATE_STATE_SECRET, the owner derivation changes —
 * this script assumes the default rule (no env override).
 */
import { createHash, randomBytes } from 'node:crypto';

const RPC = process.env.MN_SERVE_URL ?? 'ws://127.0.0.1:9932';

const ws = new WebSocket(RPC);
const timer = setTimeout(() => {
  console.error(`timeout connecting to ${RPC} — is \`mn serve\` running?`);
  process.exit(1);
}, 10_000);

ws.addEventListener('open', () => {
  ws.send(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getShieldedAddresses', params: {} }));
});

ws.addEventListener('message', (event) => {
  clearTimeout(timer);
  const message = JSON.parse(String(event.data));
  if (message.error || !message.result?.shieldedCoinPublicKey) {
    console.error('unexpected response:', JSON.stringify(message));
    process.exit(1);
  }
  const pkHex = message.result.shieldedCoinPublicKey;
  const pk = Buffer.from(pkHex, 'hex');
  const ownerId = [...createHash('sha256').update(pk).update(pk).digest()];
  const instanceSalt = [...randomBytes(32)];
  console.error(`shielded coin public key: ${pkHex}`);
  console.log(JSON.stringify([ownerId, instanceSalt]));
  ws.close();
  process.exit(0);
});

ws.addEventListener('error', () => {
  clearTimeout(timer);
  console.error(`cannot connect to ${RPC} — is \`mn serve\` running?`);
  process.exit(1);
});
