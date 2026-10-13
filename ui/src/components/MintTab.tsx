import { useState } from 'react';
import type { PoolState } from '@midnight-ntwrk/leaderboard-api/dist/api/src/amm/types.js';
import { fmtBig, isValidAmount } from '../lib/format';
import type { ActionContext, Refreshers } from '../lib/actions';
import type { BrowserAmm } from '../lib/wallet';
import type { Tab } from './TabNav';

const DEFAULT_FAUCET_AMOUNT = '1000000';

interface MintTabProps extends ActionContext {
  readonly amm: BrowserAmm;
  readonly pool: PoolState | null;
  readonly refreshers: Refreshers;
  readonly onNavigate: (tab: Tab) => void;
}

interface MintPlan {
  readonly amountA: string;
  readonly amountB: string;
}

export function MintTab(props: MintTabProps) {
  const { amm, pool, refreshers, onNavigate } = props;
  const { runAction, pushLog, setBusy, raiseError, busy, elapsed } = props;

  const [amountA, setAmountA] = useState(DEFAULT_FAUCET_AMOUNT);
  const [amountB, setAmountB] = useState(DEFAULT_FAUCET_AMOUNT);
  const [mintPlan, setMintPlan] = useState<MintPlan | null>(null);
  const [seedPlan, setSeedPlan] = useState<MintPlan | null>(null);

  const parseAmounts = (): MintPlan | null => {
    if (!isValidAmount(amountA) || !isValidAmount(amountB)) {
      raiseError('Faucet amounts must be positive integers (atomic units).');
      return null;
    }
    return { amountA, amountB };
  };

  const doMintPreview = () => {
    const plan = parseAmounts();
    if (plan) setMintPlan(plan);
  };

  const doMintConfirm = () => {
    const plan = mintPlan;
    if (!plan) return;
    void runAction('Minting…', async () => {
      const [coinA, coinB] = await amm.api.faucet({
        amountA: BigInt(plan.amountA),
        amountB: BigInt(plan.amountB),
      });
      amm.vault.record(coinA, coinB);
      setMintPlan(null);
      await refreshers.all();
      return { label: 'Minted', detail: `${fmtBig(coinA.value)} A + ${fmtBig(coinB.value)} B` };
    });
  };

  const doSeedPreview = () => {
    if (!pool) {
      raiseError('Pool state is still loading — try again in a moment.');
      return;
    }
    if (pool.seeded) {
      raiseError('Pool is already seeded.');
      return;
    }
    const plan = parseAmounts();
    if (plan) setSeedPlan(plan);
  };

  const doSeedConfirm = () => {
    const plan = seedPlan;
    if (!plan) return;
    void runAction('Minting & seeding pool…', async () => {
      setBusy('Minting seed coins…');
      const [coinA, coinB] = await amm.api.faucet({
        amountA: BigInt(plan.amountA),
        amountB: BigInt(plan.amountB),
      });
      // Faucet coins go straight into the pool — never recorded in the vault.
      pushLog({
        ok: true,
        label: 'Seed funds minted',
        detail: `${fmtBig(coinA.value)} A + ${fmtBig(coinB.value)} B`,
      });
      setBusy('Seeding pool…');
      const result = await amm.api.seed(coinA, coinB);
      amm.vault.record(result.lpCoin);
      setSeedPlan(null);
      await refreshers.all();
      return {
        label: 'Pool seeded',
        txId: result.txId,
        detail: `minted then seeded ${fmtBig(coinA.value)} A + ${fmtBig(coinB.value)} B · initial LP ${fmtBig(result.initialLp)}`,
      };
    });
  };

  const unseeded = pool?.seeded === false;

  return (
    <>
      <div className="col">
        <section className="card" data-testid="mint-card">
          <div className="card-head">
            <h2>Faucet</h2>
            <span className="badge badge-green">open to everyone</span>
          </div>
          <p className="dim small">
            The faucet circuit is open to everyone at contract level — anyone can mint pool tokens. Amounts are free
            demo units (atomic integers), nothing is bought or sold.
          </p>
          <div className="field-row">
            <label className="field">
              <span>Mint amount A</span>
              <span className="input-wrap">
                <input
                  className="input mono"
                  inputMode="numeric"
                  value={amountA}
                  onChange={(event) => setAmountA(event.target.value.trim())}
                  disabled={busy !== null}
                  data-testid="faucet-a"
                />
                <span className="input-suffix mono">A</span>
              </span>
            </label>
            <label className="field">
              <span>Mint amount B</span>
              <span className="input-wrap">
                <input
                  className="input mono"
                  inputMode="numeric"
                  value={amountB}
                  onChange={(event) => setAmountB(event.target.value.trim())}
                  disabled={busy !== null}
                  data-testid="faucet-b"
                />
                <span className="input-suffix mono">B</span>
              </span>
            </label>
          </div>

          <div className="actions">
            {!mintPlan && (
              <button className="btn btn-secondary" onClick={doMintPreview} disabled={busy !== null} data-testid="mint-preview">
                Preview mint
              </button>
            )}
            {mintPlan && (
              <>
                <div className="plan" data-testid="mint-plan">
                  Mint {fmtBig(BigInt(mintPlan.amountA))} A + {fmtBig(BigInt(mintPlan.amountB))} B into your vault
                </div>
                <div className="btn-row">
                  <button className="btn btn-ghost" onClick={() => setMintPlan(null)} disabled={busy !== null}>
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={doMintConfirm}
                    disabled={busy !== null}
                    data-testid="mint-confirm"
                  >
                    {busy ? (
                      <>
                        <span className="spinner" /> {busy} · {elapsed}s
                      </>
                    ) : (
                      'Confirm mint'
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </section>
      </div>

      <div className="col">
        <section className="card" data-testid="seed-card">
          <div className="card-head">
            <h2>Seed the pool</h2>
            {pool?.seeded && <span className="badge badge-green">seeded</span>}
            {unseeded && (
              <span className="badge badge-amber" data-testid="unseeded-badge">
                unseeded
              </span>
            )}
          </div>
          {unseeded ? (
            <>
              <p className="dim small">
                Seeding initializes reserves with two freshly minted coins and mints the initial LP supply to you. One
                confirm runs faucet → seed sequentially (two transactions, progress appears in the activity log).
              </p>
              {!seedPlan ? (
                <div className="actions">
                  <button
                    className="btn btn-secondary"
                    onClick={doSeedPreview}
                    disabled={busy !== null}
                    data-testid="seed-preview"
                  >
                    Preview seed
                  </button>
                </div>
              ) : (
                <div className="actions">
                  <div className="plan" data-testid="seed-plan">
                    Faucet {fmtBig(BigInt(seedPlan.amountA))} A + {fmtBig(BigInt(seedPlan.amountB))} B, then seed the
                    pool with those coins
                  </div>
                  <div className="btn-row">
                    <button className="btn btn-ghost" onClick={() => setSeedPlan(null)} disabled={busy !== null}>
                      Cancel
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={doSeedConfirm}
                      disabled={busy !== null}
                      data-testid="seed-confirm"
                    >
                      {busy ? (
                        <>
                          <span className="spinner" /> {busy} · {elapsed}s
                        </>
                      ) : (
                        'Confirm seed'
                      )}
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <p className="dim small">
                {pool
                  ? 'Pool is already seeded — add or remove liquidity on the Liquidity tab.'
                  : 'Loading pool state…'}
              </p>
              {pool && (
                <div className="actions">
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => onNavigate('liquidity')}
                    data-testid="seeded-go-liquidity"
                  >
                    Go to Liquidity tab →
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </>
  );
}
