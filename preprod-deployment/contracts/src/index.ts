import { CompiledContract } from "@midnight-ntwrk/midnight-js-protocol/compact-js";

export * from "./managed/threshold/contract/index.js";
export * from "./witnesses.js";

import * as CompiledThresholdContract from "./managed/threshold/contract/index.js";
import * as Witnesses from "./witnesses.js";

class ContractWrapper extends CompiledThresholdContract.Contract<any, any> {
  constructor() {
    super(Witnesses.witnesses);
  }
}

export const CompiledThresholdContractContract = CompiledContract.make(
  "threshold",
  ContractWrapper as any
).pipe(
  CompiledContract.withCompiledFileAssets("./managed/threshold")
) as any;
