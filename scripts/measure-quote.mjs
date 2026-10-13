// M4: measure ledger-read latency (quote / poolState / isPaused / colors)
// against a localnet contract. Usage: AMM_CONTRACT=<addr> node scripts/measure-quote.mjs [iterations]
import { resolve } from 'node:path';

const contractAddress = process.env.AMM_CONTRACT;
if (!contractAddress) {
  console.error('AMM_CONTRACT env var required');
  process.exit(1);
}
const iterations = Number(process.argv[2] ?? 10);

const { createNodeAmm } = await import(
  new URL('../api/dist/api/src/amm/node.js', import.meta.url).href
);

const node = await createNodeAmm({
  contractAddress,
  wallet: process.env.AMM_WALLET ?? 'devnet-main',
  networkId: process.env.AMM_NETWORK_ID ?? 'undeployed',
  syncWallet: false,
  managedDir: resolve(process.cwd(), 'contract/managed/pool'),
});

const amm = node.api;
const pct = (xs, p) => xs[Math.min(xs.length - 1, Math.floor((xs.length * p) / 100))];
const report = (name, xs) =>
  console.log(
    `${name.padEnd(12)} n=${xs.length} min=${Math.min(...xs)}ms p50=${pct(xs, 50)}ms max=${Math.max(...xs)}ms`,
  );

async function measure(name, fn) {
  await fn(); // warmup (first call pays ws-subscription setup)
  const times = [];
  for (let i = 0; i < iterations; i++) {
    const t0 = performance.now();
    await fn();
    times.push(Math.round(performance.now() - t0));
  }
  report(name, times);
}

await measure('colors', () => amm.colors());
await measure('poolState', () => amm.poolState());
await measure('isPaused', () => amm.isPaused());
await measure('quote', () => amm.quote('AtoB', 100000n));

node.close();
process.exit(0);
