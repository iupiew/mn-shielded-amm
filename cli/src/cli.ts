#!/usr/bin/env node
/**
 * mn-amm — thin CLI over the AMM api/ (M4).
 *
 * All logic lives in the api workspace; this file only parses arguments,
 * calls the api, and formats output. Mutating commands are dry-run by
 * default and require --execute (explicit execution flag).
 *
 * Node >= 24 runs this TypeScript file directly (type stripping); it must
 * contain only erasable syntax and no relative imports.
 */

type Flags = Map<string, string | true>;

const VALUE_FLAGS = new Set([
  'contract',
  'wallet',
  'network-id',
  'slippage-bps',
  'amount-a',
  'amount-b',
]);
const BOOL_FLAGS = new Set(['execute', 'json', 'no-sync', 'mint', 'help']);

class UsageError extends Error {}

const HELP = `mn-amm — Midnight shielded AMM CLI (thin wrapper over api/)

Usage: mn-amm <command> [options]

Commands:
  pool-state                     show reserves, colors, pause flag
  balance                        wallet coins split by pool color
  quote <side> <amount>          price a swap (side: AtoB | BtoA; amount in atomic units)
  swap <side> <amount>           quote + coin plan; add --execute to submit
  faucet [--amount-a N] [--amount-b N]
                                 mint devnet coins; add --execute to submit
  seed --mint                    faucet(1M,1M) then seed the pool; add --execute
  pause | unpause                admin pause control; add --execute to submit

Options:
  --contract <hex>               pool contract address (or AMM_CONTRACT env) [required]
  --wallet <name>                wallet name (default: devnet-main)
  --network-id <id>              network id (default: undeployed)
  --slippage-bps <n>             quote/swap slippage in basis points 0-10000 (default: 0)
  --amount-a <n> --amount-b <n>  faucet mint amounts in atomic units (default: 1000000)
  --no-sync                      read wallet coin cache without refreshing it first
  --execute                      actually submit (mutating commands are dry-run by default)
  --json                         machine-readable output
  -h, --help                     show this help

Exit codes: 0 ok · 1 internal error · 2 usage error · 3 AMM error (code in --json)
Notes: amounts are atomic units; views/txs take seconds each on a local devnet.
`;

function parseArgv(argv: string[]): { flags: Flags; positional: string[] } {
  const flags: Flags = new Map();
  const positional: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--') {
      positional.push(...argv.slice(i + 1));
      break;
    }
    if (arg === '-h') {
      flags.set('help', true);
      continue;
    }
    if (arg.startsWith('--')) {
      const eq = arg.indexOf('=');
      const name = eq === -1 ? arg.slice(2) : arg.slice(2, eq);
      const inline = eq === -1 ? undefined : arg.slice(eq + 1);
      if (VALUE_FLAGS.has(name)) {
        const value = inline ?? argv[++i];
        if (value === undefined) throw new UsageError(`flag --${name} needs a value`);
        flags.set(name, value);
      } else if (BOOL_FLAGS.has(name)) {
        if (inline !== undefined) throw new UsageError(`flag --${name} takes no value`);
        flags.set(name, true);
      } else {
        throw new UsageError(`unknown flag --${name} (see --help)`);
      }
      continue;
    }
    positional.push(arg);
  }
  return { flags, positional };
}

function flagStr(flags: Flags, name: string): string | undefined {
  const value = flags.get(name);
  return typeof value === 'string' ? value : undefined;
}

function parseUint(name: string, raw: string | undefined): bigint {
  if (raw === undefined) throw new UsageError(`missing <${name}> argument (see --help)`);
  if (!/^\d+$/.test(raw)) throw new UsageError(`<${name}> must be a non-negative integer (atomic units), got: ${raw}`);
  const value = BigInt(raw);
  if (value <= 0n) throw new UsageError(`<${name}> must be positive, got: ${raw}`);
  return value;
}

function parseSlippage(flags: Flags): number {
  const raw = flagStr(flags, 'slippage-bps');
  if (raw === undefined) return 0;
  if (!/^\d+$/.test(raw)) throw new UsageError(`--slippage-bps must be an integer 0-10000, got: ${raw}`);
  const bps = Number(raw);
  if (bps > 10000) throw new UsageError(`--slippage-bps must be within 0-10000, got: ${raw}`);
  return bps;
}

