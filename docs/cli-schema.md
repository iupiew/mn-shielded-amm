# `mn-amm` CLI schema

Reference for the `mn-amm` command-line interface (`cli/src/cli.ts`). This
document is enforced by a parity test (`cli/test/cli-schema.test.ts`): every
command the CLI dispatches and every flag its parser accepts must appear here,
and the [Flags](#flags) section may not list flags the parser does not know.

Run `mn-amm --help` for the in-tool summary; this file adds the machine
contract (JSON envelopes, exit codes, output keys, env vars, network matrix).

## Commands

Amounts are **atomic units** (10⁻⁶ base units), non-negative integers.
`<side>` is `AtoB` or `BtoA` (case-insensitive; `a->b` / `b->a` accepted).

| Command | Positionals | Effect | Mutating |
| --- | --- | --- | --- |
| `pool-state` | — | Reserves, colors, `seeded`, `lpSupply`, `paused` | no |
| `balance` | — | Wallet coins split by pool color (+ other colors) | no |
| `quote <side> <amount>` | side, amount | Price a swap at current reserves (0.3% fee) | no |
| `swap <side> <amount>` | side, amount | Quote + coin plan; `--execute` submits | dry-run by default |
| `faucet` | — | Mint devnet coins (`--amount-a`/`--amount-b`, default 1000000 each) | dry-run by default |
| `seed --mint` | — | Faucet then seed the pool (initial LP = `--initial-lp` or floor(√(a·b))); refuses already-seeded pools before minting | dry-run by default |
| `add-liquidity <amountA> <amountB>` | amountA, amountB | LP deposit at current ratio; slippage bounds `minLpOut` | dry-run by default |
| `remove-liquidity <shares>` | shares | LP withdrawal (pro-rata A+B); slippage bounds both payouts | dry-run by default |
| `pause` / `unpause` | — | Admin pause control; skips submission when already in target state | dry-run by default |
| `pools list` | — | Dump the named-pool registry | no |
| `pools add <name> <contract>` | name, contract | Register a pool (`--network-id` optional) | file only |
| `pools remove <name>` | name | Unregister a pool (unknown name → usage error) | file only |
| `pools deploy <name>` | name | Deploy a new pool contract and register it (see [Networks](#networks)) | dry-run by default |
| `help`, `-h`, `--help` | — | Print usage (also prints on missing command) | — |

`--contract` resolution order: explicit `--contract <64-hex>` → registered
`--pool <name>` (from the registry file) → `AMM_CONTRACT` env → (preprod only)
the deployed default pool. `pools` subcommands never need a contract.

## Flags

| Flag | Kind | Applies to | Default | Notes |
| --- | --- | --- | --- | --- |
| `--contract <hex>` | value | all except `pools` | `AMM_CONTRACT` env | 64 hex chars |
| `--pool <name>` | value | all except `pools` | — | Resolved via the registry file; overridden by `--contract` |
| `--wallet <name>` | value | all except `pools`; `pools deploy` (localnet) | localnet `devnet-main`; preprod `AMM_WALLET` env or `mn-amm-agent` | |
| `--network-id <id>` | value | all | `AMM_NETWORK_ID` env or `undeployed` | `undeployed` (localnet) \| `preprod` |
| `--slippage-bps <n>` | value | `quote`, `swap`, `add-liquidity`, `remove-liquidity`, `seed` | `0` | Integer 0–10000; bounds the `min*` fields of quotes |
| `--amount-a <n>` | value | `faucet`, `seed` | `1000000` | |
| `--amount-b <n>` | value | `faucet`, `seed` | `1000000` | |
| `--initial-lp <n>` | value | `seed` | floor(√(a·b)) | Circuit floor: 1000 |
| `--salt <64-hex>` | value | `pools deploy` | fresh random | |
| `--execute` | bool | all mutating commands | off (dry-run) | Actually submits the transaction |
| `--json` | bool | all | off (human `key: value` lines) | Machine-readable envelope (see below) |
| `--no-sync` | bool | localnet commands via the node wallet | off (sync first) | Read the wallet coin cache without refreshing |
| `--mint` | bool | `seed` | required | The CLI supports only `seed --mint` |
| `--faucet-open` | bool | `pools deploy` | off (faucet closed) | Open the faucet on the newly deployed pool |
| `--help`, `-h` | bool | all | — | Print usage |

Unknown flags are rejected by the parser (`exit 2`) before any command runs.

## Environment variables

| Variable | Owner | Default | Purpose |
| --- | --- | --- | --- |
| `AMM_CONTRACT` | CLI | — | Pool contract address when no `--contract`/`--pool` is given |
| `AMM_NETWORK_ID` | CLI | `undeployed` | Default for `--network-id` |
| `AMM_POOLS_FILE` | CLI (registry) | `<cwd>/pools.json` | Named-pool registry file location |
| `AMM_SEED_PATH` | CLI / api | `.spike/agent-seed-export.json` | Agent seed export for preprod deploy and proving |
| `AMM_SERVE_URL` | CLI / api | `ws://127.0.0.1:9932` (`ws://127.0.0.1:9933` preprod) | `mn serve` DApp-Connector WebSocket; `MN_SERVE_URL` accepted as a legacy fallback in `pools deploy` |
| `AMM_WALLET` | api (preprod) | `mn-amm-agent` | Wallet name whose shielded coin cache funds preprod transactions |
| `AMM_VAULT_PATH` | api (preprod) | `~/.mn-amm/preprod-vault.json` | Persistent file vault: records faucet coins, consumed on spends |
| `AMM_PROOF_URL` | api (localnet) | `ws://127.0.0.1:6300` | Local proof-server RPC |
| `AMM_PROOF_SERVER` | api (preprod) | ProofStation | Proving endpoint for preprod transactions |
| `AMM_INDEXER_URI`, `AMM_INDEXER_WS_URI`, `AMM_RPC_URI` | api (preprod) | public alpha endpoints | Preprod indexer/RPC endpoints |
| `AMM_MANAGED_DIR` | api | `contract/managed` | Managed-contract artifacts (deploy verification) |

## Output contract

- **Success, `--json`** (stdout): `{"ok": true, ...}` — 2-space indented;
  `bigint` values serialized as decimal strings.
- **Success, human** (stdout): `key: value` lines; arrays rendered as
  `- <item>`; objects as compact JSON.
- **Errors, `--json`** (stderr): `{"ok": false, "error": {"code": "<CODE>",
  "message": "..."}}` — `code` is `USAGE`, `INTERNAL`, or an
  [AmmError code](#exit-codes).
- **Errors, human** (stderr): `usage error: …` / `amm error [CODE]: …` /
  `error: …` (+ stack for internal errors).

Success payload keys per command (after the always-present `command`, and
`contract` where a pool is involved):

| Command | Keys |
| --- | --- |
| `pool-state` | `reserveA`, `reserveB`, `seeded`, `colorAHex`, `colorBHex`, `colorLpHex`, `lpSupply`, `paused` |
| `balance` | `totalA`, `totalB`, `totalLp`, `coinA[]`, `coinB[]`, `lpCoins[]`, `otherCoins[]` (coins: `nonceHex`, `colorHex`, `value`) |
| `quote` | `slippageBps`, `side`, `amountIn`, `reserveIn`, `reserveOut`, `amountOut`, `minAmountOut` |
| `swap` (dry-run) | `dryRun`, `executeHint`, `paused`, `quote{…}`, `slippageBps`, `spendableCoinAvailable`, `availableValues[]` |
| `swap` (executed) | `txId`, `quote{…}`, `coin{…}`, `consumedFromVault` |
| `faucet` (dry-run) | `dryRun`, `executeHint`, `paused`, `wouldMint{amountA, amountB}` |
| `faucet` (executed) | `coinA{…}`, `coinB{…}`, `recordedInVault` |
| `seed` (dry-run) | `dryRun`, `executeHint`, `paused`, `wouldMint{…}`, `initialLp` |
| `seed` (executed) | `seedTxId`, `minted{coinA, coinB}`, `initialLp`, `lpCoin{…}` |
| `add-liquidity` (dry-run) | `dryRun`, `executeHint`, `quote{amountA, amountB, reserveA, reserveB, lpSupply, lpOut, minLpOut}`, `slippageBps`, `spendableCoinAvailable{amountA, amountB}` |
| `add-liquidity` (executed) | `txId`, `quote{…}`, `lpCoin{…}`, `consumedFromVault` |
| `remove-liquidity` (dry-run) | `dryRun`, `executeHint`, `quote{lpAmount, reserveA, reserveB, lpSupply, aOut, bOut, minA, minB}`, `slippageBps`, `spendableCoinAvailable` |
| `remove-liquidity` (executed) | `txId`, `quote{…}`, `coins[]`, `consumedFromVault` |
| `pause`/`unpause` (dry-run) | `dryRun`, `executeHint`, `currentPaused`, `wouldSetPaused` |
| `pause`/`unpause` (already in state) | `alreadyInState`, `txId: null` (no transaction submitted) |
| `pause`/`unpause` (executed) | `txId`, `paused` |
| `pools list` | `path`, `pools[]{name, contract, networkId?}` |
| `pools add` | `name`, `contract`, `networkId?` |
| `pools remove` | `name` |
| `pools deploy` (dry-run, undeployed) | `networkId`, `ownerCoinPublicKey`, `salt`, `faucetOpen`, `wallet`, `dryRun` |
| `pools deploy` (dry-run, preprod) | `networkId`, `ownerId`, `salt`, `faucetOpen`, `dryRun`, `deployScript` |
| `pools deploy` (executed) | `contract`, `networkId?`, `ownerId`, `salt`, `faucetOpen` |

## Exit codes

| Code | Meaning |
| --- | --- |
| `0` | Success (including dry-runs and `--help`) |
| `1` | Internal error (node/API failure, bad api build, deploy script failure) |
| `2` | Usage error (unknown command/flag, malformed argument) |
| `3` | `AmmError` from the contract logic — `code` in the `--json` envelope: `NOT_SEEDED`, `ALREADY_SEEDED`, `ZERO_AMOUNT`, `VALUE_TOO_LARGE`, `NO_OUTPUT`, `EXCEEDS_RESERVE`, `BAD_SLIPPAGE`, `INSUFFICIENT_COIN`, `PAUSED`, `NOT_IMPLEMENTED` |

## Networks

| | `undeployed` (default, localnet) | `preprod` (alpha) |
| --- | --- | --- |
| Node | `mn serve` (local Midnight node) | public alpha network |
| Wallet | local `mn serve` wallet (default `devnet-main`), synced via the node RPC | coin-cache wallet (default `mn-amm-agent`, `AMM_WALLET`), live coins from the `midnight balance` cache with file-vault fallback |
| Proving | local proof server (`AMM_PROOF_URL`), FIFO queue | ProofStation (`AMM_PROOF_SERVER`), fees sponsored |
| `pools deploy` | `mn contract deploy` with the serve wallet's coin public key as owner | agent seed (`AMM_SEED_PATH`) + `scripts/preprod-deploy.mjs` |
| Speed | views/txs take seconds each | reads fast; proving can take minutes under load |

## Notes

- Mutating commands are **dry-run by default**; `--execute` submits. Dry-runs
  still perform reads (state, quotes, balances) and never touch the chain.
- Slippage (`--slippage-bps`) only affects the `min*` bounds handed to the
  circuit (`minAmountOut`, `minLpOut`, `minA`/`minB`), not the quoted values.
- The pool keeps a 0.3% fee in-pool; quotes use the exact circuit formula.
- `seed` refuses an already-seeded pool **before** minting (avoids burning a
  faucet tx on the circuit assert).
- `pause`/`unpause` skip submission when the pool is already in the target
  state (repeated-op idempotency of the on-chain op itself is unverified).
- Preprod minted coins persist in the file vault (`AMM_VAULT_PATH`); executed
  swaps/liquidity ops report `consumedFromVault: true` when it was updated.
