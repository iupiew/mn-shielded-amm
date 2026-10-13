/** Shared action plumbing passed from App to the tabs. */

/** Result of a successful action — shown in the info banner and the log. */
export interface ActionResult {
  readonly label: string;
  readonly detail?: string;
  readonly txId?: string;
}

/** Runs a mutation with busy/elapsed handling; resolves `true` on success. */
export type RunAction = (label: string, operation: () => Promise<ActionResult>) => Promise<boolean>;

/** One activity-log line. `raw` is only set for failures. */
export interface LogEntry {
  readonly id: number;
  readonly at: Date;
  readonly ok: boolean;
  readonly label: string;
  readonly detail?: string;
  readonly txId?: string;
  readonly raw?: string;
}

export type PushLog = (entry: Omit<LogEntry, 'id' | 'at'>) => void;

export interface ActionContext {
  readonly runAction: RunAction;
  /** Append an entry directly — used for per-step progress inside one action. */
  readonly pushLog: PushLog;
  /** Update the busy label mid-action (multi-step flows). */
  readonly setBusy: (label: string | null) => void;
  /** Surface a validation/usage error in the banner without running an action. */
  readonly raiseError: (message: string) => void;
  readonly busy: string | null;
  readonly elapsed: number;
}

/** Reload hooks the tabs call after successful mutations. */
export interface Refreshers {
  /** Re-read pool reserves (indexer read). */
  readonly pool: () => Promise<void>;
  /** Re-read wallet balances. */
  readonly balance: () => Promise<void>;
  /** Invalidate vault-derived views, then reload pool + balance. */
  readonly all: () => Promise<void>;
}
