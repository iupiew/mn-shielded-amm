# Engineering learnings

Hard-won, repo-specific lessons from building this AMM. Each entry is
something that actually bit us, with the fix that stuck.

## Compact toolchain

- **`compact compile` is the long pole: ~25 min for 7 circuits** (key
  generation dominates; docs say minutes, hardware says otherwise). Never
  interrupt a run — a killed compile leaves partial/empty files under
  `managed/pool/keys/` that only a full recompile repairs. Run it detached
  (`setsid … &`) and check liveness by PID, not `pgrep` (self-matches).
- **Recompiles are deterministic**: only the changed circuit's keys/zkir
  differ, so diffs stay reviewable. The committed `managed/` tree is the
  source of truth for deploys — CI never compiles Compact.
- **Constructor args need `disclose()` to become ledger state.** A private
  constructor parameter silently stays private; `_faucetOpen := disclose(flag)`
  was required for the deploy-time gate to be publicly readable.
- **OZ error strings are load-bearing**: `ZOwnablePK: caller is not the
  owner`, `Pausable: paused` — and runtime asserts surface with a
  `failed assert: ` prefix. Tests and CLI error-matching depend on the exact
  strings.

## Proving & the proof server

- **The compact SDK fans out `/check` + `/prove` per circuit in parallel.**
  On a 7 GB host with no swap that OOM-kills `proof-server` (kernel SIGKILL,
  exit 137). Diagnose with `docker events --filter container=proof-server`
  (look for `oom`) — `docker inspect` shows `OOMKilled=false` after the
  restart policy has already recycled the container.
- **Serialize through a FIFO proxy** (`~/.midnight/sync-infra/ps-queue.mjs`,
  `:6301 → :6300`) and point the CLI at it via `AMM_PROOF_URL`. Peak memory
  drops to one circuit at a time; swap/faucet/seed prove fine this way.
- **`addLiquidity` is its own beast**: a single prove request carries ~76 MB
  of payload and still OOMs a serialized 7 GB box with ~2 GB free. The
  circuit passes the in-process vitest prover (15/15), but on-chain E2E for
  liquidity needs a bigger host or swap. Budget ≥12 GB before promising a
  liquidity demo.
- A wedged `proof-server` between attempts surfaces client-side as
  `AbortError` or `socket hang up` — restart it and retry; these are not
  circuit errors.

## Wallet & chain operations

- **Wallet coin cache survives chain resets that it shouldn't.** After
  `mn localnet up` on a recycled chain, stale coins from the previous
  deployment appear in `mn-amm balance` and coin selection fails with
  values that don't exist. Fix: `mn cache clear --network undeployed
  --wallet devnet-main`, then resync.
- **`mn localnet down` wipes chain *and* undeployed wallet cache**;
  `mn localnet stop` preserves state. Docker container pruning (e.g. after
  a disk-full incident) is effectively a `down`.
- **The node refuses to start with <512 MB free disk** — the failure looks
  like an unrelated ws hang. Check `df` first.
- **Owner model**: with default private state, `secretKey` = the shielded
  coin public key bytes and `ownerId = sha256(pk ‖ pk)` — derivable by
  anyone who knows your coin pk (documented in `docs/privacy.md`).
  `scripts/owner-args.mjs` derives it against a live `mn serve`.
- **Deploy-time flags beat runtime gates** for demo safety: the
  `faucetOpen` constructor flag makes "anyone can mint" an explicit,
  auditable property of the deployment rather than an operator promise.

## API/UI integration

- **1AM wallet connector**: preprod only (it rejects undeployed/local
  chains — verified in the spike), `apiVersion 4.x`, in-memory vault (no
  persistence across reloads). Browser→indexer CORS works in practice.
- **Ledger reads replaced view circuits**: reserves, colors, LP supply, and
  pause status are read from contract state (e.g. `_isPaused` at state
  index 4) — no proving, no tx inclusion wait. `get*` view circuits were
  deleted; don't reintroduce them.
- **The CLI imports the api via deep `dist/` paths** — any api edit needs
  `npm run build -w api` before cli typecheck/tests see it.
- **The dashboard is preprod-only by design** (its own pool + wallet); it
  does not mirror the localnet used by CLI steps.

## Repo hygiene

- **Template leftovers rot**: the starter leaderboard contract shipped
  witnesses/types/exports/tests that the pool code kept using under
  leaderboard names. Removing them cleanly means renaming the private-state
  helpers first (`createPoolPrivateState`), then deleting; npm package names
  still say `leaderboard-*` (rename = open decision).
- **Secrets scanning**: gitleaks (git + working tree) plus a history-wide
  BIP39-phrase scan across all blob paths × recent revs. Known local secrets
  (`.spike/*.json`, `.env`) are all gitignored; nothing leaked into history,
  so no rewrite was needed.
- **License metadata gap upstream**: `@midnight-ntwrk/ledger-v8`,
  `onchain-runtime-v3`, and `zkir-v2` publish without a `license` field
  (sources are Apache-2.0 in the Midnight monorepo). Worth reporting
  upstream; tracked in `docs/dependencies.md`.
- **CI can run the circuit tests**: vitest proves with the in-process
  testkit runtime — no proof server, no localnet, no network. Keep them in
  CI; they caught real regressions cheaply.
