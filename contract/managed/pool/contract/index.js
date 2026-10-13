import * as __compactRuntime from '@midnight-ntwrk/compact-runtime';
__compactRuntime.checkRuntimeVersion('0.16.0');

const _descriptor_0 = new __compactRuntime.CompactTypeBytes(32);

const _descriptor_1 = new __compactRuntime.CompactTypeUnsignedInteger(340282366920938463463374607431768211455n, 16);

const _descriptor_2 = new __compactRuntime.CompactTypeUnsignedInteger(18446744073709551615n, 8);

class _QualifiedShieldedCoinInfo_0 {
  alignment() {
    return _descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_1.alignment().concat(_descriptor_2.alignment())));
  }
  fromValue(value_0) {
    return {
      nonce: _descriptor_0.fromValue(value_0),
      color: _descriptor_0.fromValue(value_0),
      value: _descriptor_1.fromValue(value_0),
      mt_index: _descriptor_2.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_0.toValue(value_0.nonce).concat(_descriptor_0.toValue(value_0.color).concat(_descriptor_1.toValue(value_0.value).concat(_descriptor_2.toValue(value_0.mt_index))));
  }
}

const _descriptor_3 = new _QualifiedShieldedCoinInfo_0();

const _descriptor_4 = __compactRuntime.CompactTypeBoolean;

class _ShieldedCoinInfo_0 {
  alignment() {
    return _descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_1.alignment()));
  }
  fromValue(value_0) {
    return {
      nonce: _descriptor_0.fromValue(value_0),
      color: _descriptor_0.fromValue(value_0),
      value: _descriptor_1.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_0.toValue(value_0.nonce).concat(_descriptor_0.toValue(value_0.color).concat(_descriptor_1.toValue(value_0.value)));
  }
}

const _descriptor_5 = new _ShieldedCoinInfo_0();