function parseSide(raw: string | undefined): 'AtoB' | 'BtoA' {
  if (raw === undefined) throw new UsageError('missing <side> argument (AtoB | BtoA)');
  const normalized = raw.toLowerCase();
  if (normalized === 'atob' || normalized === 'a->b') return 'AtoB';
  if (normalized === 'btoa' || normalized === 'b->a') return 'BtoA';
  throw new UsageError(`invalid <side> "${raw}" (expected AtoB or BtoA)`);
}

function parseContract(flags: Flags): string {
  const contract = flagStr(flags, 'contract') ?? process.env.AMM_CONTRACT;
  if (!contract) throw new UsageError('missing --contract <address> (or set AMM_CONTRACT)');
  if (!/^[0-9a-fA-F]{64}$/.test(contract)) throw new UsageError(`--contract must be 64 hex chars, got: ${contract}`);
  return contract;
}

function bytesToHex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('hex');
}

interface RawCoin {
  nonce: Uint8Array;
  color: Uint8Array;
  value: bigint;
}

function fmtCoin(coin: RawCoin): { nonceHex: string; colorHex: string; value: bigint } {
  return { nonceHex: bytesToHex(coin.nonce), colorHex: bytesToHex(coin.color), value: coin.value };
}

function bigintReplacer(_key: string, value: unknown): unknown {
  return typeof value === 'bigint' ? value.toString() : value;
}

function printHuman(payload: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(payload)) {
    if (Array.isArray(value)) {
      console.log(`${key}:`);
      for (const item of value) console.log(`  - ${typeof item === 'object' ? JSON.stringify(item, bigintReplacer) : String(item)}`);
    } else if (value !== null && typeof value === 'object') {
      console.log(`${key}: ${JSON.stringify(value, bigintReplacer)}`);
    } else {
      console.log(`${key}: ${typeof value === 'bigint' ? value.toString() : String(value)}`);
    }
  }
}

function emit(json: boolean, payload: Record<string, unknown>): void {
  if (json) console.log(JSON.stringify({ ok: true, ...payload }, bigintReplacer, 2));
  else printHuman(payload);
}

