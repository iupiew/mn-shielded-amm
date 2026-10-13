import { useState } from 'react';
import { copyText, fmtDate, truncHex } from '../lib/format';
import { isSupportedPool, type RegistryState } from '../lib/pools';
import type { ActionContext } from '../lib/actions';
import type { BrowserAmm } from '../lib/wallet';

export interface PoolSelection {
  readonly name: string;
  readonly contract: string;
}

const DEPLOY_COMMAND = 'node cli/src/cli.ts --network-id preprod pools deploy <name>';

interface PoolsTabProps extends ActionContext {
  readonly amm: BrowserAmm;
  readonly registry: RegistryState;
  readonly selected: PoolSelection;
  /** Name of the pool currently being connected to (switch in flight). */
  readonly switching: string | null;
  readonly paused: boolean | null;
  readonly pausedError: string | null;
  /** Names registered in this browser (localStorage) — shown with a badge + remove. */
  readonly localNames: ReadonlySet<string>;
  readonly onSwitchPool: (name: string, contract: string) => void;
  readonly onReloadRegistry: () => void;
  readonly onPausedChanged: (paused: boolean) => void;
  readonly onRefreshPool: () => Promise<void>;
  /** Validate + persist a browser-local pool; null on success, else an error message. */
  readonly onAddPool: (name: string, contract: string) => string | null;
  /** Remove a browser-local pool; null on success, else an error message. */
  readonly onRemovePool: (name: string) => string | null;
}

