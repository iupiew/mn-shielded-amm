import { CompiledContract } from '@midnight-ntwrk/compact-js';

export * as Pool from '../managed/pool/contract/index.js';
export { createWitnesses, createPoolPrivateState, witnesses } from './witnesses.js';
export type { PoolPrivateState } from './witnesses.js';

import * as PoolContract from '../managed/pool/contract/index.js';
import { createWitnesses } from './witnesses.js';

export const CompiledPoolContract = CompiledContract.make(
  'pool',
  PoolContract.Contract,
).pipe(
  CompiledContract.withWitnesses(createWitnesses()),
  CompiledContract.withCompiledFileAssets('./managed/pool'),
);
