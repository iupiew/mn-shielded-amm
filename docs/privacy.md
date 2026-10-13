# Privacy model — what the chain actually sees

> Verified 2026-10-09 against real preprod transactions, the contract
> source, and the pinned documentation; updated 2026-10-13 for the
> `faucetOpen` deploy-time gate. If a contract or circuit change alters
> any row below, update this file in the same PR.
>
> An earlier version of the README claimed *"the chain never sees amounts,
> colors, or who traded."* That was wrong on **amounts** and **colors** — both
> are public pool state. The accurate statement: **the chain never sees who
> traded** (identities, balances, coin contents), **but it sees everything about
> the pool itself.**

## Public — anyone with RPC/indexer access reads this

| Thing | Where it's visible | How verified |
|---|---|---|
| Pool reserves (per-color pot values) | Contract ledger state `_coins` map | Read in `api/src/amm/api.ts` via `contractStateObservable`; also appear as literal constants in the published on-chain transcript |
| Token colors | `_coins` map keys; derivable as `tokenType(pad(32, "mn-amm:tokenA"), contractAddr)` from the contract address alone | Contract source (derivation formula; no view circuit exposes them as a call) |
| Exact swap `amountIn` / `amountOut` / direction / timestamp | Reserve delta within the same tx; pre- and post-swap pot values are literal constants in the transcript | Decoded real tx: pot B 500,752 → 1,000,000 (+499,248 = the known `amountIn`), pot A 2,000,000 → 1,003,007 (−996,993); matches the 0.3% fee-on-input formula exactly |
| Which pool, which circuit ran | Transcript actions list `contract` + `entry_point` (`swap`, `faucet`, `seed`, `pause`, `unpause`, `addLiquidity`, `removeLiquidity`) | All sampled txs |
| Multiple pools (contract-per-pool) | Each deployment has its own color domain (colors embed the contract address), so a wallet holding coins from several pools leaks *which* pools it participates in — the color→pool mapping is public derivable — while amounts/values stay shielded per coin | Registry + derivation formula |
| Faucet mints — color domain **and exact amount** | `shielded_mints` in transcript (e.g. domain `mn-amm:tokenA`, amount `1,000,000`) | Faucet txs |
| Pause status | Ledger state `_isPaused` field | Contract source |
| Faucet availability (`_faucetOpen`) | Exported ledger field, set once at deploy (`true` = anyone can mint) | Contract source; deploy-time flag |
| Spent-coin nullifiers, received-coin commitments, transient coins | Zswap offer in the tx | Serialized offer inspection |
| Fee amounts paid (DUST) | `dust_actions` → `DustSpend { v_fee, … }` | Intent dump |
| `ownerId` | Contract ledger state; **derivable by anyone who knows a coin public key**: `sha256(pk ‖ pk)` | `scripts/owner-args.mjs` |
| LP token color | `tokenType(pad(32, "mn-amm:lp"), contractAddr)` — derivable from the contract address alone, like A/B | Contract source (derivation formula; LP is minted inside seed/addLiquidity, not exposed as a call) |
| Total LP supply (`_lpSupply`) | Exported ledger field; every seed/add/remove writes a **disclosed** delta | Contract source; swap-reserve analog |
| Exact `addLiquidity` deposit amounts / LP minted | Reserve A/B deltas and `_lpSupply` delta inside the same tx; LP `ShieldedMint` carries the disclosed amount | Circuit source; pattern matches swap |
| Exact `removeLiquidity` burn / payouts | `ShieldedBurn` carries the disclosed LP amount; reserve A/B deltas give the payouts | Circuit source |

## Hidden — not in any pool transaction

| Thing | Why |
|---|---|
| Trader / wallet identity | **Empirically:** none of the 8 sampled txs contains the agent's coin public key, encryption public key, or bech32m shielded address string (all three hex-searched). Recipients find funds only by trial-decrypting ciphertexts with their secret key. |
| Unshielded account address / signature | Both unshielded offers are `None`, `unshielded_inputs = {}`; the signature section differs from an erased tx by only 11 bytes — too small to hold any 32-byte address or 64-byte signature. Fees are paid via DUST nullifiers, not an account address. |
| Individual coin contents `(value, color, nonce)` | Encrypted inside Zswap output ciphertexts |
| Nullifier → owner mapping | Nullifiers are keyed PRFs; not derivable from the coin's public contents |
| Circuit arguments (e.g. `minAmountOut`, slippage) | Private by default; only `disclose()`d values and ledger writes become public |

## Caveats — what "hidden" does not mean

1. **Amounts are not hidden.** Reserves are public, so every swap amount and
   direction is derivable even without the transcript. Privacy here hides *who*,
   not *what*.
2. **One tx is one bundle.** Its inputs, outputs, reserve writes, and timing are
   all observable together — observers can correlate activity even without
   identities.
3. **Owner linkage:** anyone you have given your shielded coin public key to
   (counterparty, exchange, yourself) can derive your `ownerId` from public
   state and track it thereafter.
4. **Infrastructure sees you:** the node/relay sees the submitter, and the
   account that funded your NIGHT/DUST at setup is public *at that moment*.
5. **Contract-sent coins are only delivered to the caller:** `sendShielded` does
   not build ciphertexts for recipients other than the current caller, so their
   wallets won't detect the incoming coin (no identity leak, but a delivery
   caveat relevant if other parties are expected to receive coins).

## How this was verified

- Deserialized 8 real preprod txs with `@midnight-ntwrk/ledger-v8`
  (`Transaction.deserialize('signature', 'proof', 'binding', bytes)`), dumped
  intents/offers/transcripts, and hex-searched for the key material returned by
  a live `getShieldedAddresses` call.
- Transcript reserve constants decoded and cross-checked against the known swap
  amounts and the 0.3% fee formula (exact match both ways).
- `contract/pool.compact`: `export ledger _coins` (public state), `disclose()`
  call sites, non-view getters.
- Pinned docs (Kapa MCP + docs site): visibility / `disclose()` semantics,
  `sendShielded` behavior.

**Rule for future changes:** any contract/circuit change must re-run the
"public surface" checklist and update this file. The partial-coin swap (change
coins now appear in the trader's wallet, amounts still public) and the LP
liquidity work (LP supply, mints, and burns added to the public surface, rows
above) are reflected in the tables.
