# Dependency licenses

Inventory taken 2026-10-13 from the installed tree (`node_modules/*/package.json`
for direct deps, `package-lock.json` for transitive). This repo is
**Apache-2.0** (see `LICENSE`). No license decision here is legal advice; items
marked **flag** are questions for a human.

## Direct dependencies (39 distinct)

### Apache-2.0 (19)

All `@midnight-ntwrk/*` protocol/provider packages
(`compact-js` 2.5.1, `dapp-connector-api` 4.0.1, `midnight-js-*` 4.1.1 ×12,
`wallet-sdk-hd` 3.0.1, `wallet-sdk-node-client` 1.1.0,
`wallet-sdk-unshielded-wallet` 2.1.0), plus `@polkadot/api` 16.5.6,
`@polkadot/util` 14.0.3, `rxjs` ^7.8.2, `typescript` ^5.9.3 (dev).

### MIT (17)

`@openzeppelin/compact-contracts` **0.3.0-rc.1** (pre-release pin — see
"flags" below), `buffer`, `effect`, `fp-ts`, `graphql`, `pino`, `react`,
`react-dom`, `ws`, and dev-only `@types/*`, `@vitejs/plugin-react`, `vite`,
`vite-plugin-*`, `vitest`.

### ISC (1)

`semver` ^7.7.4.

### Workspace (1)

`@midnight-ntwrk/leaderboard-api` (local package, inherits repo license).

### **Flag** — no license metadata in the published package (3)

`@midnight-ntwrk/ledger-v8@8.1.0`, `@midnight-ntwrk/onchain-runtime-v3@3.0.0`,
`@midnight-ntwrk/zkir-v2@2.1.1` — npm metadata has no `license` field and the
packages ship no LICENSE file. Upstream source (midnight-ledger /
midnight-js monorepos, via Midnight docs) carries
`SPDX-License-Identifier: Apache-2.0`, Copyright (C) Midnight Foundation — so
these are treated as Apache-2.0 artifacts with an upstream packaging gap.
**Flag for legal review before release; consider raising upstream.**

## Transitive licenses (416 lockfile entries)

| License | Count |
|---|---|
| MIT | 249 |
| Apache-2.0 | 66 |
| Apache-2.0 AND MIT (dual) | 11 |
| ISC | 9 |
| BSD-3-Clause | 2 |
| BSD-2-Clause | 1 |
| 0BSD | 1 |
| **GPL-3.0-or-later** | **3** |
| **GPL-3.0-only** | **3** |
| CC-BY-4.0 | 1 (dev-only) |

### **Flag** — GPL-family packages in the runtime tree (6)

- `@subsquid/scale-codec` 4.0.1 + `@subsquid/util-internal-{hex,json}`
  (GPL-3.0-or-later) — runtime deps of `@midnight-ntwrk/wallet-sdk-address-format`.
- `@substrate/connect` 0.8.11 + `@substrate/connect-{extension-protocol,known-chains}`
  (GPL-3.0-only) — pulled by the wallet SDK's light-client helper chain; the
  actual light client (`smoldot`) is stubbed out by the repo's override (see
  `patches.md`).

Context for the **flag**: this repo distributes source only — `node_modules`
and built bundles (`dist/`) are gitignored, and npm ships GPL source with
every install. GPL obligations would attach to anyone who builds and
*redistributes binaries* (e.g. a hosted UI bundle), not to the repo itself.
A `THIRD_PARTY` notice (this file, effectively) is the standard hygiene step;
whether any hosting/distribution plan of yours triggers GPL source duties is
a question for legal.

`caniuse-lite` (CC-BY-4.0) is a dev-only browserslist data package — data
license, not code; non-issue.

## Recommendation

Keep **Apache-2.0** (already in `LICENSE`): it matches the Midnight
ecosystem (every Midnight SDK package is Apache-2.0), the template this repo
grew from, and the existing SPDX headers in contribution docs. Adding
`"license": "Apache-2.0"` to the five workspace `package.json` files was
proposed with the release-readiness report and awaits approval.
