import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Parity between cli/src/cli.ts and docs/cli-schema.md:
 * - every command the parser dispatches is documented;
 * - every flag the parser accepts is documented;
 * - the doc's Flags section lists no flag the parser rejects.
 */

const cliSource = readFileSync(new URL('../src/cli.ts', import.meta.url), 'utf8');
const doc = readFileSync(new URL('../../docs/cli-schema.md', import.meta.url), 'utf8');

const dispatchCommands = [...cliSource.matchAll(/case '([a-z-]+)':/g)].map((m) => m[1]);

function parserFlags(name: 'VALUE_FLAGS' | 'BOOL_FLAGS'): string[] {
  const match = cliSource.match(new RegExp(`${name} = new Set\\(\\[([^\\]]*)\\]\\)`));
  if (!match) throw new Error(`${name} not found in cli.ts`);
  return [...match[1].matchAll(/'([a-z-]+)'/g)].map((m) => m[1]);
}

const valueFlags = parserFlags('VALUE_FLAGS');
const boolFlags = parserFlags('BOOL_FLAGS');
const knownFlags = new Set([...valueFlags, ...boolFlags, 'help']);

const flagsSection = doc.match(/## Flags\n([\s\S]*?)\n## /)?.[1] ?? '';
const documentedFlags = [...flagsSection.matchAll(/--([a-z][a-z-]*)/g)].map((m) => m[1]);

describe('cli.ts ↔ docs/cli-schema.md parity', () => {
  it('extracts a non-trivial dispatch table and flag sets from the source', () => {
    expect(dispatchCommands.length).toBeGreaterThanOrEqual(12);
    expect(valueFlags.length).toBeGreaterThanOrEqual(9);
    expect(boolFlags.length).toBeGreaterThanOrEqual(6);
  });

  it('documents every dispatched command', () => {
    const missing = dispatchCommands.filter((name) => !doc.includes(name));
    expect(missing, `commands missing from docs/cli-schema.md: ${missing.join(', ')}`).toEqual([]);
  });

  it('documents every parser flag', () => {
    const missing = knownFlags.size === 0 ? [] : [...knownFlags].filter((f) => !doc.includes(`--${f}`));
    expect(missing, `flags missing from docs/cli-schema.md: ${missing.join(', ')}`).toEqual([]);
  });

  it('Flags section lists only flags the parser accepts', () => {
    expect(flagsSection, '## Flags section not found in docs/cli-schema.md').not.toBe('');
    const phantom = documentedFlags.filter((f) => !knownFlags.has(f));
    expect(phantom, `phantom flags in the schema doc: ${phantom.map((f) => `--${f}`).join(', ')}`).toEqual([]);
  });
});
