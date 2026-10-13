export type Tab = 'swap' | 'pools' | 'liquidity' | 'mint';

const TABS: readonly { readonly id: Tab; readonly label: string }[] = [
  { id: 'swap', label: 'Swap' },
  { id: 'pools', label: 'Pools' },
  { id: 'liquidity', label: 'Liquidity' },
  { id: 'mint', label: 'Mint' },
];

interface TabNavProps {
  readonly tab: Tab;
  readonly onTab: (tab: Tab) => void;
  readonly disabled: boolean;
}

export function TabNav({ tab, onTab, disabled }: TabNavProps) {
  return (
    <nav className="tab-nav" role="tablist" aria-label="Sections">
      {TABS.map((entry) => (
        <button
          key={entry.id}
          role="tab"
          aria-selected={tab === entry.id}
          className={`tab-btn ${tab === entry.id ? 'active' : ''}`}
          onClick={() => onTab(entry.id)}
          disabled={disabled}
          data-testid={`tab-${entry.id}`}
        >
          {entry.label}
        </button>
      ))}
    </nav>
  );
}
