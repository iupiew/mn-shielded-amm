import { useEffect, useState } from 'react';
import type {
  AddLiquidityQuote,
  PoolBalance,
  PoolState,
  RemoveLiquidityQuote,
} from '@midnight-ntwrk/leaderboard-api/dist/api/src/amm/types.js';
import { friendlyMessage } from '../lib/errors';
import { fmtBig, fmtShare, isValidAmount } from '../lib/format';
import type { ActionContext, Refreshers } from '../lib/actions';
import type { BrowserAmm } from '../lib/wallet';
import type { Tab } from './TabNav';
import { SlippageControl } from './SlippageControl';

const QUOTE_DEBOUNCE_MS = 400;

interface LiquidityTabProps extends ActionContext {
  readonly amm: BrowserAmm;
  readonly pool: PoolState | null;
  readonly balance: PoolBalance | null;
  readonly paused: boolean | null;
  readonly refreshers: Refreshers;
  readonly onNavigate: (tab: Tab) => void;
}

interface AddPlan {
  readonly amountA: string;
  readonly amountB: string;
  readonly slippageBps: number;
  readonly quote: AddLiquidityQuote;
}

interface RemovePlan {
  readonly lpAmount: string;
  readonly slippageBps: number;
  readonly quote: RemoveLiquidityQuote;
}

