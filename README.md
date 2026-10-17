# mn-amm — Shielded AMM on Midnight

A fully **shielded constant-product AMM** (think Uniswap-lite) built on the
[Midnight Network](https://midnight.network). Two devnet test tokens, a 0.3% swap
fee that stays in the pool, and every reserve change proven with zero-knowledge
circuits. Trader identities, balances, and coin contents stay private — but pool
reserves, swap amounts, and token colors are **public** ledger state. See
[docs/privacy.md](docs/privacy.md) for the verified visibility model.

Ships as four npm workspaces: a **Compact contract**, a shared **TypeScript API**,
a thin **CLI**, and a **React dashboard**.

| Feature | Status |
|---|---|
| Faucet · seed · swap · pause/unpause, via CLI **and** UI | ✅ local devnet + preprod |
| Live quotes (0.3% fee, slippage tolerance in bps) | ✅ |
| Dry-run-first safety (`--execute` to submit, `--json` output) | ✅ |
| Add/remove liquidity (LP share circuits) | ✅ verified on local devnet |
| Agent support: policy guard, owner/agent split, MCP server (`mn-amm-mcp`) | ✅ |
| Strategy interface + runner (DCA, rebalance) | 🔜 phase 2 |

> **Local devnet by default; preprod for real runs.** The quickstart below runs
> against an ephemeral local chain — the chain, the deployed pool, and (on
> `localnet down`) the wallet cache are disposable by design. The CLI also runs
> against Cardano Preprod with `--network-id preprod`; the dashboard is
> preprod-only (deployed contract address + network in `ui/src/lib/config.ts`).

---

## Architecture

```
┌──────────────┐   ┌────────────────────┐
│  cli/ (thin) │   │ ui/ (React)        │  ← browser
│   mn-amm     │   │  dashboard         │
└──────┬───────┘   └──────┬─────────────┘
       │                  │ in-browser BrowserAmm (DApp connector):
       │                  │ 1AM/Lace · indexer · proof server
       └──────────►┌──────▼──────────────────┐
                   │ api/  (ALL logic lives) │  AmmApi: poolState · quote ·
                   │  createNodeAmm()        │  swap · faucet · seed · pause
                   │  createBrowserAmm()     │
                   └──────┬──────────────────┘
                          │
        ┌─────────────────┼─────────────────────┐
        ▼                 ▼                     ▼
  contract/pool.compact   mn serve (ws :9932)   proof server (:6300)
  ZK circuits + ledger    wallet / tx signing   ZK proof generation
        ▲                 ▲
        └── localnet ─────┘  (docker: node :9944 · indexer :8088)
```

**Rule of the repo:** all business logic lives in `api/`. The CLI and the UI
are thin adapters that parse arguments / UI events and format output — they
never reimplement AMM math or tx flows.

---

## Project structure

```
mn-amm/
├── contract/
│   ├── pool.compact            # THE contract: faucet, seed, swap, liquidity, pause
│   ├── managed/pool/           # compiler output (keys/, zkir/, contract/) — committed
│   └── src/                    # contract JS exports (Pool namespace + witnesses)
├── api/                        # shared business logic — everything else calls this
│   └── src/amm/
│       ├── api.ts              # AmmApi: poolState, quote, swap, faucet, seed, pause…
│       ├── node.ts             # createNodeAmm(): node transport, wallet, private state
│       ├── math.ts             # constant-product math (division-free swap check)
│       └── types.ts            # AmmError codes (PAUSED, INSUFFICIENT_COIN, …)
├── cli/
│   └── src/cli.ts              # mn-amm — arg parsing + output formatting only
├── ui/
│   └── src/                    # React dashboard (App.tsx, tabs, lib/ thin client)
├── scripts/
│   └── owner-args.mjs          # prints deploy --args (ownerId + salt + faucetOpen)
└── docs/                       # privacy model, liquidity design, licenses, patches
```

**Template legacy:** the starter leaderboard contract and its exports have
been removed, and all workspaces now use `mn-amm-*` package names (renamed
2026-10-15; the template history remains in git).

---

## Prerequisites

| Tool | Version | Needed for |
|---|---|---|
| [Node.js](https://nodejs.org/) | **≥ 24** (this repo uses 24.21) | everything — the CLI runs `.ts` directly via type stripping |
| [Docker](https://docs.docker.com/) | any recent | local chain (`mn localnet up` uses docker compose) |
| Midnight CLI (`mn` / `midnight-wallet-cli`) | 1.x | chain, wallet, deploy, `mn serve` |
| [Compact toolchain](https://docs.midnight.network/getting-started/installation) | `compact compile` 0.5.x → compiler 0.31.1 | **only** when editing `pool.compact` |

Check: `node --version && mn --help && compact --version`

**Disk:** the local node refuses to start with less than **512 MB free disk**
(see [Troubleshooting](#troubleshooting)).

---

## Quick start

For a machine where the pool is **already deployed** (i.e. bootstrap below has
run once and the chain is still up):

```bash
npm install && npm run build      # workspaces + api

mn localnet up                    # chain (node, indexer, proof-server)
mn serve --approve-all --wallet devnet-main &   # wallet RPC on :9932

export AMM_CONTRACT=<address>     # printed by deploy (CLI default when set)

npx mn-amm pool-state             # sanity check (first call: ~30–90 s)
npx mn-amm quote AtoB 100000      # live price quote

npm run dev -w ui                 # dashboard → http://localhost:3000 (preprod)
```

Open **http://localhost:3000** — pool reserves, wallet balance, live quote,
swap preview, and dev tools (faucet / seed / pause) are all on one page. Note:
the dashboard always talks to **preprod** (its own deployed pool + wallet, see
[UI](#ui-httplocalhost3000)) — it does not mirror the localnet chain used by the
CLI steps above.

> Running services: `mn localnet status` · `pgrep -af '[m]n serve'` · `ss -ltn | grep -E '3000|9932'`

---

## Full bootstrap (from zero)

Start-to-finish path used to bring this repo up on a fresh machine. Each step
was run and verified against this repo.

### 1. Install & build

```bash
npm install
npm run build                     # builds contract/ (tsc) and api/ (+ copies managed/)
```

### 2. Start the local chain

```bash
mn localnet up                    # node :9944, indexer :8088, proof-server :6300
mn localnet status
```

### 3. Create and fund the wallet

```bash
mn wallet generate devnet-main    # if it doesn't exist yet (mn wallet list)
mn airdrop 100000 --wallet devnet-main     # NIGHT for fees (undeployed net only)
mn dust register --wallet devnet-main      # fee-token dust; 1–3 min on first run
mn dust status                              # "Dust Available: yes"
```

### 4. Start the wallet RPC

```bash
mn serve --approve-all --wallet devnet-main > /tmp/mn-serve.log 2>&1 &
# ws://127.0.0.1:9932 — required by the CLI (node wallet RPC)
```

`--approve-all` auto-approves reads *and* writes (fine for a throwaway devnet).

### 5. Deploy the pool

```bash
node scripts/owner-args.mjs --faucet-open
# prints: [[<ownerId ints>,<salt ints>,true]]  (stderr: your pk + faucetOpen)
# (requires mn serve; derives ownerId from your wallet's shielded public key;
#  drop --faucet-open for a mint-disabled pool — see the faucet note below)

node scripts/owner-args.mjs --faucet-open | xargs -I{} mn contract deploy \
  --managed contract/managed/pool --wallet devnet-main --args '{}' --json
# → {"address":"<64-hex>", ...}   takes ~1–4 min
```

Set the address for everything that follows:

```bash
export AMM_CONTRACT=<address from deploy>
```

Sanity check: `mn contract state --address $AMM_CONTRACT --managed contract/managed/pool --json`

### 6. Seed the pool

```bash
npx mn-amm seed --mint --execute --json
# mints 1,000,000 A + 1,000,000 B (faucet) and seeds the pool with them
```

### 7. Run it

```bash
npx mn-amm pool-state             # reserves, colors, pause flag
npm run dev -w ui                 # → http://localhost:3000 (dashboard = preprod, not this localnet)
```

**After `mn localnet down`** (chain state + wallet cache wiped) repeat steps 2–7.
A chain reset always destroys the deployed pool.

---

## CLI reference (`npx mn-amm` / `mn-amm`)

Full machine contract — every command, flag, env var, JSON output key, and
exit code — lives in [`docs/cli-schema.md`](docs/cli-schema.md), which is
parity-tested against `cli/src/cli.ts` in CI.

```
mn-amm <command> [options]

  pool-state                      reserves, colors, seeded + pause flag
  balance                         wallet coins split by pool color
  quote <side> <amount>           price a swap   (side: AtoB | BtoA, atomic units)
  swap <side> <amount>            quote + coin plan; --execute submits
  faucet [--amount-a N] [--amount-b N]
                                  mint devnet coins; --execute submits
  seed --mint [--amount-a N --amount-b N]
                                  faucet then seed (mints initial LP supply,
                                  default floor(sqrt(a*b))); --execute submits
  pause | unpause                 admin pause control; --execute submits
  add-liquidity <amountA> <amountB>
                                  LP deposit; --execute submits
  remove-liquidity <shares>       LP withdrawal; --execute submits
  pools list                      named pools from the registry file
  pools add <name> <contract>     register a pool (optional --network-id)
  pools deploy <name>             deploy a pool (preprod via agent seed /
                                  preprod-deploy.mjs; localnet via mn);
                                  --faucet-open to mint-enable the new pool
  pools remove <name>             unregister a pool
```

| Flag | Meaning |
|---|---|
| `--contract <hex>` | pool address — or `export AMM_CONTRACT=…`, or `--pool <name>` |
| `--pool <name>` | registered pool name from `pools.json` (overridden by `--contract`) |
| `--network-id <id>` | `undeployed` (localnet, default) · `preprod` |
| `--wallet <name>` | `AMM_WALLET` env, else `devnet-main` (localnet) / `mn-amm-agent` (preprod) |
| `--slippage-bps <n>` | 0–10000, default 0 |
| `--salt <64-hex>` | `pools deploy`: instance salt (default: fresh random) |
| `--faucet-open` | `pools deploy`: mint-enable the new pool (default: closed) |
| `--execute` | **actually submit** — mutating commands are dry-runs by default |
| `--json` | machine-readable output (bigints as decimal strings) |
| `--no-sync` | read the wallet coin cache without refreshing it first |

**Exit codes:** `0` ok · `1` internal error · `2` usage error · `3` AMM error
(`error.code` in `--json`, e.g. `PAUSED`, `INSUFFICIENT_COIN`).

```bash
export AMM_CONTRACT=bf823a56c3b5a231c168ba39ffc46a80b39e3195709a88eb594cc011899eccc1

npx mn-amm quote AtoB 100000 --json
# {"ok":true,"side":"AtoB","amountIn":"100000","amountOut":"10748", …}
#   (amountOut depends on the pool's current reserves)

npx mn-amm faucet --execute --json            # mint 1,000,000 A + 1,000,000 B

npx mn-amm swap AtoB 123456 --json             # dry-run still succeeds (rc 0) but
#   "spendableCoinAvailable":true, "availableValues":["1000000"]  → partial swap
npx mn-amm swap AtoB 2000000 --execute; echo $?
# → 3   {"error":{"code":"INSUFFICIENT_COIN","message":"… available values: [1000000]"}}

npx mn-amm swap AtoB 1000000 --execute        # real swap (~2–4 min: proving + tx)
```

### Multiple pools (contract-per-pool)

Each deployment is its own pool: token A/B/LP colors are derived from the
contract address, so two deployments never share colors, reserves, LP supply,
or pause state. Register pools by name in `pools.json` (`AMM_POOLS_FILE`
overrides the location) and target them with `--pool`:

```bash
npx mn-amm pools add main 9264c59e85cb… --json
npx mn-amm pools add alt  33616af49d75… --network-id undeployed --json

npx mn-amm --pool main pool-state --json      # reserves 1,010,000/990,129
npx mn-amm --pool alt  pool-state --json      # reserves 1,000,000/1,000,000
npx mn-amm --pool alt  seed --mint --execute  # seed the second pool
```

One wallet can hold coins from many pools at once (they are just coins with
different colors); `balance` splits the connected pool's coins and buckets
everything else under `otherCoins`. There is no cross-pool swap — routing
would need the router/factory design (option B), deliberately not built.

### The spendable-coin rule

`swap` needs **one pool-color coin with `value >= amountIn`** — it does *not*
have to match exactly. The circuit swaps `amountIn` and returns the remainder
to you as change in the same transaction. The **dry-run never fails** on a
missing coin: it reports `spendableCoinAvailable` plus `availableValues` and
exits 0. Only `--execute` raises exit code `3` (`INSUFFICIENT_COIN`), when no
single coin covers `amountIn`.

### Owner vs agent (localnet)

The pool binds admin operations (pause/unpause) to the **deployer's** coin
public key (`ownerId = sha256(pk‖pk)`), while trading runs under whichever
wallet the connected `mn serve` exposes. On localnet the two roles are
separate identities:

| Role | Serve | Wallet |
|---|---|---|
| Owner — deploys, pauses | `mn serve --port 9932` (default `AMM_SERVE_URL`) | `devnet-main` |
| Agent — trades | `mn serve --port 9934` | `mn-amm-agent` |

`AMM_SERVE_URL` selects the identity and `AMM_WALLET` (or `--wallet`) the
coin cache; owner commands run without them and keep the defaults:

```bash
mn serve --port 9934 --wallet mn-amm-agent &      # agent identity
export AMM_SERVE_URL=ws://127.0.0.1:9934
export AMM_WALLET=mn-amm-agent

npx mn-amm faucet --execute --json                # airdrop to the agent wallet
npx mn-amm swap AtoB 100000 --execute --json      # agent trade

unset AMM_SERVE_URL AMM_WALLET                    # owner defaults (:9932)
npx mn-amm pause --execute --json                 # owner pauses the pool
```

The guard rail is the contract, not the CLI: pause/unpause verify the owner
witness in-circuit, so an agent-signed pause is rejected on-chain. Server-side
spend limits for agent identities are the policy guard
([`policy.example.json`](policy.example.json)) — violations fail with exit
code `3` and `"code": "POLICY_DENIED"` before any transaction is built.

---

## UI (http://localhost:3000)

The dashboard is a thin client over `api/`'s `createBrowserAmm()` — it runs
entirely in the browser against **preprod**: no bridge, no local daemon, no
private keys in the page. Connect a Midnight DApp-connector wallet (1AM
preferred, Lace accepted), pick a pool, and every mutation previews before it
submits.

| Tab / panel | What it does |
|---|---|
| **Swap** | pool stats (reserves, prices, live/paused/unseeded badge), wallet balances, debounced live quote, slippage presets, preview → confirm |
| **Pools** | pool registry list + switch, add/remove browser-local pools, pause/unpause (owner only) |
| **Liquidity** | add/remove liquidity with live quotes + slippage, preview → confirm |
| **Mint** | faucet (mint A/B coins) + seed the pool as a two-tx flow, preview → confirm |
| **Activity** | every action, tx id and raw error lands here (the `--json` equivalent) |

**How it talks to the chain:** the connector hands the page the wallet's
shielded addresses; contract reads go to the indexer, proofs to a proof server
(`VITE_MN_PROVER_URI`, e.g. local `http://127.0.0.1:6300`, dodges hosted 524
timeouts on the big proving keys), submissions through the wallet. Coins live
in a per-pool localStorage vault (`mn-amm:vault:…`) because the connector
exposes no coin enumeration.

**Run it:** `npm run dev -w ui` → http://localhost:3000 (`scripts/sync-ui-zk.mjs`
first syncs zk artifacts + `pools.json` into `ui/public`). Override the pool
with `VITE_MN_CONTRACT_ADDRESS`.

---

## MCP server (`mn-amm-mcp`)

An MCP (Model Context Protocol) server exposing the **agent-safe** half of the
stack to MCP clients (opencode, Claude Code, …) over **stdio**. It uses the
same env family as the CLI (`AMM_NETWORK_ID`, `AMM_CONTRACT` or registry pools,
`AMM_SERVE_URL`, `AMM_WALLET`, `AMM_POLICY_*`) and is intended to run under the
agent identity:

| Tool | Kind | Notes |
|---|---|---|
| `amm_pool_state` | read | reserves, colors, LP supply, seeded + paused |
| `amm_quote` | read | price a swap at current reserves |
| `amm_balance` | read | wallet coins split by pool color |
| `amm_policy_status` | read | effective policy: halt, caps, allowlist, window sums |
| `amm_swap` | write | **dry-run by default**; `execute:true` submits on-chain |
| `amm_add_liquidity` | write | dry-run preview (LP quote + coin check) |
| `amm_remove_liquidity` | write | dry-run preview (payout quote + LP check) |
| `amm_faucet` | write | mint preview; `execute:true` submits |

Owner operations (deploy, seed, pause, unpause) are **not exposed** — the agent
wallet never receives them (the contract's owner witness is the guard rail).
Every write passes the server-side policy guard (`policy.json`): a violation
returns `{"error": {"code": "POLICY_DENIED", …}}` before any transaction is
built. Each tool call appends one JSONL audit line (`AMM_MCP_AUDIT_FILE`,
default `<cwd>/mcp-audit.jsonl`).

```bash
# stdio server, agent role (both env vars optional):
AMM_SERVE_URL=ws://127.0.0.1:9934 AMM_WALLET=mn-amm-agent npx mn-amm-mcp
```

Example client registration (opencode `opencode.json`):

```json
{
  "mcp": {
    "amm": {
      "type": "local",
      "command": ["npx", "mn-amm-mcp"],
      "environment": {
        "AMM_SERVE_URL": "ws://127.0.0.1:9934",
        "AMM_WALLET": "mn-amm-agent"
      },
      "enabled": true
    }
  }
}
```

Verified: stdio handshake + `tools/list` (8 tools) against the real server,
and the dry-run/policy/error paths in `mcp-server/test` (16 tests, in CI). A
live localnet E2E through an MCP client runs with the deferred slice-2/3
localnet validation.

---

## Preprod

Redeploy is **mandatory** after any contract change — the toolchain
(compact 0.31.1 artifacts) is incompatible with older deploys, and the
original `5fceafdf…` pool is abandoned.

```bash
node scripts/preprod-deploy.mjs            # dry-run: derives keys, checks artifacts
node scripts/preprod-deploy.mjs --execute  # deploy → .spike/preprod-deploy.json
```

Inputs: `.spike/agent-seed-export.json` (agent wallet seed) and
`.spike/preprod-deploy-args.json` (`[ownerId, instanceSalt, faucetOpen]`,
faucetOpen defaults to false — pass the CLI `--faucet-open` to mint-enable a
demo pool; `pools deploy <name> --network-id preprod --execute` generates both
and registers the pool).
Proof server defaults to hosted ProofStation (`api-preprod.1am.xyz`), overridable
via `AMM_PROOF_SERVER`.

**Preprod endpoints moved to Blockfrost (2026-10-09):** Midnight decommissioned
`indexer.preprod.midnight.network` and `rpc.preprod.midnight.network`. Set
`BLOCKFROST_PROJECT_ID` (Midnight Preprod project, id starts with `nightpreprod`)
for `api/`, the CLI, and `scripts/preprod-deploy.mjs` — the token may live in a
gitignored `.env` at the repo root (`BLOCKFROST_PROJECT_ID=…`), which both the
api and the deploy script read automatically — the **dashboard** additionally
needs the same token as `VITE_MN_BLOCKFROST_PROJECT_ID` (vite only inlines
`VITE_`-prefixed vars; keep both lines in `.env`) — or override individual
endpoints with `AMM_INDEXER_URI` / `AMM_INDEXER_WS_URI` / `AMM_RPC_URI`. The
`mn` wallet CLI needs the same: `mn config set indexer-ws
wss://midnight-preprod.blockfrost.io/api/v0/ws?project_id=<token> --network
preprod`, `mn config set node wss://rpc.midnight-preprod.blockfrost.io?project_id=<token>
--network preprod`, then `mn cache clear --network preprod` (saved sync state
against the old indexer is not portable; the first re-sync takes 1h+). Note: a **first full sync from genesis replays all
~1.65M dust events** (≈100 evt/s on the Blockfrost free tier ⇒ several hours);
checkpoints persist across restarts, so `mn serve` restarts resume where they
left off. Unshielded balance checks (`mn balance` without `--shielded`) are
address-scoped and finish in seconds.

**Current pool:** `2f557cf5ff4bb0220abd42669bf63ad73ca5e00bffdf5d5e41acd2a5a1634712`
(open-faucet build, deployed 2026-10-10 via `pools deploy preprod-open
--network-id preprod --execute`; `DEFAULT_PREPROD_CONTRACT` in
`api/src/amm/preprod.ts` points here, so `--network-id preprod` needs no
`--contract`). Supersedes `4b9ebca3…` (gated-faucet) and `5fceafdf…`
(abandoned toolchain mismatch).
**Stale after the faucet-gate change (2026-10-13):** that pool predates the
`faucetOpen` constructor flag, so
the repo's recompiled `managed/pool` artifacts no longer match it — redeploy
(`pools deploy <name> --network-id preprod --faucet-open --execute`, then
re-seed and update `DEFAULT_PREPROD_CONTRACT`) to use preprod again.

**Wallet:** `mn-amm-agent` (seed in `.spike/`, unshielded
`mn_addr_preprod1x9cq…`). Check funds: `mn balance --network preprod --wallet
mn-amm-agent --shielded` and `mn dust status --network preprod --wallet
mn-amm-agent`.

**Operations:** the agent wallet server must be started on its own
network — `mn serve --port 9933 --wallet mn-amm-agent --network preprod`
(a serve without `--network` comes up `undeployed` and both balance and
submit fail). Preprod commands default to the hosted ProofStation for
`/prove`; when it returns `524` on the big proving keys, point
`AMM_PROOF_SERVER=http://127.0.0.1:6300` at the local proof server (SRS
params k10–17 mounted) and keep `AMM_BALANCE_SERVER=https://api-preprod.1am.xyz`
(`/balance-only` sponsorship is hosted-only — the local server 404s it).
`balanceTx` retries the serve balance 4×15s to ride out DUST UTXOs locked by
the previous tx before it falls back to the sponsor (whose stale dust state
earns `1010 Custom error: 170 InvalidDustSpendProof`).

**Verified end-to-end on preprod (2026-10-09):** faucet (owner gate) →
seed → faucet → swap A→B 10,000 → 9,871 → swap B→A 10,000 → 10,068 — all
exact, final reserves 999,932 / 1,000,129, LP 1,000,000, and the old B→A
`1010 Custom error: 103` regression did not reproduce.

**Verified end-to-end via the dashboard (2026-10-13, open-faucet build):**
wallet connect (1AM) → mint → swap A→B 100,000 → 88,078
(tx `005b4533310a…82ac9c11`) — the pre-gate pool still serves the browser
flow end-to-end.

**The faucet is deploy-time gated** (`_faucetOpen` constructor flag)
**and pause-gated**: a pool mints only when deployed with the flag set
(`--faucet-open`) and not paused; pause/unpause remain owner-only
(`ZOwn_assertOnlyOwner`). Consequence: on a public deployment only people who
can mint (or whoever holds coins) can trade — there is no transfer circuit, so
a multi-user demo needs an open-faucet deploy or a distribution circuit — a
deliberate future decision, not built.

## Development

```bash
npm run build                # contract (tsc) + api (tsc + copy managed/)
npm run compile:pool -w contract   # recompile pool.compact — ONLY after editing it
npm run typecheck -w api     # also: -w ui, -w mn-amm-cli
npm test -w api              # 37 tests (math, quotes, errors, local registry)
npm test -w contract         # 15 pool circuit tests (local proving)
npm run dev -w ui            # dashboard on :3000
```

**Conventions in this repo**

- **All logic in `api/`.** CLI/UI only parse, call, format. New features land in
  `AmmApi` first and get wired into both frontends.
- **`// UNVERIFIED:` markers** flag Compact/SDK constructs that were confirmed
  via docs but not yet battle-tested — kept visible (3 in `pool.compact`,
  3 in `browser.ts`, 1 in `node.ts`, 1 in `preprod.ts`).
- **Pinned dependencies** — no upgrades without an explicit decision
  (the one npm `override` and the `wallet-sdk-shielded` status are
  documented in `docs/patches.md`).
- **Mutations are dry-run by default** in the CLI; `--execute` is required.
- **Never interrupt `compact compile`** — a killed run leaves partial/empty
  files in `managed/pool/keys/` (see Troubleshooting).

### Contract at a glance (`contract/pool.compact`)

- **Circuits:** `faucet` · `seed` · `swap` · `addLiquidity` ·
  `removeLiquidity` · `pause` · `unpause` (7 total; the former
  `get*` view circuits were replaced by ledger reads — reserves, colors,
  LP supply, and pause status are read straight from state, no proving)
- **Ledger:** `export ledger _coins: Map<Bytes<32>, QualifiedShieldedCoinInfo>`
  — one UTXO per token color; a token's reserve *is* its pot's value;
  plus `export ledger _lpSupply: Uint<128>` (total LP minted) and
  `export ledger _faucetOpen: Boolean` (deploy-time mint gate)
- **Token colors are derived in-circuit** from the contract address
  (`tokenType(pad(32,"mn-amm:tokenA"), kernel.self())`), so colors differ per
  deployment — never hardcode them
- **Fee:** 0.3% retained in the pool (997/1000); swap math is division-free
  (quotient range check), bounds `< 2^64`
- **Ownership:** OpenZeppelin `ZOwnablePK` — `ownerId = sha256(pk ‖ secret)`,
  with the default secret being the bytes of the shielded coin public key.
  `scripts/owner-args.mjs` derives it; override via `MN_PRIVATE_STATE_SECRET`
  only if you also change the derivation everywhere
- **Pause:** `swap`, `seed`, `addLiquidity`, `removeLiquidity`, and
  `faucet` all assert not-paused; only the owner can pause/unpause

---

## Troubleshooting

| Symptom | Cause & fix |
|---|---|
| Everything hangs; `API-WS … 1006`; `StorageOutOfSpace(481, 512)` in `docker logs node` | **Host disk < 512 MB free.** The node won't start. Free ≥ 1 GB (`docker rm` old exited containers, `npm cache clean --force`), node restarts itself |
| `ENOENT … keys/seed.verifier` (or any missing key file) | **A `compact compile` run was interrupted.** Never kill it mid-run (~25 min: 7 circuits, key generation dominates). Fix: `npm run compile:pool -w contract`, then `npm run build` |
| CLI/UI hang forever on connect, no error | **Wrong contract address** — a nonexistent address never emits state. Verify: `mn contract state --address $AMM_CONTRACT --managed contract/managed/pool` |
| UI shows stale/old coins, or `INSUFFICIENT_COIN` with values that don't exist | **Wallet cache survives chain resets.** `mn cache clear --network undeployed --wallet devnet-main`, then `mn balance` to resync |
| `mn serve unreachable at ws://127.0.0.1:9932` | Start it: `mn serve --approve-all --wallet devnet-main &`. To stop it, kill **by PID** (`pgrep -af '[m]n serve'` — brackets avoid matching your own shell) — a bare `pkill -f serve` can kill the shell you're typing in |
| CLI/UI suddenly fails with `Insufficient Funds: could not balance dust` (even though `mn dust status` shows plenty) | `mn serve` outlived a chain outage / node restart with stale wallet state — restart it **by PID**, wait for `ws://127.0.0.1:9932`, retry |
| Swap fails / proofs die mid-run | **Proof server out of memory** (swap/add-liquidity fan out parallel proves; `addLiquidity` alone can OOM a 7 GB host): `docker restart proof-server`, free RAM (stale `tsserver`s, browsers), or serialize proofs through a FIFO proxy on `:6301` and point the CLI at it via `AMM_PROOF_URL=http://127.0.0.1:6301` |
| `mn localnet down` “ate” my deployment | By design: `down` wipes chain **and** undeployed wallet cache → re-run bootstrap steps 2–7. `mn localnet stop` only stops containers (state preserved) |

---

## Roadmap

**Phase 2 — agent support** (in progress): CLI schema doc (`docs/cli-schema.md`,
parity-tested) → policy guard (spend limits, token allowlist, persisted
counters) → owner/agent identity split → MCP server (`mn-amm-mcp`, dry-run
first, policy-gated, JSONL-audited) — all done → strategy interface + runner
(DCA, rebalance; simulation mode, idempotent execution, kill switch) →
strategy dashboard in the UI → live demo (two agents, one policy-blocked
trade, halt). Deferred: localnet E2E for the policy/agent/MCP stack (needs
more free RAM for proving).

**Contract:** LP share circuits live; view circuits replaced by ledger
reads; multi-pool via contract-per-pool registry; deploy-time faucet gate;
remaining work is hardening against the `UNVERIFIED` markers, plus a
preprod redeploy of the stale pool above.

**Release checklist:** liquidity E2E — done (2026-10-15): `addLiquidity`
and `removeLiquidity` both settled on-chain from this host via the FIFO
prove queue at ≥4 GB free RAM (the ~76 MB single-prove peak OOMs the box
below ~2.5 GB free); CI first-run passed (2026-10-15). Remaining: preprod
redeploy of the gated pool. Engineering notes live in
[`docs/learnings.md`](./docs/learnings.md).

**Housekeeping:** leaderboard template leftovers removed and package names
renamed to `mn-amm-*`; see `docs/patches.md` for the wallet-sdk-shielded
note.

---

## License

Apache-2.0 — see [LICENSE](./LICENSE). Dependency licenses (and the few
GPL-only transitive packages, never shipped to browsers) are inventoried in
[`docs/dependencies.md`](./docs/dependencies.md).
