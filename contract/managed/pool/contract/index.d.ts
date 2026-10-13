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
       coinB_0: { nonce: Uint8Array, color: Uint8Array, value: bigint },
       initialLp_0: bigint,
       nonceLp_0: Uint8Array): __compactRuntime.CircuitResults<PS, { nonce: Uint8Array,
                                                                     color: Uint8Array,
                                                                     value: bigint
                                                                   }>;
  swap(context: __compactRuntime.CircuitContext<PS>,
       inCoin_0: { nonce: Uint8Array, color: Uint8Array, value: bigint },
       amountIn_0: bigint,
       amountOut_0: bigint,
       minAmountOut_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  addLiquidity(context: __compactRuntime.CircuitContext<PS>,
               coinA_0: { nonce: Uint8Array, color: Uint8Array, value: bigint },
               amountA_0: bigint,
               coinB_0: { nonce: Uint8Array, color: Uint8Array, value: bigint },
               amountB_0: bigint,
               lpOut_0: bigint,
               minLpOut_0: bigint,
               nonceLp_0: Uint8Array): __compactRuntime.CircuitResults<PS, { nonce: Uint8Array,
                                                                             color: Uint8Array,
                                                                             value: bigint
                                                                           }>;
  removeLiquidity(context: __compactRuntime.CircuitContext<PS>,
                  coinLp_0: { nonce: Uint8Array,
                              color: Uint8Array,
                              value: bigint
                            },
                  amountLp_0: bigint,
                  aOut_0: bigint,
                  bOut_0: bigint,
                  minA_0: bigint,
                  minB_0: bigint,
                  nonceA_0: Uint8Array,
                  nonceB_0: Uint8Array): __compactRuntime.CircuitResults<PS, [{ nonce: Uint8Array,
                                                                                color: Uint8Array,
                                                                                value: bigint
                                                                              },
                                                                              { nonce: Uint8Array,
                                                                                color: Uint8Array,
                                                                                value: bigint
                                                                              }]>;
  pause(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  unpause(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
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
       coinB_0: { nonce: Uint8Array, color: Uint8Array, value: bigint },
       initialLp_0: bigint,
       nonceLp_0: Uint8Array): __compactRuntime.CircuitResults<PS, { nonce: Uint8Array,
                                                                     color: Uint8Array,
                                                                     value: bigint
                                                                   }>;
  swap(context: __compactRuntime.CircuitContext<PS>,
       inCoin_0: { nonce: Uint8Array, color: Uint8Array, value: bigint },
       amountIn_0: bigint,
       amountOut_0: bigint,
       minAmountOut_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  addLiquidity(context: __compactRuntime.CircuitContext<PS>,
               coinA_0: { nonce: Uint8Array, color: Uint8Array, value: bigint },
               amountA_0: bigint,
               coinB_0: { nonce: Uint8Array, color: Uint8Array, value: bigint },
               amountB_0: bigint,
               lpOut_0: bigint,
               minLpOut_0: bigint,
               nonceLp_0: Uint8Array): __compactRuntime.CircuitResults<PS, { nonce: Uint8Array,
                                                                             color: Uint8Array,
                                                                             value: bigint
                                                                           }>;
  removeLiquidity(context: __compactRuntime.CircuitContext<PS>,
                  coinLp_0: { nonce: Uint8Array,
                              color: Uint8Array,
                              value: bigint
                            },
                  amountLp_0: bigint,
                  aOut_0: bigint,
                  bOut_0: bigint,
                  minA_0: bigint,
                  minB_0: bigint,
                  nonceA_0: Uint8Array,
                  nonceB_0: Uint8Array): __compactRuntime.CircuitResults<PS, [{ nonce: Uint8Array,
                                                                                color: Uint8Array,
                                                                                value: bigint
                                                                              },
                                                                              { nonce: Uint8Array,
                                                                                color: Uint8Array,
                                                                                value: bigint
                                                                              }]>;
  pause(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  unpause(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
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
       coinB_0: { nonce: Uint8Array, color: Uint8Array, value: bigint },
       initialLp_0: bigint,
       nonceLp_0: Uint8Array): __compactRuntime.CircuitResults<PS, { nonce: Uint8Array,
                                                                     color: Uint8Array,
                                                                     value: bigint
                                                                   }>;
  swap(context: __compactRuntime.CircuitContext<PS>,
       inCoin_0: { nonce: Uint8Array, color: Uint8Array, value: bigint },
       amountIn_0: bigint,
       amountOut_0: bigint,
       minAmountOut_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  addLiquidity(context: __compactRuntime.CircuitContext<PS>,
               coinA_0: { nonce: Uint8Array, color: Uint8Array, value: bigint },
               amountA_0: bigint,
               coinB_0: { nonce: Uint8Array, color: Uint8Array, value: bigint },
               amountB_0: bigint,
               lpOut_0: bigint,
               minLpOut_0: bigint,
               nonceLp_0: Uint8Array): __compactRuntime.CircuitResults<PS, { nonce: Uint8Array,
                                                                             color: Uint8Array,
                                                                             value: bigint
                                                                           }>;
  removeLiquidity(context: __compactRuntime.CircuitContext<PS>,
                  coinLp_0: { nonce: Uint8Array,
                              color: Uint8Array,
                              value: bigint
                            },
                  amountLp_0: bigint,
                  aOut_0: bigint,
                  bOut_0: bigint,
                  minA_0: bigint,
                  minB_0: bigint,
                  nonceA_0: Uint8Array,
                  nonceB_0: Uint8Array): __compactRuntime.CircuitResults<PS, [{ nonce: Uint8Array,
                                                                                color: Uint8Array,
                                                                                value: bigint
                                                                              },
                                                                              { nonce: Uint8Array,
                                                                                color: Uint8Array,
                                                                                value: bigint
                                                                              }]>;
  pause(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  unpause(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
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
  readonly _lpSupply: bigint;
  readonly _faucetOpen: boolean;
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
               instanceSalt_0: Uint8Array,
               faucetOpen_0: boolean): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
