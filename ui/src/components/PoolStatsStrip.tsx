import type { PoolState } from '@midnight-ntwrk/leaderboard-api/dist/api/src/amm/types.js';
import { fmtBig, fmtPrice } from '../lib/format';

interface PoolStatsStripProps {
  readonly pool: PoolState | null;
  readonly poolError: string | null;
  readonly poolUpdatedAt: Date | null;
  readonly paused: boolean | null;
  readonly pausedError: string | null;
  readonly busy: string | null;
  readonly onRefresh: () => void;
}

/** Compact reserves/price strip (the old pool card, slimmed down). */
export function PoolStatsStrip({
  pool,
  poolError,
  poolUpdatedAt,
  paused,
  pausedError,
  busy,
  onRefresh,
}: PoolStatsStripProps) {
  const pausedNow = paused === true;
  return (
    <section className="card stats-strip" data-testid="pool-card">
      <div className="card-head">
        <h2>Pool</h2>
        <div className="badges">
          {pool?.seeded === false && (
            <span className="badge badge-amber" data-testid="unseeded-badge">
              unseeded
            </span>
          )}
          {paused === null && <span className="badge badge-amber">checking…</span>}
          {pausedNow && (
            <span className="badge badge-red" data-testid="paused-badge">
              paused
            </span>
          )}
          {pool?.seeded && paused === false && (
            <span className="badge badge-green" data-testid="live-badge">
              live
            </span>
          )}
        </div>
      </div>
      {!pool ? (
        <div className="empty">
          {poolError ? (
            <span className="err-text">{poolError}</span>
          ) : (
            <>
              <span className="spinner" /> Loading pool state…
            </>
          )}
        </div>
      ) : (
        <>
          <div className="stats-grid">
            <div className="stat">
              <span className="stat-label">Reserve A</span>
              <span className="stat-value">{fmtBig(pool.reserveA)}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Reserve B</span>
              <span className="stat-value">{fmtBig(pool.reserveB)}</span>
            </div>
            <div className="stat">
              <span className="stat-label">1 A costs</span>
              <span className="stat-value">{fmtPrice(pool.reserveB, pool.reserveA)} B</span>
            </div>
            <div className="stat">
              <span className="stat-label">1 B costs</span>
              <span className="stat-value">{fmtPrice(pool.reserveA, pool.reserveB)} A</span>
            </div>
            <div className="stat">
              <span className="stat-label">LP supply</span>
              <span className="stat-value">{fmtBig(pool.lpSupply)}</span>
            </div>
          </div>
          <div className="card-foot">
            <span className="dim small">
              fee 0.3% (retained in pool) · all amounts are raw token units
              {poolUpdatedAt ? ` · updated ${poolUpdatedAt.toLocaleTimeString()}` : ''}
              {poolError ? ` · ${poolError}` : ''}
            </span>
            <button
              className="btn btn-ghost btn-sm"
              onClick={onRefresh}
              disabled={busy !== null}
              data-testid="pool-refresh"
            >
              Refresh
            </button>
          </div>
        </>
      )}
      {pausedError && <span className="err-text">{pausedError}</span>}
    </section>
  );
}
