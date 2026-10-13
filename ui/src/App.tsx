/**
 * Midnight AMM — Uniswap-style React dashboard (preprod, wallet Connect).
 *
 * Thin client over the api workspace's BrowserAmm (ui/src/lib/wallet.ts →
 * api/src/amm/browser.ts): wallet discovery → connect → tabbed UI (Swap /
 * Pools / Liquidity / Mint) against deployed preprod pool contracts.
 * Mutations are dry-run first: the first click shows a preview/plan, a second
 * explicit click submits.
 *
 * Reads are cheap (indexer + in-browser vault): colors are derived locally
 * from the contract address and pause/reserves come from contract state — no
 * proving and no view transactions.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import type { PoolBalance, PoolState } from '@midnight-ntwrk/leaderboard-api/dist/api/src/amm/types.js';
import type { ActionContext, ActionResult, LogEntry, Refreshers, RunAction } from './lib/actions';
import { toAppError, friendlyMessage, type AppError } from './lib/errors';
import { copyText, truncHex } from './lib/format';
import {
  addLocalPool,
  fetchPoolRegistry,
  loadLocalPools,
  mergePools,
  removeLocalPool,
  saveLocalPools,
  type LocalPoolEntry,
  type RegistryState,
} from './lib/pools';
import {
  CONTRACT_ADDRESS,
  NETWORK_ID,
  connectWallet,
  getAvailableWallets,
  type BrowserAmm,
  type WalletInfo,
} from './lib/wallet';
import { ActivityLog } from './components/ActivityLog';
import { ConnectScreen } from './components/ConnectScreen';
import { ErrorBanner } from './components/ErrorBanner';
import { Header, type HeaderPool } from './components/Header';
import { LiquidityTab } from './components/LiquidityTab';
import { MintTab } from './components/MintTab';
import { PoolsTab, type PoolSelection } from './components/PoolsTab';
import { SwapTab } from './components/SwapTab';
import { TabNav, type Tab } from './components/TabNav';

interface InfoState {
  readonly label: string;
  readonly detail?: string;
  readonly txId?: string;
}

/** localStorage key remembering the last successfully connected wallet across reloads. */
const AUTOCONNECT_KEY = 'mn-amm:autoconnect-wallet';

function readStoredWalletKey(): string | null {
  try {
    return localStorage.getItem(AUTOCONNECT_KEY);
  } catch {
    return null;
  }
}

function storeWalletKey(key: string): void {
  try {
    localStorage.setItem(AUTOCONNECT_KEY, key);
  } catch {
    // Storage unavailable (private mode/sandbox) — auto-reconnect just won't run.
  }
}

