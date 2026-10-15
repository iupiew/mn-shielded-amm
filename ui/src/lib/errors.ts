/**
 * Error mapping for the UI banner: a friendly, actionable headline plus the
 * raw message kept verbatim (revealed via the "Show details" toggle and always
 * recorded in the action log — nothing is swallowed).
 */
import { AmmError } from 'mn-amm-api/dist/api/src/amm/types.js';
import { friendlyWalletError } from './wallet';

export interface AppError {
  /** Friendly copy shown in the banner. */
  readonly message: string;
  /** Raw error message, unmodified. */
  readonly raw: string;
}

export function toAppError(cause: unknown): AppError {
  const raw = cause instanceof Error ? cause.message : String(cause);
  let message: string;
  if (cause instanceof AmmError) {
    switch (cause.code) {
      case 'NOT_SEEDED':
        message = 'Pool has no reserves yet — mint and seed first on the Mint tab.';
        break;
      case 'ALREADY_SEEDED':
        message = 'Pool is already seeded — add or remove liquidity on the Liquidity tab.';
        break;
      case 'PAUSED':
        message = 'Pool is paused — unpause it before trading.';
        break;
      case 'INSUFFICIENT_COIN':
        message = 'Not enough tokens — mint some on the Mint tab.';
        break;
      default:
        message = `[${cause.code}] ${cause.message}`;
    }
  } else {
    message = friendlyWalletError(cause);
  }
  // Substring rules win over the code-based ones: these come back wrapped in
  // generic transport/wallet errors rather than as AmmError.
  if (/caller is not the owner/i.test(raw)) {
    message = 'Only the pool owner can do that (pause/unpause).';
  } else if (/already seeded/i.test(raw)) {
    message = 'Pool is already seeded — add or remove liquidity on the Liquidity tab.';
  } else if (/insufficient[\s_-]*(?:coin|balance|funds)/i.test(raw)) {
    message = 'Not enough tokens — mint some on the Mint tab.';
  }
  return { message, raw };
}

/** Friendly headline only — for inline loader errors (pool/balance/paused). */
export function friendlyMessage(cause: unknown): string {
  return toAppError(cause).message;
}
