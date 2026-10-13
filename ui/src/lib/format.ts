/** Formatting + small input helpers shared by every tab. */

export function fmtBig(value: string | bigint | undefined): string {
  if (value === undefined || value === '') return '—';
  try {
    return BigInt(value).toLocaleString('en-US');
  } catch {
    return String(value);
  }
}

export function fmtPrice(numerator: bigint, denominator: bigint): string {
  if (denominator === 0n || numerator === 0n) return '—';
  const scaled = (numerator * 1_000_000n) / denominator;
  const whole = scaled / 1_000_000n;
  const frac = (scaled % 1_000_000n).toString().padStart(6, '0').replace(/0+$/, '');
  return frac ? `${whole}.${frac}` : whole.toString();
}

/** Pool-share percentage as `N.NN%` (hundredths resolution, bigint-safe). */
export function fmtShare(part: bigint, whole: bigint): string {
  if (whole <= 0n) return '—';
  const hundredths = (part * 10_000n) / whole;
  return `${hundredths / 100n}.${(hundredths % 100n).toString().padStart(2, '0')}%`;
}

export function fmtDate(iso: string): string {
  if (!iso) return '—';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString();
}

export function truncHex(hex: string, head = 10, tail = 6): string {
  return hex.length <= head + tail + 1 ? hex : `${hex.slice(0, head)}…${hex.slice(-tail)}`;
}

/** Display symbol for a pool token: first 8 chars of its color hex, or a fallback pre-load. */
export function colorSymbol(colorHex: string | undefined, fallback: string): string {
  return colorHex ? colorHex.slice(0, 8) : fallback;
}

export function isValidAmount(raw: string): boolean {
  return /^\d+$/.test(raw) && BigInt(raw) > 0n;
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
