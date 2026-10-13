/**
 * Public entry point of the pool AMM api.
 *
 * Platform-agnostic surface (types, math, registry, `AmmApi`) plus the
 * node-side preprod helper. Node/browser wiring lives in `./amm/node.js` and
 * `./amm/browser.js` and is intentionally not re-exported here so browser
 * bundles never pull in node built-ins; consumers may deep-import
 * `dist/api/src/amm/*` (the CLI and UI do).
 * @packageDocumentation
 */

export * from './amm/index.js';
export {
  createPreprodAmm,
  PREPROD_NETWORK_ID,
  DEFAULT_PREPROD_CONTRACT,
  type PreprodAmm,
  type PreprodAmmOptions,
} from './amm/preprod.js';
