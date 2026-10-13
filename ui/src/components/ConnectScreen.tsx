import { CONTRACT_ADDRESS, NETWORK_ID, type WalletInfo } from '../lib/wallet';
import { truncHex } from '../lib/format';

interface ConnectScreenProps {
  readonly wallets: WalletInfo[];
  readonly connecting: boolean;
  readonly elapsed: number;
  readonly walletScanError: string | null;
  readonly copied: boolean;
  readonly onConnect: (walletKey: string) => void;
  readonly onRescan: () => void;
  readonly onCopyContract: () => void;
}

/** Pre-connect screen: wallet discovery + connect. Rendered by App below the header. */
export function ConnectScreen({
  wallets,
  connecting,
  elapsed,
  walletScanError,
  copied,
  onConnect,
  onRescan,
  onCopyContract,
}: ConnectScreenProps) {
  return (
    <>
      <main className="layout layout-center">
        <section className="card card-connect" data-testid="connect-card">
          <div className="card-head">
            <h2>Connect a Midnight wallet</h2>
          </div>
          {connecting ? (
            <div className="empty">
              <span className="spinner" />
              <p>
                Connecting to the deployed pool on {NETWORK_ID} — fetching contract state and deriving pool colors
                locally (no proving needed).
              </p>
              {elapsed > 0 && (
                <p className="dim small" data-testid="connect-elapsed">
                  {elapsed}s elapsed — still fetching contract state.
                </p>
              )}
            </div>
          ) : wallets.length === 0 ? (
            <div className="empty" data-testid="no-wallets">
              <p>{walletScanError ?? 'No Midnight wallet detected yet.'}</p>
              <p className="dim small">
                Install the 1AM extension (https://1am.xyz), create or unlock a wallet, then reload. Scanning{' '}
                <code>window.midnight</code> every 500&nbsp;ms…
              </p>
              <button className="btn btn-secondary" onClick={onRescan} data-testid="rescan-btn">
                Rescan
              </button>
            </div>
          ) : (
            <>
              <div className="wallet-list" data-testid="wallet-list">
                {wallets.map((w) => (
                  <div className="wallet-row" key={w.key}>
                    <div className="wallet-meta">
                      <span className="wallet-name">{w.name}</span>
                      <span className="dim small">
                        {w.rdns} · api {w.apiVersion}
                      </span>
                    </div>
                    <button
                      className="btn btn-primary"
                      onClick={() => onConnect(w.key)}
                      data-testid="connect-wallet"
                      title={`Connect ${w.name}`}
                    >
                      Connect
                    </button>
                  </div>
                ))}
              </div>
              <p className="dim small">
                Connecting reads the deployed pool contract on {NETWORK_ID} locally (colors derived, reserves and
                pause flag from state). Owner-only circuits (pause/unpause) require the deployer wallet.
              </p>
            </>
          )}
          <div className="card-foot">
            <span className="dim small">
              contract <span className="mono">{truncHex(CONTRACT_ADDRESS, 12, 8)}</span>
            </span>
            <button className="btn btn-ghost btn-sm" onClick={onCopyContract} data-testid="copy-contract">
              {copied ? '✓ copied' : 'Copy address'}
            </button>
          </div>
        </section>
      </main>

      <footer className="footer">
        <span>
          Shielded constant-product AMM · all logic in <code>api/</code> · preprod
        </span>
      </footer>
    </>
  );
}
