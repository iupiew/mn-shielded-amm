interface SlippageControlProps {
  readonly value: string;
  readonly onChange: (bps: string) => void;
  readonly disabled: boolean;
  readonly testid: string;
}

const SLIPPAGE_PRESETS = [
  { label: '0.1%', bps: 10 },
  { label: '0.5%', bps: 50 },
  { label: '1%', bps: 100 },
];

/** Slippage input with friendly % presets (values stay in raw bps, 0–10000). */
export function SlippageControl(props: SlippageControlProps) {
  const { value, onChange, disabled, testid } = props;
  const clamp = (raw: string) => {
    const n = Number(raw);
    if (!Number.isFinite(n)) return '0';
    return String(Math.max(0, Math.min(10000, Math.floor(n))));
  };
  const percent = ((Number(value || '0') || 0) / 100).toFixed(2).replace(/\.?0+$/, '') || '0';

  return (
    <label className="field">
      <span>Slippage tolerance (max % you accept the price to move)</span>
      <div className="slippage-row">
        <div className="slippage-presets" role="group" aria-label="Slippage presets">
          {SLIPPAGE_PRESETS.map((preset) => (
            <button
              key={preset.bps}
              type="button"
              className={`slippage-preset ${value === String(preset.bps) ? 'active' : ''}`}
              onClick={() => onChange(String(preset.bps))}
              disabled={disabled}
              data-testid={`${testid}-preset-${preset.bps}`}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <span className="input-wrap">
          <input
            className="input mono"
            inputMode="numeric"
            value={value}
            onChange={(event) => onChange(clamp(event.target.value.trim()))}
            disabled={disabled}
            data-testid={testid}
          />
          <span className="input-suffix mono">bps ≈ {percent}%</span>
        </span>
      </div>
    </label>
  );
}
