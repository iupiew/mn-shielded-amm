# M3 design — LP share liquidity (`addLiquidity` / `removeLiquidity`)

Status: **shipped** — this file is the original design record; the as-built
implementation differs in a few places (see "As-built deltas" below) and lives
in `contract/pool.compact` + `contract/test/pool.test.ts`.
Verified facts below come from Kapa/docs for the pinned versions (compact
language 0.23, compiler 0.31.1, midnight-js 4.1.1); every circuit construct
additionally gets compile-validated before it is called done.

## As-built deltas (vs. the design sketched here)

- **Caller-supplied quotients:** `addLiquidity` takes `lpOut` (prover supplies
  the quotient, range-checked in-circuit) plus `minLpOut`; `removeLiquidity`
  takes `aOut`/`bOut` plus `minA`/`minB` — instead of the design's
  min-computed-in-circuit sketch. Slippage protection is unchanged.
- **No getters:** `getLpSupply`/`getLpColor` were dropped — LP supply and the
  derived LP color are read straight from ledger state by `api/`.
- **Seed initial LP:** as designed (see below); api computes
  `sqrt(a·b)` off-circuit by default.

## Current state (snapshot at design time — since shipped)

- `seed(coinA, coinB)` creates both pots **without LP accounting** (devnet-only
  bootstrap; comment says it is to be replaced).
- `api.addLiquidity` / `api.removeLiquidity` are stubs (`NOT_IMPLEMENTED`).
- `swap` supports partial input coins (M2, proven on localnet).

## Design

### LP token

- Color: `tokenType(pad(32, "mn-amm:lp"), kernel.self())` — same derivation as
  tokenA/tokenB (faucet-proven).
- Supply ledger: `export ledger _lpSupply: Uint<128>` (scalar ledger entry;
  compile-to-verify).
- Getters: `getLpSupply(): Uint<128>`, `getLpColor(): Bytes<32>` for api/CLI.

### Bootstrap: `seed` mints the initial LP supply

`seed` stays the devnet-only initializer (no sqrt, no first-deposit special
case in `addLiquidity`):

```
export circuit seed(coinA, coinB, initialLp: Uint<64>, nonceLp: Bytes<32>): ShieldedCoinInfo
```

- Existing seed asserts unchanged (pots empty, colors, values > 0).
- New: `initialLp >= 1000` (dust-floor; api/ computes `sqrt(a*b)` off-circuit
  by default). Mint LP → `sendImmediateShielded` to caller (faucet pattern);
  `_lpSupply := initialLp`. Returns the sent LP coin.

Consequence: after seed, `S > 0` and both reserves `> 0` always, so
`addLiquidity` needs no zero-division special case.

### `addLiquidity`

```
export circuit addLiquidity(
  coinA: ShieldedCoinInfo, amountA: Uint<64>,
  coinB: ShieldedCoinInfo, amountB: Uint<64>,
  minLpOut: Uint<64>, nonceLp: Bytes<32>
): ShieldedCoinInfo
```

- `Pausable_assertNotPaused()`; coin colors must be tokenA/tokenB; reserves
  must exist.
- Partial amounts supported (M2 proven pattern, per-coin disclosed branch):
  receive → split remainder back to caller → merge `amountA` into potA.
  When `amountX == coinX.value` the whole-coin merge path runs.
- Mint: `lpOut = min(floor(amountA·S/rA), floor(amountB·S/rB))` — proved via
  the swap-style quotient range check (`floor == q ⇔ q·d ≤ n < (q+1)·d`),
  then `lpOut == min(qA, qB)` with a disclosed `if` selecting the minimum.
- Asserts `lpOut > 0` and `lpOut >= minLpOut`; `_lpSupply += lpOut`.
- Mint LP → `sendImmediateShielded` to caller; return the sent coin
  (faucet contract: never return the consumed mint).

### `removeLiquidity`

```
export circuit removeLiquidity(
  coinLp: ShieldedCoinInfo, amountLp: Uint<64>,
  minA: Uint<64>, minB: Uint<64>,
  nonceA: Bytes<32>, nonceB: Bytes<32>
): [ShieldedCoinInfo, ShieldedCoinInfo]
```

