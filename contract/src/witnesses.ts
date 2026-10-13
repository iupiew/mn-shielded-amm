export type PoolPrivateState = {
  readonly secretKey: Uint8Array;
};

export const createPoolPrivateState = (secretKey: Uint8Array): PoolPrivateState => ({
  secretKey,
});

export const createWitnesses = () => ({
  localSecretKey: ({
    privateState,
  }: {
    privateState: PoolPrivateState;
  }): [PoolPrivateState, Uint8Array] => [privateState, privateState.secretKey],
  wit_secretNonce: ({
    privateState,
  }: {
    privateState: PoolPrivateState;
  }): [PoolPrivateState, Uint8Array] => [privateState, privateState.secretKey],
});

// Direct named export for tooling that loads witnesses generically
// (e.g. `midnight contract deploy` looks for a `witnesses` export).
export const witnesses = createWitnesses();
