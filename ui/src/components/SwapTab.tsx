import { useEffect, useMemo, useState } from 'react';
import type {
  PoolBalance,
  PoolState,
  Quote,
  SwapSide,
  WalletCoin,
} from 'mn-amm-api/dist/api/src/amm/types.js';
import { friendlyMessage } from '../lib/errors';
import { fmtBig, isValidAmount } from '../lib/format';
import type { ActionContext, Refreshers } from '../lib/actions';
import type { BrowserAmm } from '../lib/wallet';
import type { Tab } from './TabNav';
import { PoolStatsStrip } from './PoolStatsStrip';
import { BalancesPanel } from './BalancesPanel';
import { SlippageControl } from './SlippageControl';

const QUOTE_DEBOUNCE_MS = 400;

interface SwapTabProps extends ActionContext {
  readonly amm: BrowserAmm;
  readonly pool: PoolState | null;
  readonly poolError: string | null;
  readonly poolUpdatedAt: Date | null;
  readonly balance: PoolBalance | null;
  readonly balanceError: string | null;
  readonly paused: boolean | null;
  readonly pausedError: string | null;
  /** Bumped by App whenever the in-browser vault changes (it has no observable). */
  readonly vaultTick: number;
  readonly refreshers: Refreshers;
  readonly onNavigate: (tab: Tab) => void;
}

