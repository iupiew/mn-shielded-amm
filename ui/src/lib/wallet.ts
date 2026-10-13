/**
 * Thin wallet layer for the React UI.
 *
 * Wraps api/src/amm/browser.js (createBrowserAmm) — all AMM logic stays in
 * the api workspace. Network is preprod-only (Lace/1AM reject undeployed).
 */

import type { ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import type { BrowserAmm as BrowserAmmImpl, WalletInfo as WalletInfoImpl } from '@midnight-ntwrk/leaderboard-api/dist/api/src/amm/browser.js';
import { BLOCKFROST_PROJECT_ID, CONTRACT_ADDRESS, NETWORK_ID as CONFIG_NETWORK_ID, PROVER_URI } from './config';

export type BrowserAmm = BrowserAmmImpl;
export type WalletInfo = WalletInfoImpl;

type BrowserAmmModule = typeof import('@midnight-ntwrk/leaderboard-api/dist/api/src/amm/browser.js');

export const NETWORK_ID = CONFIG_NETWORK_ID;
export { CONTRACT_ADDRESS };

let modulePromise: Promise<BrowserAmmModule> | undefined;

function loadModule(): Promise<BrowserAmmModule> {
  modulePromise ??= import('@midnight-ntwrk/leaderboard-api/dist/api/src/amm/browser.js');
  return modulePromise;
}

/** Wallets currently injected under window.midnight. Poll until non-empty before connect. */
export async function getAvailableWallets(): Promise<WalletInfo[]> {
  const mod = await loadModule();
  return mod.listWallets();
}

export async function waitForWallets(timeoutMs = 3000): Promise<WalletInfo[]> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const wallets = await getAvailableWallets();
    if (wallets.length > 0) return wallets;
    if (Date.now() >= deadline) return [];
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

/** Connect the preferred (or given) wallet and wire AmmApi for the deployed pool. */
export async function connectWallet(options?: {
  contractAddress?: ContractAddress;
  walletKey?: string;
}): Promise<BrowserAmm> {
  const mod = await loadModule();
  return mod.createBrowserAmm({
    contractAddress: (options?.contractAddress ?? CONTRACT_ADDRESS) as ContractAddress,
    networkId: NETWORK_ID,
    walletKey: options?.walletKey,
    proverServerUri: PROVER_URI,
    indexerProjectId: BLOCKFROST_PROJECT_ID,
  });
}

/** Re-export friendly error mapping used by the UI. */
export function friendlyWalletError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
