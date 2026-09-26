// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
export class Contract<T = any, U = any> {
  _phantomT?: T;
  _phantomU?: U;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(..._args: any[]) {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  callTx: any = {};
}

export type Ledger = Record<string, unknown>;

export const CompiledThresholdContractContract = {} as any;
export type ThresholdContractContract = any;
