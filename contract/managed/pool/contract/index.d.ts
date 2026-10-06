import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<PS> = {
  wit_secretNonce(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
}

export type ImpureCircuits<PS> = {
  faucet(context: __compactRuntime.CircuitContext<PS>,
         amountA_0: bigint,
         amountB_0: bigint,
         nonceA_0: Uint8Array,
         nonceB_0: Uint8Array): __compactRuntime.CircuitResults<PS, [{ nonce: Uint8Array,
                                                                       color: Uint8Array,
                                                                       value: bigint
                                                                     },
                                                                     { nonce: Uint8Array,
                                                                       color: Uint8Array,
                                                                       value: bigint
                                                                     }]>;
  seed(context: __compactRuntime.CircuitContext<PS>,
       coinA_0: { nonce: Uint8Array, color: Uint8Array, value: bigint },
       coinB_0: { nonce: Uint8Array, color: Uint8Array, value: bigint }): __compactRuntime.CircuitResults<PS, []>;
  swap(context: __compactRuntime.CircuitContext<PS>,
       inCoin_0: { nonce: Uint8Array, color: Uint8Array, value: bigint },
       amountOut_0: bigint,
       minAmountOut_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  pause(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  unpause(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  getColors(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, [Uint8Array,
                                                                                                Uint8Array]>;
  getReserves(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, [bigint,
                                                                                                  bigint]>;
  getIsPaused(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, boolean>;
}

export type ProvableCircuits<PS> = {
  faucet(context: __compactRuntime.CircuitContext<PS>,
         amountA_0: bigint,
         amountB_0: bigint,
         nonceA_0: Uint8Array,
         nonceB_0: Uint8Array): __compactRuntime.CircuitResults<PS, [{ nonce: Uint8Array,
                                                                       color: Uint8Array,
                                                                       value: bigint
                                                                     },
                                                                     { nonce: Uint8Array,
                                                                       color: Uint8Array,
                                                                       value: bigint
                                                                     }]>;
  seed(context: __compactRuntime.CircuitContext<PS>,
       coinA_0: { nonce: Uint8Array, color: Uint8Array, value: bigint },
       coinB_0: { nonce: Uint8Array, color: Uint8Array, value: bigint }): __compactRuntime.CircuitResults<PS, []>;
  swap(context: __compactRuntime.CircuitContext<PS>,
       inCoin_0: { nonce: Uint8Array, color: Uint8Array, value: bigint },
       amountOut_0: bigint,
       minAmountOut_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  pause(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  unpause(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  getColors(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, [Uint8Array,
                                                                                                Uint8Array]>;
  getReserves(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, [bigint,
                                                                                                  bigint]>;
  getIsPaused(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, boolean>;
}

export type PureCircuits = {
}

export type Circuits<PS> = {
  faucet(context: __compactRuntime.CircuitContext<PS>,
         amountA_0: bigint,
         amountB_0: bigint,
         nonceA_0: Uint8Array,
         nonceB_0: Uint8Array): __compactRuntime.CircuitResults<PS, [{ nonce: Uint8Array,
                                                                       color: Uint8Array,
                                                                       value: bigint
                                                                     },
                                                                     { nonce: Uint8Array,
                                                                       color: Uint8Array,
                                                                       value: bigint
                                                                     }]>;
  seed(context: __compactRuntime.CircuitContext<PS>,
       coinA_0: { nonce: Uint8Array, color: Uint8Array, value: bigint },
       coinB_0: { nonce: Uint8Array, color: Uint8Array, value: bigint }): __compactRuntime.CircuitResults<PS, []>;
  swap(context: __compactRuntime.CircuitContext<PS>,
       inCoin_0: { nonce: Uint8Array, color: Uint8Array, value: bigint },
       amountOut_0: bigint,
       minAmountOut_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  pause(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  unpause(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  getColors(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, [Uint8Array,
                                                                                                Uint8Array]>;
  getReserves(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, [bigint,
                                                                                                  bigint]>;
  getIsPaused(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, boolean>;
}

export type Ledger = {
  _coins: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): { nonce: Uint8Array,
                                 color: Uint8Array,
                                 value: bigint,
                                 mt_index: bigint
                               };
    [Symbol.iterator](): Iterator<[Uint8Array, { nonce: Uint8Array, color: Uint8Array, value: bigint, mt_index: bigint }]>
  };
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>,
               ownerId_0: Uint8Array,
               instanceSalt_0: Uint8Array): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