export function LiquidityTab(props: LiquidityTabProps) {
  const { amm, pool, balance, paused, refreshers, onNavigate } = props;
  const { runAction, busy, elapsed } = props;

  const [amountA, setAmountA] = useState('');
  const [amountB, setAmountB] = useState('');
  const [addSlippage, setAddSlippage] = useState('0');
  const [addQuote, setAddQuote] = useState<AddLiquidityQuote | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [addPlan, setAddPlan] = useState<AddPlan | null>(null);

  const [lpAmount, setLpAmount] = useState('');
  const [removeSlippage, setRemoveSlippage] = useState('0');
  const [removeQuote, setRemoveQuote] = useState<RemoveLiquidityQuote | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [removePlan, setRemovePlan] = useState<RemovePlan | null>(null);

  const seeded = pool?.seeded === true;

  // ── debounced live quotes (read-only) ────────────────────────────────────
  useEffect(() => {
    setAddQuote(null);
    setAddError(null);
    setAddPlan(null);
    if (!seeded || !isValidAmount(amountA) || !isValidAmount(amountB)) return;
    const timer = setTimeout(() => {
      void amm.api
        .quoteAddLiquidity(BigInt(amountA), BigInt(amountB), Number(addSlippage) || 0)
        .then((next) => setAddQuote(next))
        .catch((cause) => setAddError(friendlyMessage(cause)));
    }, QUOTE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [amountA, amountB, addSlippage, seeded, amm]);

  useEffect(() => {
    setRemoveQuote(null);
    setRemoveError(null);
    setRemovePlan(null);
    if (!seeded || !isValidAmount(lpAmount)) return;
    const timer = setTimeout(() => {
      void amm.api
        .quoteRemoveLiquidity(BigInt(lpAmount), Number(removeSlippage) || 0)
        .then((next) => setRemoveQuote(next))
        .catch((cause) => setRemoveError(friendlyMessage(cause)));
    }, QUOTE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [lpAmount, removeSlippage, seeded, amm]);

  const doAddConfirm = () => {
    const plan = addPlan;
    if (!plan) return;
    void runAction('Adding liquidity…', async () => {
      const result = await amm.api.addLiquidity({
        amountA: BigInt(plan.amountA),
        amountB: BigInt(plan.amountB),
        slippageBps: plan.slippageBps,
      });
      amm.vault.consume(result.coinA);
      amm.vault.consume(result.coinB);
      amm.vault.record(result.lpCoin);
      setAddPlan(null);
      setAmountA('');
      setAmountB('');
      await refreshers.all();
      return {
        label: 'Liquidity added',
        txId: result.txId,
        detail: `+${fmtBig(result.quote.lpOut)} LP (min ${fmtBig(result.quote.minLpOut)}) for ${fmtBig(result.quote.amountA)} A + ${fmtBig(result.quote.amountB)} B`,
      };
    });
  };

  const doRemoveConfirm = () => {
    const plan = removePlan;
    if (!plan) return;
    void runAction('Removing liquidity…', async () => {
      const result = await amm.api.removeLiquidity({
        lpAmount: BigInt(plan.lpAmount),
        slippageBps: plan.slippageBps,
      });
      amm.vault.consume(result.lpCoin);
      amm.vault.record(...result.coins);
      setRemovePlan(null);
      setLpAmount('');
      await refreshers.all();
      return {
        label: 'Liquidity removed',
        txId: result.txId,
        detail: `−${fmtBig(plan.quote.lpAmount)} LP → ${fmtBig(result.quote.aOut)} A + ${fmtBig(result.quote.bOut)} B (min ${fmtBig(result.quote.minA)}/${fmtBig(result.quote.minB)})`,
      };
    });
  };

  const totalLp = balance?.totalLp ?? 0n;
  const lpSupply = pool?.lpSupply ?? 0n;
  const pausedNow = paused === true;

  if (!pool) {
    return (
      <div className="col span-2">
        <section className="card">
          <div className="empty">
            <span className="spinner" /> Loading pool state…
          </div>
        </section>
      </div>
    );
  }

  if (!pool.seeded) {
    return (
      <div className="col span-2">
        <section className="card" data-testid="liquidity-unseeded">
          <div className="card-head">
            <h2>Liquidity</h2>
            <span className="badge badge-amber" data-testid="unseeded-badge">
              unseeded
            </span>
          </div>
          <p className="dim">Pool not seeded — mint and seed first (Mint tab).</p>
            <div className="actions">
              <button
                className="btn btn-amber btn-sm"
                onClick={() => onNavigate('mint')}
                data-testid="unseeded-go-mint"
              >
                Go to Mint tab →
              </button>
            </div>
        </section>
      </div>
    );
  }

  return (
    <>
      <section className="card span-2 lp-summary" data-testid="lp-summary">
        <div className="lp-stat">
          <span className="stat-label">Your LP</span>
          <span className="stat-value" data-testid="lp-balance">
            {fmtBig(totalLp)}
          </span>
        </div>
        <div className="lp-stat">
          <span className="stat-label">Pool share</span>
          <span className="stat-value" data-testid="lp-share">
            {fmtShare(totalLp, lpSupply)}
          </span>
        </div>
        <div className="lp-stat">
          <span className="stat-label">LP supply</span>
          <span className="stat-value">{fmtBig(lpSupply)}</span>
        </div>
        <div className="lp-stat">
          <span className="stat-label">Pool</span>
          <span className="stat-value">
            {fmtBig(pool.reserveA)} A / {fmtBig(pool.reserveB)} B
          </span>
        </div>
      </section>

      <div className="col">
        <section className="card" data-testid="add-card">
          <div className="card-head">
            <h2>Add liquidity</h2>
            <div className="badges">
              {pausedNow && <span className="badge badge-red">paused</span>}
            </div>
          </div>
          <div className="field-row">
            <label className="field">
              <span>Amount A (units)</span>
              <span className="input-wrap">
                <input
                  className="input mono"
                  inputMode="numeric"
                  placeholder="e.g. 100000"
                  value={amountA}
                  onChange={(event) => setAmountA(event.target.value.trim())}
                  disabled={busy !== null}
                  data-testid="add-amount-a"
                />
                <span className="input-suffix mono">A</span>
              </span>
            </label>
            <label className="field">
              <span>Amount B (units)</span>
              <span className="input-wrap">
                <input
                  className="input mono"
                  inputMode="numeric"
                  placeholder="e.g. 100000"
                  value={amountB}
                  onChange={(event) => setAmountB(event.target.value.trim())}
                  disabled={busy !== null}
                  data-testid="add-amount-b"
                />
                <span className="input-suffix mono">B</span>
              </span>
            </label>
          </div>
          <SlippageControl value={addSlippage} onChange={setAddSlippage} disabled={busy !== null} testid="add-slippage" />

          <div className="quote-box" data-testid="add-quote">
            {addError ? (
              <span className="err-text">{addError}</span>
            ) : addQuote ? (
              <>
                <div className="quote-line">
                  <span>LP to receive (est.)</span>
                  <strong>{fmtBig(addQuote.lpOut)}</strong>
                </div>
                <div className="quote-line dim">
                  <span>Min. LP with slippage tolerance</span>
                  <span>{fmtBig(addQuote.minLpOut)}</span>
                </div>
                <div className="quote-line dim">
                  <span>Pool ratio check</span>
                  <span>
                    {fmtBig(addQuote.reserveA)} A / {fmtBig(addQuote.reserveB)} B
                  </span>
                </div>
              </>
            ) : (
              <span className="dim">Enter both amounts for a live quote (deposited at the current pool ratio).</span>
            )}
          </div>

          <div className="actions">
            {!addPlan && (
              <button
                className="btn btn-secondary"
                onClick={() => addQuote && setAddPlan({ amountA, amountB, slippageBps: Number(addSlippage) || 0, quote: addQuote })}
                disabled={!addQuote || busy !== null}
                data-testid="add-preview"
              >
                Preview deposit
              </button>
            )}
            {addPlan && (
              <>
                <div className="plan" data-testid="add-plan">
                  Deposit {fmtBig(BigInt(addPlan.amountA))} A + {fmtBig(BigInt(addPlan.amountB))} B for ≥{' '}
                  {fmtBig(addPlan.quote.minLpOut)} LP (expect {fmtBig(addPlan.quote.lpOut)}; quote re-checked on submit)
                </div>
                <div className="btn-row">
                  <button className="btn btn-ghost" onClick={() => setAddPlan(null)} disabled={busy !== null}>
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={doAddConfirm}
                    disabled={busy !== null}
                    data-testid="add-confirm"
                  >
                    {busy ? (
                      <>
                        <span className="spinner" /> {busy} · {elapsed}s
                      </>
                    ) : (
                      'Confirm add'
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </section>
      </div>

      <div className="col">
        <section className="card" data-testid="remove-card">
          <div className="card-head">
            <h2>Remove liquidity</h2>
            <div className="badges">
              {pausedNow && <span className="badge badge-red">paused</span>}
            </div>
          </div>
          <label className="field">
            <span>LP amount to burn (you hold {fmtBig(totalLp)})</span>
            <span className="input-wrap">
              <input
                className="input mono"
                inputMode="numeric"
                placeholder="e.g. 1000"
                value={lpAmount}
                onChange={(event) => setLpAmount(event.target.value.trim())}
                disabled={busy !== null}
                data-testid="remove-amount"
              />
              <span className="input-suffix mono">LP</span>
            </span>
          </label>
          <SlippageControl value={removeSlippage} onChange={setRemoveSlippage} disabled={busy !== null} testid="remove-slippage" />

          <div className="quote-box" data-testid="remove-quote">
            {removeError ? (
              <span className="err-text">{removeError}</span>
            ) : removeQuote ? (
              <>
                <div className="quote-line">
                  <span>You receive (est.)</span>
                  <strong>
                    {fmtBig(removeQuote.aOut)} A + {fmtBig(removeQuote.bOut)} B
                  </strong>
                </div>
                <div className="quote-line dim">
                  <span>Min. with slippage tolerance</span>
                  <span>
                    {fmtBig(removeQuote.minA)} A / {fmtBig(removeQuote.minB)} B
                  </span>
                </div>
                <div className="quote-line dim">
                  <span>Share of pool</span>
                  <span>{fmtShare(removeQuote.lpAmount, removeQuote.lpSupply)}</span>
                </div>
              </>
            ) : (
              <span className="dim">Enter an LP amount for a live quote (proportional slice of both reserves).</span>
            )}
          </div>

          <div className="actions">
            {!removePlan && (
              <button
                className="btn btn-secondary"
                onClick={() => removeQuote && setRemovePlan({ lpAmount, slippageBps: Number(removeSlippage) || 0, quote: removeQuote })}
                disabled={!removeQuote || busy !== null}
                data-testid="remove-preview"
              >
                Preview withdrawal
              </button>
            )}
            {removePlan && (
              <>
                <div className="plan" data-testid="remove-plan">
                  Burn {fmtBig(BigInt(removePlan.lpAmount))} LP for ≥ {fmtBig(removePlan.quote.minA)} A + ≥{' '}
                  {fmtBig(removePlan.quote.minB)} B (quote re-checked on submit)
                </div>
                <div className="btn-row">
                  <button className="btn btn-ghost" onClick={() => setRemovePlan(null)} disabled={busy !== null}>
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={doRemoveConfirm}
                    disabled={busy !== null}
                    data-testid="remove-confirm"
                  >
                    {busy ? (
                      <>
                        <span className="spinner" /> {busy} · {elapsed}s
                      </>
                    ) : (
                      'Confirm remove'
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
