import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<PS> = {
  callerSecretKey(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  attestationIncome(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, bigint];
  attestationSalt(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
}

export type ImpureCircuits<PS> = {
  registerIssuer(context: __compactRuntime.CircuitContext<PS>,
                 issuerId_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  createListing(context: __compactRuntime.CircuitContext<PS>,
                rentAmount_0: bigint): __compactRuntime.CircuitResults<PS, bigint>;
  issueAttestation(context: __compactRuntime.CircuitContext<PS>,
                   attestationId_0: Uint8Array,
                   issuerId_0: Uint8Array,
                   applicantAddress_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  submitProof(context: __compactRuntime.CircuitContext<PS>,
              listingId_0: bigint,
              attestationId_0: Uint8Array,
              multiplier_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  registerIssuer(context: __compactRuntime.CircuitContext<PS>,
                 issuerId_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  createListing(context: __compactRuntime.CircuitContext<PS>,
                rentAmount_0: bigint): __compactRuntime.CircuitResults<PS, bigint>;
  issueAttestation(context: __compactRuntime.CircuitContext<PS>,
                   attestationId_0: Uint8Array,
                   issuerId_0: Uint8Array,
                   applicantAddress_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  submitProof(context: __compactRuntime.CircuitContext<PS>,
              listingId_0: bigint,
              attestationId_0: Uint8Array,
              multiplier_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
}

export type Circuits<PS> = {
  registerIssuer(context: __compactRuntime.CircuitContext<PS>,
                 issuerId_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  createListing(context: __compactRuntime.CircuitContext<PS>,
                rentAmount_0: bigint): __compactRuntime.CircuitResults<PS, bigint>;
  issueAttestation(context: __compactRuntime.CircuitContext<PS>,
                   attestationId_0: Uint8Array,
                   issuerId_0: Uint8Array,
                   applicantAddress_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  submitProof(context: __compactRuntime.CircuitContext<PS>,
              listingId_0: bigint,
              attestationId_0: Uint8Array,
              multiplier_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type Ledger = {
  readonly issuerCount: bigint;
  trustedIssuers: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<[Uint8Array, boolean]>
  };
  readonly listingCount: bigint;
  listingRentAmount: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): bigint;
    [Symbol.iterator](): Iterator<[bigint, bigint]>
  };
  listingLandlord: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): Uint8Array;
    [Symbol.iterator](): Iterator<[bigint, Uint8Array]>
  };
  listingVerifiedCount: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): bigint;
    [Symbol.iterator](): Iterator<[bigint, bigint]>
  };
  attestationCommitment: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): Uint8Array;
    [Symbol.iterator](): Iterator<[Uint8Array, Uint8Array]>
  };
  attestationIssuer: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): Uint8Array;
    [Symbol.iterator](): Iterator<[Uint8Array, Uint8Array]>
  };
  proofNullifiers: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<[Uint8Array, boolean]>
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
  initialState(context: __compactRuntime.ConstructorContext<PS>): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
