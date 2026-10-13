/**
 * Refresh ui/public/contract/compiled/pool from contract/managed/pool.
 *
 * The browser fetches prover/verifier/zkir artifacts from
 * `${origin}/contract/compiled/pool` (FetchZkConfigProvider, see
 * api/src/amm/browser.ts DEFAULT_ZK_BASE_PATH) — a stale copy there makes
 * in-browser proofs fail against the deployed contract. Wired as
 * ui predev/prebuild so it cannot drift; run manually with:
 *
 *   node scripts/sync-ui-zk.mjs
 */
import { cpSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const src = join(root, 'contract', 'managed', 'pool');
const dest = join(root, 'ui', 'public', 'contract', 'compiled', 'pool');

if (!existsSync(join(src, 'keys', 'faucet.verifier'))) {
  console.error(`sync-ui-zk: missing managed artifacts at ${src} (run the contract build first)`);
  process.exit(1);
}
rmSync(dest, { recursive: true, force: true });
cpSync(src, dest, { recursive: true });
console.log(`sync-ui-zk: ${src} → ${dest}`);

// Pool registry → ui/public/pools.json (the Pools tab fetches /pools.json).
// Optional: a missing registry just means an empty pool list in the UI.
const poolsSrc = join(root, 'pools.json');
const poolsDest = join(root, 'ui', 'public', 'pools.json');
if (existsSync(poolsSrc)) {
  cpSync(poolsSrc, poolsDest);
  console.log(`sync-ui-zk: ${poolsSrc} → ${poolsDest}`);
} else {
  console.log(`sync-ui-zk: no ${poolsSrc} — skipping pool registry sync`);
}