export function PoolsTab(props: PoolsTabProps) {
  const { registry, selected, switching, paused, pausedError, onSwitchPool, onReloadRegistry, amm, localNames } = props;
  const { onPausedChanged, onRefreshPool, runAction, raiseError, busy, elapsed, onAddPool, onRemovePool } = props;
  const [pausePlan, setPausePlan] = useState<'pause' | 'unpause' | null>(null);
  const [cmdCopied, setCmdCopied] = useState(false);
  const [newName, setNewName] = useState('');
  const [newContract, setNewContract] = useState('');
  const [addFormError, setAddFormError] = useState<string | null>(null);

  const pausedNow = paused === true;

  const doSwitch = (entry: PoolSelection) => {
    if (entry.name === selected.name && entry.contract.toLowerCase() === selected.contract.toLowerCase()) return;
    onSwitchPool(entry.name, entry.contract);
  };

  const doCopyCommand = async () => {
    if (await copyText(DEPLOY_COMMAND)) {
      setCmdCopied(true);
      setTimeout(() => setCmdCopied(false), 2000);
    }
  };

  const doAdd = () => {
    const error = onAddPool(newName.trim(), newContract.trim());
    if (error) {
      setAddFormError(error);
      return;
    }
    setAddFormError(null);
    setNewName('');
    setNewContract('');
  };

  const doRemove = (entry: PoolSelection) => {
    const error = onRemovePool(entry.name);
    if (error) raiseError(error);
  };

  const doPausePreview = (target: boolean) => {
    if (paused === null) {
      raiseError(pausedError ?? 'Pause state has not loaded yet — try again in a moment.');
      return;
    }
    if (paused === target) {
      raiseError(`Pool is already ${target ? 'paused' : 'running'}.`);
      return;
    }
    setPausePlan(target ? 'pause' : 'unpause');
  };

  const doPauseConfirm = () => {
    const target = pausePlan === 'pause';
    void runAction(target ? 'Pausing…' : 'Unpausing…', async () => {
      const txId = target ? await amm.api.pause() : await amm.api.unpause();
      onPausedChanged(target);
      setPausePlan(null);
      await onRefreshPool();
      return { label: `Pool ${target ? 'paused' : 'unpaused'}`, txId };
    });
  };

  const poolCount = registry.status === 'ok' ? registry.pools.length : 0;

  return (
    <>
      <div className="col">
        <section className="card" data-testid="pools-card">
          <div className="card-head">
            <h2>
              <span data-testid="pools-count">{poolCount} pool{poolCount === 1 ? '' : 's'}</span>
            </h2>
            <button className="btn btn-ghost btn-sm" onClick={onReloadRegistry} disabled={registry.status === 'loading'}>
              Refresh
            </button>
          </div>

          {registry.status === 'loading' && (
            <div className="empty">
              <span className="spinner" /> Loading pool registry…
            </div>
          )}
          {registry.status === 'error' && (
            <div className="empty" data-testid="pools-empty">
              <span>No pools found — {registry.message}.</span>
              <button className="btn btn-secondary btn-sm" onClick={onReloadRegistry}>
                Retry
              </button>
            </div>
          )}
          {registry.status === 'ok' && poolCount === 0 && (
            <div className="empty" data-testid="pools-empty">
              Registry is empty — deploy a pool with the CLI below.
            </div>
          )}
          {registry.status === 'ok' && poolCount > 0 && (
            <div className="pool-list">
              <div className="pool-list-head dim small">
                <span>Name</span>
                <span>Contract</span>
                <span>Added</span>
                <span>Network</span>
              </div>
              {registry.pools.map((entry) => {
                const supported = isSupportedPool(entry);
                const isCustom = localNames.has(entry.name);
                const isSelected =
                  entry.name === selected.name && entry.contract.toLowerCase() === selected.contract.toLowerCase();
                const isSwitching = switching === entry.name;
                const body = (
                  <>
                    <span className="pool-row-name">
                      {entry.name}
                      {isCustom && (
                        <span className="badge badge-grey" data-testid={`custom-badge-${entry.name}`}>
                          custom
                        </span>
                      )}
                      {isSelected && <span className="badge badge-green pool-row-selected">selected</span>}
                      {isSwitching && (
                        <span className="dim small">
                          <span className="spinner" /> switching…
                        </span>
                      )}
                    </span>
                    <span className="pool-row-contract mono" title={entry.contract}>
                      {truncHex(entry.contract, 12, 8)}
                    </span>
                    <span className="pool-row-date dim small">{fmtDate(entry.addedAt)}</span>
                    <span className={`badge ${supported ? 'badge-green' : 'badge-grey'}`}>
                      {supported ? (entry.networkId ?? 'preprod') : (entry.networkId ?? 'unknown')}
                    </span>
                  </>
                );
                if (!supported) {
                  return (
                    <div
                      key={entry.name}
                      className="pool-row pool-row-unsupported"
                      data-testid={`pool-row-${entry.name}`}
                      title="Unsupported network — this pool cannot be selected"
                    >
                      {body}
                      <span className="pool-row-note dim small">unsupported network — not selectable</span>
                    </div>
                  );
                }
                const rowButton = (
                  <button
                    className={`pool-row ${isSelected ? 'selected' : ''}`}
                    data-testid={`pool-row-${entry.name}`}
                    onClick={() => doSwitch({ name: entry.name, contract: entry.contract })}
                    disabled={switching !== null || busy !== null}
                    title={`Switch to pool "${entry.name}"`}
                  >
                    {body}
                  </button>
                );
                if (!isCustom) {
                  return (
                    <div key={entry.name} className="pool-row-wrap">
                      {rowButton}
                    </div>
                  );
                }
                return (
                  <div key={entry.name} className="pool-row-wrap">
                    {rowButton}
                    <button
                      className="btn btn-ghost btn-sm pool-row-remove"
                      onClick={() => doRemove(entry)}
                      disabled={switching !== null || busy !== null}
                      title={`Remove "${entry.name}" from this browser (the pool contract itself is untouched)`}
                      data-testid={`pool-remove-${entry.name}`}
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          <p className="dim small pools-hint">
            Click a pool to reconnect the wallet against its contract (same wallet, fresh contract state).
          </p>
        </section>

        <section className="card" data-testid="deploy-hint">
          <div className="card-head">
            <h2>Deploy a new pool</h2>
          </div>
          <p className="dim small">Pool creation is CLI-only — the UI never deploys. Run:</p>
          <div className="code-row">
            <code className="mono">{DEPLOY_COMMAND}</code>
            <button className="btn btn-ghost btn-sm" onClick={() => void doCopyCommand()} data-testid="copy-deploy-cmd">
              {cmdCopied ? '✓ copied' : 'Copy'}
            </button>
          </div>
          <p className="dim small">
            Deployments register in <code>pools.json</code>, which the build copies into the UI (scripts/sync-ui-zk.mjs).
          </p>
        </section>

        <section className="card" data-testid="add-pool-card">
          <div className="card-head">
            <h2>Register an existing pool</h2>
          </div>
          <p className="dim small">
            Add a deployed pool contract by address — saved in <em>this browser only</em> (the repo&apos;s pools.json is
            untouched).
          </p>
          <label className="field">
            <span>Name</span>
            <span className="input-wrap">
              <input
                className="input mono"
                placeholder="e.g. my-pool"
                value={newName}
                onChange={(event) => setNewName(event.target.value.trim().toLowerCase())}
                disabled={busy !== null}
                data-testid="add-pool-name"
              />
            </span>
          </label>
          <label className="field">
            <span>Contract address (64 hex)</span>
            <span className="input-wrap">
              <input
                className="input mono"
                placeholder="e.g. 2f557cf5…"
                value={newContract}
                onChange={(event) => setNewContract(event.target.value.trim())}
                disabled={busy !== null}
                data-testid="add-pool-contract"
              />
            </span>
          </label>
          {addFormError && (
            <span className="err-text" data-testid="add-pool-error">
              {addFormError}
            </span>
          )}
          <div className="btn-row">
            <button
              className="btn btn-primary"
              onClick={doAdd}
              disabled={busy !== null || newName === '' || newContract === ''}
              data-testid="add-pool-submit"
            >
              Add pool
            </button>
          </div>
        </section>
      </div>

      <div className="col">
        <section className="card" data-testid="admin-card">
          <div className="card-head">
            <h2>Admin — {selected.name}</h2>
            <div className="badges">
              {paused === null && <span className="badge badge-amber">checking…</span>}
              {pausedNow && (
                <span className="badge badge-red" data-testid="paused-badge">
                  paused
                </span>
              )}
              {paused === false && (
                <span className="badge badge-green" data-testid="live-badge">
                  running
                </span>
              )}
            </div>
          </div>
          <p className="dim small">
            Pause halts swaps, faucet and LP operations for this pool. Pause/unpause are owner-only circuits — they
            only pass from the deployer&apos;s wallet.
          </p>
          <div className="btn-row">
            <button
              className="btn btn-secondary"
              onClick={() => doPausePreview(true)}
              disabled={busy !== null || paused === null || pausedNow}
              data-testid="pause-preview"
            >
              Pause pool
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => doPausePreview(false)}
              disabled={busy !== null || paused === null || paused === false}
              data-testid="unpause-preview"
            >
              Unpause pool
            </button>
          </div>
          {pausedError && <span className="err-text">{pausedError}</span>}
          {pausePlan && (
            <div className="actions">
              <div className="plan" data-testid="confirm-plan">
                {pausePlan === 'pause'
                  ? `Pause the pool (currently running) — swaps and faucet will be rejected until unpaused.`
                  : `Unpause the pool (currently paused) — trading resumes immediately.`}
              </div>
              <div className="btn-row">
                <button className="btn btn-ghost" onClick={() => setPausePlan(null)} disabled={busy !== null}>
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={doPauseConfirm}
                  disabled={busy !== null}
                  data-testid="confirm-run"
                >
                  {busy ? (
                    <>
                      <span className="spinner" /> {busy} · {elapsed}s
                    </>
                  ) : pausePlan === 'pause' ? (
                    'Confirm pause'
                  ) : (
                    'Confirm unpause'
                  )}
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
