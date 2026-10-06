/**
 * AMM core public surface (platform-agnostic).
 *
 * Node-only wiring lives in `./node.js` and is intentionally not re-exported
 * here so browser bundles never pull in node built-ins.
 * @module
 */

export * from './types.js';
export * from './math.js';
export { AmmApi, type AmmConnectOptions } from './api.js';
