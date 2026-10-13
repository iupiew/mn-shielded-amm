import { truncHex } from '../lib/format';
import type { LogEntry } from '../lib/actions';

/** Rolling activity log — every action (and raw failure) lands here. */
export function ActivityLog({ log }: { log: readonly LogEntry[] }) {
  return (
    <section className="card log-card span-2" data-testid="action-log">
      <div className="card-head">
        <h2>Activity</h2>
        <span className="dim small">
          {log.length} entr{log.length === 1 ? 'y' : 'ies'}
        </span>
      </div>
      {log.length === 0 ? (
        <div className="empty">No actions yet — previews, confirmations and errors show up here.</div>
      ) : (
        <ul className="log-list">
          {[...log].reverse().map((entry) => (
            <li key={entry.id} className={`log-entry ${entry.ok ? '' : 'log-fail'}`} data-testid="log-entry">
              <span className="log-time mono">{entry.at.toLocaleTimeString()}</span>
              <span className="log-label">{entry.label}</span>
              {entry.detail && <span className="log-detail dim">{entry.detail}</span>}
              {entry.txId && <span className="log-tx mono dim">tx {truncHex(entry.txId, 12, 8)}</span>}
              {!entry.ok && entry.raw && <span className="log-raw mono">{entry.raw}</span>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
