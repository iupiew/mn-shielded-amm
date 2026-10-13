import { truncHex } from '../lib/format';
import { NETWORK_ID, type BrowserAmm, type WalletInfo } from '../lib/wallet';

export interface HeaderPool {
  readonly name: string;
  readonly contract: string;
}

interface HeaderProps {
  readonly amm: BrowserAmm | null;
  readonly connecting: boolean;
  readonly elapsed: number;
  readonly wallets: WalletInfo[];
  /** Selected pool chip — connected view only (`null` hides it). */
  readonly pool: HeaderPool | null;
  readonly copied: boolean;
  readonly onRescan: () => void;
  readonly onCopyContract: () => void;
}

export function Header({ amm, connecting, elapsed, wallets, pool, copied, onRescan, onCopyContract }: HeaderProps) {
  const walletChip = (() => {
    if (connecting) {
      return (
        <div className="chip muted" data-testid="connecting-badge">
          <span className="spinner" />
          Connecting…{elapsed > 0 ? ` · ${elapsed}s` : ''}
        </div>
      );
    }
    if (amm) {
      return (
        <div className="chip" data-testid="wallet-chip" title={`rdns: ${amm.wallet.rdns} · apiVersion: ${amm.wallet.apiVersion}`}>
          <span className="dot dot-green" />
          {amm.wallet.name}
        </div>
      );
    }
    if (wallets.length > 0) {
      return (
        <div className="chip muted" data-testid="wallets-detected">
          {wallets.length} wallet{wallets.length > 1 ? 's' : ''} detected
        </div>
      );
    }
    return (
      <button className="chip chip-error" onClick={onRescan} data-testid="no-wallets-chip" title="Rescan window.midnight">
        <span className="dot dot-red" />
        No wallet — rescan
      </button>
    );
  })();

  return (
    <header className="header">
      <div className="brand">
        <span className="brand-mark">◈</span>
        <span className="brand-name">Midnight AMM</span>
      </div>
      <div className="header-right">
        <div className="chip muted" title="Midnight network">
          {NETWORK_ID}
        </div>
        {pool && (
          <button
            className="chip chip-contract"
            onClick={onCopyContract}
            title={`Copy contract address: ${pool.contract}`}
            data-testid="copy-contract"
          >
            <span className="pool-chip-name">{pool.name}</span>
            <span className="mono">{truncHex(pool.contract, 12, 8)}</span>
            <span>{copied ? '✓' : '⎘'}</span>
          </button>
        )}
        {walletChip}
      </div>
    </header>
  );
}
