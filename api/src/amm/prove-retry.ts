import type { ProofProvider } from '@midnight-ntwrk/midnight-js-types';

type ProveTxParams = Parameters<ProofProvider['proveTx']>;
type ProveTxResult = Awaited<ReturnType<ProofProvider['proveTx']>>;

/**
 * ProofServer failures worth retrying: HTTP 429/5xx surfaced by the proof
 * client (`code="524"` from Cloudflare is the flaky one for the 19 MB
 * faucet/swap circuits), timeouts, and transport resets. Deterministic
 * circuit-level rejections don't match and fail immediately.
 */
const TRANSIENT_PROVE_ERROR =
  /code="(429|5\d{2})"|status="5\d{2}"|timeout|timed out|etimedout|econnreset|econnrefused|epipe|fetch failed|socket hang up|network error|other side closed/i;

/** Failures faster than this never touched the server meaningfully (connection refused etc.). */
const FAST_FAILURE_MS = 3_000;

export interface ProveRetryOptions {
  /** Total attempts including the first (default 3). */
  readonly attempts?: number;
  /** Delay between attempts in ms (default 10_000). */
  readonly delayMs?: number;
  /**
   * Retry sub-3 s failures too (default false). Browsers keep this false so a
   * dead proof server still fails inside the fast-fail window and falls back
   * to the wallet-native prover; the CLI has no fallback and retries them.
   */
  readonly retryFastFailures?: boolean;
}

/**
 * Wrap a ProofProvider so transient remote proving failures (Cloudflare 524,
 * 429, timeouts, resets) are retried with a delay instead of aborting the
 * whole command. Logs each attempt to stderr/devtools.
 */
export function withProveRetry(provider: ProofProvider, options: ProveRetryOptions = {}): ProofProvider {
  const attempts = options.attempts ?? 3;
  const delayMs = options.delayMs ?? 10_000;
  const retryFastFailures = options.retryFastFailures ?? false;

  return {
    async proveTx(...args: ProveTxParams): Promise<ProveTxResult> {
      let lastError: unknown;
      for (let attempt = 1; attempt <= attempts; attempt += 1) {
        const started = Date.now();
        try {
          return await provider.proveTx(...args);
        } catch (error) {
          lastError = error;
          const elapsedMs = Date.now() - started;
          const message = error instanceof Error ? error.message : String(error);
          const transient = TRANSIENT_PROVE_ERROR.test(message);
          const fast = elapsedMs < FAST_FAILURE_MS;
          const willRetry = attempt < attempts && transient && (retryFastFailures || !fast);
          console.error(
            `[prove-retry] proveTx attempt ${attempt}/${attempts} failed after ${elapsedMs}ms` +
              `${willRetry ? ` — retrying in ${delayMs}ms` : ''}: ${message}`,
          );
          if (!willRetry) break;
          await new Promise((resolveRetry) => setTimeout(resolveRetry, delayMs));
        }
      }
      throw lastError;
    },
  };
}
