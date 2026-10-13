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
  'pool',
  'wallet',
  'network-id',
  'slippage-bps',
  'amount-a',
  'amount-b',
  'initial-lp',
  'salt',
]);
const BOOL_FLAGS = new Set(['execute', 'json', 'no-sync', 'mint', 'help']);

class UsageError extends Error {}

const HELP = `mn-amm — Midnight shielded AMM CLI (thin wrapper over api/)

Usage: mn-amm <command> [options]

Commands:
  pool-state                     show reserves, colors, pause flag
  balance                        wallet coins split by pool color (preprod:
                                 syncs the live coin cache via midnight balance)
  quote <side> <amount>          price a swap (side: AtoB | BtoA; amount in atomic units)
  swap <side> <amount>           quote + coin plan; add --execute to submit
  faucet [--amount-a N] [--amount-b N]
                                 mint devnet coins; add --execute to submit
   seed --mint [--amount-a N --amount-b N]
                                  faucet then seed the pool (mints initial LP
                                  supply, default floor(sqrt(a*b))); --execute
                                  to submit
   pause | unpause                admin pause control; add --execute to submit
   add-liquidity <amountA> <amountB>
                                  LP deposit; add --execute to submit
   remove-liquidity <shares>      LP withdrawal; add --execute to submit
  pools list                      list named pools from the registry file
  pools add <name> <contract>     register a pool (optional --network-id)
  pools deploy <name>             deploy a new pool contract and register it;
                                 --network-id preprod uses the agent seed +
                                 scripts/preprod-deploy.mjs, otherwise localnet
                                 via mn contract deploy (owner = serve wallet)
  pools remove <name>             unregister a pool

Options:
  --contract <hex>               pool contract address (or AMM_CONTRACT env);
                                 with --network-id preprod it defaults to the
                                 deployed pool
  --pool <name>                  resolve a registered pool name from the
                                 registry (pools.json / AMM_POOLS_FILE);
                                 overridden by --contract
  --wallet <name>                wallet name (localnet: devnet-main; preprod:
                                 coin-cache wallet, default: mn-amm-agent)
  --network-id <id>              undeployed (localnet, default) | preprod (alpha:
                                 agent seed wallet, ProofStation proving, fees
                                 sponsored, live coins from the midnight balance
                                 cache with a file vault fallback)
  --slippage-bps <n>             quote/swap slippage in basis points 0-10000 (default: 0)
  --amount-a <n> --amount-b <n>  faucet mint amounts in atomic units (default: 1000000)
  --no-sync                      (localnet) read wallet coin cache without refreshing it
  --salt <64-hex>                pools deploy: instance salt (default: fresh random)
  --faucet-open                  pools deploy: open the faucet on the new pool
                                 (default: closed)
  --execute                      actually submit (mutating commands are dry-run by default)
  --json                         machine-readable output
  -h, --help                     show this help

Exit codes: 0 ok · 1 internal error · 2 usage error · 3 AMM error (code in --json)
Notes: amounts are atomic units; views/txs take seconds each on a local devnet.
  Preprod (alpha): status/quote reads are fast (colors derived locally,
  reserves/pause from state); mutating commands (faucet/seed/swap) prove and
  can take minutes under proof-server load. Keys come from
  .spike/agent-seed-export.json (AMM_SEED_PATH), and minted coins persist in
  ~/.mn-amm/preprod-vault.json (AMM_VAULT_PATH).
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

/** Floor integer sqrt — display-only mirror of api math for dry-run output. */
function floorSqrtApprox(value: bigint): bigint {
  if (value < 2n) return value;
  let x = value;
  let y = (x + 1n) / 2n;
  while (y < x) {
    x = y;
    y = (x + value / x) / 2n;
  }
  return x;
}

async function parseContract(flags: Flags, defaultAddress?: string): Promise<string> {
  const explicit = flagStr(flags, 'contract');
  if (explicit) {
    if (!/^[0-9a-fA-F]{64}$/.test(explicit)) throw new UsageError(`--contract must be 64 hex chars, got: ${explicit}`);
    return explicit;
  }
  const poolName = flagStr(flags, 'pool');
  if (poolName) {
    try {
      const { resolvePool } = await import('@midnight-ntwrk/leaderboard-api/dist/api/src/amm/registry.js');
      return resolvePool(poolName).contract;
    } catch (cause) {
      throw new UsageError(cause instanceof Error ? cause.message : String(cause));
    }
  }
  const contract = process.env.AMM_CONTRACT ?? defaultAddress;
  if (!contract) throw new UsageError('missing --contract <address>, --pool <name>, or AMM_CONTRACT env');
  if (!/^[0-9a-fA-F]{64}$/.test(contract)) throw new UsageError(`contract address must be 64 hex chars, got: ${contract}`);
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
  let createPreprodAmm: typeof import('@midnight-ntwrk/leaderboard-api/dist/api/src/amm/preprod.js').createPreprodAmm;
  let DEFAULT_PREPROD_CONTRACT: string;
  try {
    ({ createNodeAmm } = await import('@midnight-ntwrk/leaderboard-api/dist/api/src/amm/node.js'));
    ({ createPreprodAmm, DEFAULT_PREPROD_CONTRACT } = await import('@midnight-ntwrk/leaderboard-api/dist/api/src/amm/preprod.js'));
  } catch (cause) {
    throw new Error(`cannot load api build (run: npm run build -w api): ${cause instanceof Error ? cause.message : String(cause)}`);
  }

  const networkId = flagStr(flags, 'network-id') ?? process.env.AMM_NETWORK_ID ?? 'undeployed';
  const isPreprod = networkId === 'preprod';
  // `pools` manages the registry file only — no contract needed.
  const contract =
    command === 'pools' ? '' : await parseContract(flags, isPreprod ? DEFAULT_PREPROD_CONTRACT : undefined);

  interface ConnectedAmm {
    api: Awaited<ReturnType<typeof createPreprodAmm>>['api'];
    close: () => void;
    /** Present on preprod: persistent file vault — record faucet coins, consume swap inputs. */
    vault?: Awaited<ReturnType<typeof createPreprodAmm>>['vault'];
  }
  const connect = async (): Promise<ConnectedAmm> => {
    if (isPreprod) {
      return createPreprodAmm({ contractAddress: contract, wallet: flagStr(flags, 'wallet') });
    }
    const node = await createNodeAmm({
      contractAddress: contract,
      wallet: flagStr(flags, 'wallet') ?? 'devnet-main',
      networkId,
      syncWallet: !flags.has('no-sync'),
    });
    return { api: node.api, close: node.close };
  };

  switch (command) {
    case 'pools': {
      const registry = await import('@midnight-ntwrk/leaderboard-api/dist/api/src/amm/registry.js');
      const sub = positional[1];
      switch (sub) {
        case 'list': {
          const file = registry.loadRegistry();
          emit(json, {
            command: 'pools list',
            path: registry.registryPath(),
            pools: Object.entries(file.pools).map(([name, entry]) => ({ name, ...entry })),
          });
          return 0;
        }
        case 'add': {
          const name = positional[2];
          const address = positional[3];
          if (!name || !address) throw new UsageError('usage: pools add <name> <contract-address> [--network-id X]');
          const entry = registry.addPool(name, address, { networkId: flagStr(flags, 'network-id') });
          emit(json, { command: 'pools add', name, ...entry });
          return 0;
        }
        case 'remove': {
          const name = positional[2];
          if (!name) throw new UsageError('usage: pools remove <name>');
          if (!registry.removePool(name)) throw new UsageError(`unknown pool "${name}"`);
          emit(json, { command: 'pools remove', name });
          return 0;
        }
        case 'deploy': {
          const name = positional[2];
          if (!name) throw new UsageError('usage: pools deploy <name> [--network-id preprod] [--salt <64-hex>] [--faucet-open] [--execute]');
          const { randomBytes, createHash } = await import('node:crypto');
          const { writeFileSync, readFileSync } = await import('node:fs');
          const saltRaw = (flagStr(flags, 'salt') ?? randomBytes(32).toString('hex')).toLowerCase();
          if (!/^[0-9a-f]{64}$/.test(saltRaw)) throw new UsageError('--salt must be 64 hex chars');
          const faucetOpen = flags.has('faucet-open');

          if (isPreprod) {
            const { fileURLToPath } = await import('node:url');
            const { resolve: resolvePath } = await import('node:path');
            const seedPath = process.env.AMM_SEED_PATH ?? resolvePath('.spike/agent-seed-export.json');
            let seedHex: string;
            try {
              seedHex = String(JSON.parse(readFileSync(seedPath, 'utf8')).seedHex ?? '');
            } catch {
              throw new Error(`missing agent seed export at ${seedPath} (see README preprod setup)`);
            }
            if (!/^[0-9a-f]{64}$/i.test(seedHex)) throw new Error(`invalid seedHex in ${seedPath}`);
            const { HDWallet, Roles } = await import('@midnight-ntwrk/wallet-sdk-hd');
            const ledger = await import('@midnight-ntwrk/ledger-v8');
            const hdResult = HDWallet.fromSeed(Buffer.from(seedHex, 'hex'));
            if (hdResult.type !== 'seedOk') throw new Error('failed to derive wallet keys from seed');
            const derived = hdResult.hdWallet.selectAccount(0).selectRoles([Roles.Zswap]).deriveKeysAt(0);
            if (derived.type !== 'keysDerived') throw new Error('failed to derive role keys');
            const shieldedSecretKeys = ledger.ZswapSecretKeys.fromSeed(derived.keys[Roles.Zswap]);
            const pk = Buffer.from(String(shieldedSecretKeys.coinPublicKey), 'hex');
            const ownerIdHex = createHash('sha256').update(pk).update(pk).digest('hex');
            const deployScript = fileURLToPath(new URL('../../scripts/preprod-deploy.mjs', import.meta.url));
            if (!flags.has('execute')) {
              emit(json, { command: 'pools deploy', name, networkId: 'preprod', ownerId: ownerIdHex, salt: saltRaw, faucetOpen, dryRun: true, deployScript });
              return 0;
            }
            writeFileSync(resolvePath('.spike/preprod-deploy-args.json'), `${JSON.stringify([ownerIdHex, saltRaw, faucetOpen], null, 2)}\n`);
            const { spawn } = await import('node:child_process');
            const exitCode: number = await new Promise((resolvePromise, rejectPromise) => {
              const child = spawn(process.execPath, [deployScript, '--execute'], { stdio: 'inherit' });
              child.on('error', rejectPromise);
              child.on('exit', (code) => resolvePromise(code ?? 1));
            });
            if (exitCode !== 0) throw new Error(`preprod deploy script failed (exit ${exitCode})`);
            const deployed = JSON.parse(readFileSync(resolvePath('.spike/preprod-deploy.json'), 'utf8'));
            const address = String(deployed.contractAddress ?? '');
            if (!/^[0-9a-f]{64}$/.test(address)) throw new Error('deploy script returned an invalid contractAddress');
            const entry = registry.addPool(name, address, { networkId: 'preprod' });
            emit(json, { command: 'pools deploy', name, ...entry, ownerId: ownerIdHex, salt: saltRaw, faucetOpen });
            return 0;
          }

          const serveUrl = process.env.AMN_SERVE_URL ?? process.env.MN_SERVE_URL ?? 'ws://127.0.0.1:9932';
          const pkHex: string = await new Promise((resolvePromise, rejectPromise) => {
            const ws = new WebSocket(serveUrl);
            const timer = setTimeout(() => {
              ws.close();
              rejectPromise(new Error(`timeout connecting to ${serveUrl} — is mn serve running?`));
            }, 10_000);
            ws.addEventListener('open', () => {
              ws.send(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getShieldedAddresses', params: {} }));
            });
            ws.addEventListener('message', (event) => {
              clearTimeout(timer);
              const message = JSON.parse(String(event.data));
              ws.close();
              if (message.error || !message.result?.shieldedCoinPublicKey) {
                rejectPromise(new Error(`unexpected getShieldedAddresses response: ${JSON.stringify(message)}`));
              } else {
                resolvePromise(String(message.result.shieldedCoinPublicKey));
              }
            });
            ws.addEventListener('error', () => {
              clearTimeout(timer);
              rejectPromise(new Error(`cannot connect to ${serveUrl} — is mn serve running?`));
            });
          });
          const pk = Buffer.from(pkHex, 'hex');
          const ownerIdBytes = [...createHash('sha256').update(pk).update(pk).digest()];
          const saltBytes = [...Buffer.from(saltRaw, 'hex')];
          const wallet = flagStr(flags, 'wallet') ?? 'devnet-main';
          if (!flags.has('execute')) {
            emit(json, { command: 'pools deploy', name, networkId: 'undeployed', ownerCoinPublicKey: pkHex, salt: saltRaw, faucetOpen, wallet, dryRun: true });
            return 0;
          }
          const { execFileSync } = await import('node:child_process');
          // `--args` boolean encoding for the pool's third constructor
          // parameter: VERIFIED on localnet 2026-10-13 (faucetOpen true and
          // false deploys; gated pool rejects mints with "AMM: faucet closed").
          const out = execFileSync('mn', ['contract', 'deploy', '--managed', 'contract/managed/pool', '--wallet', wallet, '--args', JSON.stringify([ownerIdBytes, saltBytes, faucetOpen]), '--json'], { encoding: 'utf8', timeout: 280_000 });
          const deployed = JSON.parse(out);
          const address = String(deployed.address ?? '');
          if (!/^[0-9a-f]{64}$/.test(address)) throw new Error(`mn contract deploy returned an invalid address: ${out.slice(0, 200)}`);
          const entry = registry.addPool(name, address, { networkId: undefined });
          emit(json, { command: 'pools deploy', name, ...entry, ownerId: Buffer.from(ownerIdBytes).toString('hex'), salt: saltRaw, faucetOpen });
          return 0;
        }
        default:
          throw new UsageError('usage: pools <list | add <name> <contract-address> | deploy <name> | remove <name>>');
      }
    }

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
          colorLpHex: state.colorLpHex,
          lpSupply: state.lpSupply,
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
          totalLp: balance.totalLp,
          coinA: balance.coinA,
          coinB: balance.coinB,
          lpCoins: balance.lpCoins,
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
      const { api, close, vault } = await connect();
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
            spendableCoinAvailable: values.some((value) => value >= amountIn),
            availableValues: values,
          });
          return 0;
        }
        const result = await api.swap({ side, amountIn, slippageBps });
        // Keep the vault fallback honest: spend its record too (the live
        // wallet cache self-updates on the next balance sync).
        vault?.consume(result.coin);
        emit(json, {
          command,
          contract,
          txId: result.txId,
          quote: result.quote,
          coin: result.coin,
          consumedFromVault: vault !== undefined,
        });
      } finally {
        close();
      }
      return 0;
    }

    case 'faucet': {
      const amountA = parseUint('--amount-a', flagStr(flags, 'amount-a') ?? '1000000');
      const amountB = parseUint('--amount-b', flagStr(flags, 'amount-b') ?? '1000000');
      const execute = flags.has('execute');
      const { api, close, vault } = await connect();
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
        // Record in the vault too: it's the fallback source, and it makes the
        // fresh coins available before the next balance cache sync.
        vault?.record(coinA, coinB);
        emit(json, {
          command,
          contract,
          coinA: fmtCoin(coinA),
          coinB: fmtCoin(coinB),
          recordedInVault: vault !== undefined,
        });
      } finally {
        close();
      }
      return 0;
    }

    case 'seed': {
      if (!flags.has('mint')) {
        throw new UsageError('seed: the CLI supports only "seed --mint" (faucet then seed); use api/ directly for custom coin pairs');
      }
      const amountA = parseUint('--amount-a', flagStr(flags, 'amount-a') ?? '1000000');
      const amountB = parseUint('--amount-b', flagStr(flags, 'amount-b') ?? '1000000');
      const initialLpOption = flagStr(flags, 'initial-lp') !== undefined
        ? parseUint('initial-lp', flagStr(flags, 'initial-lp'))
        : undefined;
      const execute = flags.has('execute');
      const { api, close } = await connect();
      try {
        // Guard before the faucet: seeding an already-seeded pool used to mint
        // coins and then fail the circuit assert ("AMM: pool already seeded").
        const state = await api.poolState();
        if (state.seeded) {
          const { AmmError } = await import('@midnight-ntwrk/leaderboard-api/dist/api/src/amm/types.js');
          throw new AmmError('ALREADY_SEEDED', 'pool already seeded');
        }
        const paused = await api.isPaused();
        if (!execute) {
          emit(json, {
            command,
            contract,
            dryRun: true,
            executeHint: `add --execute to submit: faucet(${amountA},${amountB}) then seed`,
            paused,
            wouldMint: { amountA, amountB },
            initialLp: initialLpOption ?? floorSqrtApprox(amountA * amountB),
          });
          return 0;
        }
        const [coinA, coinB] = await api.faucet({ amountA, amountB });
        const { txId, lpCoin, initialLp } = await api.seed(coinA, coinB, { initialLp: initialLpOption });
        emit(json, {
          command,
          contract,
          seedTxId: txId,
          minted: { coinA: fmtCoin(coinA), coinB: fmtCoin(coinB) },
          initialLp,
          lpCoin: fmtCoin(lpCoin),
        });
      } finally {
        close();
      }
      return 0;
    }

    case 'add-liquidity': {
      const amountA = parseUint('amountA', positional[1]);
      const amountB = parseUint('amountB', positional[2]);
      const slippageBps = parseSlippage(flags);
      const execute = flags.has('execute');
      const { api, close, vault } = await connect();
      try {
        const quote = await api.quoteAddLiquidity(amountA, amountB, slippageBps);
        if (!execute) {
          const balance = await api.balance();
          emit(json, {
            command,
            contract,
            dryRun: true,
            executeHint: 'add --execute to submit this deposit',
            quote,
            slippageBps,
            spendableCoinAvailable: {
              amountA: balance.coinA.some((c) => c.value >= amountA),
              amountB: balance.coinB.some((c) => c.value >= amountB),
            },
          });
          return 0;
        }
        const result = await api.addLiquidity({ amountA, amountB, slippageBps });
        vault?.consume(result.coinA);
        vault?.consume(result.coinB);
        emit(json, {
          command,
          contract,
          txId: result.txId,
          quote: result.quote,
          lpCoin: fmtCoin(result.lpCoin),
          consumedFromVault: vault !== undefined,
        });
      } finally {
        close();
      }
      return 0;
    }

    case 'remove-liquidity': {
      const shares = parseUint('shares', positional[1]);
      const slippageBps = parseSlippage(flags);
      const execute = flags.has('execute');
      const { api, close, vault } = await connect();
      try {
        const quote = await api.quoteRemoveLiquidity(shares, slippageBps);
        if (!execute) {
          const balance = await api.balance();
          emit(json, {
            command,
            contract,
            dryRun: true,
            executeHint: 'add --execute to submit this withdrawal',
            quote,
            slippageBps,
            spendableCoinAvailable: balance.lpCoins.some((c) => c.value >= shares),
          });
          return 0;
        }
        const result = await api.removeLiquidity({ lpAmount: shares, slippageBps });
        vault?.consume(result.lpCoin);
        emit(json, {
          command,
          contract,
          txId: result.txId,
          quote: result.quote,
          coins: result.coins.map(fmtCoin),
          consumedFromVault: vault !== undefined,
        });
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
