# Patches & overrides

Everything this repo does differently from stock npm packages — exactly one
real override, plus one claim that needed correcting.

## `smoldot` → `@aspect-build/empty` (active override)

Root `package.json`:

```json
"overrides": {
  "smoldot": "npm:@aspect-build/empty@0.0.0"
}
```

`smoldot` is the WASM light-client client pulled in by the
`@substrate/*` packages inside the Midnight wallet SDK tree. Nothing in this
project runs a light client: the wallet lives in the Midnight browser
extension (the dApp-connector API in the UI is only the request surface), and
the Node-side tools talk to preprod via Blockfrost HTTP/WS. The override
replaces smoldot with a zero-byte stub package (`@aspect-build/empty`) so
installs and bundles never carry the WASM light-client.

Effect on behavior: none observed — no code path instantiates smoldot.
Cost if a future dependency actually needs a light client: it will fail
loudly, and the override should be removed then.

## `wallet-sdk-shielded` — no local patch exists (claim corrected)

An earlier README revision stated "exception in flight: a local patch of
`wallet-sdk-shielded` 3.0.1". Investigation for the public release:

- `@midnight-ntwrk/wallet-sdk-shielded` is **not a dependency of this repo
  at all** (zero hits in `package-lock.json`; the repo consumes
  `wallet-sdk-hd`, `wallet-sdk-unshielded-wallet`,
  `wallet-sdk-node-client`, and the `midnight-js-*` provider packages).
- The `mn` CLI (`midnight-wallet-cli`, installed globally) bundles
  `wallet-sdk-shielded@3.0.2` (Apache-2.0) in its own node_modules.
  Per the upstream changelog, 3.0.2 includes the `balanceTransaction`
  fix ("Could not create a valid guaranteed offer" bug) that a local
  patch of 3.0.1 would have targeted — i.e. the situation the old README
  described is resolved upstream, no patch needed or present.

The stale claim was removed from the README in the M2 licensing pass.