class _ZswapCoinPublicKey_0 {
  alignment() {
    return _descriptor_0.alignment();
  }
  fromValue(value_0) {
    return {
      bytes: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_0.toValue(value_0.bytes);
  }
}

const _descriptor_6 = new _ZswapCoinPublicKey_0();

class _ContractAddress_0 {
  alignment() {
    return _descriptor_0.alignment();
  }
  fromValue(value_0) {
    return {
      bytes: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_0.toValue(value_0.bytes);
  }
}

const _descriptor_7 = new _ContractAddress_0();

class _Either_0 {
  alignment() {
    return _descriptor_4.alignment().concat(_descriptor_6.alignment().concat(_descriptor_7.alignment()));
  }
  fromValue(value_0) {
    return {
      is_left: _descriptor_4.fromValue(value_0),
      left: _descriptor_6.fromValue(value_0),
      right: _descriptor_7.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_4.toValue(value_0.is_left).concat(_descriptor_6.toValue(value_0.left).concat(_descriptor_7.toValue(value_0.right)));
  }
}

const _descriptor_8 = new _Either_0();

class _tuple_0 {
  alignment() {
    return _descriptor_5.alignment().concat(_descriptor_5.alignment());
  }
  fromValue(value_0) {
    return [
      _descriptor_5.fromValue(value_0),
      _descriptor_5.fromValue(value_0)
    ]
  }
  toValue(value_0) {
    return _descriptor_5.toValue(value_0[0]).concat(_descriptor_5.toValue(value_0[1]));
  }
}

const _descriptor_9 = new _tuple_0();

const _descriptor_10 = new __compactRuntime.CompactTypeUnsignedInteger(65535n, 2);

const _descriptor_11 = __compactRuntime.CompactTypeField;

const _descriptor_12 = new __compactRuntime.CompactTypeVector(2, _descriptor_0);

const _descriptor_13 = new __compactRuntime.CompactTypeVector(4, _descriptor_0);

const _descriptor_14 = new __compactRuntime.CompactTypeVector(2, _descriptor_11);

const _descriptor_15 = new __compactRuntime.CompactTypeBytes(21);

class _CoinPreimage_0 {
  alignment() {
    return _descriptor_15.alignment().concat(_descriptor_5.alignment().concat(_descriptor_4.alignment().concat(_descriptor_0.alignment())));
  }
  fromValue(value_0) {
    return {
      domain_sep: _descriptor_15.fromValue(value_0),
      info: _descriptor_5.fromValue(value_0),
      dataType: _descriptor_4.fromValue(value_0),
      data: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_15.toValue(value_0.domain_sep).concat(_descriptor_5.toValue(value_0.info).concat(_descriptor_4.toValue(value_0.dataType).concat(_descriptor_0.toValue(value_0.data))));
  }
}

const _descriptor_16 = new _CoinPreimage_0();

class _Maybe_0 {
  alignment() {
    return _descriptor_4.alignment().concat(_descriptor_5.alignment());
  }
  fromValue(value_0) {
    return {
      is_some: _descriptor_4.fromValue(value_0),
      value: _descriptor_5.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_4.toValue(value_0.is_some).concat(_descriptor_5.toValue(value_0.value));
  }
}

const _descriptor_17 = new _Maybe_0();

class _ShieldedSendResult_0 {
  alignment() {
    return _descriptor_17.alignment().concat(_descriptor_5.alignment());
  }
  fromValue(value_0) {
    return {
      change: _descriptor_17.fromValue(value_0),
      sent: _descriptor_5.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_17.toValue(value_0.change).concat(_descriptor_5.toValue(value_0.sent));
  }
}

const _descriptor_18 = new _ShieldedSendResult_0();

class _Either_1 {
  alignment() {
    return _descriptor_4.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment()));
  }
  fromValue(value_0) {
    return {
      is_left: _descriptor_4.fromValue(value_0),
      left: _descriptor_0.fromValue(value_0),
      right: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_4.toValue(value_0.is_left).concat(_descriptor_0.toValue(value_0.left).concat(_descriptor_0.toValue(value_0.right)));
  }
}

const _descriptor_19 = new _Either_1();

const _descriptor_20 = new __compactRuntime.CompactTypeUnsignedInteger(255n, 1);

export class Contract {
  witnesses;
  constructor(...args_0) {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`Contract constructor: expected 1 argument, received ${args_0.length}`);
    }
    const witnesses_0 = args_0[0];
    if (typeof(witnesses_0) !== 'object') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor is not an object');
    }
    if (typeof(witnesses_0.wit_secretNonce) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named wit_secretNonce');
    }
    this.witnesses = witnesses_0;
    this.circuits = {
      faucet: (...args_1) => {
        if (args_1.length !== 5) {
          throw new __compactRuntime.CompactError(`faucet: expected 5 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const amountA_0 = args_1[1];
        const amountB_0 = args_1[2];
        const nonceA_0 = args_1[3];
        const nonceB_0 = args_1[4];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('faucet',
                                     'argument 1 (as invoked from Typescript)',
                                     'pool.compact line 44 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(amountA_0) === 'bigint' && amountA_0 >= 0n && amountA_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('faucet',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'pool.compact line 44 char 1',
                                     'Uint<0..18446744073709551616>',
                                     amountA_0)
        }
        if (!(typeof(amountB_0) === 'bigint' && amountB_0 >= 0n && amountB_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('faucet',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'pool.compact line 44 char 1',
                                     'Uint<0..18446744073709551616>',
                                     amountB_0)
        }
        if (!(nonceA_0.buffer instanceof ArrayBuffer && nonceA_0.BYTES_PER_ELEMENT === 1 && nonceA_0.length === 32)) {
          __compactRuntime.typeError('faucet',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'pool.compact line 44 char 1',
                                     'Bytes<32>',
                                     nonceA_0)
        }
        if (!(nonceB_0.buffer instanceof ArrayBuffer && nonceB_0.BYTES_PER_ELEMENT === 1 && nonceB_0.length === 32)) {
          __compactRuntime.typeError('faucet',
                                     'argument 4 (argument 5 as invoked from Typescript)',
                                     'pool.compact line 44 char 1',
                                     'Bytes<32>',
                                     nonceB_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_2.toValue(amountA_0).concat(_descriptor_2.toValue(amountB_0).concat(_descriptor_0.toValue(nonceA_0).concat(_descriptor_0.toValue(nonceB_0)))),
            alignment: _descriptor_2.alignment().concat(_descriptor_2.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment())))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._faucet_0(context,
                                        partialProofData,
                                        amountA_0,
                                        amountB_0,
                                        nonceA_0,
                                        nonceB_0);
        partialProofData.output = { value: _descriptor_9.toValue(result_0), alignment: _descriptor_9.alignment() };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      seed: (...args_1) => {
        if (args_1.length !== 5) {
          throw new __compactRuntime.CompactError(`seed: expected 5 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const coinA_0 = args_1[1];
        const coinB_0 = args_1[2];
        const initialLp_0 = args_1[3];
        const nonceLp_0 = args_1[4];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('seed',
                                     'argument 1 (as invoked from Typescript)',
                                     'pool.compact line 59 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(coinA_0) === 'object' && coinA_0.nonce.buffer instanceof ArrayBuffer && coinA_0.nonce.BYTES_PER_ELEMENT === 1 && coinA_0.nonce.length === 32 && coinA_0.color.buffer instanceof ArrayBuffer && coinA_0.color.BYTES_PER_ELEMENT === 1 && coinA_0.color.length === 32 && typeof(coinA_0.value) === 'bigint' && coinA_0.value >= 0n && coinA_0.value <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('seed',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'pool.compact line 59 char 1',
                                     'struct ShieldedCoinInfo<nonce: Bytes<32>, color: Bytes<32>, value: Uint<0..340282366920938463463374607431768211456>>',
                                     coinA_0)
        }
        if (!(typeof(coinB_0) === 'object' && coinB_0.nonce.buffer instanceof ArrayBuffer && coinB_0.nonce.BYTES_PER_ELEMENT === 1 && coinB_0.nonce.length === 32 && coinB_0.color.buffer instanceof ArrayBuffer && coinB_0.color.BYTES_PER_ELEMENT === 1 && coinB_0.color.length === 32 && typeof(coinB_0.value) === 'bigint' && coinB_0.value >= 0n && coinB_0.value <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('seed',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'pool.compact line 59 char 1',
                                     'struct ShieldedCoinInfo<nonce: Bytes<32>, color: Bytes<32>, value: Uint<0..340282366920938463463374607431768211456>>',
                                     coinB_0)
        }
        if (!(typeof(initialLp_0) === 'bigint' && initialLp_0 >= 0n && initialLp_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('seed',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'pool.compact line 59 char 1',
                                     'Uint<0..18446744073709551616>',
                                     initialLp_0)
        }
        if (!(nonceLp_0.buffer instanceof ArrayBuffer && nonceLp_0.BYTES_PER_ELEMENT === 1 && nonceLp_0.length === 32)) {
          __compactRuntime.typeError('seed',
                                     'argument 4 (argument 5 as invoked from Typescript)',
                                     'pool.compact line 59 char 1',
                                     'Bytes<32>',
                                     nonceLp_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_5.toValue(coinA_0).concat(_descriptor_5.toValue(coinB_0).concat(_descriptor_2.toValue(initialLp_0).concat(_descriptor_0.toValue(nonceLp_0)))),
            alignment: _descriptor_5.alignment().concat(_descriptor_5.alignment().concat(_descriptor_2.alignment().concat(_descriptor_0.alignment())))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._seed_0(context,
                                      partialProofData,
                                      coinA_0,
                                      coinB_0,
                                      initialLp_0,
                                      nonceLp_0);
        partialProofData.output = { value: _descriptor_5.toValue(result_0), alignment: _descriptor_5.alignment() };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      swap: (...args_1) => {
        if (args_1.length !== 5) {
          throw new __compactRuntime.CompactError(`swap: expected 5 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const inCoin_0 = args_1[1];
        const amountIn_0 = args_1[2];
        const amountOut_0 = args_1[3];
        const minAmountOut_0 = args_1[4];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('swap',
                                     'argument 1 (as invoked from Typescript)',
                                     'pool.compact line 88 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(inCoin_0) === 'object' && inCoin_0.nonce.buffer instanceof ArrayBuffer && inCoin_0.nonce.BYTES_PER_ELEMENT === 1 && inCoin_0.nonce.length === 32 && inCoin_0.color.buffer instanceof ArrayBuffer && inCoin_0.color.BYTES_PER_ELEMENT === 1 && inCoin_0.color.length === 32 && typeof(inCoin_0.value) === 'bigint' && inCoin_0.value >= 0n && inCoin_0.value <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('swap',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'pool.compact line 88 char 1',
                                     'struct ShieldedCoinInfo<nonce: Bytes<32>, color: Bytes<32>, value: Uint<0..340282366920938463463374607431768211456>>',
                                     inCoin_0)
        }
        if (!(typeof(amountIn_0) === 'bigint' && amountIn_0 >= 0n && amountIn_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('swap',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'pool.compact line 88 char 1',
                                     'Uint<0..18446744073709551616>',
                                     amountIn_0)
        }
        if (!(typeof(amountOut_0) === 'bigint' && amountOut_0 >= 0n && amountOut_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('swap',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'pool.compact line 88 char 1',
                                     'Uint<0..18446744073709551616>',
                                     amountOut_0)
        }
        if (!(typeof(minAmountOut_0) === 'bigint' && minAmountOut_0 >= 0n && minAmountOut_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('swap',
                                     'argument 4 (argument 5 as invoked from Typescript)',
                                     'pool.compact line 88 char 1',
                                     'Uint<0..18446744073709551616>',
                                     minAmountOut_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_5.toValue(inCoin_0).concat(_descriptor_2.toValue(amountIn_0).concat(_descriptor_2.toValue(amountOut_0).concat(_descriptor_2.toValue(minAmountOut_0)))),
            alignment: _descriptor_5.alignment().concat(_descriptor_2.alignment().concat(_descriptor_2.alignment().concat(_descriptor_2.alignment())))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._swap_0(context,
                                      partialProofData,
                                      inCoin_0,
                                      amountIn_0,
                                      amountOut_0,
                                      minAmountOut_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      addLiquidity: (...args_1) => {
        if (args_1.length !== 8) {
          throw new __compactRuntime.CompactError(`addLiquidity: expected 8 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const coinA_0 = args_1[1];
        const amountA_0 = args_1[2];
        const coinB_0 = args_1[3];
        const amountB_0 = args_1[4];
        const lpOut_0 = args_1[5];
        const minLpOut_0 = args_1[6];
        const nonceLp_0 = args_1[7];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('addLiquidity',
                                     'argument 1 (as invoked from Typescript)',
                                     'pool.compact line 157 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(coinA_0) === 'object' && coinA_0.nonce.buffer instanceof ArrayBuffer && coinA_0.nonce.BYTES_PER_ELEMENT === 1 && coinA_0.nonce.length === 32 && coinA_0.color.buffer instanceof ArrayBuffer && coinA_0.color.BYTES_PER_ELEMENT === 1 && coinA_0.color.length === 32 && typeof(coinA_0.value) === 'bigint' && coinA_0.value >= 0n && coinA_0.value <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('addLiquidity',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'pool.compact line 157 char 1',
                                     'struct ShieldedCoinInfo<nonce: Bytes<32>, color: Bytes<32>, value: Uint<0..340282366920938463463374607431768211456>>',
                                     coinA_0)
        }
        if (!(typeof(amountA_0) === 'bigint' && amountA_0 >= 0n && amountA_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('addLiquidity',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'pool.compact line 157 char 1',
                                     'Uint<0..18446744073709551616>',
                                     amountA_0)
        }
        if (!(typeof(coinB_0) === 'object' && coinB_0.nonce.buffer instanceof ArrayBuffer && coinB_0.nonce.BYTES_PER_ELEMENT === 1 && coinB_0.nonce.length === 32 && coinB_0.color.buffer instanceof ArrayBuffer && coinB_0.color.BYTES_PER_ELEMENT === 1 && coinB_0.color.length === 32 && typeof(coinB_0.value) === 'bigint' && coinB_0.value >= 0n && coinB_0.value <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('addLiquidity',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'pool.compact line 157 char 1',
                                     'struct ShieldedCoinInfo<nonce: Bytes<32>, color: Bytes<32>, value: Uint<0..340282366920938463463374607431768211456>>',
                                     coinB_0)
        }
        if (!(typeof(amountB_0) === 'bigint' && amountB_0 >= 0n && amountB_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('addLiquidity',
                                     'argument 4 (argument 5 as invoked from Typescript)',
                                     'pool.compact line 157 char 1',
                                     'Uint<0..18446744073709551616>',
                                     amountB_0)
        }
        if (!(typeof(lpOut_0) === 'bigint' && lpOut_0 >= 0n && lpOut_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('addLiquidity',
                                     'argument 5 (argument 6 as invoked from Typescript)',
                                     'pool.compact line 157 char 1',
                                     'Uint<0..18446744073709551616>',
                                     lpOut_0)
        }
        if (!(typeof(minLpOut_0) === 'bigint' && minLpOut_0 >= 0n && minLpOut_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('addLiquidity',
                                     'argument 6 (argument 7 as invoked from Typescript)',
                                     'pool.compact line 157 char 1',
                                     'Uint<0..18446744073709551616>',
                                     minLpOut_0)
        }
        if (!(nonceLp_0.buffer instanceof ArrayBuffer && nonceLp_0.BYTES_PER_ELEMENT === 1 && nonceLp_0.length === 32)) {
          __compactRuntime.typeError('addLiquidity',
                                     'argument 7 (argument 8 as invoked from Typescript)',
                                     'pool.compact line 157 char 1',
                                     'Bytes<32>',
                                     nonceLp_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_5.toValue(coinA_0).concat(_descriptor_2.toValue(amountA_0).concat(_descriptor_5.toValue(coinB_0).concat(_descriptor_2.toValue(amountB_0).concat(_descriptor_2.toValue(lpOut_0).concat(_descriptor_2.toValue(minLpOut_0).concat(_descriptor_0.toValue(nonceLp_0))))))),
            alignment: _descriptor_5.alignment().concat(_descriptor_2.alignment().concat(_descriptor_5.alignment().concat(_descriptor_2.alignment().concat(_descriptor_2.alignment().concat(_descriptor_2.alignment().concat(_descriptor_0.alignment()))))))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._addLiquidity_0(context,
                                              partialProofData,
                                              coinA_0,
                                              amountA_0,
                                              coinB_0,
                                              amountB_0,
                                              lpOut_0,
                                              minLpOut_0,
                                              nonceLp_0);
        partialProofData.output = { value: _descriptor_5.toValue(result_0), alignment: _descriptor_5.alignment() };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      removeLiquidity: (...args_1) => {
        if (args_1.length !== 9) {
          throw new __compactRuntime.CompactError(`removeLiquidity: expected 9 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const coinLp_0 = args_1[1];
        const amountLp_0 = args_1[2];
        const aOut_0 = args_1[3];
        const bOut_0 = args_1[4];
        const minA_0 = args_1[5];
        const minB_0 = args_1[6];
        const nonceA_0 = args_1[7];
        const nonceB_0 = args_1[8];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('removeLiquidity',
                                     'argument 1 (as invoked from Typescript)',
                                     'pool.compact line 231 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(coinLp_0) === 'object' && coinLp_0.nonce.buffer instanceof ArrayBuffer && coinLp_0.nonce.BYTES_PER_ELEMENT === 1 && coinLp_0.nonce.length === 32 && coinLp_0.color.buffer instanceof ArrayBuffer && coinLp_0.color.BYTES_PER_ELEMENT === 1 && coinLp_0.color.length === 32 && typeof(coinLp_0.value) === 'bigint' && coinLp_0.value >= 0n && coinLp_0.value <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('removeLiquidity',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'pool.compact line 231 char 1',
                                     'struct ShieldedCoinInfo<nonce: Bytes<32>, color: Bytes<32>, value: Uint<0..340282366920938463463374607431768211456>>',
                                     coinLp_0)
        }
        if (!(typeof(amountLp_0) === 'bigint' && amountLp_0 >= 0n && amountLp_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('removeLiquidity',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'pool.compact line 231 char 1',
                                     'Uint<0..18446744073709551616>',
                                     amountLp_0)
        }
        if (!(typeof(aOut_0) === 'bigint' && aOut_0 >= 0n && aOut_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('removeLiquidity',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'pool.compact line 231 char 1',
                                     'Uint<0..18446744073709551616>',
                                     aOut_0)
        }
        if (!(typeof(bOut_0) === 'bigint' && bOut_0 >= 0n && bOut_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('removeLiquidity',
                                     'argument 4 (argument 5 as invoked from Typescript)',
                                     'pool.compact line 231 char 1',
                                     'Uint<0..18446744073709551616>',
                                     bOut_0)
        }
        if (!(typeof(minA_0) === 'bigint' && minA_0 >= 0n && minA_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('removeLiquidity',
                                     'argument 5 (argument 6 as invoked from Typescript)',
                                     'pool.compact line 231 char 1',
                                     'Uint<0..18446744073709551616>',
                                     minA_0)
        }
        if (!(typeof(minB_0) === 'bigint' && minB_0 >= 0n && minB_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('removeLiquidity',
                                     'argument 6 (argument 7 as invoked from Typescript)',
                                     'pool.compact line 231 char 1',
                                     'Uint<0..18446744073709551616>',
                                     minB_0)
        }
        if (!(nonceA_0.buffer instanceof ArrayBuffer && nonceA_0.BYTES_PER_ELEMENT === 1 && nonceA_0.length === 32)) {
          __compactRuntime.typeError('removeLiquidity',
                                     'argument 7 (argument 8 as invoked from Typescript)',
                                     'pool.compact line 231 char 1',
                                     'Bytes<32>',
                                     nonceA_0)
        }
        if (!(nonceB_0.buffer instanceof ArrayBuffer && nonceB_0.BYTES_PER_ELEMENT === 1 && nonceB_0.length === 32)) {
          __compactRuntime.typeError('removeLiquidity',
                                     'argument 8 (argument 9 as invoked from Typescript)',
                                     'pool.compact line 231 char 1',
                                     'Bytes<32>',
                                     nonceB_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_5.toValue(coinLp_0).concat(_descriptor_2.toValue(amountLp_0).concat(_descriptor_2.toValue(aOut_0).concat(_descriptor_2.toValue(bOut_0).concat(_descriptor_2.toValue(minA_0).concat(_descriptor_2.toValue(minB_0).concat(_descriptor_0.toValue(nonceA_0).concat(_descriptor_0.toValue(nonceB_0)))))))),
            alignment: _descriptor_5.alignment().concat(_descriptor_2.alignment().concat(_descriptor_2.alignment().concat(_descriptor_2.alignment().concat(_descriptor_2.alignment().concat(_descriptor_2.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment())))))))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._removeLiquidity_0(context,
                                                 partialProofData,
                                                 coinLp_0,
                                                 amountLp_0,
                                                 aOut_0,
                                                 bOut_0,
                                                 minA_0,
                                                 minB_0,
                                                 nonceA_0,
                                                 nonceB_0);
        partialProofData.output = { value: _descriptor_9.toValue(result_0), alignment: _descriptor_9.alignment() };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      pause: (...args_1) => {
        if (args_1.length !== 1) {
          throw new __compactRuntime.CompactError(`pause: expected 1 argument (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('pause',
                                     'argument 1 (as invoked from Typescript)',
                                     'pool.compact line 288 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: { value: [], alignment: [] },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._pause_0(context, partialProofData);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      unpause: (...args_1) => {
        if (args_1.length !== 1) {
          throw new __compactRuntime.CompactError(`unpause: expected 1 argument (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('unpause',
                                     'argument 1 (as invoked from Typescript)',
                                     'pool.compact line 293 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: { value: [], alignment: [] },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._unpause_0(context, partialProofData);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      }
    };
    this.impureCircuits = {
      faucet: this.circuits.faucet,
      seed: this.circuits.seed,
      swap: this.circuits.swap,
      addLiquidity: this.circuits.addLiquidity,
      removeLiquidity: this.circuits.removeLiquidity,
      pause: this.circuits.pause,
      unpause: this.circuits.unpause
    };
    this.provableCircuits = {
      faucet: this.circuits.faucet,
      seed: this.circuits.seed,
      swap: this.circuits.swap,
      addLiquidity: this.circuits.addLiquidity,
      removeLiquidity: this.circuits.removeLiquidity,
      pause: this.circuits.pause,
      unpause: this.circuits.unpause
    };
  }
  initialState(...args_0) {
    if (args_0.length !== 3) {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 3 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const constructorContext_0 = args_0[0];
    const ownerId_0 = args_0[1];
    const instanceSalt_0 = args_0[2];
    if (typeof(constructorContext_0) !== 'object') {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'constructorContext' in argument 1 (as invoked from Typescript) to be an object`);
    }
    if (!('initialPrivateState' in constructorContext_0)) {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'initialPrivateState' in argument 1 (as invoked from Typescript)`);
    }
    if (!('initialZswapLocalState' in constructorContext_0)) {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'initialZswapLocalState' in argument 1 (as invoked from Typescript)`);
    }
    if (typeof(constructorContext_0.initialZswapLocalState) !== 'object') {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'initialZswapLocalState' in argument 1 (as invoked from Typescript) to be an object`);
    }
    if (!(ownerId_0.buffer instanceof ArrayBuffer && ownerId_0.BYTES_PER_ELEMENT === 1 && ownerId_0.length === 32)) {
      __compactRuntime.typeError('Contract state constructor',
                                 'argument 1 (argument 2 as invoked from Typescript)',
                                 'pool.compact line 24 char 1',
                                 'Bytes<32>',
                                 ownerId_0)
    }
    if (!(instanceSalt_0.buffer instanceof ArrayBuffer && instanceSalt_0.BYTES_PER_ELEMENT === 1 && instanceSalt_0.length === 32)) {
      __compactRuntime.typeError('Contract state constructor',
                                 'argument 2 (argument 3 as invoked from Typescript)',
                                 'pool.compact line 24 char 1',
                                 'Bytes<32>',
                                 instanceSalt_0)
    }
    const state_0 = new __compactRuntime.ContractState();
    let stateValue_0 = __compactRuntime.StateValue.newArray();
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    state_0.data = new __compactRuntime.ChargedState(stateValue_0);
    state_0.setOperation('faucet', new __compactRuntime.ContractOperation());
    state_0.setOperation('seed', new __compactRuntime.ContractOperation());
    state_0.setOperation('swap', new __compactRuntime.ContractOperation());
    state_0.setOperation('addLiquidity', new __compactRuntime.ContractOperation());
    state_0.setOperation('removeLiquidity', new __compactRuntime.ContractOperation());
    state_0.setOperation('pause', new __compactRuntime.ContractOperation());
    state_0.setOperation('unpause', new __compactRuntime.ContractOperation());
    const context = __compactRuntime.createCircuitContext(__compactRuntime.dummyContractAddress(), constructorContext_0.initialZswapLocalState.coinPublicKey, state_0.data, constructorContext_0.initialPrivateState);
    const partialProofData = {
      input: { value: [], alignment: [] },
      output: undefined,
      publicTranscript: [],
      privateTranscriptOutputs: []
    };
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_20.toValue(0n),
                                                                                              alignment: _descriptor_20.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(false),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_20.toValue(1n),
                                                                                              alignment: _descriptor_20.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(new Uint8Array(32)),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_20.toValue(2n),
                                                                                              alignment: _descriptor_20.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(0n),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_20.toValue(3n),
                                                                                              alignment: _descriptor_20.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(new Uint8Array(32)),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_20.toValue(4n),
                                                                                              alignment: _descriptor_20.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(false),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_20.toValue(5n),
                                                                                              alignment: _descriptor_20.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newMap(
                                                          new __compactRuntime.StateMap()
                                                        ).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_20.toValue(6n),
                                                                                              alignment: _descriptor_20.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(0n),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    this._initialize_0(context, partialProofData, ownerId_0, instanceSalt_0);
    state_0.data = new __compactRuntime.ChargedState(context.currentQueryContext.state.state);
    return {
      currentContractState: state_0,
      currentPrivateState: context.currentPrivateState,
      currentZswapLocalState: context.currentZswapLocalState
    }
  }
  _some_0(value_0) { return { is_some: true, value: value_0 }; }
  _none_0() {
    return { is_some: false,
             value:
               { nonce: new Uint8Array(32), color: new Uint8Array(32), value: 0n } };
  }
  _left_0(value_0) {
    return { is_left: true, left: value_0, right: { bytes: new Uint8Array(32) } };
  }
  _right_0(value_0) {
    return { is_left: false, left: { bytes: new Uint8Array(32) }, right: value_0 };
  }
  _tokenType_0(domain_sep_0, contractAddress_0) {
    return this._persistentCommit_0([domain_sep_0, contractAddress_0.bytes],
                                    new Uint8Array([109, 105, 100, 110, 105, 103, 104, 116, 58, 100, 101, 114, 105, 118, 101, 95, 116, 111, 107, 101, 110, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]));
  }
  _mintShieldedToken_0(context,
                       partialProofData,
                       domain_sep_0,
                       value_0,
                       nonce_0,
                       recipient_0)
  {
    const coin_0 = { nonce: nonce_0,
                     color:
                       this._tokenType_0(domain_sep_0,
                                         _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                   partialProofData,
                                                                                                   [
                                                                                                    { dup: { n: 2 } },
                                                                                                    { idx: { cached: true,
                                                                                                             pushPath: false,
                                                                                                             path: [
                                                                                                                    { tag: 'value',
                                                                                                                      value: { value: _descriptor_20.toValue(0n),
                                                                                                                               alignment: _descriptor_20.alignment() } }] } },
                                                                                                    { popeq: { cached: true,
                                                                                                               result: undefined } }]).value)),
                     value: value_0 };
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { swap: { n: 0 } },
                                       { idx: { cached: true,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_20.toValue(4n),
                                                                  alignment: _descriptor_20.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(domain_sep_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { dup: { n: 1 } },
                                       { dup: { n: 1 } },
                                       'member',
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(value_0),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { swap: { n: 0 } },
                                       'neg',
                                       { branch: { skip: 4 } },
                                       { dup: { n: 2 } },
                                       { dup: { n: 2 } },
                                       { idx: { cached: true,
                                                pushPath: false,
                                                path: [ { tag: 'stack' }] } },
                                       'add',
                                       { ins: { cached: true, n: 2 } },
                                       { swap: { n: 0 } }]);
    this._createZswapOutput_0(context, partialProofData, coin_0, recipient_0);
    const cm_0 = this._coinCommitment_0(coin_0, recipient_0);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { swap: { n: 0 } },
                                       { idx: { cached: true,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_20.toValue(2n),
                                                                  alignment: _descriptor_20.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(cm_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newNull().encode() } },
                                       { ins: { cached: true, n: 2 } },
                                       { swap: { n: 0 } }]);
    if (!recipient_0.is_left
        &&
        this._equal_0(recipient_0.right.bytes,
                      _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                partialProofData,
                                                                                [
                                                                                 { dup: { n: 2 } },
                                                                                 { idx: { cached: true,
                                                                                          pushPath: false,
                                                                                          path: [
                                                                                                 { tag: 'value',
                                                                                                   value: { value: _descriptor_20.toValue(0n),
                                                                                                            alignment: _descriptor_20.alignment() } }] } },
                                                                                 { popeq: { cached: true,
                                                                                            result: undefined } }]).value).bytes))
    {
      __compactRuntime.queryLedgerState(context,
                                        partialProofData,
                                        [
                                         { swap: { n: 0 } },
                                         { idx: { cached: true,
                                                  pushPath: true,
                                                  path: [
                                                         { tag: 'value',
                                                           value: { value: _descriptor_20.toValue(1n),
                                                                    alignment: _descriptor_20.alignment() } }] } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(cm_0),
                                                                                                alignment: _descriptor_0.alignment() }).encode() } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newNull().encode() } },
                                         { ins: { cached: true, n: 2 } },
                                         { swap: { n: 0 } }]);
    }
    return coin_0;
  }
  _shieldedBurnAddress_0() {
    return this._left_0({ bytes: new Uint8Array(32) });
  }
  _receiveShielded_0(context, partialProofData, coin_0) {
    const recipient_0 = this._right_0(_descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                partialProofData,
                                                                                                [
                                                                                                 { dup: { n: 2 } },
                                                                                                 { idx: { cached: true,
                                                                                                          pushPath: false,
                                                                                                          path: [
                                                                                                                 { tag: 'value',
                                                                                                                   value: { value: _descriptor_20.toValue(0n),
                                                                                                                            alignment: _descriptor_20.alignment() } }] } },
                                                                                                 { popeq: { cached: true,
                                                                                                            result: undefined } }]).value));
    this._createZswapOutput_0(context, partialProofData, coin_0, recipient_0);
    const tmp_0 = this._coinCommitment_0(coin_0, recipient_0);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { swap: { n: 0 } },
                                       { idx: { cached: true,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_20.toValue(1n),
                                                                  alignment: _descriptor_20.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newNull().encode() } },
                                       { ins: { cached: true, n: 2 } },
                                       { swap: { n: 0 } }]);
    return [];
  }
  _sendShielded_0(context, partialProofData, input_0, recipient_0, value_0) {
    const selfAddr_0 = _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                 partialProofData,
                                                                                 [
                                                                                  { dup: { n: 2 } },
                                                                                  { idx: { cached: true,
                                                                                           pushPath: false,
                                                                                           path: [
                                                                                                  { tag: 'value',
                                                                                                    value: { value: _descriptor_20.toValue(0n),
                                                                                                             alignment: _descriptor_20.alignment() } }] } },
                                                                                  { popeq: { cached: true,
                                                                                             result: undefined } }]).value);
    this._createZswapInput_0(context, partialProofData, input_0);
    const tmp_0 = this._coinNullifier_0(this._downcastQualifiedCoin_0(input_0),
                                        selfAddr_0);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { swap: { n: 0 } },
                                       { idx: { cached: true,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_20.toValue(0n),
                                                                  alignment: _descriptor_20.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newNull().encode() } },
                                       { ins: { cached: true, n: 2 } },
                                       { swap: { n: 0 } }]);
    let t_0;
    const change_0 = (t_0 = input_0.value,
                      (__compactRuntime.assert(t_0 >= value_0,
                                               'result of subtraction would be negative'),
                       t_0 - value_0));
    const output_0 = { nonce:
                         this._upgradeFromTransient_0(this._transientHash_0([__compactRuntime.convertBytesToField(28,
                                                                                                                  new Uint8Array([109, 105, 100, 110, 105, 103, 104, 116, 58, 107, 101, 114, 110, 101, 108, 58, 110, 111, 110, 99, 101, 95, 101, 118, 111, 108, 118, 101]),
                                                                                                                  '<standard library>'),
                                                                             this._degradeToTransient_0(input_0.nonce)])),
                       color: input_0.color,
                       value: value_0 };
    this._createZswapOutput_0(context, partialProofData, output_0, recipient_0);
    const tmp_1 = this._coinCommitment_0(output_0, recipient_0);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { swap: { n: 0 } },
                                       { idx: { cached: true,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_20.toValue(2n),
                                                                  alignment: _descriptor_20.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_1),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newNull().encode() } },
                                       { ins: { cached: true, n: 2 } },
                                       { swap: { n: 0 } }]);
    if (!recipient_0.is_left
        &&
        this._equal_1(recipient_0.right.bytes, selfAddr_0.bytes))
    {
      const tmp_2 = this._coinCommitment_0(output_0, recipient_0);
      __compactRuntime.queryLedgerState(context,
                                        partialProofData,
                                        [
                                         { swap: { n: 0 } },
                                         { idx: { cached: true,
                                                  pushPath: true,
                                                  path: [
                                                         { tag: 'value',
                                                           value: { value: _descriptor_20.toValue(1n),
                                                                    alignment: _descriptor_20.alignment() } }] } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_2),
                                                                                                alignment: _descriptor_0.alignment() }).encode() } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newNull().encode() } },
                                         { ins: { cached: true, n: 2 } },
                                         { swap: { n: 0 } }]);
    }
    if (this._equal_2(change_0, 0n)) {
      return { change: this._none_0(), sent: output_0 };
    } else {
      const changeCoin_0 = { nonce:
                               this._upgradeFromTransient_0(this._transientHash_0([__compactRuntime.convertBytesToField(30,
                                                                                                                        new Uint8Array([109, 105, 100, 110, 105, 103, 104, 116, 58, 107, 101, 114, 110, 101, 108, 58, 110, 111, 110, 99, 101, 95, 101, 118, 111, 108, 118, 101, 47, 50]),
                                                                                                                        '<standard library>'),
                                                                                   this._degradeToTransient_0(input_0.nonce)])),
                             color: input_0.color,
                             value: change_0 };
      this._createZswapOutput_0(context,
                                partialProofData,
                                changeCoin_0,
                                this._right_0(selfAddr_0));
      const cm_0 = this._coinCommitment_0(changeCoin_0,
                                          this._right_0(selfAddr_0));
      __compactRuntime.queryLedgerState(context,
                                        partialProofData,
                                        [
                                         { swap: { n: 0 } },
                                         { idx: { cached: true,
                                                  pushPath: true,
                                                  path: [
                                                         { tag: 'value',
                                                           value: { value: _descriptor_20.toValue(2n),
                                                                    alignment: _descriptor_20.alignment() } }] } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(cm_0),
                                                                                                alignment: _descriptor_0.alignment() }).encode() } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newNull().encode() } },
                                         { ins: { cached: true, n: 2 } },
                                         { swap: { n: 0 } }]);
      __compactRuntime.queryLedgerState(context,
                                        partialProofData,
                                        [
                                         { swap: { n: 0 } },
                                         { idx: { cached: true,
                                                  pushPath: true,
                                                  path: [
                                                         { tag: 'value',
                                                           value: { value: _descriptor_20.toValue(1n),
                                                                    alignment: _descriptor_20.alignment() } }] } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(cm_0),
                                                                                                alignment: _descriptor_0.alignment() }).encode() } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newNull().encode() } },
                                         { ins: { cached: true, n: 2 } },
                                         { swap: { n: 0 } }]);
      return { change: this._some_0(changeCoin_0), sent: output_0 };
    }
  }
  _sendImmediateShielded_0(context, partialProofData, input_0, target_0, value_0)
  {
    return this._sendShielded_0(context,
                                partialProofData,
                                this._upcastQualifiedCoin_0(input_0),
                                target_0,
                                value_0);
  }
  _mergeCoin_0(context, partialProofData, a_0, b_0) {
    const selfAddr_0 = _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                 partialProofData,
                                                                                 [
                                                                                  { dup: { n: 2 } },
                                                                                  { idx: { cached: true,
                                                                                           pushPath: false,
                                                                                           path: [
                                                                                                  { tag: 'value',
                                                                                                    value: { value: _descriptor_20.toValue(0n),
                                                                                                             alignment: _descriptor_20.alignment() } }] } },
                                                                                  { popeq: { cached: true,
                                                                                             result: undefined } }]).value);
    this._createZswapInput_0(context, partialProofData, a_0);
    const tmp_0 = this._coinNullifier_0(this._downcastQualifiedCoin_0(a_0),
                                        selfAddr_0);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { swap: { n: 0 } },
                                       { idx: { cached: true,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_20.toValue(0n),
                                                                  alignment: _descriptor_20.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newNull().encode() } },
                                       { ins: { cached: true, n: 2 } },
                                       { swap: { n: 0 } }]);
    this._createZswapInput_0(context, partialProofData, b_0);
    const tmp_1 = this._coinNullifier_0(this._downcastQualifiedCoin_0(b_0),
                                        selfAddr_0);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { swap: { n: 0 } },
                                       { idx: { cached: true,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_20.toValue(0n),
                                                                  alignment: _descriptor_20.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_1),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newNull().encode() } },
                                       { ins: { cached: true, n: 2 } },
                                       { swap: { n: 0 } }]);
    __compactRuntime.assert(this._equal_3(a_0.color, b_0.color),
                            'Can only merge coins of the same color');
    const newCoin_0 = { nonce:
                          this._upgradeFromTransient_0(this._transientHash_0([__compactRuntime.convertBytesToField(28,
                                                                                                                   new Uint8Array([109, 105, 100, 110, 105, 103, 104, 116, 58, 107, 101, 114, 110, 101, 108, 58, 110, 111, 110, 99, 101, 95, 101, 118, 111, 108, 118, 101]),
                                                                                                                   '<standard library>'),
                                                                              this._degradeToTransient_0(a_0.nonce)])),
                        color: a_0.color,
                        value:
                          ((t1) => {
                            if (t1 > 340282366920938463463374607431768211455n) {
                              throw new __compactRuntime.CompactError('<standard library>: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 340282366920938463463374607431768211455');
                            }
                            return t1;
                          })(a_0.value + b_0.value) };
    this._createZswapOutput_0(context,
                              partialProofData,
                              newCoin_0,
                              this._right_0(selfAddr_0));
    const cm_0 = this._coinCommitment_0(newCoin_0, this._right_0(selfAddr_0));
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { swap: { n: 0 } },
                                       { idx: { cached: true,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_20.toValue(2n),
                                                                  alignment: _descriptor_20.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(cm_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newNull().encode() } },
                                       { ins: { cached: true, n: 2 } },
                                       { swap: { n: 0 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { swap: { n: 0 } },
                                       { idx: { cached: true,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_20.toValue(1n),
                                                                  alignment: _descriptor_20.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(cm_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newNull().encode() } },
                                       { ins: { cached: true, n: 2 } },
                                       { swap: { n: 0 } }]);
    return newCoin_0;
  }
  _mergeCoinImmediate_0(context, partialProofData, a_0, b_0) {
    return this._mergeCoin_0(context,
                             partialProofData,
                             a_0,
                             this._upcastQualifiedCoin_0(b_0));
  }
  _downcastQualifiedCoin_0(coin_0) {
    return { nonce: coin_0.nonce, color: coin_0.color, value: coin_0.value };
  }
  _upcastQualifiedCoin_0(coin_0) {
    return { nonce: coin_0.nonce,
             color: coin_0.color,
             value: coin_0.value,
             mt_index: 0n };
  }
  _coinCommitment_0(coin_0, recipient_0) {
    return this._persistentHash_0({ domain_sep:
                                      new Uint8Array([109, 105, 100, 110, 105, 103, 104, 116, 58, 122, 115, 119, 97, 112, 45, 99, 99, 91, 118, 49, 93]),
                                    info: coin_0,
                                    dataType: recipient_0.is_left,
                                    data:
                                      recipient_0.is_left ?
                                      recipient_0.left.bytes :
                                      recipient_0.right.bytes });
  }
  _coinNullifier_0(coin_0, addr_0) {
    return this._persistentHash_0({ domain_sep:
                                      new Uint8Array([109, 105, 100, 110, 105, 103, 104, 116, 58, 122, 115, 119, 97, 112, 45, 99, 110, 91, 118, 49, 93]),
                                    info: coin_0,
                                    dataType: false,
                                    data: addr_0.bytes });
  }
  _transientHash_0(value_0) {
    const result_0 = __compactRuntime.transientHash(_descriptor_14, value_0);
    return result_0;
  }
  _persistentHash_0(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_16, value_0);
    return result_0;
  }
  _persistentHash_1(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_12, value_0);
    return result_0;
  }
  _persistentHash_2(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_13, value_0);
    return result_0;
  }
  _persistentCommit_0(value_0, rand_0) {
    const result_0 = __compactRuntime.persistentCommit(_descriptor_12,
                                                       value_0,
                                                       rand_0);
    return result_0;
  }
  _degradeToTransient_0(x_0) {
    const result_0 = __compactRuntime.degradeToTransient(x_0);
    return result_0;
  }
  _upgradeFromTransient_0(x_0) {
    const result_0 = __compactRuntime.upgradeFromTransient(x_0);
    return result_0;
  }
  _ownPublicKey_0(context, partialProofData) {
    const result_0 = __compactRuntime.ownPublicKey(context);
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_6.toValue(result_0),
      alignment: _descriptor_6.alignment()
    });
    return result_0;
  }
  _createZswapInput_0(context, partialProofData, coin_0) {
    const result_0 = __compactRuntime.createZswapInput(context, coin_0);
    partialProofData.privateTranscriptOutputs.push({
      value: [],
      alignment: []
    });
    return result_0;
  }
  _createZswapOutput_0(context, partialProofData, coin_0, recipient_0) {
    const result_0 = __compactRuntime.createZswapOutput(context,
                                                        coin_0,
                                                        recipient_0);
    partialProofData.privateTranscriptOutputs.push({
      value: [],
      alignment: []
    });
    return result_0;
  }
  _wit_secretNonce_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.wit_secretNonce(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(result_0.buffer instanceof ArrayBuffer && result_0.BYTES_PER_ELEMENT === 1 && result_0.length === 32)) {
      __compactRuntime.typeError('wit_secretNonce',
                                 'return value',
                                 'ZOwnablePK.compact line 92 char 3',
                                 'Bytes<32>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_0.toValue(result_0),
      alignment: _descriptor_0.alignment()
    });
    return result_0;
  }
  _initialize_0(context, partialProofData, ownerId_0, instanceSalt_0) {
    this._assertNotInitialized_0(context, partialProofData);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_20.toValue(0n),
                                                                                              alignment: _descriptor_20.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(true),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.assert(!this._equal_4(ownerId_0, new Uint8Array(32)),
                            'ZOwnablePK: invalid id');
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_20.toValue(3n),
                                                                                              alignment: _descriptor_20.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(instanceSalt_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    this.__transferOwnership_0(context, partialProofData, ownerId_0);
    return [];
  }
  _assertInitialized_0(context, partialProofData) {
    __compactRuntime.assert(_descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_20.toValue(0n),
                                                                                                                  alignment: _descriptor_20.alignment() } }] } },
                                                                                       { popeq: { cached: false,
                                                                                                  result: undefined } }]).value),
                            'ZOwnablePK: contract not initialized');
    return [];
  }
  _assertNotInitialized_0(context, partialProofData) {
    __compactRuntime.assert(!_descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_20.toValue(0n),
                                                                                                                   alignment: _descriptor_20.alignment() } }] } },
                                                                                        { popeq: { cached: false,
                                                                                                   result: undefined } }]).value),
                            'ZOwnablePK: contract already initialized');
    return [];
  }
  _assertOnlyOwner_0(context, partialProofData) {
    this._assertInitialized_0(context, partialProofData);
    const nonce_0 = this._wit_secretNonce_0(context, partialProofData);
    const callerAsEither_0 = { is_left: true,
                               left:
                                 this._ownPublicKey_0(context, partialProofData),
                               right:
                                 { bytes:
                                     new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]) } };
    const id_0 = this.__computeOwnerId_0(callerAsEither_0, nonce_0);
    __compactRuntime.assert(this._equal_5(_descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                    partialProofData,
                                                                                                    [
                                                                                                     { dup: { n: 0 } },
                                                                                                     { idx: { cached: false,
                                                                                                              pushPath: false,
                                                                                                              path: [
                                                                                                                     { tag: 'value',
                                                                                                                       value: { value: _descriptor_20.toValue(1n),
                                                                                                                                alignment: _descriptor_20.alignment() } }] } },
                                                                                                     { popeq: { cached: false,
                                                                                                                result: undefined } }]).value),
                                          this.__computeOwnerCommitment_0(context,
                                                                          partialProofData,
                                                                          id_0,
                                                                          _descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                                                    partialProofData,
                                                                                                                                    [
                                                                                                                                     { dup: { n: 0 } },
                                                                                                                                     { idx: { cached: false,
                                                                                                                                              pushPath: false,
                                                                                                                                              path: [
                                                                                                                                                     { tag: 'value',
                                                                                                                                                       value: { value: _descriptor_20.toValue(2n),
                                                                                                                                                                alignment: _descriptor_20.alignment() } }] } },
                                                                                                                                     { popeq: { cached: true,
                                                                                                                                                result: undefined } }]).value))),
                            'ZOwnablePK: caller is not the owner');
    return [];
  }
  __computeOwnerCommitment_0(context, partialProofData, id_0, counter_0) {
    this._assertInitialized_0(context, partialProofData);
    return this._persistentHash_2([id_0,
                                   _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                             partialProofData,
                                                                                             [
                                                                                              { dup: { n: 0 } },
                                                                                              { idx: { cached: false,
                                                                                                       pushPath: false,
                                                                                                       path: [
                                                                                                              { tag: 'value',
                                                                                                                value: { value: _descriptor_20.toValue(3n),
                                                                                                                         alignment: _descriptor_20.alignment() } }] } },
                                                                                              { popeq: { cached: false,
                                                                                                         result: undefined } }]).value),
                                   __compactRuntime.convertFieldToBytes(32,
                                                                        counter_0,
                                                                        'ZOwnablePK.compact line 274 char 34'),
                                   new Uint8Array([90, 79, 119, 110, 97, 98, 108, 101, 80, 75, 58, 115, 104, 105, 101, 108, 100, 58, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])]);
  }
  __computeOwnerId_0(pk_0, nonce_0) {
    __compactRuntime.assert(pk_0.is_left,
                            'ZOwnablePK: contract address owners are not yet supported');
    return this._persistentHash_1([pk_0.left.bytes, nonce_0]);
  }
  __transferOwnership_0(context, partialProofData, newOwnerId_0) {
    this._assertInitialized_0(context, partialProofData);
    const tmp_0 = 1n;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_20.toValue(2n),
                                                                  alignment: _descriptor_20.alignment() } }] } },
                                       { addi: { immediate: parseInt(__compactRuntime.valueToBigInt(
                                                              { value: _descriptor_10.toValue(tmp_0),
                                                                alignment: _descriptor_10.alignment() }
                                                                .value
                                                            )) } },
                                       { ins: { cached: true, n: 1 } }]);
    const tmp_1 = this.__computeOwnerCommitment_0(context,
                                                  partialProofData,
                                                  newOwnerId_0,
                                                  _descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                            partialProofData,
                                                                                                            [
                                                                                                             { dup: { n: 0 } },
                                                                                                             { idx: { cached: false,
                                                                                                                      pushPath: false,
                                                                                                                      path: [
                                                                                                                             { tag: 'value',
                                                                                                                               value: { value: _descriptor_20.toValue(2n),
                                                                                                                                        alignment: _descriptor_20.alignment() } }] } },
                                                                                                             { popeq: { cached: true,
                                                                                                                        result: undefined } }]).value));
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_20.toValue(1n),
                                                                                              alignment: _descriptor_20.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_1),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    return [];
  }
  _assertPaused_0(context, partialProofData) {
    __compactRuntime.assert(_descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_20.toValue(4n),
                                                                                                                  alignment: _descriptor_20.alignment() } }] } },
                                                                                       { popeq: { cached: false,
                                                                                                  result: undefined } }]).value),
                            'Pausable: not paused');
    return [];
  }
  _assertNotPaused_0(context, partialProofData) {
    __compactRuntime.assert(!_descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_20.toValue(4n),
                                                                                                                   alignment: _descriptor_20.alignment() } }] } },
                                                                                        { popeq: { cached: false,
                                                                                                   result: undefined } }]).value),
                            'Pausable: paused');
    return [];
  }
  __pause_0(context, partialProofData) {
    this._assertNotPaused_0(context, partialProofData);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_20.toValue(4n),
                                                                                              alignment: _descriptor_20.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(true),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    return [];
  }
  __unpause_0(context, partialProofData) {
    this._assertPaused_0(context, partialProofData);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_20.toValue(4n),
                                                                                              alignment: _descriptor_20.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(false),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    return [];
  }
  _tokenColorA_0(context, partialProofData) {
    return this._tokenType_0(new Uint8Array([109, 110, 45, 97, 109, 109, 58, 116, 111, 107, 101, 110, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                             _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 2 } },
                                                                                        { idx: { cached: true,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_20.toValue(0n),
                                                                                                                   alignment: _descriptor_20.alignment() } }] } },
                                                                                        { popeq: { cached: true,
                                                                                                   result: undefined } }]).value));
  }
  _tokenColorB_0(context, partialProofData) {
    return this._tokenType_0(new Uint8Array([109, 110, 45, 97, 109, 109, 58, 116, 111, 107, 101, 110, 66, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                             _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 2 } },
                                                                                        { idx: { cached: true,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_20.toValue(0n),
                                                                                                                   alignment: _descriptor_20.alignment() } }] } },
                                                                                        { popeq: { cached: true,
                                                                                                   result: undefined } }]).value));
  }
  _lpColor_0(context, partialProofData) {
    return this._tokenType_0(new Uint8Array([109, 110, 45, 97, 109, 109, 58, 108, 112, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                             _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 2 } },
                                                                                        { idx: { cached: true,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_20.toValue(0n),
                                                                                                                   alignment: _descriptor_20.alignment() } }] } },
                                                                                        { popeq: { cached: true,
                                                                                                   result: undefined } }]).value));
  }
  _faucet_0(context, partialProofData, amountA_0, amountB_0, nonceA_0, nonceB_0)
  {
    __compactRuntime.assert(amountA_0 > 0n, 'faucet: amountA is zero');
    __compactRuntime.assert(amountB_0 > 0n, 'faucet: amountB is zero');
    const coinA_0 = this._mintShieldedToken_0(context,
                                              partialProofData,
                                              new Uint8Array([109, 110, 45, 97, 109, 109, 58, 116, 111, 107, 101, 110, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                              amountA_0,
                                              nonceA_0,
                                              this._right_0(_descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                                      partialProofData,
                                                                                                                      [
                                                                                                                       { dup: { n: 2 } },
                                                                                                                       { idx: { cached: true,
                                                                                                                                pushPath: false,
                                                                                                                                path: [
                                                                                                                                       { tag: 'value',
                                                                                                                                         value: { value: _descriptor_20.toValue(0n),
                                                                                                                                                  alignment: _descriptor_20.alignment() } }] } },
                                                                                                                       { popeq: { cached: true,
                                                                                                                                  result: undefined } }]).value)));
    const sentA_0 = this._sendImmediateShielded_0(context,
                                                  partialProofData,
                                                  coinA_0,
                                                  this._left_0(this._ownPublicKey_0(context,
                                                                                    partialProofData)),
                                                  coinA_0.value);
    const coinB_0 = this._mintShieldedToken_0(context,
                                              partialProofData,
                                              new Uint8Array([109, 110, 45, 97, 109, 109, 58, 116, 111, 107, 101, 110, 66, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                              amountB_0,
                                              nonceB_0,
                                              this._right_0(_descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                                      partialProofData,
                                                                                                                      [
                                                                                                                       { dup: { n: 2 } },
                                                                                                                       { idx: { cached: true,
                                                                                                                                pushPath: false,
                                                                                                                                path: [
                                                                                                                                       { tag: 'value',
                                                                                                                                         value: { value: _descriptor_20.toValue(0n),
                                                                                                                                                  alignment: _descriptor_20.alignment() } }] } },
                                                                                                                       { popeq: { cached: true,
                                                                                                                                  result: undefined } }]).value)));
    const sentB_0 = this._sendImmediateShielded_0(context,
                                                  partialProofData,
                                                  coinB_0,
                                                  this._left_0(this._ownPublicKey_0(context,
                                                                                    partialProofData)),
                                                  coinB_0.value);
    return [sentA_0.sent, sentB_0.sent];
  }
  _seed_0(context, partialProofData, coinA_0, coinB_0, initialLp_0, nonceLp_0) {
    this._assertNotPaused_0(context, partialProofData);
    const colorA_0 = this._tokenColorA_0(context, partialProofData);
    const colorB_0 = this._tokenColorB_0(context, partialProofData);
    const cA_0 = coinA_0.color;
    const cB_0 = coinB_0.color;
    __compactRuntime.assert(this._equal_6(cA_0, colorA_0),
                            'AMM: coinA is not tokenA');
    __compactRuntime.assert(this._equal_7(cB_0, colorB_0),
                            'AMM: coinB is not tokenB');
    __compactRuntime.assert(!_descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_20.toValue(5n),
                                                                                                                   alignment: _descriptor_20.alignment() } }] } },
                                                                                        { push: { storage: false,
                                                                                                  value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(cA_0),
                                                                                                                                               alignment: _descriptor_0.alignment() }).encode() } },
                                                                                        'member',
                                                                                        { popeq: { cached: true,
                                                                                                   result: undefined } }]).value),
                            'AMM: pool already seeded');
    __compactRuntime.assert(!_descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_20.toValue(5n),
                                                                                                                   alignment: _descriptor_20.alignment() } }] } },
                                                                                        { push: { storage: false,
                                                                                                  value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(cB_0),
                                                                                                                                               alignment: _descriptor_0.alignment() }).encode() } },
                                                                                        'member',
                                                                                        { popeq: { cached: true,
                                                                                                   result: undefined } }]).value),
                            'AMM: pool already seeded');
    let t_0, t_1;
    __compactRuntime.assert((t_1 = coinA_0.value, t_1 > 0n)
                            &&
                            (t_0 = coinB_0.value, t_0 > 0n),
                            'AMM: zero seed');
    __compactRuntime.assert(initialLp_0 >= 1000n, 'AMM: initialLp below floor');
    this._receiveShielded_0(context, partialProofData, coinA_0);
    const tmp_0 = this._right_0(_descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                          partialProofData,
                                                                                          [
                                                                                           { dup: { n: 2 } },
                                                                                           { idx: { cached: true,
                                                                                                    pushPath: false,
                                                                                                    path: [
                                                                                                           { tag: 'value',
                                                                                                             value: { value: _descriptor_20.toValue(0n),
                                                                                                                      alignment: _descriptor_20.alignment() } }] } },
                                                                                           { popeq: { cached: true,
                                                                                                      result: undefined } }]).value));
    __compactRuntime.hasCoinCommitment(context, coinA_0, tmp_0) ? __compactRuntime.queryLedgerState(context,
                                                                                                    partialProofData,
                                                                                                    [
                                                                                                     { idx: { cached: false,
                                                                                                              pushPath: true,
                                                                                                              path: [
                                                                                                                     { tag: 'value',
                                                                                                                       value: { value: _descriptor_20.toValue(5n),
                                                                                                                                alignment: _descriptor_20.alignment() } }] } },
                                                                                                     { push: { storage: false,
                                                                                                               value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(cA_0),
                                                                                                                                                            alignment: _descriptor_0.alignment() }).encode() } },
                                                                                                     { dup: { n: 5 } },
                                                                                                     { push: { storage: false,
                                                                                                               value: __compactRuntime.StateValue.newCell(__compactRuntime.runtimeCoinCommitment(
                                                                                                                                                            { value: _descriptor_5.toValue(coinA_0),
                                                                                                                                                              alignment: _descriptor_5.alignment() },
                                                                                                                                                            { value: _descriptor_8.toValue(tmp_0),
                                                                                                                                                              alignment: _descriptor_8.alignment() }
                                                                                                                                                          )).encode() } },
                                                                                                     { idx: { cached: true,
                                                                                                              pushPath: false,
                                                                                                              path: [
                                                                                                                     { tag: 'value',
                                                                                                                       value: { value: _descriptor_20.toValue(1n),
                                                                                                                                alignment: _descriptor_20.alignment() } },
                                                                                                                     { tag: 'stack' }] } },
                                                                                                     { push: { storage: false,
                                                                                                               value: __compactRuntime.StateValue.newCell({ value: _descriptor_5.toValue(coinA_0),
                                                                                                                                                            alignment: _descriptor_5.alignment() }).encode() } },
                                                                                                     { swap: { n: 0 } },
                                                                                                     { concat: { cached: true,
                                                                                                                 n: 91 } },
                                                                                                     { ins: { cached: false,
                                                                                                              n: 1 } },
                                                                                                     { ins: { cached: true,
                                                                                                              n: 1 } }]) : (() => { throw new __compactRuntime.CompactError(`pool.compact line 72 char 3: Coin commitment not found. Check the coin has been received (or call 'createZswapOutput')`); })();
    this._receiveShielded_0(context, partialProofData, coinB_0);
    const tmp_1 = this._right_0(_descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                          partialProofData,
                                                                                          [
                                                                                           { dup: { n: 2 } },
                                                                                           { idx: { cached: true,
                                                                                                    pushPath: false,
                                                                                                    path: [
                                                                                                           { tag: 'value',
                                                                                                             value: { value: _descriptor_20.toValue(0n),
                                                                                                                      alignment: _descriptor_20.alignment() } }] } },
                                                                                           { popeq: { cached: true,
                                                                                                      result: undefined } }]).value));
    __compactRuntime.hasCoinCommitment(context, coinB_0, tmp_1) ? __compactRuntime.queryLedgerState(context,
                                                                                                    partialProofData,
                                                                                                    [
                                                                                                     { idx: { cached: false,
                                                                                                              pushPath: true,
                                                                                                              path: [
                                                                                                                     { tag: 'value',
                                                                                                                       value: { value: _descriptor_20.toValue(5n),
                                                                                                                                alignment: _descriptor_20.alignment() } }] } },
                                                                                                     { push: { storage: false,
                                                                                                               value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(cB_0),
                                                                                                                                                            alignment: _descriptor_0.alignment() }).encode() } },
                                                                                                     { dup: { n: 5 } },
                                                                                                     { push: { storage: false,
                                                                                                               value: __compactRuntime.StateValue.newCell(__compactRuntime.runtimeCoinCommitment(
                                                                                                                                                            { value: _descriptor_5.toValue(coinB_0),
                                                                                                                                                              alignment: _descriptor_5.alignment() },
                                                                                                                                                            { value: _descriptor_8.toValue(tmp_1),
                                                                                                                                                              alignment: _descriptor_8.alignment() }
                                                                                                                                                          )).encode() } },
                                                                                                     { idx: { cached: true,
                                                                                                              pushPath: false,
                                                                                                              path: [
                                                                                                                     { tag: 'value',
                                                                                                                       value: { value: _descriptor_20.toValue(1n),
                                                                                                                                alignment: _descriptor_20.alignment() } },
                                                                                                                     { tag: 'stack' }] } },
                                                                                                     { push: { storage: false,
                                                                                                               value: __compactRuntime.StateValue.newCell({ value: _descriptor_5.toValue(coinB_0),
                                                                                                                                                            alignment: _descriptor_5.alignment() }).encode() } },
                                                                                                     { swap: { n: 0 } },
                                                                                                     { concat: { cached: true,
                                                                                                                 n: 91 } },
                                                                                                     { ins: { cached: false,
                                                                                                              n: 1 } },
                                                                                                     { ins: { cached: true,
                                                                                                              n: 1 } }]) : (() => { throw new __compactRuntime.CompactError(`pool.compact line 74 char 3: Coin commitment not found. Check the coin has been received (or call 'createZswapOutput')`); })();
    const lpCoin_0 = this._mintShieldedToken_0(context,
                                               partialProofData,
                                               new Uint8Array([109, 110, 45, 97, 109, 109, 58, 108, 112, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                               initialLp_0,
                                               nonceLp_0,
                                               this._right_0(_descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                                       partialProofData,
                                                                                                                       [
                                                                                                                        { dup: { n: 2 } },
                                                                                                                        { idx: { cached: true,
                                                                                                                                 pushPath: false,
                                                                                                                                 path: [
                                                                                                                                        { tag: 'value',
                                                                                                                                          value: { value: _descriptor_20.toValue(0n),
                                                                                                                                                   alignment: _descriptor_20.alignment() } }] } },
                                                                                                                        { popeq: { cached: true,
                                                                                                                                   result: undefined } }]).value)));
    const sentLp_0 = this._sendImmediateShielded_0(context,
                                                   partialProofData,
                                                   lpCoin_0,
                                                   this._left_0(this._ownPublicKey_0(context,
                                                                                     partialProofData)),
                                                   lpCoin_0.value);
    const tmp_2 = initialLp_0;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_20.toValue(6n),
                                                                                              alignment: _descriptor_20.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(tmp_2),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    return sentLp_0.sent;
  }
  _swap_0(context,
          partialProofData,
          inCoin_0,
          amountIn_0,
          amountOut_0,
          minAmountOut_0)
  {
    this._assertNotPaused_0(context, partialProofData);
    const colorIn_0 = inCoin_0.color;
    const colorA_0 = this._tokenColorA_0(context, partialProofData);
    const colorB_0 = this._tokenColorB_0(context, partialProofData);
    __compactRuntime.assert(this._equal_8(colorIn_0, colorA_0)
                            ||
                            this._equal_9(colorIn_0, colorB_0),
                            'AMM: unknown token color');
    const colorOut_0 = this._equal_10(colorIn_0, colorA_0) ? colorB_0 : colorA_0;
    __compactRuntime.assert(_descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_20.toValue(5n),
                                                                                                                  alignment: _descriptor_20.alignment() } }] } },
                                                                                       { push: { storage: false,
                                                                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(colorIn_0),
                                                                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                                                                       'member',
                                                                                       { popeq: { cached: true,
                                                                                                  result: undefined } }]).value),
                            'AMM: input reserve missing');
    __compactRuntime.assert(_descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_20.toValue(5n),
                                                                                                                  alignment: _descriptor_20.alignment() } }] } },
                                                                                       { push: { storage: false,
                                                                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(colorOut_0),
                                                                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                                                                       'member',
                                                                                       { popeq: { cached: true,
                                                                                                  result: undefined } }]).value),
                            'AMM: output reserve missing');
    const potIn_0 = _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                              partialProofData,
                                                                              [
                                                                               { dup: { n: 0 } },
                                                                               { idx: { cached: false,
                                                                                        pushPath: false,
                                                                                        path: [
                                                                                               { tag: 'value',
                                                                                                 value: { value: _descriptor_20.toValue(5n),
                                                                                                          alignment: _descriptor_20.alignment() } }] } },
                                                                               { idx: { cached: false,
                                                                                        pushPath: false,
                                                                                        path: [
                                                                                               { tag: 'value',
                                                                                                 value: { value: _descriptor_0.toValue(colorIn_0),
                                                                                                          alignment: _descriptor_0.alignment() } }] } },
                                                                               { popeq: { cached: false,
                                                                                          result: undefined } }]).value);
    const potOut_0 = _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                               partialProofData,
                                                                               [
                                                                                { dup: { n: 0 } },
                                                                                { idx: { cached: false,
                                                                                         pushPath: false,
                                                                                         path: [
                                                                                                { tag: 'value',
                                                                                                  value: { value: _descriptor_20.toValue(5n),
                                                                                                           alignment: _descriptor_20.alignment() } }] } },
                                                                                { idx: { cached: false,
                                                                                         pushPath: false,
                                                                                         path: [
                                                                                                { tag: 'value',
                                                                                                  value: { value: _descriptor_0.toValue(colorOut_0),
                                                                                                           alignment: _descriptor_0.alignment() } }] } },
                                                                                { popeq: { cached: false,
                                                                                           result: undefined } }]).value);
    let t_0;
    __compactRuntime.assert((t_0 = inCoin_0.value, t_0 < 18446744073709551616n),
                            'AMM: input too large');
    let t_1;
    __compactRuntime.assert((t_1 = potIn_0.value, t_1 < 18446744073709551616n),
                            'AMM: reserve in too large');
    let t_2;
    __compactRuntime.assert((t_2 = potOut_0.value, t_2 < 18446744073709551616n),
                            'AMM: reserve out too large');
    __compactRuntime.assert(amountIn_0 > 0n, 'AMM: zero amountIn');
    __compactRuntime.assert(amountIn_0
                            <=
                            ((t1) => {
                              if (t1 > 18446744073709551615n) {
                                throw new __compactRuntime.CompactError('pool.compact line 107 char 23: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                              }
                              return t1;
                            })(inCoin_0.value),
                            'AMM: amountIn exceeds input coin');
    const v_0 = amountIn_0;
    const rIn_0 = ((t1) => {
                    if (t1 > 18446744073709551615n) {
                      throw new __compactRuntime.CompactError('pool.compact line 109 char 15: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                    }
                    return t1;
                  })(potIn_0.value);
    const rOut_0 = ((t1) => {
                     if (t1 > 18446744073709551615n) {
                       throw new __compactRuntime.CompactError('pool.compact line 110 char 16: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                     }
                     return t1;
                   })(potOut_0.value);
    __compactRuntime.assert(amountOut_0 <= rOut_0, 'AMM: insufficient reserve');
    const numer_0 = v_0 * 997n * rOut_0;
    const denom_0 = rIn_0 * 1000n + v_0 * 997n;
    let t_3;
    __compactRuntime.assert((t_3 = amountOut_0 * denom_0, t_3 <= numer_0),
                            'AMM: output too high');
    __compactRuntime.assert(numer_0 < (amountOut_0 + 1n) * denom_0,
                            'AMM: output too low');
    __compactRuntime.assert(amountOut_0 >= minAmountOut_0,
                            'AMM: below minAmountOut');
    let t_4;
    __compactRuntime.assert((t_4 = (rIn_0 + v_0)
                                   *
                                   (__compactRuntime.assert(rOut_0
                                                            >=
                                                            amountOut_0,
                                                            'result of subtraction would be negative'),
                                    rOut_0 - amountOut_0),
                             t_4 >= rIn_0 * rOut_0),
                            'AMM: k invariant');
    this._receiveShielded_0(context, partialProofData, inCoin_0);
    if (this._equal_11(amountIn_0,
                       ((t1) => {
                         if (t1 > 18446744073709551615n) {
                           throw new __compactRuntime.CompactError('pool.compact line 127 char 29: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                         }
                         return t1;
                       })(inCoin_0.value)))
    {
      const merged_0 = this._mergeCoinImmediate_0(context,
                                                  partialProofData,
                                                  potIn_0,
                                                  inCoin_0);
      const tmp_0 = this._right_0(_descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                            partialProofData,
                                                                                            [
                                                                                             { dup: { n: 2 } },
                                                                                             { idx: { cached: true,
                                                                                                      pushPath: false,
                                                                                                      path: [
                                                                                                             { tag: 'value',
                                                                                                               value: { value: _descriptor_20.toValue(0n),
                                                                                                                        alignment: _descriptor_20.alignment() } }] } },
                                                                                             { popeq: { cached: true,
                                                                                                        result: undefined } }]).value));
      __compactRuntime.hasCoinCommitment(context, merged_0, tmp_0) ? __compactRuntime.queryLedgerState(context,
                                                                                                       partialProofData,
                                                                                                       [
                                                                                                        { idx: { cached: false,
                                                                                                                 pushPath: true,
                                                                                                                 path: [
                                                                                                                        { tag: 'value',
                                                                                                                          value: { value: _descriptor_20.toValue(5n),
                                                                                                                                   alignment: _descriptor_20.alignment() } }] } },
                                                                                                        { push: { storage: false,
                                                                                                                  value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(colorIn_0),
                                                                                                                                                               alignment: _descriptor_0.alignment() }).encode() } },
                                                                                                        { dup: { n: 5 } },
                                                                                                        { push: { storage: false,
                                                                                                                  value: __compactRuntime.StateValue.newCell(__compactRuntime.runtimeCoinCommitment(
                                                                                                                                                               { value: _descriptor_5.toValue(merged_0),
                                                                                                                                                                 alignment: _descriptor_5.alignment() },
                                                                                                                                                               { value: _descriptor_8.toValue(tmp_0),
                                                                                                                                                                 alignment: _descriptor_8.alignment() }
                                                                                                                                                             )).encode() } },
                                                                                                        { idx: { cached: true,
                                                                                                                 pushPath: false,
                                                                                                                 path: [
                                                                                                                        { tag: 'value',
                                                                                                                          value: { value: _descriptor_20.toValue(1n),
                                                                                                                                   alignment: _descriptor_20.alignment() } },
                                                                                                                        { tag: 'stack' }] } },
                                                                                                        { push: { storage: false,
                                                                                                                  value: __compactRuntime.StateValue.newCell({ value: _descriptor_5.toValue(merged_0),
                                                                                                                                                               alignment: _descriptor_5.alignment() }).encode() } },
                                                                                                        { swap: { n: 0 } },
                                                                                                        { concat: { cached: true,
                                                                                                                    n: 91 } },
                                                                                                        { ins: { cached: false,
                                                                                                                 n: 1 } },
                                                                                                        { ins: { cached: true,
                                                                                                                 n: 1 } }]) : (() => { throw new __compactRuntime.CompactError(`pool.compact line 130 char 5: Coin commitment not found. Check the coin has been received (or call 'createZswapOutput')`); })();
    } else {
      let t_5, t_6;
      const split_0 = this._sendImmediateShielded_0(context,
                                                    partialProofData,
                                                    inCoin_0,
                                                    this._left_0(this._ownPublicKey_0(context,
                                                                                      partialProofData)),
                                                    (t_5 = inCoin_0.value,
                                                     (t_6 = amountIn_0,
                                                      (__compactRuntime.assert(t_5
                                                                               >=
                                                                               t_6,
                                                                               'result of subtraction would be negative'),
                                                       t_5 - t_6))));
      __compactRuntime.assert(split_0.change.is_some,
                              'AMM: split change missing');
      const merged_1 = this._mergeCoinImmediate_0(context,
                                                  partialProofData,
                                                  potIn_0,
                                                  split_0.change.value);
      const tmp_1 = this._right_0(_descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                            partialProofData,
                                                                                            [
                                                                                             { dup: { n: 2 } },
                                                                                             { idx: { cached: true,
                                                                                                      pushPath: false,
                                                                                                      path: [
                                                                                                             { tag: 'value',
                                                                                                               value: { value: _descriptor_20.toValue(0n),
                                                                                                                        alignment: _descriptor_20.alignment() } }] } },
                                                                                             { popeq: { cached: true,
                                                                                                        result: undefined } }]).value));
      __compactRuntime.hasCoinCommitment(context, merged_1, tmp_1) ? __compactRuntime.queryLedgerState(context,
                                                                                                       partialProofData,
                                                                                                       [
                                                                                                        { idx: { cached: false,
                                                                                                                 pushPath: true,
                                                                                                                 path: [
                                                                                                                        { tag: 'value',
                                                                                                                          value: { value: _descriptor_20.toValue(5n),
                                                                                                                                   alignment: _descriptor_20.alignment() } }] } },
                                                                                                        { push: { storage: false,
                                                                                                                  value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(colorIn_0),
                                                                                                                                                               alignment: _descriptor_0.alignment() }).encode() } },
                                                                                                        { dup: { n: 5 } },
                                                                                                        { push: { storage: false,
                                                                                                                  value: __compactRuntime.StateValue.newCell(__compactRuntime.runtimeCoinCommitment(
                                                                                                                                                               { value: _descriptor_5.toValue(merged_1),
                                                                                                                                                                 alignment: _descriptor_5.alignment() },
                                                                                                                                                               { value: _descriptor_8.toValue(tmp_1),
                                                                                                                                                                 alignment: _descriptor_8.alignment() }
                                                                                                                                                             )).encode() } },
                                                                                                        { idx: { cached: true,
                                                                                                                 pushPath: false,
                                                                                                                 path: [
                                                                                                                        { tag: 'value',
                                                                                                                          value: { value: _descriptor_20.toValue(1n),
                                                                                                                                   alignment: _descriptor_20.alignment() } },
                                                                                                                        { tag: 'stack' }] } },
                                                                                                        { push: { storage: false,
                                                                                                                  value: __compactRuntime.StateValue.newCell({ value: _descriptor_5.toValue(merged_1),
                                                                                                                                                               alignment: _descriptor_5.alignment() }).encode() } },
                                                                                                        { swap: { n: 0 } },
                                                                                                        { concat: { cached: true,
                                                                                                                    n: 91 } },
                                                                                                        { ins: { cached: false,
                                                                                                                 n: 1 } },
                                                                                                        { ins: { cached: true,
                                                                                                                 n: 1 } }]) : (() => { throw new __compactRuntime.CompactError(`pool.compact line 140 char 5: Coin commitment not found. Check the coin has been received (or call 'createZswapOutput')`); })();
    }
    const sendVal_0 = amountOut_0;
    const result_0 = this._sendShielded_0(context,
                                          partialProofData,
                                          potOut_0,
                                          this._left_0(this._ownPublicKey_0(context,
                                                                            partialProofData)),
                                          sendVal_0);
    if (result_0.change.is_some) {
      const tmp_2 = result_0.change.value;
      const tmp_3 = this._right_0(_descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                            partialProofData,
                                                                                            [
                                                                                             { dup: { n: 2 } },
                                                                                             { idx: { cached: true,
                                                                                                      pushPath: false,
                                                                                                      path: [
                                                                                                             { tag: 'value',
                                                                                                               value: { value: _descriptor_20.toValue(0n),
                                                                                                                        alignment: _descriptor_20.alignment() } }] } },
                                                                                             { popeq: { cached: true,
                                                                                                        result: undefined } }]).value));
      __compactRuntime.hasCoinCommitment(context, tmp_2, tmp_3) ? __compactRuntime.queryLedgerState(context,
                                                                                                    partialProofData,
                                                                                                    [
                                                                                                     { idx: { cached: false,
                                                                                                              pushPath: true,
                                                                                                              path: [
                                                                                                                     { tag: 'value',
                                                                                                                       value: { value: _descriptor_20.toValue(5n),
                                                                                                                                alignment: _descriptor_20.alignment() } }] } },
                                                                                                     { push: { storage: false,
                                                                                                               value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(colorOut_0),
                                                                                                                                                            alignment: _descriptor_0.alignment() }).encode() } },
                                                                                                     { dup: { n: 5 } },
                                                                                                     { push: { storage: false,
                                                                                                               value: __compactRuntime.StateValue.newCell(__compactRuntime.runtimeCoinCommitment(
                                                                                                                                                            { value: _descriptor_5.toValue(tmp_2),
                                                                                                                                                              alignment: _descriptor_5.alignment() },
                                                                                                                                                            { value: _descriptor_8.toValue(tmp_3),
                                                                                                                                                              alignment: _descriptor_8.alignment() }
                                                                                                                                                          )).encode() } },
                                                                                                     { idx: { cached: true,
                                                                                                              pushPath: false,
                                                                                                              path: [
                                                                                                                     { tag: 'value',
                                                                                                                       value: { value: _descriptor_20.toValue(1n),
                                                                                                                                alignment: _descriptor_20.alignment() } },
                                                                                                                     { tag: 'stack' }] } },
                                                                                                     { push: { storage: false,
                                                                                                               value: __compactRuntime.StateValue.newCell({ value: _descriptor_5.toValue(tmp_2),
                                                                                                                                                            alignment: _descriptor_5.alignment() }).encode() } },
                                                                                                     { swap: { n: 0 } },
                                                                                                     { concat: { cached: true,
                                                                                                                 n: 91 } },
                                                                                                     { ins: { cached: false,
                                                                                                              n: 1 } },
                                                                                                     { ins: { cached: true,
                                                                                                              n: 1 } }]) : (() => { throw new __compactRuntime.CompactError(`pool.compact line 146 char 5: Coin commitment not found. Check the coin has been received (or call 'createZswapOutput')`); })();
    } else {
      __compactRuntime.queryLedgerState(context,
                                        partialProofData,
                                        [
                                         { idx: { cached: false,
                                                  pushPath: true,
                                                  path: [
                                                         { tag: 'value',
                                                           value: { value: _descriptor_20.toValue(5n),
                                                                    alignment: _descriptor_20.alignment() } }] } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(colorOut_0),
                                                                                                alignment: _descriptor_0.alignment() }).encode() } },
                                         { rem: { cached: false } },
                                         { ins: { cached: true, n: 1 } }]);
    }
    return [];
  }
  _addLiquidity_0(context,
                  partialProofData,
                  coinA_0,
                  amountA_0,
                  coinB_0,
                  amountB_0,
                  lpOut_0,
                  minLpOut_0,
                  nonceLp_0)
  {
    this._assertNotPaused_0(context, partialProofData);
    const colorA_0 = this._tokenColorA_0(context, partialProofData);
    const colorB_0 = this._tokenColorB_0(context, partialProofData);
    const cA_0 = coinA_0.color;
    const cB_0 = coinB_0.color;
    __compactRuntime.assert(this._equal_12(cA_0, colorA_0),
                            'AMM: coinA is not tokenA');
    __compactRuntime.assert(this._equal_13(cB_0, colorB_0),
                            'AMM: coinB is not tokenB');
    __compactRuntime.assert(_descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_20.toValue(5n),
                                                                                                                  alignment: _descriptor_20.alignment() } }] } },
                                                                                       { push: { storage: false,
                                                                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(cA_0),
                                                                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                                                                       'member',
                                                                                       { popeq: { cached: true,
                                                                                                  result: undefined } }]).value),
                            'AMM: pool reserve A missing');
    __compactRuntime.assert(_descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_20.toValue(5n),
                                                                                                                  alignment: _descriptor_20.alignment() } }] } },
                                                                                       { push: { storage: false,
                                                                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(cB_0),
                                                                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                                                                       'member',
                                                                                       { popeq: { cached: true,
                                                                                                  result: undefined } }]).value),
                            'AMM: pool reserve B missing');
    const potA_0 = _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                             partialProofData,
                                                                             [
                                                                              { dup: { n: 0 } },
                                                                              { idx: { cached: false,
                                                                                       pushPath: false,
                                                                                       path: [
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_20.toValue(5n),
                                                                                                         alignment: _descriptor_20.alignment() } }] } },
                                                                              { idx: { cached: false,
                                                                                       pushPath: false,
                                                                                       path: [
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_0.toValue(cA_0),
                                                                                                         alignment: _descriptor_0.alignment() } }] } },
                                                                              { popeq: { cached: false,
                                                                                         result: undefined } }]).value);
    const potB_0 = _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                             partialProofData,
                                                                             [
                                                                              { dup: { n: 0 } },
                                                                              { idx: { cached: false,
                                                                                       pushPath: false,
                                                                                       path: [
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_20.toValue(5n),
                                                                                                         alignment: _descriptor_20.alignment() } }] } },
                                                                              { idx: { cached: false,
                                                                                       pushPath: false,
                                                                                       path: [
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_0.toValue(cB_0),
                                                                                                         alignment: _descriptor_0.alignment() } }] } },
                                                                              { popeq: { cached: false,
                                                                                         result: undefined } }]).value);
    let t_0;
    __compactRuntime.assert((t_0 = _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                             partialProofData,
                                                                                             [
                                                                                              { dup: { n: 0 } },
                                                                                              { idx: { cached: false,
                                                                                                       pushPath: false,
                                                                                                       path: [
                                                                                                              { tag: 'value',
                                                                                                                value: { value: _descriptor_20.toValue(6n),
                                                                                                                         alignment: _descriptor_20.alignment() } }] } },
                                                                                              { popeq: { cached: false,
                                                                                                         result: undefined } }]).value),
                             t_0 > 0n),
                            'AMM: pool not seeded');
    let t_1;
    __compactRuntime.assert((t_1 = _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                             partialProofData,
                                                                                             [
                                                                                              { dup: { n: 0 } },
                                                                                              { idx: { cached: false,
                                                                                                       pushPath: false,
                                                                                                       path: [
                                                                                                              { tag: 'value',
                                                                                                                value: { value: _descriptor_20.toValue(6n),
                                                                                                                         alignment: _descriptor_20.alignment() } }] } },
                                                                                              { popeq: { cached: false,
                                                                                                         result: undefined } }]).value),
                             t_1 < 18446744073709551616n),
                            'AMM: supply too large');
    let t_2;
    __compactRuntime.assert((t_2 = potA_0.value, t_2 < 18446744073709551616n),
                            'AMM: reserve A too large');
    let t_3;
    __compactRuntime.assert((t_3 = potB_0.value, t_3 < 18446744073709551616n),
                            'AMM: reserve B too large');
    let t_4;
    __compactRuntime.assert((t_4 = coinA_0.value, t_4 < 18446744073709551616n),
                            'AMM: coinA too large');
    let t_5;
    __compactRuntime.assert((t_5 = coinB_0.value, t_5 < 18446744073709551616n),
                            'AMM: coinB too large');
    __compactRuntime.assert(amountA_0 > 0n && amountB_0 > 0n,
                            'AMM: zero deposit');
    __compactRuntime.assert(amountA_0
                            <=
                            ((t1) => {
                              if (t1 > 18446744073709551615n) {
                                throw new __compactRuntime.CompactError('pool.compact line 176 char 22: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                              }
                              return t1;
                            })(coinA_0.value),
                            'AMM: amountA exceeds coinA');
    __compactRuntime.assert(amountB_0
                            <=
                            ((t1) => {
                              if (t1 > 18446744073709551615n) {
                                throw new __compactRuntime.CompactError('pool.compact line 177 char 22: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                              }
                              return t1;
                            })(coinB_0.value),
                            'AMM: amountB exceeds coinB');
    __compactRuntime.assert(lpOut_0 > 0n, 'AMM: zero lpOut');
    __compactRuntime.assert(lpOut_0 < 18446744073709551616n,
                            'AMM: lpOut too large');
    const S_0 = ((t1) => {
                  if (t1 > 18446744073709551615n) {
                    throw new __compactRuntime.CompactError('pool.compact line 181 char 13: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                  }
                  return t1;
                })(_descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                             partialProofData,
                                                                             [
                                                                              { dup: { n: 0 } },
                                                                              { idx: { cached: false,
                                                                                       pushPath: false,
                                                                                       path: [
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_20.toValue(6n),
                                                                                                         alignment: _descriptor_20.alignment() } }] } },
                                                                              { popeq: { cached: false,
                                                                                         result: undefined } }]).value));
    const rA_0 = ((t1) => {
                   if (t1 > 18446744073709551615n) {
                     throw new __compactRuntime.CompactError('pool.compact line 182 char 14: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                   }
                   return t1;
                 })(potA_0.value);
    const rB_0 = ((t1) => {
                   if (t1 > 18446744073709551615n) {
                     throw new __compactRuntime.CompactError('pool.compact line 183 char 14: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                   }
                   return t1;
                 })(potB_0.value);
    let t_6; const le_0 = (t_6 = amountA_0 * rB_0, t_6 <= amountB_0 * rA_0);
    if (le_0) {
      let t_7;
      __compactRuntime.assert((t_7 = lpOut_0 * rA_0, t_7 <= amountA_0 * S_0),
                              'AMM: lpOut too high (A)');
      let t_8;
      __compactRuntime.assert((t_8 = amountA_0 * S_0,
                               t_8 < (lpOut_0 + 1n) * rA_0),
                              'AMM: lpOut too low (A)');
      let t_9;
      __compactRuntime.assert((t_9 = lpOut_0 * rB_0, t_9 <= amountB_0 * S_0),
                              'AMM: lpOut exceeds B side');
    } else {
      let t_10;
      __compactRuntime.assert((t_10 = lpOut_0 * rB_0, t_10 <= amountB_0 * S_0),
                              'AMM: lpOut too high (B)');
      let t_11;
      __compactRuntime.assert((t_11 = amountB_0 * S_0,
                               t_11 < (lpOut_0 + 1n) * rB_0),
                              'AMM: lpOut too low (B)');
      let t_12;
      __compactRuntime.assert((t_12 = lpOut_0 * rA_0, t_12 <= amountA_0 * S_0),
                              'AMM: lpOut exceeds A side');
    }
    __compactRuntime.assert(lpOut_0 >= minLpOut_0, 'AMM: below minLpOut');
    this._receiveShielded_0(context, partialProofData, coinA_0);
    if (this._equal_14(amountA_0,
                       ((t1) => {
                         if (t1 > 18446744073709551615n) {
                           throw new __compactRuntime.CompactError('pool.compact line 200 char 28: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                         }
                         return t1;
                       })(coinA_0.value)))
    {
      const mergedA_0 = this._mergeCoinImmediate_0(context,
                                                   partialProofData,
                                                   potA_0,
                                                   coinA_0);
      const tmp_0 = this._right_0(_descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                            partialProofData,
                                                                                            [
                                                                                             { dup: { n: 2 } },
                                                                                             { idx: { cached: true,
                                                                                                      pushPath: false,
                                                                                                      path: [
                                                                                                             { tag: 'value',
                                                                                                               value: { value: _descriptor_20.toValue(0n),
                                                                                                                        alignment: _descriptor_20.alignment() } }] } },
                                                                                             { popeq: { cached: true,
                                                                                                        result: undefined } }]).value));
      __compactRuntime.hasCoinCommitment(context, mergedA_0, tmp_0) ? __compactRuntime.queryLedgerState(context,
                                                                                                        partialProofData,
                                                                                                        [
                                                                                                         { idx: { cached: false,
                                                                                                                  pushPath: true,
                                                                                                                  path: [
                                                                                                                         { tag: 'value',
                                                                                                                           value: { value: _descriptor_20.toValue(5n),
                                                                                                                                    alignment: _descriptor_20.alignment() } }] } },
                                                                                                         { push: { storage: false,
                                                                                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(cA_0),
                                                                                                                                                                alignment: _descriptor_0.alignment() }).encode() } },
                                                                                                         { dup: { n: 5 } },
                                                                                                         { push: { storage: false,
                                                                                                                   value: __compactRuntime.StateValue.newCell(__compactRuntime.runtimeCoinCommitment(
                                                                                                                                                                { value: _descriptor_5.toValue(mergedA_0),
                                                                                                                                                                  alignment: _descriptor_5.alignment() },
                                                                                                                                                                { value: _descriptor_8.toValue(tmp_0),
                                                                                                                                                                  alignment: _descriptor_8.alignment() }
                                                                                                                                                              )).encode() } },
                                                                                                         { idx: { cached: true,
                                                                                                                  pushPath: false,
                                                                                                                  path: [
                                                                                                                         { tag: 'value',
                                                                                                                           value: { value: _descriptor_20.toValue(1n),
                                                                                                                                    alignment: _descriptor_20.alignment() } },
                                                                                                                         { tag: 'stack' }] } },
                                                                                                         { push: { storage: false,
                                                                                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_5.toValue(mergedA_0),
                                                                                                                                                                alignment: _descriptor_5.alignment() }).encode() } },
                                                                                                         { swap: { n: 0 } },
                                                                                                         { concat: { cached: true,
                                                                                                                     n: 91 } },
                                                                                                         { ins: { cached: false,
                                                                                                                  n: 1 } },
                                                                                                         { ins: { cached: true,
                                                                                                                  n: 1 } }]) : (() => { throw new __compactRuntime.CompactError(`pool.compact line 202 char 5: Coin commitment not found. Check the coin has been received (or call 'createZswapOutput')`); })();
    } else {
      let t_13, t_14;
      const splitA_0 = this._sendImmediateShielded_0(context,
                                                     partialProofData,
                                                     coinA_0,
                                                     this._left_0(this._ownPublicKey_0(context,
                                                                                       partialProofData)),
                                                     (t_13 = coinA_0.value,
                                                      (t_14 = amountA_0,
                                                       (__compactRuntime.assert(t_13
                                                                                >=
                                                                                t_14,
                                                                                'result of subtraction would be negative'),
                                                        t_13 - t_14))));
      __compactRuntime.assert(splitA_0.change.is_some,
                              'AMM: split change A missing');
      const mergedA_1 = this._mergeCoinImmediate_0(context,
                                                   partialProofData,
                                                   potA_0,
                                                   splitA_0.change.value);
      const tmp_1 = this._right_0(_descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                            partialProofData,
                                                                                            [
                                                                                             { dup: { n: 2 } },
                                                                                             { idx: { cached: true,
                                                                                                      pushPath: false,
                                                                                                      path: [
                                                                                                             { tag: 'value',
                                                                                                               value: { value: _descriptor_20.toValue(0n),
                                                                                                                        alignment: _descriptor_20.alignment() } }] } },
                                                                                             { popeq: { cached: true,
                                                                                                        result: undefined } }]).value));
      __compactRuntime.hasCoinCommitment(context, mergedA_1, tmp_1) ? __compactRuntime.queryLedgerState(context,
                                                                                                        partialProofData,
                                                                                                        [
                                                                                                         { idx: { cached: false,
                                                                                                                  pushPath: true,
                                                                                                                  path: [
                                                                                                                         { tag: 'value',
                                                                                                                           value: { value: _descriptor_20.toValue(5n),
                                                                                                                                    alignment: _descriptor_20.alignment() } }] } },
                                                                                                         { push: { storage: false,
                                                                                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(cA_0),
                                                                                                                                                                alignment: _descriptor_0.alignment() }).encode() } },
                                                                                                         { dup: { n: 5 } },
                                                                                                         { push: { storage: false,
                                                                                                                   value: __compactRuntime.StateValue.newCell(__compactRuntime.runtimeCoinCommitment(
                                                                                                                                                                { value: _descriptor_5.toValue(mergedA_1),
                                                                                                                                                                  alignment: _descriptor_5.alignment() },
                                                                                                                                                                { value: _descriptor_8.toValue(tmp_1),
                                                                                                                                                                  alignment: _descriptor_8.alignment() }
                                                                                                                                                              )).encode() } },
                                                                                                         { idx: { cached: true,
                                                                                                                  pushPath: false,
                                                                                                                  path: [
                                                                                                                         { tag: 'value',
                                                                                                                           value: { value: _descriptor_20.toValue(1n),
                                                                                                                                    alignment: _descriptor_20.alignment() } },
                                                                                                                         { tag: 'stack' }] } },
                                                                                                         { push: { storage: false,
                                                                                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_5.toValue(mergedA_1),
                                                                                                                                                                alignment: _descriptor_5.alignment() }).encode() } },
                                                                                                         { swap: { n: 0 } },
                                                                                                         { concat: { cached: true,
                                                                                                                     n: 91 } },
                                                                                                         { ins: { cached: false,
                                                                                                                  n: 1 } },
                                                                                                         { ins: { cached: true,
                                                                                                                  n: 1 } }]) : (() => { throw new __compactRuntime.CompactError(`pool.compact line 207 char 5: Coin commitment not found. Check the coin has been received (or call 'createZswapOutput')`); })();
    }
    this._receiveShielded_0(context, partialProofData, coinB_0);
    if (this._equal_15(amountB_0,
                       ((t1) => {
                         if (t1 > 18446744073709551615n) {
                           throw new __compactRuntime.CompactError('pool.compact line 210 char 28: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                         }
                         return t1;
                       })(coinB_0.value)))
    {
      const mergedB_0 = this._mergeCoinImmediate_0(context,
                                                   partialProofData,
                                                   potB_0,
                                                   coinB_0);
      const tmp_2 = this._right_0(_descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                            partialProofData,
                                                                                            [
                                                                                             { dup: { n: 2 } },
                                                                                             { idx: { cached: true,
                                                                                                      pushPath: false,
                                                                                                      path: [
                                                                                                             { tag: 'value',
                                                                                                               value: { value: _descriptor_20.toValue(0n),
                                                                                                                        alignment: _descriptor_20.alignment() } }] } },
                                                                                             { popeq: { cached: true,
                                                                                                        result: undefined } }]).value));
      __compactRuntime.hasCoinCommitment(context, mergedB_0, tmp_2) ? __compactRuntime.queryLedgerState(context,
                                                                                                        partialProofData,
                                                                                                        [
                                                                                                         { idx: { cached: false,
                                                                                                                  pushPath: true,
                                                                                                                  path: [
                                                                                                                         { tag: 'value',
                                                                                                                           value: { value: _descriptor_20.toValue(5n),
                                                                                                                                    alignment: _descriptor_20.alignment() } }] } },
                                                                                                         { push: { storage: false,
                                                                                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(cB_0),
                                                                                                                                                                alignment: _descriptor_0.alignment() }).encode() } },
                                                                                                         { dup: { n: 5 } },
                                                                                                         { push: { storage: false,
                                                                                                                   value: __compactRuntime.StateValue.newCell(__compactRuntime.runtimeCoinCommitment(
                                                                                                                                                                { value: _descriptor_5.toValue(mergedB_0),
                                                                                                                                                                  alignment: _descriptor_5.alignment() },
                                                                                                                                                                { value: _descriptor_8.toValue(tmp_2),
                                                                                                                                                                  alignment: _descriptor_8.alignment() }
                                                                                                                                                              )).encode() } },
                                                                                                         { idx: { cached: true,
                                                                                                                  pushPath: false,
                                                                                                                  path: [
                                                                                                                         { tag: 'value',
                                                                                                                           value: { value: _descriptor_20.toValue(1n),
                                                                                                                                    alignment: _descriptor_20.alignment() } },
                                                                                                                         { tag: 'stack' }] } },
                                                                                                         { push: { storage: false,
                                                                                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_5.toValue(mergedB_0),
                                                                                                                                                                alignment: _descriptor_5.alignment() }).encode() } },
                                                                                                         { swap: { n: 0 } },
                                                                                                         { concat: { cached: true,
                                                                                                                     n: 91 } },
                                                                                                         { ins: { cached: false,
                                                                                                                  n: 1 } },
                                                                                                         { ins: { cached: true,
                                                                                                                  n: 1 } }]) : (() => { throw new __compactRuntime.CompactError(`pool.compact line 212 char 5: Coin commitment not found. Check the coin has been received (or call 'createZswapOutput')`); })();
    } else {
      let t_15, t_16;
      const splitB_0 = this._sendImmediateShielded_0(context,
                                                     partialProofData,
                                                     coinB_0,
                                                     this._left_0(this._ownPublicKey_0(context,
                                                                                       partialProofData)),
                                                     (t_15 = coinB_0.value,
                                                      (t_16 = amountB_0,
                                                       (__compactRuntime.assert(t_15
                                                                                >=
                                                                                t_16,
                                                                                'result of subtraction would be negative'),
                                                        t_15 - t_16))));
      __compactRuntime.assert(splitB_0.change.is_some,
                              'AMM: split change B missing');
      const mergedB_1 = this._mergeCoinImmediate_0(context,
                                                   partialProofData,
                                                   potB_0,
                                                   splitB_0.change.value);
      const tmp_3 = this._right_0(_descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                            partialProofData,
                                                                                            [
                                                                                             { dup: { n: 2 } },
                                                                                             { idx: { cached: true,
                                                                                                      pushPath: false,
                                                                                                      path: [
                                                                                                             { tag: 'value',
                                                                                                               value: { value: _descriptor_20.toValue(0n),
                                                                                                                        alignment: _descriptor_20.alignment() } }] } },
                                                                                             { popeq: { cached: true,
                                                                                                        result: undefined } }]).value));
      __compactRuntime.hasCoinCommitment(context, mergedB_1, tmp_3) ? __compactRuntime.queryLedgerState(context,
                                                                                                        partialProofData,
                                                                                                        [
                                                                                                         { idx: { cached: false,
                                                                                                                  pushPath: true,
                                                                                                                  path: [
                                                                                                                         { tag: 'value',
                                                                                                                           value: { value: _descriptor_20.toValue(5n),
                                                                                                                                    alignment: _descriptor_20.alignment() } }] } },
                                                                                                         { push: { storage: false,
                                                                                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(cB_0),
                                                                                                                                                                alignment: _descriptor_0.alignment() }).encode() } },
                                                                                                         { dup: { n: 5 } },
                                                                                                         { push: { storage: false,
                                                                                                                   value: __compactRuntime.StateValue.newCell(__compactRuntime.runtimeCoinCommitment(
                                                                                                                                                                { value: _descriptor_5.toValue(mergedB_1),
                                                                                                                                                                  alignment: _descriptor_5.alignment() },
                                                                                                                                                                { value: _descriptor_8.toValue(tmp_3),
                                                                                                                                                                  alignment: _descriptor_8.alignment() }
                                                                                                                                                              )).encode() } },
                                                                                                         { idx: { cached: true,
                                                                                                                  pushPath: false,
                                                                                                                  path: [
                                                                                                                         { tag: 'value',
                                                                                                                           value: { value: _descriptor_20.toValue(1n),
                                                                                                                                    alignment: _descriptor_20.alignment() } },
                                                                                                                         { tag: 'stack' }] } },
                                                                                                         { push: { storage: false,
                                                                                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_5.toValue(mergedB_1),
                                                                                                                                                                alignment: _descriptor_5.alignment() }).encode() } },
                                                                                                         { swap: { n: 0 } },
                                                                                                         { concat: { cached: true,
                                                                                                                     n: 91 } },
                                                                                                         { ins: { cached: false,
                                                                                                                  n: 1 } },
                                                                                                         { ins: { cached: true,
                                                                                                                  n: 1 } }]) : (() => { throw new __compactRuntime.CompactError(`pool.compact line 217 char 5: Coin commitment not found. Check the coin has been received (or call 'createZswapOutput')`); })();
    }
    const lpCoin_0 = this._mintShieldedToken_0(context,
                                               partialProofData,
                                               new Uint8Array([109, 110, 45, 97, 109, 109, 58, 108, 112, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                               lpOut_0,
                                               nonceLp_0,
                                               this._right_0(_descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                                       partialProofData,
                                                                                                                       [
                                                                                                                        { dup: { n: 2 } },
                                                                                                                        { idx: { cached: true,
                                                                                                                                 pushPath: false,
                                                                                                                                 path: [
                                                                                                                                        { tag: 'value',
                                                                                                                                          value: { value: _descriptor_20.toValue(0n),
                                                                                                                                                   alignment: _descriptor_20.alignment() } }] } },
                                                                                                                        { popeq: { cached: true,
                                                                                                                                   result: undefined } }]).value)));
    const sentLp_0 = this._sendImmediateShielded_0(context,
                                                   partialProofData,
                                                   lpCoin_0,
                                                   this._left_0(this._ownPublicKey_0(context,
                                                                                     partialProofData)),
                                                   lpCoin_0.value);
    const tmp_4 = ((t1) => {
                    if (t1 > 340282366920938463463374607431768211455n) {
                      throw new __compactRuntime.CompactError('pool.compact line 222 char 24: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 340282366920938463463374607431768211455');
                    }
                    return t1;
                  })(_descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                               partialProofData,
                                                                               [
                                                                                { dup: { n: 0 } },
                                                                                { idx: { cached: false,
                                                                                         pushPath: false,
                                                                                         path: [
                                                                                                { tag: 'value',
                                                                                                  value: { value: _descriptor_20.toValue(6n),
                                                                                                           alignment: _descriptor_20.alignment() } }] } },
                                                                                { popeq: { cached: false,
                                                                                           result: undefined } }]).value)
                     +
                     lpOut_0);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_20.toValue(6n),
                                                                                              alignment: _descriptor_20.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(tmp_4),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    return sentLp_0.sent;
  }
  _removeLiquidity_0(context,
                     partialProofData,
                     coinLp_0,
                     amountLp_0,
                     aOut_0,
                     bOut_0,
                     minA_0,
                     minB_0,
                     nonceA_0,
                     nonceB_0)
  {
    this._assertNotPaused_0(context, partialProofData);
    const colorLp_0 = this._lpColor_0(context, partialProofData);
    const cLp_0 = coinLp_0.color;
    __compactRuntime.assert(this._equal_16(cLp_0, colorLp_0),
                            'AMM: coin is not LP token');
    const colorA_0 = this._tokenColorA_0(context, partialProofData);
    const colorB_0 = this._tokenColorB_0(context, partialProofData);
    __compactRuntime.assert(_descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_20.toValue(5n),
                                                                                                                  alignment: _descriptor_20.alignment() } }] } },
                                                                                       { push: { storage: false,
                                                                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(colorA_0),
                                                                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                                                                       'member',
                                                                                       { popeq: { cached: true,
                                                                                                  result: undefined } }]).value),
                            'AMM: pool reserve A missing');
    __compactRuntime.assert(_descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_20.toValue(5n),
                                                                                                                  alignment: _descriptor_20.alignment() } }] } },
                                                                                       { push: { storage: false,
                                                                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(colorB_0),
                                                                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                                                                       'member',
                                                                                       { popeq: { cached: true,
                                                                                                  result: undefined } }]).value),
                            'AMM: pool reserve B missing');
    const potA_0 = _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                             partialProofData,
                                                                             [
                                                                              { dup: { n: 0 } },
                                                                              { idx: { cached: false,
                                                                                       pushPath: false,
                                                                                       path: [
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_20.toValue(5n),
                                                                                                         alignment: _descriptor_20.alignment() } }] } },
                                                                              { idx: { cached: false,
                                                                                       pushPath: false,
                                                                                       path: [
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_0.toValue(colorA_0),
                                                                                                         alignment: _descriptor_0.alignment() } }] } },
                                                                              { popeq: { cached: false,
                                                                                         result: undefined } }]).value);
    const potB_0 = _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                             partialProofData,
                                                                             [
                                                                              { dup: { n: 0 } },
                                                                              { idx: { cached: false,
                                                                                       pushPath: false,
                                                                                       path: [
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_20.toValue(5n),
                                                                                                         alignment: _descriptor_20.alignment() } }] } },
                                                                              { idx: { cached: false,
                                                                                       pushPath: false,
                                                                                       path: [
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_0.toValue(colorB_0),
                                                                                                         alignment: _descriptor_0.alignment() } }] } },
                                                                              { popeq: { cached: false,
                                                                                         result: undefined } }]).value);
    let t_0;
    __compactRuntime.assert((t_0 = _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                             partialProofData,
                                                                                             [
                                                                                              { dup: { n: 0 } },
                                                                                              { idx: { cached: false,
                                                                                                       pushPath: false,
                                                                                                       path: [
                                                                                                              { tag: 'value',
                                                                                                                value: { value: _descriptor_20.toValue(6n),
                                                                                                                         alignment: _descriptor_20.alignment() } }] } },
                                                                                              { popeq: { cached: false,
                                                                                                         result: undefined } }]).value),
                             t_0 > 0n),
                            'AMM: no LP supply');
    let t_1;
    __compactRuntime.assert((t_1 = _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                             partialProofData,
                                                                                             [
                                                                                              { dup: { n: 0 } },
                                                                                              { idx: { cached: false,
                                                                                                       pushPath: false,
                                                                                                       path: [
                                                                                                              { tag: 'value',
                                                                                                                value: { value: _descriptor_20.toValue(6n),
                                                                                                                         alignment: _descriptor_20.alignment() } }] } },
                                                                                              { popeq: { cached: false,
                                                                                                         result: undefined } }]).value),
                             t_1 < 18446744073709551616n),
                            'AMM: supply too large');
    let t_2;
    __compactRuntime.assert((t_2 = potA_0.value, t_2 < 18446744073709551616n),
                            'AMM: reserve A too large');
    let t_3;
    __compactRuntime.assert((t_3 = potB_0.value, t_3 < 18446744073709551616n),
                            'AMM: reserve B too large');
    let t_4;
    __compactRuntime.assert((t_4 = coinLp_0.value, t_4 < 18446744073709551616n),
                            'AMM: LP coin too large');
    __compactRuntime.assert(amountLp_0 > 0n, 'AMM: zero amountLp');
    __compactRuntime.assert(amountLp_0
                            <=
                            ((t1) => {
                              if (t1 > 18446744073709551615n) {
                                throw new __compactRuntime.CompactError('pool.compact line 248 char 23: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                              }
                              return t1;
                            })(coinLp_0.value),
                            'AMM: amountLp exceeds coin');
    __compactRuntime.assert(amountLp_0
                            <=
                            ((t1) => {
                              if (t1 > 18446744073709551615n) {
                                throw new __compactRuntime.CompactError('pool.compact line 249 char 23: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                              }
                              return t1;
                            })(_descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                         partialProofData,
                                                                                         [
                                                                                          { dup: { n: 0 } },
                                                                                          { idx: { cached: false,
                                                                                                   pushPath: false,
                                                                                                   path: [
                                                                                                          { tag: 'value',
                                                                                                            value: { value: _descriptor_20.toValue(6n),
                                                                                                                     alignment: _descriptor_20.alignment() } }] } },
                                                                                          { popeq: { cached: false,
                                                                                                     result: undefined } }]).value)),
                            'AMM: amountLp exceeds supply');
    __compactRuntime.assert(aOut_0 > 0n && bOut_0 > 0n, 'AMM: zero payout');
    __compactRuntime.assert(aOut_0 <= potA_0.value,
                            'AMM: payout A exceeds reserve');
    __compactRuntime.assert(bOut_0 <= potB_0.value,
                            'AMM: payout B exceeds reserve');
    const S_0 = ((t1) => {
                  if (t1 > 18446744073709551615n) {
                    throw new __compactRuntime.CompactError('pool.compact line 254 char 13: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                  }
                  return t1;
                })(_descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                             partialProofData,
                                                                             [
                                                                              { dup: { n: 0 } },
                                                                              { idx: { cached: false,
                                                                                       pushPath: false,
                                                                                       path: [
                                                                                              { tag: 'value',
                                                                                                value: { value: _descriptor_20.toValue(6n),
                                                                                                         alignment: _descriptor_20.alignment() } }] } },
                                                                              { popeq: { cached: false,
                                                                                         result: undefined } }]).value));
    const rA_0 = ((t1) => {
                   if (t1 > 18446744073709551615n) {
                     throw new __compactRuntime.CompactError('pool.compact line 255 char 14: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                   }
                   return t1;
                 })(potA_0.value);
    const rB_0 = ((t1) => {
                   if (t1 > 18446744073709551615n) {
                     throw new __compactRuntime.CompactError('pool.compact line 256 char 14: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                   }
                   return t1;
                 })(potB_0.value);
    const amt_0 = amountLp_0;
    let t_5;
    __compactRuntime.assert((t_5 = aOut_0 * S_0, t_5 <= amt_0 * rA_0),
                            'AMM: aOut too high');
    let t_6;
    __compactRuntime.assert((t_6 = amt_0 * rA_0, t_6 < (aOut_0 + 1n) * S_0),
                            'AMM: aOut too low');
    let t_7;
    __compactRuntime.assert((t_7 = bOut_0 * S_0, t_7 <= amt_0 * rB_0),
                            'AMM: bOut too high');
    let t_8;
    __compactRuntime.assert((t_8 = amt_0 * rB_0, t_8 < (bOut_0 + 1n) * S_0),
                            'AMM: bOut too low');
    __compactRuntime.assert(aOut_0 >= minA_0, 'AMM: below minA');
    __compactRuntime.assert(bOut_0 >= minB_0, 'AMM: below minB');
    this._receiveShielded_0(context, partialProofData, coinLp_0);
    const burnRes_0 = this._sendImmediateShielded_0(context,
                                                    partialProofData,
                                                    coinLp_0,
                                                    this._shieldedBurnAddress_0(),
                                                    amountLp_0);
    if (burnRes_0.change.is_some) {
      this._sendImmediateShielded_0(context,
                                    partialProofData,
                                    burnRes_0.change.value,
                                    this._left_0(this._ownPublicKey_0(context,
                                                                      partialProofData)),
                                    burnRes_0.change.value.value);
    }
    const resA_0 = this._sendShielded_0(context,
                                        partialProofData,
                                        potA_0,
                                        this._left_0(this._ownPublicKey_0(context,
                                                                          partialProofData)),
                                        aOut_0);
    if (resA_0.change.is_some) {
      const tmp_0 = resA_0.change.value;
      const tmp_1 = this._right_0(_descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                            partialProofData,
                                                                                            [
                                                                                             { dup: { n: 2 } },
                                                                                             { idx: { cached: true,
                                                                                                      pushPath: false,
                                                                                                      path: [
                                                                                                             { tag: 'value',
                                                                                                               value: { value: _descriptor_20.toValue(0n),
                                                                                                                        alignment: _descriptor_20.alignment() } }] } },
                                                                                             { popeq: { cached: true,
                                                                                                        result: undefined } }]).value));
      __compactRuntime.hasCoinCommitment(context, tmp_0, tmp_1) ? __compactRuntime.queryLedgerState(context,
                                                                                                    partialProofData,
                                                                                                    [
                                                                                                     { idx: { cached: false,
                                                                                                              pushPath: true,
                                                                                                              path: [
                                                                                                                     { tag: 'value',
                                                                                                                       value: { value: _descriptor_20.toValue(5n),
                                                                                                                                alignment: _descriptor_20.alignment() } }] } },
                                                                                                     { push: { storage: false,
                                                                                                               value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(colorA_0),
                                                                                                                                                            alignment: _descriptor_0.alignment() }).encode() } },
                                                                                                     { dup: { n: 5 } },
                                                                                                     { push: { storage: false,
                                                                                                               value: __compactRuntime.StateValue.newCell(__compactRuntime.runtimeCoinCommitment(
                                                                                                                                                            { value: _descriptor_5.toValue(tmp_0),
                                                                                                                                                              alignment: _descriptor_5.alignment() },
                                                                                                                                                            { value: _descriptor_8.toValue(tmp_1),
                                                                                                                                                              alignment: _descriptor_8.alignment() }
                                                                                                                                                          )).encode() } },
                                                                                                     { idx: { cached: true,
                                                                                                              pushPath: false,
                                                                                                              path: [
                                                                                                                     { tag: 'value',
                                                                                                                       value: { value: _descriptor_20.toValue(1n),
                                                                                                                                alignment: _descriptor_20.alignment() } },
                                                                                                                     { tag: 'stack' }] } },
                                                                                                     { push: { storage: false,
                                                                                                               value: __compactRuntime.StateValue.newCell({ value: _descriptor_5.toValue(tmp_0),
                                                                                                                                                            alignment: _descriptor_5.alignment() }).encode() } },
                                                                                                     { swap: { n: 0 } },
                                                                                                     { concat: { cached: true,
                                                                                                                 n: 91 } },
                                                                                                     { ins: { cached: false,
                                                                                                              n: 1 } },
                                                                                                     { ins: { cached: true,
                                                                                                              n: 1 } }]) : (() => { throw new __compactRuntime.CompactError(`pool.compact line 274 char 5: Coin commitment not found. Check the coin has been received (or call 'createZswapOutput')`); })();
    } else {
      __compactRuntime.queryLedgerState(context,
                                        partialProofData,
                                        [
                                         { idx: { cached: false,
                                                  pushPath: true,
                                                  path: [
                                                         { tag: 'value',
                                                           value: { value: _descriptor_20.toValue(5n),
                                                                    alignment: _descriptor_20.alignment() } }] } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(colorA_0),
                                                                                                alignment: _descriptor_0.alignment() }).encode() } },
                                         { rem: { cached: false } },
                                         { ins: { cached: true, n: 1 } }]);
    }
    const resB_0 = this._sendShielded_0(context,
                                        partialProofData,
                                        potB_0,
                                        this._left_0(this._ownPublicKey_0(context,
                                                                          partialProofData)),
                                        bOut_0);
    if (resB_0.change.is_some) {
      const tmp_2 = resB_0.change.value;
      const tmp_3 = this._right_0(_descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                            partialProofData,
                                                                                            [
                                                                                             { dup: { n: 2 } },
                                                                                             { idx: { cached: true,
                                                                                                      pushPath: false,
                                                                                                      path: [
                                                                                                             { tag: 'value',
                                                                                                               value: { value: _descriptor_20.toValue(0n),
                                                                                                                        alignment: _descriptor_20.alignment() } }] } },
                                                                                             { popeq: { cached: true,
                                                                                                        result: undefined } }]).value));
      __compactRuntime.hasCoinCommitment(context, tmp_2, tmp_3) ? __compactRuntime.queryLedgerState(context,
                                                                                                    partialProofData,
                                                                                                    [
                                                                                                     { idx: { cached: false,
                                                                                                              pushPath: true,
                                                                                                              path: [
                                                                                                                     { tag: 'value',
                                                                                                                       value: { value: _descriptor_20.toValue(5n),
                                                                                                                                alignment: _descriptor_20.alignment() } }] } },
                                                                                                     { push: { storage: false,
                                                                                                               value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(colorB_0),
                                                                                                                                                            alignment: _descriptor_0.alignment() }).encode() } },
                                                                                                     { dup: { n: 5 } },
                                                                                                     { push: { storage: false,
                                                                                                               value: __compactRuntime.StateValue.newCell(__compactRuntime.runtimeCoinCommitment(
                                                                                                                                                            { value: _descriptor_5.toValue(tmp_2),
                                                                                                                                                              alignment: _descriptor_5.alignment() },
                                                                                                                                                            { value: _descriptor_8.toValue(tmp_3),
                                                                                                                                                              alignment: _descriptor_8.alignment() }
                                                                                                                                                          )).encode() } },
                                                                                                     { idx: { cached: true,
                                                                                                              pushPath: false,
                                                                                                              path: [
                                                                                                                     { tag: 'value',
                                                                                                                       value: { value: _descriptor_20.toValue(1n),
                                                                                                                                alignment: _descriptor_20.alignment() } },
                                                                                                                     { tag: 'stack' }] } },
                                                                                                     { push: { storage: false,
                                                                                                               value: __compactRuntime.StateValue.newCell({ value: _descriptor_5.toValue(tmp_2),
                                                                                                                                                            alignment: _descriptor_5.alignment() }).encode() } },
                                                                                                     { swap: { n: 0 } },
                                                                                                     { concat: { cached: true,
                                                                                                                 n: 91 } },
                                                                                                     { ins: { cached: false,
                                                                                                              n: 1 } },
                                                                                                     { ins: { cached: true,
                                                                                                              n: 1 } }]) : (() => { throw new __compactRuntime.CompactError(`pool.compact line 280 char 5: Coin commitment not found. Check the coin has been received (or call 'createZswapOutput')`); })();
    } else {
      __compactRuntime.queryLedgerState(context,
                                        partialProofData,
                                        [
                                         { idx: { cached: false,
                                                  pushPath: true,
                                                  path: [
                                                         { tag: 'value',
                                                           value: { value: _descriptor_20.toValue(5n),
                                                                    alignment: _descriptor_20.alignment() } }] } },
                                         { push: { storage: false,
                                                   value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(colorB_0),
                                                                                                alignment: _descriptor_0.alignment() }).encode() } },
                                         { rem: { cached: false } },
                                         { ins: { cached: true, n: 1 } }]);
    }
    let t_9, t_10;
    const tmp_4 = (t_9 = _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                   partialProofData,
                                                                                   [
                                                                                    { dup: { n: 0 } },
                                                                                    { idx: { cached: false,
                                                                                             pushPath: false,
                                                                                             path: [
                                                                                                    { tag: 'value',
                                                                                                      value: { value: _descriptor_20.toValue(6n),
                                                                                                               alignment: _descriptor_20.alignment() } }] } },
                                                                                    { popeq: { cached: false,
                                                                                               result: undefined } }]).value),
                   (t_10 = amountLp_0,
                    (__compactRuntime.assert(t_9 >= t_10,
                                             'result of subtraction would be negative'),
                     t_9 - t_10)));
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_20.toValue(6n),
                                                                                              alignment: _descriptor_20.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(tmp_4),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    return [resA_0.sent, resB_0.sent];
  }
  _pause_0(context, partialProofData) {
    this._assertOnlyOwner_0(context, partialProofData);
    this.__pause_0(context, partialProofData);
    return [];
  }
  _unpause_0(context, partialProofData) {
    this._assertOnlyOwner_0(context, partialProofData);
    this.__unpause_0(context, partialProofData);
    return [];
  }
  _equal_0(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_1(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_2(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_3(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_4(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_5(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_6(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_7(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_8(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_9(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_10(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_11(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_12(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_13(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_14(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_15(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_16(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
}
export function ledger(stateOrChargedState) {
  const state = stateOrChargedState instanceof __compactRuntime.StateValue ? stateOrChargedState : stateOrChargedState.state;
  const chargedState = stateOrChargedState instanceof __compactRuntime.StateValue ? new __compactRuntime.ChargedState(stateOrChargedState) : stateOrChargedState;
  const context = {
    currentQueryContext: new __compactRuntime.QueryContext(chargedState, __compactRuntime.dummyContractAddress()),
    costModel: __compactRuntime.CostModel.initialCostModel()
  };
  const partialProofData = {
    input: { value: [], alignment: [] },
    output: undefined,
    publicTranscript: [],
    privateTranscriptOutputs: []
  };
  return {
    _coins: {
      isEmpty(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_20.toValue(5n),
                                                                                                     alignment: _descriptor_20.alignment() } }] } },
                                                                          'size',
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(0n),
                                                                                                                                 alignment: _descriptor_2.alignment() }).encode() } },
                                                                          'eq',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_20.toValue(5n),
                                                                                                     alignment: _descriptor_20.alignment() } }] } },
                                                                          'size',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      member(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(key_0.buffer instanceof ArrayBuffer && key_0.BYTES_PER_ELEMENT === 1 && key_0.length === 32)) {
          __compactRuntime.typeError('member',
                                     'argument 1',
                                     'pool.compact line 19 char 1',
                                     'Bytes<32>',
                                     key_0)
        }
        return _descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_20.toValue(5n),
                                                                                                     alignment: _descriptor_20.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(key_0),
                                                                                                                                 alignment: _descriptor_0.alignment() }).encode() } },
                                                                          'member',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      lookup(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`lookup: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(key_0.buffer instanceof ArrayBuffer && key_0.BYTES_PER_ELEMENT === 1 && key_0.length === 32)) {
          __compactRuntime.typeError('lookup',
                                     'argument 1',
                                     'pool.compact line 19 char 1',
                                     'Bytes<32>',
                                     key_0)
        }
        return _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_20.toValue(5n),
                                                                                                     alignment: _descriptor_20.alignment() } }] } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_0.toValue(key_0),
                                                                                                     alignment: _descriptor_0.alignment() } }] } },
                                                                          { popeq: { cached: false,
                                                                                     result: undefined } }]).value);
      },
      [Symbol.iterator](...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`iter: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[5];
        return self_0.asMap().keys().map(  (key) => {    const value = self_0.asMap().get(key).asCell();    return [      _descriptor_0.fromValue(key.value),      _descriptor_3.fromValue(value.value)    ];  })[Symbol.iterator]();
      }
    },
    get _lpSupply() {
      return _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_20.toValue(6n),
                                                                                                   alignment: _descriptor_20.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    }
  };
}
const _emptyContext = {
  currentQueryContext: new __compactRuntime.QueryContext(new __compactRuntime.ContractState().data, __compactRuntime.dummyContractAddress())
};
const _dummyContract = new Contract({
  wit_secretNonce: (...args) => undefined
});
export const pureCircuits = {};
export const contractReferenceLocations =
  { tag: 'publicLedgerArray', indices: { } };
//# sourceMappingURL=index.js.map