export function SwapTab(props: SwapTabProps) {
  const { amm, pool, poolError, poolUpdatedAt, balance, balanceError, paused, pausedError, vaultTick, refreshers, onNavigate } =
    props;
  const { runAction, busy, elapsed } = props;

  const [side, setSide] = useState<SwapSide>('AtoB');
  const [amount, setAmount] = useState('');
  const [slippageBps, setSlippageBps] = useState('0');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [plan, setPlan] = useState<{ quote: Quote; coin: WalletCoin } | null>(null);

  // ── debounced live quote (read-only) ─────────────────────────────────────
  useEffect(() => {
    setQuote(null);
    setQuoteError(null);
    setPlan(null);
    if (!isValidAmount(amount)) return;
    const timer = setTimeout(() => {
      void amm.api
        .quote(side, BigInt(amount), Number(slippageBps) || 0)
        .then((next) => setQuote(next))
        .catch((cause) => setQuoteError(friendlyMessage(cause)));
    }, QUOTE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [side, amount, slippageBps, amm]);

  // ── spendable-coin lookup (swap accepts coins ≥ amountIn, returns change) ─
  const sideColorHex = pool ? (side === 'AtoB' ? pool.colorAHex : pool.colorBHex) : null;
  const eligibleCoins = useMemo(() => {
    if (!sideColorHex || !isValidAmount(amount)) return [] as WalletCoin[];
    const value = BigInt(amount);
    return amm.vault.list().filter((c) => c.colorHex === sideColorHex && c.value >= value);
  }, [amm, sideColorHex, amount, vaultTick]);
  const availableValues = useMemo(() => {
    if (!sideColorHex) return [] as bigint[];
    const seen = new Set<string>();
    const values: bigint[] = [];
    for (const coin of amm.vault.list()) {
      if (coin.colorHex !== sideColorHex) continue;
      const key = coin.value.toString();
      if (seen.has(key)) continue;
      seen.add(key);
      values.push(coin.value);
    }
    return values.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  }, [amm, sideColorHex, vaultTick]);

  const doPreview = () => {
    if (!quote || eligibleCoins.length === 0) return;
    // Same rule the API uses when it picks a coin: exact fit first, else smallest ≥.
    const exact = eligibleCoins.find((c) => c.value === quote.amountIn);
    const coin = exact ?? eligibleCoins.reduce((best, c) => (c.value < best.value ? c : best));
    setPlan({ quote, coin });
  };

  const doConfirm = () => {
    const current = plan;
    if (!current) return;
    void runAction('Proving & submitting swap…', async () => {
      const result = await amm.api.swap({
        side: current.quote.side,
        amountIn: current.quote.amountIn,
        slippageBps: Number(slippageBps) || 0,
        coin: current.coin,
      });
      amm.vault.consume(result.coin);
      setPlan(null);
      setAmount('');
      await refreshers.all();
      return {
        label: 'Swap settled',
        txId: result.txId,
        detail: `${fmtBig(result.quote.amountIn)} ${current.quote.side === 'AtoB' ? 'A→B' : 'B→A'} → ${fmtBig(result.quote.amountOut)} out`,
      };
    });
  };

  const pausedNow = paused === true;
  const inSymbol = side === 'AtoB' ? 'A' : 'B';

  return (
    <>
      <div className="col">
        <PoolStatsStrip
          pool={pool}
          poolError={poolError}
          poolUpdatedAt={poolUpdatedAt}
          paused={paused}
          pausedError={pausedError}
          busy={busy}
          onRefresh={() => void refreshers.pool()}
        />

        <section className="card" data-testid="swap-card">
          <div className="card-head">
            <h2>Swap</h2>
            <div className="badges">
              {pausedNow && <span className="badge badge-red">paused — trading disabled</span>}
              {pool?.seeded === false && (
                <button className="btn btn-amber btn-sm" onClick={() => onNavigate('mint')} data-testid="swap-seed-cta">
                  unseeded — seed on Mint tab →
                </button>
              )}
            </div>
          </div>
          <div className="side-toggle">
            <button
              className={`side-btn ${side === 'AtoB' ? 'active' : ''}`}
              onClick={() => setSide('AtoB')}
              disabled={busy !== null}
              data-testid="side-atob"
            >
              A → B
            </button>
            <button
              className={`side-btn ${side === 'BtoA' ? 'active' : ''}`}
              onClick={() => setSide('BtoA')}
              disabled={busy !== null}
              data-testid="side-btoa"
            >
              B → A
            </button>
          </div>
          <label className="field">
            <span>Amount in (units, must match a whole vault coin)</span>
            <span className="input-wrap">
              <input
                className="input mono"
                inputMode="numeric"
                placeholder="e.g. 1000000"
                value={amount}
                onChange={(event) => setAmount(event.target.value.trim())}
                disabled={busy !== null}
                data-testid="swap-amount"
              />
              <span className="input-suffix mono">{inSymbol}</span>
            </span>
          </label>
          <SlippageControl value={slippageBps} onChange={setSlippageBps} disabled={busy !== null} testid="swap-slippage" />

          <div className="quote-box" data-testid="swap-quote">
            {quoteError ? (
              <span className="err-text">{quoteError}</span>
            ) : quote ? (
              <>
                <div className="quote-line">
                  <span>You receive (est.)</span>
                  <strong>{fmtBig(quote.amountOut)}</strong>
                </div>
                <div className="quote-line dim">
                  <span>Min. with slippage tolerance</span>
                  <span>{fmtBig(quote.minAmountOut)}</span>
                </div>
                <div className="quote-line dim">
                  <span>Reserves</span>
                  <span>
                    {fmtBig(quote.reserveIn)} → {fmtBig(quote.reserveOut)}
                  </span>
                </div>
              </>
            ) : (
              <span className="dim">Enter an amount for a live quote (0.3% fee included).</span>
            )}
          </div>

          <div className="actions">
            {!plan && (
              <button
                className="btn btn-secondary"
                onClick={doPreview}
                disabled={!quote || eligibleCoins.length === 0 || busy !== null}
                data-testid="swap-preview"
              >
                {busy ? (
                  <>
                    <span className="spinner" /> {busy} · {elapsed}s
                  </>
                ) : (
                  'Preview swap'
                )}
              </button>
            )}
            {plan && (
              <>
                <div className={`plan ${pausedNow ? 'plan-warn' : ''}`} data-testid="swap-plan">
                  {pausedNow ? (
                    <span>Pool is paused — unpause before trading.</span>
                  ) : (
                    <span>
                      Spend vault coin of at least {fmtBig(plan.quote.amountIn)} (remainder returns as change) · expect
                      ≥ {fmtBig(plan.quote.minAmountOut)} out (quote re-checked on submit)
                    </span>
                  )}
                </div>
                <div className="btn-row">
                  <button className="btn btn-ghost" onClick={() => setPlan(null)} disabled={busy !== null}>
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={doConfirm}
                    disabled={pausedNow || busy !== null}
                    data-testid="swap-confirm"
                  >
                    {busy ? (
                      <>
                        <span className="spinner" /> {busy} · {elapsed}s
                      </>
                    ) : (
                      'Execute swap'
                    )}
                  </button>
                </div>
              </>
            )}
            {!plan && !quoteError && (
              <div className="quote-line dim small">
                {eligibleCoins.length > 0
                  ? `✓ vault has ${inSymbol} coin ≥ ${fmtBig(BigInt(amount || '0'))}`
                  : availableValues.length > 0
                    ? `Vault ${inSymbol} coin values: ${availableValues.map(fmtBig).join(', ')} — need a coin ≥ ${fmtBig(BigInt(amount || '0'))}`
                    : `No ${inSymbol} coins yet.`}
                {eligibleCoins.length === 0 && availableValues.length === 0 && (
                  <button
                    className="btn btn-ghost btn-sm go-link"
                    onClick={() => onNavigate('mint')}
                    data-testid="swap-go-mint"
                  >
                    Mint {inSymbol} coins →
                  </button>
                )}
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="col">
        <BalancesPanel
          balance={balance}
          error={balanceError}
          pool={pool}
          busy={busy}
          onRefresh={() => void refreshers.balance()}
        />
      </div>
    </>
  );
}
