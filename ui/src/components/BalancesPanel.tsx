import type { PoolBalance, PoolState } from '@midnight-ntwrk/leaderboard-api/dist/api/src/amm/types.js';
import { fmtBig, truncHex } from '../lib/format';

interface BalancesPanelProps {
  readonly balance: PoolBalance | null;
  readonly error: string | null;
  readonly pool: PoolState | null;
  readonly busy: string | null;
  readonly onRefresh: () => void;
}

interface BalanceRowProps {
  readonly symbol: string;
  readonly colorHex?: string;
  readonly total: bigint;
  readonly coinCount: number;
  readonly totalTestId: string;
}

function BalanceRow({ symbol, colorHex, total, coinCount, totalTestId }: BalanceRowProps) {
  return (
    <div className="balance-row" data-testid={`balance-${symbol}`}>
      <span className="balance-symbol mono" title={colorHex ?? symbol}>
        {symbol}
      </span>
      <span className="balance-total" data-testid={totalTestId}>
        {fmtBig(total)}
      </span>
      <span className="balance-count dim small">
        {coinCount} coin{coinCount === 1 ? '' : 's'}
      </span>
    </div>
  );
}

/** Per-token wallet balances (A / B / LP + collapsed other colors). */
export function BalancesPanel({ balance, error, pool, busy, onRefresh }: BalancesPanelProps) {
  return (
    <section className="card" data-testid="balance-card">
      <div className="card-head">
        <h2>Balances</h2>
        <button
          className="btn btn-ghost btn-sm"
          onClick={onRefresh}
          disabled={busy !== null}
          data-testid="balance-refresh"
          title="Shielded coin vault — saved in this browser per pool + wallet (re-faucet after clearing site data)"
        >
          Refresh
        </button>
      </div>
      {!balance ? (
        <div className="empty">
          {error ? <span className="err-text">{error}</span> : <><span className="spinner" /> Loading…</>}
        </div>
      ) : (
        <div className="balance-rows">
          <BalanceRow
            symbol="A"
            colorHex={pool?.colorAHex}
            total={balance.totalA}
            coinCount={balance.coinA.length}
            totalTestId="total-a"
          />
          <BalanceRow
            symbol="B"
            colorHex={pool?.colorBHex}
            total={balance.totalB}
            coinCount={balance.coinB.length}
            totalTestId="total-b"
          />
          <BalanceRow
            symbol="LP"
            colorHex={pool?.colorLpHex}
            total={balance.totalLp}
            coinCount={balance.lpCoins.length}
            totalTestId="total-lp"
          />
          <details className="other-coins" data-testid="other-coins">
            <summary>
              {balance.otherCoins.length} other coin{balance.otherCoins.length === 1 ? '' : 's'} (other colors)
            </summary>
            {balance.otherCoins.length > 0 ? (
              <div className="coin-chips">
                {balance.otherCoins.map((coin) => (
                  <span
                    key={coin.nonceHex}
                    className="coin-chip coin-chip-dim mono"
                    title={`color ${coin.colorHex} · nonce ${coin.nonceHex}`}
                  >
                    {fmtBig(coin.value)} <span className="dim">{truncHex(coin.colorHex, 6, 4)}</span>
                  </span>
                ))}
              </div>
            ) : (
              <span className="dim small">None — coins of other colors show up here.</span>
            )}
          </details>
          {balance.coinA.length === 0 && balance.coinB.length === 0 && (
            <span className="dim small">Vault empty — mint coins on the Mint tab (a reload starts empty).</span>
          )}
          {error && <span className="err-text">{error}</span>}
        </div>
      )}
    </section>
  );
}
