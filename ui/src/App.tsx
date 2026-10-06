/**
 * Midnight AMM — React dashboard.
 *
 * Thin client over the local bridge (bridge.ts, mounted at /api by the vite
 * dev server); every AMM operation lives in the api workspace. Mutations are
 * dry-run first: the first click shows a preview/plan, a second explicit
 * click submits. Reads poll; wallet/proof work happens server-side.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  bridge,
  friendlyError,
  type BalanceView,
  type Health,
  type PoolStateView,
  type QuoteView,
  type SwapResponse,
  type SwapSide,
} from './lib/api';

function fmtBig(value: string | bigint | undefined): string {
  if (value === undefined || value === '') return '—';
  try {
    return BigInt(value).toLocaleString('en-US');
  } catch {
    return String(value);
  }
}

function fmtPrice(numerator: string, denominator: string): string {
  const n = BigInt(numerator);
  const d = BigInt(denominator);
  if (d === 0n || n === 0n) return '—';
  const scaled = (n * 1_000_000n) / d;
  const whole = scaled / 1_000_000n;
  const frac = (scaled % 1_000_000n).toString().padStart(6, '0').replace(/0+$/, '');
  return frac ? `${whole}.${frac}` : whole.toString();
}

function truncHex(hex: string, head = 10, tail = 6): string {
  return hex.length <= head + tail + 1 ? hex : `${hex.slice(0, head)}…${hex.slice(-tail)}`;
}

function isValidAmount(raw: string): boolean {
  return /^\d+$/.test(raw) && BigInt(raw) > 0n;
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

type Preview =
  | { kind: 'swap'; response: Extract<SwapResponse, { dryRun: true }> }
  | { kind: 'faucet'; amountA: string; amountB: string; paused: boolean }
  | { kind: 'seed'; paused: boolean }
  | { kind: 'pause'; currentPaused: boolean; wouldSetPaused: boolean }
  | { kind: 'unpause'; currentPaused: boolean; wouldSetPaused: boolean }
  | null;

interface ActionLog {
  label: string;
  txId?: string | null;
  detail?: string;
}

export default function App() {
  const [health, setHealth] = useState<Health | null>(null);
  const [pool, setPool] = useState<PoolStateView | null>(null);
  const [poolError, setPoolError] = useState<string | null>(null);
  const [poolUpdatedAt, setPoolUpdatedAt] = useState<Date | null>(null);
  const [balance, setBalance] = useState<BalanceView | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [actionLog, setActionLog] = useState<ActionLog | null>(null);

  const [side, setSide] = useState<SwapSide>('AtoB');
  const [amount, setAmount] = useState('');
  const [slippageBps, setSlippageBps] = useState('0');
  const [quote, setQuote] = useState<QuoteView | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview>(null);

  const [devOpen, setDevOpen] = useState(false);
  const [faucetA, setFaucetA] = useState('1000000');
  const [faucetB, setFaucetB] = useState('1000000');
  const [copied, setCopied] = useState(false);

  const poolInFlight = useRef(false);
  const balanceInFlight = useRef(false);

  const ready = health?.state === 'ready';

  // ── health polling ─────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const next = await bridge.health();
        if (!cancelled) setHealth(next);
      } catch {
        /* keep previous health; bridge unreachable shows on next operation */
      }
    };
    void load();
    const interval = setInterval(load, ready ? 20_000 : 4_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [ready]);

  // ── pool state polling ─────────────────────────────────────────────────
  const loadPool = useCallback(async () => {
    if (poolInFlight.current) return;
    poolInFlight.current = true;
    try {
      const next = await bridge.poolState();
      setPool(next);
      setPoolError(null);
      setPoolUpdatedAt(new Date());
    } catch (cause) {
      setPoolError(friendlyError(cause));
    } finally {
      poolInFlight.current = false;
    }
  }, []);

  const loadBalance = useCallback(async (sync: boolean) => {
    if (balanceInFlight.current) return;
    balanceInFlight.current = true;
    try {
      const next = await bridge.balance(sync);
      setBalance(next);
      setBalanceError(null);
    } catch (cause) {
      setBalanceError(friendlyError(cause));
    } finally {
      balanceInFlight.current = false;
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    void loadPool();
    void loadBalance(false);
    const interval = setInterval(() => void loadPool(), 45_000);
    return () => clearInterval(interval);
  }, [ready, loadPool, loadBalance]);

  // ── debounced live quote ───────────────────────────────────────────────
  useEffect(() => {
    setQuote(null);
    setQuoteError(null);
    setPreview(null);
    if (!ready || !isValidAmount(amount)) return;
    const timer = setTimeout(() => {
      void bridge
        .quote(side, amount, Number(slippageBps) || 0)
        .then((next) => setQuote(next))
        .catch((cause) => setQuoteError(friendlyError(cause)));
    }, 600);
    return () => clearTimeout(timer);
  }, [side, amount, slippageBps, ready]);

  // ── actions ────────────────────────────────────────────────────────────
  const runAction = useCallback(async (label: string, operation: () => Promise<ActionLog>) => {
    setBusy(label);
    setError(null);
    try {
      const log = await operation();
      setActionLog(log);
    } catch (cause) {
      setError(friendlyError(cause));
    } finally {
      setBusy(null);
    }
  }, []);

  const refreshAfterMutation = useCallback(async () => {
    // sync=true: mutations change the wallet's coins; refresh from chain so
    // the displayed balance is honest (runs `midnight-wallet-cli balance`).
    await Promise.all([loadPool(), loadBalance(true)]);
  }, [loadPool, loadBalance]);

  const doPreviewSwap = useCallback(() => {
    if (!isValidAmount(amount)) return;
    void runAction('Previewing swap…', async () => {
      const response = await bridge.swap({ side, amountIn: amount, slippageBps: Number(slippageBps) || 0, execute: false });
      if (!response.dryRun) return { label: 'Bridge executed instead of previewing' };
      setPreview({ kind: 'swap', response });
      return { label: 'Swap preview ready' };
    });
  }, [amount, side, slippageBps, runAction]);

  const doConfirm = useCallback(() => {
    if (!preview) return;
    const current = preview;
    if (current.kind === 'swap') {
      void runAction('Proving & submitting swap…', async () => {
        const response = await bridge.swap({
          side: current.response.side,
          amountIn: current.response.amountIn,
          slippageBps: current.response.slippageBps,
          execute: true,
        });
        setPreview(null);
        setAmount('');
        await refreshAfterMutation();
        return {
          label: response.dryRun ? 'Swap submitted' : 'Swap settled',
          txId: response.dryRun ? null : response.txId,
          detail: response.dryRun ? undefined : `${fmtBig(current.response.quote.amountOut)} out (min ${fmtBig(current.response.quote.minAmountOut)})`,
        };
      });
      return;
    }
    if (current.kind === 'faucet') {
      void runAction('Minting…', async () => {
        const response = await bridge.faucet({ amountA: current.amountA, amountB: current.amountB, execute: true });
        setPreview(null);
        await refreshAfterMutation();
        if (response.dryRun) return { label: 'Bridge returned a preview instead of minting' };
        return { label: 'Minted', detail: `${fmtBig(response.coinA.value)} A + ${fmtBig(response.coinB.value)} B` };
      });
      return;
    }
    if (current.kind === 'seed') {
      void runAction('Minting & seeding pool…', async () => {
        const response = await bridge.seed(true);
        setPreview(null);
        await refreshAfterMutation();
        if (response.dryRun) return { label: 'Bridge returned a preview instead of seeding' };
        return { label: 'Pool seeded', txId: response.seedTxId };
      });
      return;
    }
    void runAction(`${current.kind === 'pause' ? 'Pausing' : 'Unpausing'}…`, async () => {
      const result = await (current.kind === 'pause' ? bridge.pause(true) : bridge.unpause(true));
      setPreview(null);
      await refreshAfterMutation();
      if (result.dryRun) return { label: 'Bridge returned a preview instead of submitting' };
      return {
        label: result.alreadyInState ? 'Already in requested state' : `Pool ${current.kind === 'pause' ? 'paused' : 'unpaused'}`,
        txId: result.txId,
      };
    });
  }, [preview, runAction, refreshAfterMutation]);

  const doFaucetPreview = useCallback(() => {
    if (!isValidAmount(faucetA) || !isValidAmount(faucetB)) {
      setError('Faucet amounts must be positive integers (atomic units).');
      return;
    }
    void runAction('Checking faucet…', async () => {
      const response = await bridge.faucet({ amountA: faucetA, amountB: faucetB, execute: false });
      if (!response.dryRun) return { label: 'Bridge returned mint instead of a preview' };
      setPreview({ kind: 'faucet', amountA: faucetA, amountB: faucetB, paused: response.paused });
      return { label: 'Faucet ready to confirm' };
    });
  }, [faucetA, faucetB, runAction]);

  const doSeedPreview = useCallback(() => {
    void runAction('Checking seed…', async () => {
      const response = await bridge.seed(false);
      if (!response.dryRun) return { label: 'Bridge returned seed instead of a preview' };
      setPreview({ kind: 'seed', paused: response.paused });
      return { label: 'Seed ready to confirm' };
    });
  }, [runAction]);

  const doPausePreview = useCallback(
    (target: boolean) => {
      void runAction('Reading pause state…', async () => {
        const result = await (target ? bridge.pause(false) : bridge.unpause(false));
        if (!result.dryRun) return { label: 'Bridge submitted instead of previewing' };
        setPreview({ kind: target ? 'pause' : 'unpause', currentPaused: result.currentPaused, wouldSetPaused: result.wouldSetPaused });
        return { label: `${target ? 'Pause' : 'Unpause'} ready to confirm` };
      });
    },
    [runAction],
  );

  const doReconnect = useCallback(() => {
    setHealth({ state: 'connecting', contract: health?.contract ?? '', wallet: health?.wallet ?? '', networkId: health?.networkId ?? '' });
    setError(null);
    void bridge.reconnect().catch((cause) => setError(friendlyError(cause)));
  }, [health]);

  const handleCopy = useCallback(async () => {
    if (!health?.contract) return;
    if (await copyText(health.contract)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [health]);

  // ── derived ────────────────────────────────────────────────────────────
  const tokenA = pool?.colorAHex ?? '';
  const tokenB = pool?.colorBHex ?? '';
  const swapPreview = preview?.kind === 'swap' ? preview.response : null;
  const paused = pool?.paused ?? false;
  const canExecuteSwap =
    swapPreview !== null && !swapPreview.paused && swapPreview.exactCoinAvailable && busy === null;

  const previewLabel = (() => {
    if (!preview) return null;
    if (preview.kind === 'swap') return `Swap ${fmtBig(preview.response.quote.amountIn)} ${preview.response.side === 'AtoB' ? 'A→B' : 'B→A'} for ≥ ${fmtBig(preview.response.quote.minAmountOut)}`;
    if (preview.kind === 'faucet') return `Mint ${fmtBig(preview.amountA)} A + ${fmtBig(preview.amountB)} B`;
    if (preview.kind === 'seed') return 'Faucet 1,000,000 A + 1,000,000 B, then seed the pool';
    return `${preview.kind === 'pause' ? 'Pause' : 'Unpause'} the pool (currently ${preview.currentPaused ? 'paused' : 'running'})`;
  })();

  // ── render ─────────────────────────────────────────────────────────────
  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <span className="brand-mark">◈</span>
          <span className="brand-name">Midnight AMM</span>
        </div>
        <div className="header-right">
          {health?.state === 'ready' && (
            <div className="chip" title={`wallet: ${health.wallet} · network: ${health.networkId}`}>
              <span className="dot dot-green" />
              {health.wallet}
            </div>
          )}
          {health?.state === 'connecting' && (
            <div className="chip muted">
              <span className="spinner" />
              Bridge connecting…
            </div>
          )}
          {health?.state === 'error' && (
            <button className="chip chip-error" onClick={doReconnect} title={health.message}>
              <span className="dot dot-red" />
              Bridge error — retry
            </button>
          )}
          {health?.contract && (
            <button className="chip chip-contract" onClick={handleCopy} title={`Copy contract address: ${health.contract}`}>
              <span className="mono">{truncHex(health.contract, 12, 8)}</span>
              <span>{copied ? '✓' : '⎘'}</span>
            </button>
          )}
        </div>
      </header>

      {health?.state === 'error' && health.message && <div className="banner banner-error">{health.message}</div>}
      {error && (
        <div className="banner banner-error">
          <span>{error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}
      {actionLog && !error && (
        <div className="banner banner-info">
          <span>
            {actionLog.label}
            {actionLog.detail ? ` · ${actionLog.detail}` : ''}
            {actionLog.txId ? ` · tx ${truncHex(actionLog.txId, 12, 8)}` : ''}
          </span>
          <button onClick={() => setActionLog(null)}>✕</button>
        </div>
      )}

      <main className="layout">
        <div className="col">
          <section className="card">
            <div className="card-head">
              <h2>Pool</h2>
              <div className="badges">
                {pool?.seeded === false && <span className="badge badge-amber">unseeded</span>}
                {paused && <span className="badge badge-red">paused</span>}
                {pool?.seeded && !paused && <span className="badge badge-green">live</span>}
              </div>
            </div>
            {!pool ? (
              <div className="empty">
                {poolError ? <span className="err-text">{poolError}</span> : <><span className="spinner" /> Loading pool state…</>}
              </div>
            ) : (
              <>
                <div className="reserves">
                  <div className="reserve">
                    <span className="reserve-label">Token A</span>
                    <span className="reserve-value">{fmtBig(pool.reserveA)}</span>
                    <span className="reserve-color mono" title={pool.colorAHex}>{truncHex(pool.colorAHex, 12, 8)}</span>
                  </div>
                  <div className="reserve-swap">⇄</div>
                  <div className="reserve">
                    <span className="reserve-label">Token B</span>
                    <span className="reserve-value">{fmtBig(pool.reserveB)}</span>
                    <span className="reserve-color mono" title={pool.colorBHex}>{truncHex(pool.colorBHex, 12, 8)}</span>
                  </div>
                </div>
                <div className="price-row">
                  <span>1 A = <strong>{fmtPrice(pool.reserveB, pool.reserveA)}</strong> B</span>
                  <span>1 B = <strong>{fmtPrice(pool.reserveA, pool.reserveB)}</strong> A</span>
                  <span className="dim">fee 0.3% (retained in pool)</span>
                </div>
                <div className="card-foot">
                  <span className="dim">
                    {poolUpdatedAt ? `updated ${poolUpdatedAt.toLocaleTimeString()}` : ''}
                    {poolError ? ` · ${poolError}` : ''}
                  </span>
                  <button className="btn btn-ghost btn-sm" onClick={() => void loadPool()} disabled={busy !== null}>
                    Refresh
                  </button>
                </div>
              </>
            )}
          </section>

          <section className="card">
            <div className="card-head">
              <h2>Wallet balance</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => void loadBalance(true)} disabled={busy !== null} title="Re-sync the wallet coin cache first (runs midnight-wallet-cli balance)">
                Sync & refresh
              </button>
            </div>
            {!balance ? (
              <div className="empty">
                {balanceError ? <span className="err-text">{balanceError}</span> : <><span className="spinner" /> Waiting for bridge…</>}
              </div>
            ) : (
              <div className="balance">
                <div className="balance-totals">
                  <div>
                    <span className="reserve-label">Token A</span>
                    <span className="reserve-value">{fmtBig(balance.totalA)}</span>
                  </div>
                  <div>
                    <span className="reserve-label">Token B</span>
                    <span className="reserve-value">{fmtBig(balance.totalB)}</span>
                  </div>
                </div>
                <div className="coin-groups">
                  {balance.coinA.length > 0 && (
                    <div className="coin-group">
                      <span className="coin-group-title">A coins ({balance.coinA.length})</span>
                      <div className="coin-chips">
                        {balance.coinA.map((coin) => (
                          <span key={coin.nonceHex} className="coin-chip mono" title={`nonce ${coin.nonceHex}`}>
                            {fmtBig(coin.value)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {balance.coinB.length > 0 && (
                    <div className="coin-group">
                      <span className="coin-group-title">B coins ({balance.coinB.length})</span>
                      <div className="coin-chips">
                        {balance.coinB.map((coin) => (
                          <span key={coin.nonceHex} className="coin-chip mono" title={`nonce ${coin.nonceHex}`}>
                            {fmtBig(coin.value)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {balance.otherCoins.length > 0 && (
                    <div className="coin-group">
                      <span className="coin-group-title">Other colors</span>
                      <div className="coin-chips">
                        {balance.otherCoins.map((coin) => (
                          <span key={coin.nonceHex} className="coin-chip coin-chip-dim mono" title={`color ${coin.colorHex} · nonce ${coin.nonceHex}`}>
                            {fmtBig(coin.value)} <span className="dim">{truncHex(coin.colorHex, 6, 4)}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {balanceError && <span className="err-text">{balanceError}</span>}
              </div>
            )}
          </section>
        </div>

        <div className="col">
          <section className="card">
            <div className="card-head">
              <h2>Swap</h2>
              {paused && <span className="badge badge-red">paused — trading disabled</span>}
            </div>
            <div className="side-toggle">
              <button className={`side-btn ${side === 'AtoB' ? 'active' : ''}`} onClick={() => setSide('AtoB')} disabled={busy !== null}>
                A → B
              </button>
              <button className={`side-btn ${side === 'BtoA' ? 'active' : ''}`} onClick={() => setSide('BtoA')} disabled={busy !== null}>
                B → A
              </button>
            </div>
            <label className="field">
              <span>Amount in (atomic units)</span>
              <input
                className="input mono"
                inputMode="numeric"
                placeholder={side === 'AtoB' ? 'e.g. 500000' : 'e.g. 100000'}
                value={amount}
                onChange={(event) => setAmount(event.target.value.trim())}
                disabled={busy !== null}
              />
            </label>
            <label className="field">
              <span>Slippage (bps, 0–10000)</span>
              <input
                className="input mono"
                inputMode="numeric"
                value={slippageBps}
                onChange={(event) => setSlippageBps(event.target.value.trim())}
                disabled={busy !== null}
              />
            </label>

            <div className="quote-box">
              {quoteError ? (
                <span className="err-text">{quoteError}</span>
              ) : quote ? (
                <>
                  <div className="quote-line">
                    <span>You receive (est.)</span>
                    <strong>{fmtBig(quote.amountOut)}</strong>
                  </div>
                  <div className="quote-line dim">
                    <span>Min. with {quote.slippageBps ?? 0} bps slippage</span>
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
              {!preview && (
                <button className="btn btn-secondary" onClick={doPreviewSwap} disabled={!ready || !isValidAmount(amount) || busy !== null}>
                  {busy === 'Previewing swap…' ? <><span className="spinner" /> {busy}</> : 'Preview swap'}
                </button>
              )}
              {swapPreview && (
                <>
                  <div className={`plan ${swapPreview.paused || !swapPreview.exactCoinAvailable ? 'plan-warn' : ''}`}>
                    {swapPreview.paused ? (
                      <span>Pool is paused — unpause before trading.</span>
                    ) : swapPreview.exactCoinAvailable ? (
                      <span>
                        Exact coin of {fmtBig(swapPreview.quote.amountIn)} available ✓ · expect {fmtBig(swapPreview.quote.amountOut)} out
                      </span>
                    ) : (
                      <span>
                        No coin with exactly {fmtBig(swapPreview.quote.amountIn)}. Available:{' '}
                        {swapPreview.availableValues.length ? swapPreview.availableValues.map(fmtBig).join(', ') : 'none'} — sync the wallet or
                        use one of those values.
                      </span>
                    )}
                  </div>
                  <div className="btn-row">
                    <button className="btn btn-ghost" onClick={() => setPreview(null)} disabled={busy !== null}>
                      Cancel
                    </button>
                    <button className="btn btn-primary" onClick={doConfirm} disabled={!canExecuteSwap}>
                      {busy ? <><span className="spinner" /> {busy}</> : 'Execute swap'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </section>

          <section className="card">
            <div className="card-head dev-head">
              <h2>Dev tools</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setDevOpen(!devOpen)}>
                {devOpen ? 'Hide' : 'Show'}
              </button>
            </div>
            {devOpen && (
              <div className="dev-body">
                <div className="field-row">
                  <label className="field">
                    <span>Faucet amount A</span>
                    <input className="input mono" inputMode="numeric" value={faucetA} onChange={(e) => setFaucetA(e.target.value.trim())} disabled={busy !== null} />
                  </label>
                  <label className="field">
                    <span>Faucet amount B</span>
                    <input className="input mono" inputMode="numeric" value={faucetB} onChange={(e) => setFaucetB(e.target.value.trim())} disabled={busy !== null} />
                  </label>
                </div>
                <div className="btn-row">
                  <button className="btn btn-secondary" onClick={doFaucetPreview} disabled={!ready || busy !== null}>
                    Mint coins
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => doPausePreview(!paused)}
                    disabled={!ready || busy !== null || preview?.kind === 'pause' || preview?.kind === 'unpause'}
                  >
                    {paused ? 'Unpause pool' : 'Pause pool'}
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={doSeedPreview}
                    disabled={!ready || busy !== null || preview?.kind === 'seed'}
                  >
                    Seed pool
                  </button>
                </div>
                <p className="dim small">
                  Every mutation previews first, then requires an explicit confirm. Seed is devnet-only and permanently mints into the pool.
                </p>
              </div>
            )}
          </section>

          {preview && preview.kind !== 'swap' && (
            <section className="card card-confirm">
              <div className="card-head">
                <h2>Confirm</h2>
              </div>
              <div className="plan">{previewLabel}</div>
              <div className="btn-row">
                <button className="btn btn-ghost" onClick={() => setPreview(null)} disabled={busy !== null}>
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={doConfirm} disabled={busy !== null || !ready}>
                  {busy ? <><span className="spinner" /> {busy}</> : `Confirm ${preview.kind}`}
                </button>
              </div>
            </section>
          )}
        </div>
      </main>

      <footer className="footer">
        <span>
          Shielded constant-product AMM · all logic in <code>api/</code> · dry-run until confirmed
        </span>
      </footer>
    </div>
  );
}
