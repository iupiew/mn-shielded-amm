# 1AM wallet + preprod spike report

Track B evidence for the Zealy quest — browser wallet integration against a
preprod-deployed contract. Covers what was verified, what was built, what is
mocked, and what remains open.

**Status:** preprod deploy ✅ · UI Connect flow ✅ (typecheck + build) ·
automated E2E against the deployed address ✅ (mock connector) ·
live 1AM extension run ⏳ (see [Open items](#open-items)).

---

## 1. Wallet choice

| Candidate | Result |
|---|---|
| **1AM** (`com.midnight.1am`, apiVersion `4.0.1`/spec `4.0.0`) | ✅ chosen — preferred in `api/src/amm/browser.ts`, accepts connector API `4.x` |
| Lace (`io.lace.wallet` 4.0.1) | ❌ dropped — earlier spike (`.spike/w0-wallet-spike.md`) showed it rejects undeployed/local chains; we target preprod only anyway |

Detection: `listWallets()` scans `window.midnight` (poll every 500 ms in the
UI), filters by `apiVersion.startsWith('4.')`, prefers `rdns ===
'com.midnight.1am'`, else first compatible wallet.

## 2. Connector API surface (verified from `dapp-connector-api` dist, not docs)

From `node_modules/@midnight-ntwrk/dapp-connector-api/dist/api.d.ts`:

- `InitialAPI` — `{ rdns, name, icon, apiVersion, connect(networkId) }`
- `ConnectedAPI`, as consumed by `api/src/amm/browser.ts`:
  `getConfiguration()` · `getShieldedAddresses()` ·
  `getProvingProvider(zkConfigProvider)` (optional — throws ⇒ HTTP fallback) ·
  `balanceUnsealedTransaction(hex)` · `submitTransaction(hex)` ·
  `hintUsage` (stubbed)
- **No coin enumeration** (no `getShieldedCoins`) ⇒ the DApp cannot list its
  own UTXOs. This forced the in-memory vault design (§4).
- Addresses are spec'd as Bech32m ⇒ `resolveSecretKey` normalises with
  `parseCoinPublicKeyToHex()` (both Bech32m and hex accepted; hex is
  returned unchanged).

`getConfiguration()` fields used: `indexerUri`, `indexerWsUri`,
`proverServerUri` — each falling back to preprod defaults when empty.

## 3. Preprod deploy (Path B)

`1am deploy` was impossible: the CLI bundles `compact-runtime 0.15.0` /
`ledger-v8 8.0.3` and rejects artifacts compiled by `compact 0.31.1`
(runtime `0.16.0`). Instead `scripts/preprod-deploy.mjs` deploys the exact
`contract/managed/pool` artifacts the tests and UI proof bundle use.

- **Contract:** `5fceafdfb98e98645eaf8386cd72d9de593a27abf882a2a6694061e01105cebf`
  (preprod) — deploy tx `a1639cde…f26c`, indexer tx 651659 `ContractDeploy`
  verified. Recorded in `.spike/preprod-deploy.json` (gitignored).
- **Proving:** ProofStation `https://api-preprod.1am.xyz` works **without an
  API key** (circuit `/prove` + `/balance-only` sponsorship).
- **Signing:** intents signed with the agent HD wallet
  (`wallet-sdk-hd` + `wallet-sdk-unshielded-wallet`), balanced via
  `/balance-only`, submitted through
  `@polkadot/api` → `midnight.sendMnTransaction`.

**Owner rule (important):** `ownerId = sha256(agentCpk ‖ agentCpk)`. The
deployer's agent wallet (`d09d5464…f1b5`) owns `pause`/`unpause`; any other
wallet fails those two circuits by design. `faucet`, `seed`, `swap` have no
owner gate. **No contract changes were made** — the UI documents that
pause/unpause are deployer-only.

## 4. Browser wiring (all AMM logic stays in `api/`)

| Piece | File | Role |
|---|---|---|
| `createBrowserAmm` / `listWallets` | `api/src/amm/browser.ts` | wallet connect → providers (indexer, `FetchZkConfigProvider` from `/contract/compiled/pool`, ProofStation HTTP fallback) → `AmmApi` |
| Coin vault | `api/src/amm/vault.ts` | in-memory: `faucet` results are `record`ed, `swap` result is `consume`d; no connector API exists to enumerate coins. Fresh page load ⇒ empty vault ⇒ re-faucet (zero contract changes) |
| In-memory private state | `api/src/amm/in-memory-private-state-provider.ts` | replaces the LevelDB provider (browser has no fs) |
| Contract address / network | `ui/src/lib/config.ts` | hardcoded preprod address, `VITE_MN_CONTRACT_ADDRESS` override |
| Thin UI layer | `ui/src/lib/wallet.ts` | lazy-loads the browser module; `connectWallet()` |
| Connect UI | `ui/src/App.tsx` | wallet scan → Connect → pool/vault/swap/dev panels; dry-run preview → explicit confirm |

**Cost model (no `@view` circuits in `pool.compact`):** every circuit call is
prove + balance + submit + wait-for-inclusion:

- connect runs `getColors` → first Connect takes ~30–90 s (shown in the UI);
- `isPaused()` ≈ 24 s ⇒ loaded **once** at connect and after
  pause/unpause only — never polled;
- `poolState()`/`quote()`/`balance()` are cheap (indexer/vault reads);
- `swap()` internally re-checks pause ⇒ one extra tx per swap (api-level
  design, left as-is).

## 5. E2E scope: what is real, what is mocked

Real: deployed contract, indexer, ProofStation proving/balancing, node
submission, the full `AmmApi` + `browser.ts` stack, the built UI.

Mocked: **the wallet extension**. Headless Chromium cannot install/run the
1AM extension (its popup cannot be driven by Playwright), so
`ui/src/lib/mock-wallet.ts` implements the connector API in-page:

- injected only when Playwright's `addInitScript` sets
  `window.__E2E_MOCK_SEED__` (the agent seed — never committed, never in a URL);
- `getShieldedAddresses` derives keys from the seed exactly like
  `preprod-deploy.mjs` (same owner rule ⇒ owner circuits also work in E2E);
- `getProvingProvider` throws ⇒ exercises the same ProofStation HTTP fallback
  the real wallet-less path uses;
- `balanceUnsealedTransaction` signs intents + POSTs `/balance-only`;
  `submitTransaction` uses `@polkadot/api` — both ported from the deploy
  script;
- ProofStation is reached through a vite dev/preview proxy
  (`/proofstation` → `https://api-preprod.1am.xyz`) because page-origin CORS
  on that host is unverified; a real extension proves/balances in its own
  context and needs no proxy.

E2E flow (`scripts/e2e-smoke.mjs`): connect → (seed only if the pool is still
unseeded — the contract state persists across runs) → faucet → swap of the
exact minted coin, asserting balances/reserves moved on the deployed address.

## Open items

- **Live 1AM extension run** — manual: install 1AM, fund on preprod, click
  Connect in the UI. Earlier attempt stalled on a pending connection popup
  (wallet-side state); headless automation of the extension is out of scope.
- **Indexer CORS from a browser origin** — assumed open (the Midnight indexer
  is consumed by browser dapps; the localnet bridge never exercised this).
  Not yet observed failing in E2E.
- **`isPaused` inside `swap()`** — extra ~24 s per swap; a pause cache in
  `AmmApi` would remove it, deferred to avoid touching the verified api layer
  mid-quest.
- **Vault persistence** — in-memory by design (connector has no coin
  enumeration); survives neither reload nor second tab.

## Reproduce

```bash
node scripts/preprod-deploy.mjs --execute   # re-deploy (writes .spike/preprod-deploy.json)
npm run typecheck -w api && npm run typecheck -w ui
npm run build -w ui                          # tsc + vite build (includes browser chunk)
node scripts/e2e-smoke.mjs                   # mock-wallet E2E against preprod
```
