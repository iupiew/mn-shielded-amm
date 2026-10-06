# mn-amm — Shielded AMM on Midnight

A fully **shielded constant-product AMM** (think Uniswap-lite) built on the
[Midnight Network](https://midnight.network). Two devnet test tokens, a 0.3% swap
fee that stays in the pool, and every reserve change proven with zero-knowledge
circuits — the chain never sees amounts, colors, or who traded.

Ships as four npm workspaces: a **Compact contract**, a shared **TypeScript API**,
a thin **CLI**, and a **React dashboard**.

| Feature | Status |
|---|---|
| Faucet · seed · swap · pause/unpause, via CLI **and** UI | ✅ verified on local devnet |
| Live quotes (0.3% fee, slippage tolerance in bps) | ✅ |
| Dry-run-first safety (`--execute` to submit, `--json` output) | ✅ |
| Add/remove liquidity (LP share circuits) | 🔜 planned (API stubs return `NOT_IMPLEMENTED`) |
| Agent support (MCP server, policies, strategies) | 🔜 phase 2 |

> **Local-devnet only.** Everything below runs against an ephemeral local chain.
> The chain, the deployed pool, and (on `localnet down`) the wallet cache are
> disposable by design.

---

## Architecture

```
┌──────────────┐   ┌──────────────┐
│  cli/ (thin) │   │ ui/ (React)  │  ← browser
│   mn-amm     │   │  dashboard   │
└──────┬───────┘   └──────┬───────┘
       │                  │ HTTP (vite dev middleware)
       │           ┌──────▼───────┐
       │           │ ui/bridge.ts │  local API bridge: serializes every
       │           └──────┬───────┘  call behind one queue, caches pause state
       │                  │
       └──────────►┌──────▼──────────────────┐
                   │ api/  (ALL logic lives) │  AmmApi: poolState · quote ·
                   │  createNodeAmm()        │  swap · faucet · seed · pause
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
bridge are thin adapters that parse arguments / HTTP and format output — they
never reimplement AMM math or tx flows.

---

## Project structure

```
mn-amm/
├── contract/
│   ├── pool.compact            # THE contract: faucet, seed, swap, pause, views
│   ├── managed/pool/           # compiler output (keys/, zkir/, contract/) — committed
│   ├── leaderboard.compact     # template legacy (unused by this app)
│   └── src/                    # contract JS exports (legacy leaderboard + witnesses)
├── api/                        # shared business logic — everything else calls this
│   └── src/amm/
│       ├── api.ts              # AmmApi: poolState, quote, swap, faucet, seed, pause…
│       ├── node.ts             # createNodeAmm(): node transport, wallet, private state
│       ├── math.ts             # constant-product math (division-free swap check)
│       └── types.ts            # AmmError codes (PAUSED, NO_EXACT_COIN, …)
├── cli/
│   └── src/cli.ts              # mn-amm — arg parsing + output formatting only
├── ui/
│   ├── bridge.ts               # vite dev middleware exposing api/ over /api/*
│   └── src/                    # React dashboard (App.tsx, lib/api.ts typed client)
├── scripts/
│   └── owner-args.mjs          # prints deploy --args (ownerId + instanceSalt)
└── .spike/                     # dev scratch harnesses (smoke tests, derivations)
```

**Template legacy** (present but not part of the AMM): `leaderboard.compact`,
the leaderboard exports in `api/src/index.ts`, `contract/README.md`, and the root
`npm run compile` script (use `compile:pool` instead — see below).

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

export AMM_CONTRACT=<address>     # printed by deploy; skip if using the
                                  # baked-in default in ui/bridge.ts

npx mn-amm pool-state             # sanity check (first call: ~30–90 s)
npx mn-amm quote AtoB 100000      # live price quote

npm run dev -w ui                 # dashboard + API bridge → http://localhost:3000
```

Open **http://localhost:3000** — pool reserves, wallet balance, live quote,
swap preview, and dev tools (faucet / seed / pause) are all on one page.

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
# ws://127.0.0.1:9932 — the CLI and the UI bridge both require it
```

`--approve-all` auto-approves reads *and* writes (fine for a throwaway devnet).

### 5. Deploy the pool

```bash
node scripts/owner-args.mjs       # prints: [[<ownerId ints>,<salt ints>]]
# (requires mn serve; derives ownerId from your wallet's shielded public key)

node scripts/owner-args.mjs | xargs -I{} mn contract deploy \
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
npm run dev -w ui                 # → http://localhost:3000
```

**After `mn localnet down`** (chain state + wallet cache wiped) repeat steps 2–7.
A chain reset always destroys the deployed pool.

---

## CLI reference (`npx mn-amm` / `mn-amm`)

```
mn-amm <command> [options]

  pool-state                      reserves, colors, seeded + pause flag
  balance                         wallet coins split by pool color
  quote <side> <amount>           price a swap   (side: AtoB | BtoA, atomic units)
  swap <side> <amount>            quote + coin plan; --execute submits
  faucet [--amount-a N] [--amount-b N]
                                  mint devnet coins; --execute submits
  seed --mint                     faucet(1M,1M) then seed; --execute submits
  pause | unpause                 admin pause control; --execute submits
```

| Flag | Meaning |
|---|---|
| `--contract <hex>` | pool address — or `export AMM_CONTRACT=…` (required) |
| `--wallet <name>` | default `devnet-main` |
| `--slippage-bps <n>` | 0–10000, default 0 |
| `--execute` | **actually submit** — mutating commands are dry-runs by default |
| `--json` | machine-readable output (bigints as decimal strings) |
| `--no-sync` | read the wallet coin cache without refreshing it first |

**Exit codes:** `0` ok · `1` internal error · `2` usage error · `3` AMM error
(`error.code` in `--json`, e.g. `PAUSED`, `NO_EXACT_COIN`).

```bash
export AMM_CONTRACT=bf823a56c3b5a231c168ba39ffc46a80b39e3195709a88eb594cc011899eccc1

npx mn-amm quote AtoB 100000 --json
# {"ok":true,"side":"AtoB","amountIn":"100000","amountOut":"10748", …}
#   (amountOut depends on the pool's current reserves)

npx mn-amm faucet --execute --json            # mint 1,000,000 A + 1,000,000 B

npx mn-amm swap AtoB 123456 --json             # dry-run still succeeds (rc 0) but
#   "exactCoinAvailable":false, "availableValues":["1000000"]
npx mn-amm swap AtoB 123456 --execute; echo $?
# → 3   {"error":{"code":"NO_EXACT_COIN","message":"… available values: [1000000]"}}

npx mn-amm swap AtoB 1000000 --execute        # real swap (~2–4 min: proving + tx)
```

### The exact-coin rule

`swap` consumes an **entire coin** in-circuit — `amountIn` must equal one of
your existing pool-color coin values exactly. The **dry-run never fails** on a
missing coin: it reports `exactCoinAvailable:false` plus `availableValues` and
exits 0. Only `--execute` raises exit code `3` (`NO_EXACT_COIN`).
Want to swap 100,000? Mint split amounts with `faucet --amount-a 100000`
first, or swap a full coin value.

---

## UI (http://localhost:3000)

| Panel | What it does |
|---|---|
| **Pool** | reserves, prices, token colors, live/paused badge, refresh |
| **Wallet balance** | totals + per-coin chips; *Sync & refresh* re-reads the chain |
| **Swap** | debounced live quote, slippage, preview → explicit *Execute swap* |
| **Dev tools** | faucet (mint), seed, pause/unpause — every mutation previews first |

**How it talks to the chain:** the browser never holds keys. `ui/bridge.ts` is a
vite dev-server middleware exposing `api/` over `/api/*` in the same process —
no CORS, no extra daemon. All bridge calls run behind a single queue (wallet
coin selection, proofs and submissions must never interleave), and the paused
flag is cached (60 s TTL) because `isPaused()` is a submitted view (~24 s).

**Bridge env** (shell env of `npm run dev`): `AMM_CONTRACT`, `AMM_WALLET`,
`AMM_NETWORK_ID` — defaults: baked-in devnet address, `devnet-main`,
`undeployed`.

**Recovered from a bridge error?** `curl -X POST localhost:3000/api/reconnect`
or restart the dev server — a failed startup leaves `health.state=error`, which
blocks the UI even after the underlying problem is fixed.

---

## Development

```bash
npm run build                # contract (tsc) + api (tsc + copy managed/)
npm run compile:pool -w contract   # recompile pool.compact — ONLY after editing it
npm run typecheck -w api     # also: -w ui, -w mn-amm-cli
npm test -w api              # 20 tests (math, quotes, errors)
npm test -w contract         # 23 tests
npm run dev -w ui            # dashboard + bridge on :3000
```

**Conventions in this repo**

- **All logic in `api/`.** CLI/UI only parse, call, format. New features land in
  `AmmApi` first and get wired into both frontends.
- **`// UNVERIFIED:` markers** flag Compact/SDK constructs that were confirmed
  via docs but not yet battle-tested — kept visible (3 in `pool.compact`,
  2 in `node.ts`).
- **Pinned dependencies** — no upgrades without an explicit decision
  (exception in flight: a local patch of `wallet-sdk-shielded` 3.0.1).
- **Mutations are dry-run by default** in the CLI; `--execute` is required.
- **Never interrupt `compact compile`** — a killed run leaves partial/empty
  files in `managed/pool/keys/` (see Troubleshooting).

### Contract at a glance (`contract/pool.compact`)

- **Circuits:** `faucet` · `seed` · `swap` · `pause` · `unpause` ·
  `getColors` · `getReserves` · `getIsPaused`
- **Ledger:** `export ledger _coins: Map<Bytes<32>, QualifiedShieldedCoinInfo>`
  — one UTXO per token color; a token's reserve *is* its pot's value
- **Token colors are derived in-circuit** from the contract address
  (`tokenType(pad(32,"mn-amm:tokenA"), kernel.self())`), so colors differ per
  deployment — never hardcode them
- **Fee:** 0.3% retained in the pool (997/1000); swap math is division-free
  (quotient range check), bounds `< 2^64`
- **Ownership:** OpenZeppelin `ZOwnablePK` — `ownerId = sha256(pk ‖ secret)`,
  with the default secret being the bytes of the shielded coin public key.
  `scripts/owner-args.mjs` derives it; override via `MN_PRIVATE_STATE_SECRET`
  only if you also change the derivation everywhere
- **Pause:** `swap` and `seed` assert not-paused; `faucet` intentionally is not
  gated (dev helper)

---

## Troubleshooting

| Symptom | Cause & fix |
|---|---|
| Everything hangs; `API-WS … 1006`; `StorageOutOfSpace(481, 512)` in `docker logs node` | **Host disk < 512 MB free.** The node won't start. Free ≥ 1 GB (`docker rm` old exited containers, `npm cache clean --force`), node restarts itself |
| `ENOENT … keys/seed.verifier` (or any missing key file) | **A `compact compile` run was interrupted.** Never kill it mid-run. Fix: `npm run compile:pool -w contract` (runs to completion, ~1–2 min), then `npm run build` |
| CLI/UI hang forever on connect, no error | **Wrong contract address** — a nonexistent address never emits state (bridge times out after 90 s with a health error). Verify: `mn contract state --address $AMM_CONTRACT --managed contract/managed/pool` |
| UI shows stale/old coins, or `NO_EXACT_COIN` with values that don't exist | **Wallet cache survives chain resets.** `mn cache clear --network undeployed --wallet devnet-main`, then `mn balance` to resync |
| `mn serve unreachable at ws://127.0.0.1:9932` | Start it: `mn serve --approve-all --wallet devnet-main &`. To stop it, kill **by PID** (`pgrep -af '[m]n serve'` — brackets avoid matching your own shell) — a bare `pkill -f serve` can kill the shell you're typing in |
| CLI/UI suddenly fails with `Insufficient Funds: could not balance dust` (even though `mn dust status` shows plenty) | `mn serve` outlived a chain outage / node restart with stale wallet state — restart it **by PID**, wait for `ws://127.0.0.1:9932`, retry |
| Swap fails / proofs die mid-run | **Proof server out of memory** (swap fans out ~8 concurrent proofs, needs ≈2 GB free): `docker restart proof-server` |
| First quote after ~1 min idle takes ~25 s | The bridge's background `isPaused()` refresh (a ~24 s submitted view) holds the queue; subsequent calls are ~50 ms |
| `isPaused` / `pool-state` slow in the CLI | `isPaused()` is a *submitted view* — every call waits for tx inclusion (~24 s). The UI bridge caches it (60 s TTL) |
| `NOT_IMPLEMENTED` from `addLiquidity`/`removeLiquidity` | Expected — LP share circuits are planned, not built |
| `mn localnet down` “ate” my deployment | By design: `down` wipes chain **and** undeployed wallet cache → re-run bootstrap steps 2–7. `mn localnet stop` only stops containers (state preserved) |

---

## Roadmap

**Phase 2 — agent support** (next):
CLI schema doc (`docs/cli-schema.md`) → policy guard (spend limits, token
allowlist, persisted counters) → isolated agent wallet → MCP server mirroring
the CLI with server-side policy → strategy interface + runner (DCA,
rebalance; simulation mode, idempotent execution, kill switch) → strategy
dashboard in the UI → live demo (two agents, one policy-blocked trade, halt).

**Contract:** LP share circuits (`addLiquidity`/`removeLiquidity` are API stubs
today), then hardening against the `UNVERIFIED` markers.

**Housekeeping:** remove leaderboard template leftovers, un-pin the
`wallet-sdk-shielded` 3.0.1 patch once 3.0.2 is adopted.

---

## License

See [LICENSE](./LICENSE).
