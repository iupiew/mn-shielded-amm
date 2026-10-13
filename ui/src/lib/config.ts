/**
 * Preprod deployment configuration for the UI.
 *
 * The address is hardcoded from `.spike/preprod-deploy.json` (that directory
 * is gitignored, so it cannot be a build-time import); override with
 * VITE_MN_CONTRACT_ADDRESS when re-deploying.
 */

/** Deployed pool contract on preprod (scripts/preprod-deploy.mjs → .spike/preprod-deploy.json). */
export const CONTRACT_ADDRESS =
  (import.meta.env.VITE_MN_CONTRACT_ADDRESS as string | undefined) ||
  '2f557cf5ff4bb0220abd42669bf63ad73ca5e00bffdf5d5e41acd2a5a1634712';

export const NETWORK_ID = 'preprod';

/**
 * Blockfrost token for the post-decommission preprod indexer (old
 * indexer.preprod.midnight.network died 2026-10-09). Kept in the gitignored
 * `.env` as `VITE_MN_BLOCKFROST_PROJECT_ID` so vite inlines it locally.
 */
export const BLOCKFROST_PROJECT_ID =
  (import.meta.env.VITE_MN_BLOCKFROST_PROJECT_ID as string | undefined) || undefined;

/**
 * Proof server for in-browser proving. Unset → whatever the wallet's
 * getConfiguration() reports, else the hosted ProofStation. Point at the
 * local proof server (http://127.0.0.1:6300 — CORS-open) to dodge the
 * hosted gateway's 524 timeouts on the big faucet/swap proving keys.
 */
export const PROVER_URI = (import.meta.env.VITE_MN_PROVER_URI as string | undefined) || undefined;