async function main(): Promise<number> {
  const { flags, positional } = parseArgv(process.argv.slice(2));
  const json = flags.has('json');
  const command = positional[0];

  if (flags.has('help') || command === undefined || command === 'help') {
    console.log(HELP);
    return 0;
  }

  // Dynamic import: a missing build gets a clear message instead of a module stack.
  let createNodeAmm: typeof import('@midnight-ntwrk/leaderboard-api/dist/api/src/amm/node.js').createNodeAmm;
  try {
    ({ createNodeAmm } = await import('@midnight-ntwrk/leaderboard-api/dist/api/src/amm/node.js'));
  } catch (cause) {
    throw new Error(`cannot load api build (run: npm run build -w api): ${cause instanceof Error ? cause.message : String(cause)}`);
  }

  const contract = parseContract(flags);
  const connect = () =>
    createNodeAmm({
      contractAddress: contract,
      wallet: flagStr(flags, 'wallet') ?? 'devnet-main',
      networkId: flagStr(flags, 'network-id') ?? 'undeployed',
      syncWallet: !flags.has('no-sync'),
    });

  switch (command) {
    case 'pool-state': {
      const { api, close } = await connect();
      try {
        const state = await api.poolState();
        const paused = await api.isPaused();
        emit(json, {
          command,
          contract,
          reserveA: state.reserveA,
          reserveB: state.reserveB,
          seeded: state.seeded,
          colorAHex: state.colorAHex,
          colorBHex: state.colorBHex,
          paused,
        });
      } finally {
        close();
      }
      return 0;
    }

    case 'balance': {
      const { api, close } = await connect();
      try {
        const balance = await api.balance();
        emit(json, {
          command,
          contract,
          totalA: balance.totalA,
          totalB: balance.totalB,
          coinA: balance.coinA,
          coinB: balance.coinB,
          otherCoins: balance.otherCoins,
        });
      } finally {
        close();
      }
      return 0;
    }

    case 'quote': {
      const side = parseSide(positional[1]);
      const amountIn = parseUint('amount', positional[2]);
      const slippageBps = parseSlippage(flags);
      const { api, close } = await connect();
      try {
        const quote = await api.quote(side, amountIn, slippageBps);
        emit(json, { command, contract, slippageBps, ...quote });
      } finally {
        close();
      }
      return 0;
    }

    case 'swap': {
      const side = parseSide(positional[1]);
      const amountIn = parseUint('amount', positional[2]);
      const slippageBps = parseSlippage(flags);
      const execute = flags.has('execute');
      const { api, close } = await connect();
      try {
        const quote = await api.quote(side, amountIn, slippageBps);
        const paused = await api.isPaused();
        if (!execute) {
          const balance = await api.balance();
          const poolCoins = side === 'AtoB' ? balance.coinA : balance.coinB;
          const values = (poolCoins as readonly { value: bigint }[]).map((c) => c.value);
          emit(json, {
            command,
            contract,
            dryRun: true,
            executeHint: 'add --execute to submit this swap',
            paused,
            quote,
            slippageBps,
            exactCoinAvailable: values.includes(amountIn),
            availableValues: values,
          });
          return 0;
        }
        const result = await api.swap({ side, amountIn, slippageBps });
        emit(json, { command, contract, txId: result.txId, quote: result.quote, coin: result.coin });
      } finally {
        close();
      }
      return 0;
    }

    case 'faucet': {
      const amountA = parseUint('--amount-a', flagStr(flags, 'amount-a') ?? '1000000');
      const amountB = parseUint('--amount-b', flagStr(flags, 'amount-b') ?? '1000000');
      const execute = flags.has('execute');
      const { api, close } = await connect();
      try {
        const paused = await api.isPaused();
        if (!execute) {
          emit(json, {
            command,
            contract,
            dryRun: true,
            executeHint: 'add --execute to submit this mint',
            paused,
            wouldMint: { amountA, amountB },
          });
          return 0;
        }
        const [coinA, coinB] = await api.faucet({ amountA, amountB });
        emit(json, { command, contract, coinA: fmtCoin(coinA), coinB: fmtCoin(coinB) });
      } finally {
        close();
      }
      return 0;
    }

    case 'seed': {
      if (!flags.has('mint')) {
        throw new UsageError('seed: the CLI supports only "seed --mint" (faucet 1M/1M then seed); use api/ directly for custom coin pairs');
      }
      const execute = flags.has('execute');
      const { api, close } = await connect();
      try {
        const paused = await api.isPaused();
        if (!execute) {
          emit(json, {
            command,
            contract,
            dryRun: true,
            executeHint: 'add --execute to submit: faucet(1000000,1000000) then seed',
            paused,
            wouldMint: { amountA: 1000000n, amountB: 1000000n },
          });
          return 0;
        }
        const [coinA, coinB] = await api.faucet();
        const seedTxId = await api.seed(coinA, coinB);
        emit(json, { command, contract, seedTxId, minted: { coinA: fmtCoin(coinA), coinB: fmtCoin(coinB) } });
      } finally {
        close();
      }
      return 0;
    }

    case 'pause':
    case 'unpause': {
      const target = command === 'pause';
      const execute = flags.has('execute');
      const { api, close } = await connect();
      try {
        const current = await api.isPaused();
        if (!execute) {
          emit(json, {
            command,
            contract,
            dryRun: true,
            executeHint: `add --execute to ${command}`,
            currentPaused: current,
            wouldSetPaused: target,
          });
          return 0;
        }
        if (current === target) {
          // Pausable idempotency on repeated ops is unverified — skip instead of re-submitting.
          emit(json, { command, contract, alreadyInState: target, txId: null });
          return 0;
        }
        const txId = target ? await api.pause() : await api.unpause();
        emit(json, { command, contract, txId, paused: target });
      } finally {
        close();
      }
      return 0;
    }

    default:
      throw new UsageError(`unknown command "${command}" (see --help)`);
  }
}

main().then(
  (code) => {
    process.exitCode = code;
  },
  (error: unknown) => {
    const json = process.argv.includes('--json');
    if (error instanceof UsageError) {
      if (json) console.error(JSON.stringify({ ok: false, error: { code: 'USAGE', message: error.message } }));
      else console.error(`usage error: ${error.message}`);
      process.exitCode = 2;
      return;
    }
    const ammCode = (error as { code?: unknown } | null)?.code;
    const isAmm = error instanceof Error && typeof ammCode === 'string' && error.name === 'AmmError';
    if (isAmm) {
      if (json) console.error(JSON.stringify({ ok: false, error: { code: ammCode, message: (error as Error).message } }));
      else console.error(`amm error [${ammCode}]: ${(error as Error).message}`);
      process.exitCode = 3;
      return;
    }
    const message = error instanceof Error ? error.message : String(error);
    if (json) console.error(JSON.stringify({ ok: false, error: { code: 'INTERNAL', message } }));
    else console.error(`error: ${message}`);
    if (error instanceof Error && error.stack && !json) console.error(error.stack.split('\n').slice(1).join('\n'));
    process.exitCode = 1;
  },
);