- Pause + color asserts; `0 < amountLp <= coinLp.value`; bounds `< 2^64`.
- Payouts: `aOut = floor(amountLp·rA/S)`, `bOut = floor(amountLp·rB/S)`
  (quotient checks). Asserts `aOut, bOut > 0` and `>= minA/minB`.
- LP handling (partial via M2 pattern): receive →
  `sendImmediateShielded(lpFresh, shieldedBurnAddress(), amountLp)` burns the
  redeemed portion → remainder change re-sent to caller (exact case: no
  change). `shieldedBurnAddress(): Either<ZswapCoinPublicKey, ContractAddress>`
  (docs-verified; testkit uses exactly this mint→burn composition). Burn
  emits a public `ShieldedBurn` event — supply is provably destroyed.
- Pots: `sendShielded(potX, caller, amountX)` with change re-inserted /
  pot removed when emptied (swap output pattern, incl. full-exit case).
- `_lpSupply -= amountLp`; return the two sent coins.

### Math & safety

- All values bounded `< 2^64` (same asserts style as swap) → every product
  `< 2^138` fits `Uint<128>`; `amountLp·rX < 2^128`.
- Rounding floors in the pool's favor (Uniswap-v2 style); `minLpOut` /
  `minA`/`minB` protect against sandwich/rounding (slippage applies in api/).
- Full exit is exact: burning the entire supply pays out `rA` and `rB` with
  zero remainder and empties both pots ( `_coins.remove` path).
- Invariant: `_lpSupply == 0 ⇔ both pots empty` holds automatically.

### Known ecosystem notes

- Burn-address coin discovery ("phantom balance") was fixed in midnight-js
  **v4.0.4** via `EncryptionPublicKeyResolver`; pinned **4.1.1** is fine.
- `ShieldedMint`/`ShieldedBurn` events carry disclosed amounts (consistent
  with this app's public-amount posture — see `docs/privacy.md`).

## Privacy impact (→ update `docs/privacy.md`)

- Public: LP color, minted/burned LP amounts (events + `_lpSupply` ledger),
  reserve deltas from deposits/withdrawals (same observer class as swaps).
- Hidden: LP holder identity (coins sent to wallet's shielded address; coin pk
  fresh per mint), deposit/withdraw counterparties.

## API / CLI

- Replace the `NOT_IMPLEMENTED` stubs:
  - `addLiquidity(amountA, amountB, {slippageBps})` — exact-else-smallest coin
    selection per color (M2 helper reused), quote `lpOut`, `minLpOut` from
    slippage, wait for LP coin, return `{lpCoin, quote}`.
  - `removeLiquidity(lpAmount, {slippageBps})` — select LP coin ≥ amount,
    quote `{aOut, bOut}`, wait for both payout coins.
- `poolState` gains `lpSupply` + `lpColor` (read via new getters).
- CLI: `mn-amm add` / `mn-amm remove` (dry-run default, `--execute`, `--json`,
  same exit codes; new error codes only if selection fails).
- UI: shipped (dashboard Liquidity tab — deposit/withdraw with slippage and
  live LP balance).

## Verification plan

1. Gates: compile (new circuits), typecheck, api unit tests (math: lpOut/
   aOut/bOut quotients, slippage mins), contract template suite.
2. Localnet E2E (contract redeploy + re-seed required — circuit change):
   seed(initialLp=1,000,000) → `add` partial (600k of 1M coins) → assert
   reserves, `_lpSupply`, wallet LP coin → `remove` partial (~40% of LP) →
   assert reserves/supply/payouts → swap regression (M2 partial + exact).
3. Re-audit one E2E tx for burn events if cheap (M1 method).

## Out of scope

Fee switch, permit/approvals, multi-pool, LP token transfers UI, migration of
an already-seeded LP-less pool (localnet gets a clean redeploy).

## Open questions for review

1. **Bootstrap**: modify `seed` to mint initial LP (recommended above) vs.
   special-case first deposit inside `addLiquidity` (adds sqrt-or-supplied-S
   complexity)? — deleting `seed` entirely is a third option.
2. **Partial amounts**: full M2-pattern support in both circuits (recommended)
   vs. exact-coin-only v1 (smaller circuits, worse UX)?
3. **`initialLp` default**: api computes `sqrt(a·b)` off-circuit (recommended;
  matches Uniswap v2 first-mint) vs. simpler `min(a,b)`?