export default function App() {
  const [wallets, setWallets] = useState<WalletInfo[]>([]);
  const [walletScanError, setWalletScanError] = useState<string | null>(null);
  const [amm, setAmm] = useState<BrowserAmm | null>(null);
  const [connecting, setConnecting] = useState(false);

  const [pool, setPool] = useState<PoolState | null>(null);
  const [poolError, setPoolError] = useState<string | null>(null);
  const [poolUpdatedAt, setPoolUpdatedAt] = useState<Date | null>(null);
  const [balance, setBalance] = useState<PoolBalance | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  /** null = not loaded yet (isPaused is a full tx — load once, never poll). */
  const [paused, setPaused] = useState<boolean | null>(null);
  const [pausedError, setPausedError] = useState<string | null>(null);

  const [error, setError] = useState<AppError | null>(null);
  const [info, setInfo] = useState<InfoState | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const [tab, setTab] = useState<Tab>('swap');
  const [registry, setRegistry] = useState<RegistryState>({ status: 'loading' });
  /** Browser-registered pools (localStorage) — merged into the display list. */
  const [localPools, setLocalPools] = useState<LocalPoolEntry[]>(() => loadLocalPools());
  /** Set once the user picks a pool; until then the header follows the registry. */
  const [selectedOverride, setSelectedOverride] = useState<PoolSelection | null>(null);
  const [switching, setSwitching] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  /** Bumped whenever the in-browser vault changes (it has no observable). */
  const [vaultTick, setVaultTick] = useState(0);

  /** Elapsed seconds for the active long operation (connect or busy action) — proving can take minutes. */
  const activeLabel = busy ?? (connecting ? 'Connecting' : null);
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (activeLabel === null) {
      setElapsed(0);
      return;
    }
    const started = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [activeLabel]);

  const ready = amm !== null;

  // ── wallet discovery (stops once connected) ──────────────────────────────
  useEffect(() => {
    if (ready) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let lastSignature = '';
    const scan = async () => {
      try {
        const found = await getAvailableWallets();
        if (cancelled) return;
        const signature = found.map((w) => `${w.key}:${w.apiVersion}`).join(',');
        if (signature !== lastSignature) {
          lastSignature = signature;
          setWallets(found);
          setWalletScanError(null);
        }
      } catch (cause) {
        if (!cancelled) setWalletScanError(friendlyMessage(cause));
      }
      if (!cancelled) timer = setTimeout(scan, 500);
    };
    void scan();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [ready]);

  // ── loaders (token-guarded so a pool switch never applies stale reads) ───
  const poolToken = useRef(0);
  const balanceToken = useRef(0);
  const pausedToken = useRef(0);

  const loadPool = useCallback(
    async (a: BrowserAmm | null = amm) => {
      if (!a) return;
      const token = ++poolToken.current;
      try {
        const next = await a.api.poolState();
        if (token !== poolToken.current) return;
        setPool(next);
        setPoolError(null);
        setPoolUpdatedAt(new Date());
      } catch (cause) {
        if (token !== poolToken.current) return;
        setPoolError(friendlyMessage(cause));
      }
    },
    [amm],
  );

  const loadBalance = useCallback(
    async (a: BrowserAmm | null = amm) => {
      if (!a) return;
      const token = ++balanceToken.current;
      try {
        const next = await a.api.balance();
        if (token !== balanceToken.current) return;
        setBalance(next);
        setBalanceError(null);
      } catch (cause) {
        if (token !== balanceToken.current) return;
        setBalanceError(friendlyMessage(cause));
      }
    },
    [amm],
  );

  const loadPaused = useCallback(
    async (a: BrowserAmm | null = amm) => {
      if (!a) return;
      const token = ++pausedToken.current;
      try {
        const value = await a.api.isPaused();
        if (token !== pausedToken.current) return;
        setPaused(value);
        setPausedError(null);
      } catch (cause) {
        if (token !== pausedToken.current) return;
        setPausedError(friendlyMessage(cause));
      }
    },
    [amm],
  );

  // ── activity log / error plumbing ────────────────────────────────────────
  const logId = useRef(0);
  const pushLog = useCallback<ActionContext['pushLog']>((entry) => {
    logId.current += 1;
    const full: LogEntry = { id: logId.current, at: new Date(), ...entry };
    setLog((previous) => [...previous, full]);
  }, []);

  const raiseError = useCallback((message: string) => setError({ message, raw: message }), []);

  const runAction = useCallback<RunAction>(
    async (label, operation) => {
      setBusy(label);
      setError(null);
      try {
        const result: ActionResult = await operation();
        pushLog({ ok: true, label: result.label, detail: result.detail, txId: result.txId });
        setInfo({ label: result.label, detail: result.detail, txId: result.txId });
        return true;
      } catch (cause) {
        const appError = toAppError(cause);
        setError(appError);
        pushLog({ ok: false, label, detail: appError.message, raw: appError.raw });
        return false;
      } finally {
        setBusy(null);
      }
    },
    [pushLog],
  );

  const refreshers = useMemo<Refreshers>(
    () => ({
      pool: () => loadPool(),
      balance: () => loadBalance(),
      all: async () => {
        setVaultTick((tick) => tick + 1);
        await Promise.all([loadPool(), loadBalance()]);
      },
    }),
    [loadPool, loadBalance],
  );

  const actionContext: ActionContext = { runAction, pushLog, setBusy, raiseError, busy, elapsed };

  // ── connect ──────────────────────────────────────────────────────────────
  const doConnect = useCallback(
    async (walletKey?: string) => {
      setConnecting(true);
      setError(null);
      setInfo(null);
      try {
        const instance = await connectWallet({ walletKey });
        storeWalletKey(instance.wallet.key);
        setAmm(instance);
        // Reads (colors/paused/pool/balance) are local or state-based — no view txs.
        void loadPool(instance);
        void loadBalance(instance);
        void loadPaused(instance);
      } catch (cause) {
        setError(toAppError(cause));
      } finally {
        setConnecting(false);
      }
    },
    [loadPool, loadBalance, loadPaused],
  );

  const doRescan = useCallback(() => {
    setWalletScanError(null);
    setWallets([]);
    setError(null);
    // the discovery effect re-arms because `ready` stays false
  }, []);

  // ── auto-reconnect (restores the last connected wallet after a reload) ───
  // Once per page load: waits until discovery sees the stored wallet, then
  // connects. A failure surfaces through the normal error UI (no retry loop).
  const autoConnectAttempted = useRef(false);
  useEffect(() => {
    if (ready || connecting || autoConnectAttempted.current) return;
    const storedKey = readStoredWalletKey();
    if (!storedKey || !wallets.some((w) => w.key === storedKey)) return;
    autoConnectAttempted.current = true;
    void doConnect(storedKey);
  }, [ready, connecting, wallets, doConnect]);

  // ── pool polling (indexer reads — cheap) ─────────────────────────────────
  useEffect(() => {
    if (!ready) return;
    const interval = setInterval(() => void loadPool(), 30_000);
    return () => clearInterval(interval);
  }, [ready, loadPool]);

  // ── pool registry (/pools.json, copied in by scripts/sync-ui-zk.mjs) ─────
  const reloadRegistry = useCallback(() => {
    setRegistry({ status: 'loading' });
    void fetchPoolRegistry()
      .then((pools) => setRegistry({ status: 'ok', pools }))
      .catch((cause) => setRegistry({ status: 'error', message: friendlyMessage(cause) }));
  }, []);
  useEffect(reloadRegistry, [reloadRegistry]);

  /** Display list: pools.json (build-time) first, then browser-local pools. */
  const displayRegistry = useMemo<RegistryState>(
    () => (registry.status === 'ok' ? { status: 'ok', pools: mergePools(registry.pools, localPools) } : registry),
    [registry, localPools],
  );
  const localNames = useMemo(() => new Set(localPools.map((pool) => pool.name)), [localPools]);

  const selected = useMemo<PoolSelection>(() => {
    if (selectedOverride) return selectedOverride;
    const match =
      displayRegistry.status === 'ok'
        ? displayRegistry.pools.find((entry) => entry.contract.toLowerCase() === CONTRACT_ADDRESS.toLowerCase())
        : undefined;
    return match ? { name: match.name, contract: match.contract } : { name: 'default', contract: CONTRACT_ADDRESS };
  }, [selectedOverride, displayRegistry]);

  // ── browser-local pool registry (localStorage; validated in api/) ────────
  const addPool = useCallback(
    (name: string, contract: string): string | null => {
      try {
        const basePools = registry.status === 'ok' ? registry.pools : [];
        const next = addLocalPool(localPools, basePools, name, contract);
        if (!saveLocalPools(next)) {
          const message = 'Could not save to browser storage (private mode or quota) — pool not added.';
          raiseError(message);
          return message;
        }
        setLocalPools(next);
        pushLog({ ok: true, label: `Added pool "${name}"`, detail: truncHex(contract.toLowerCase(), 12, 8) });
        return null;
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : String(cause);
        pushLog({ ok: false, label: `Add pool "${name}" failed`, detail: message });
        return message;
      }
    },
    [registry, localPools, pushLog, raiseError],
  );

  const removePool = useCallback(
    (name: string): string | null => {
      try {
        const next = removeLocalPool(localPools, name);
        saveLocalPools(next);
        setLocalPools(next);
        // Removing the selected pool falls back to the default selection.
        if (selectedOverride?.name === name) setSelectedOverride(null);
        pushLog({ ok: true, label: `Removed pool "${name}" from this browser` });
        return null;
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : String(cause);
        pushLog({ ok: false, label: `Remove pool "${name}" failed`, detail: message });
        return message;
      }
    },
    [localPools, selectedOverride, pushLog],
  );

  // ── pool switching (reconnect the same wallet against another contract) ──
  const switchPool = useCallback(
    async (name: string, contract: string) => {
      if (!amm || switching !== null) return;
      if (name === selected.name && contract.toLowerCase() === selected.contract.toLowerCase()) return;
      setSwitching(name);
      setError(null);
      try {
        const next = await connectWallet({
          contractAddress: contract as ContractAddress,
          walletKey: amm.wallet.key,
        });
        setAmm(next);
        setSelectedOverride({ name, contract });
        // Drop the previous pool's state before reading the new contract's.
        setPool(null);
        setPoolError(null);
        setPoolUpdatedAt(null);
        setBalance(null);
        setBalanceError(null);
        setPaused(null);
        setPausedError(null);
        setVaultTick((tick) => tick + 1);
        void loadPool(next);
        void loadBalance(next);
        void loadPaused(next);
        pushLog({ ok: true, label: `Switched to pool "${name}"`, detail: truncHex(contract, 12, 8) });
      } catch (cause) {
        const appError = toAppError(cause);
        setError(appError);
        pushLog({ ok: false, label: `Switch to pool "${name}" failed`, detail: appError.message, raw: appError.raw });
      } finally {
        setSwitching(null);
      }
    },
    [amm, switching, selected, loadPool, loadBalance, loadPaused, pushLog],
  );

  const handleCopy = useCallback(async (text: string) => {
    if (await copyText(text)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, []);

  const headerPool: HeaderPool | null = amm ? selected : null;

  // ── render: connect screen ───────────────────────────────────────────────
  if (!amm) {
    return (
      <div className="app">
        <Header
          amm={null}
          connecting={connecting}
          elapsed={elapsed}
          wallets={wallets}
          pool={null}
          copied={copied}
          onRescan={doRescan}
          onCopyContract={() => void handleCopy(CONTRACT_ADDRESS)}
        />

        {error && <ErrorBanner error={error} onClose={() => setError(null)} />}

        <ConnectScreen
          wallets={wallets}
          connecting={connecting}
          elapsed={elapsed}
          walletScanError={walletScanError}
          copied={copied}
          onConnect={(walletKey) => void doConnect(walletKey)}
          onRescan={doRescan}
          onCopyContract={() => void handleCopy(CONTRACT_ADDRESS)}
        />
      </div>
    );
  }

  // ── render: connected dashboard ──────────────────────────────────────────
  return (
    <div className="app">
      <Header
        amm={amm}
        connecting={connecting}
        elapsed={elapsed}
        wallets={wallets}
        pool={headerPool}
        copied={copied}
        onRescan={doRescan}
        onCopyContract={() => void handleCopy(selected.contract)}
      />

      {error && <ErrorBanner key={error.raw} error={error} onClose={() => setError(null)} />}
      {info && !error && (
        <div className="banner banner-info" data-testid="banner-info">
          <span>
            {info.label}
            {info.detail ? ` · ${info.detail}` : ''}
            {info.txId ? ` · tx ${truncHex(info.txId, 12, 8)}` : ''}
          </span>
          <button onClick={() => setInfo(null)}>✕</button>
        </div>
      )}

      <TabNav tab={tab} onTab={setTab} disabled={busy !== null} />

      <main className="layout">
        {tab === 'swap' && (
          <SwapTab
            {...actionContext}
            amm={amm}
            pool={pool}
            poolError={poolError}
            poolUpdatedAt={poolUpdatedAt}
            balance={balance}
            balanceError={balanceError}
            paused={paused}
            pausedError={pausedError}
            vaultTick={vaultTick}
            refreshers={refreshers}
            onNavigate={setTab}
          />
        )}
        {tab === 'pools' && (
          <PoolsTab
            {...actionContext}
            amm={amm}
            registry={displayRegistry}
            selected={selected}
            switching={switching}
            paused={paused}
            pausedError={pausedError}
            localNames={localNames}
            onSwitchPool={(name, contract) => void switchPool(name, contract)}
            onReloadRegistry={reloadRegistry}
            onPausedChanged={setPaused}
            onRefreshPool={() => loadPool()}
            onAddPool={addPool}
            onRemovePool={removePool}
          />
        )}
        {tab === 'liquidity' && (
          <LiquidityTab
            {...actionContext}
            amm={amm}
            pool={pool}
            balance={balance}
            paused={paused}
            refreshers={refreshers}
            onNavigate={setTab}
          />
        )}
        {tab === 'mint' && (
          <MintTab {...actionContext} amm={amm} pool={pool} refreshers={refreshers} onNavigate={setTab} />
        )}

        <ActivityLog log={log} />
      </main>

      <footer className="footer">
        <span>
          Shielded constant-product AMM · all logic in <code>api/</code> · {NETWORK_ID} · dry-run until confirmed
        </span>
      </footer>
    </div>
  );
}
