import { Ledger } from "./managed/threshold/contract/index.js";
import { WitnessContext } from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";

export type ThresholdPrivateState = {
  readonly secretKey: Uint8Array;
  readonly attestationIncome: bigint;
  readonly attestationSalt: Uint8Array;
};

export const createThresholdPrivateState = (secretKey: Uint8Array, attestationIncome: bigint, attestationSalt: Uint8Array): ThresholdPrivateState => ({
  secretKey,
  attestationIncome,
  attestationSalt
});

export const witnesses = {
  callerSecretKey: ({
    privateState,
  }: WitnessContext<Ledger, ThresholdPrivateState>): [
    ThresholdPrivateState,
    Uint8Array,
  ] => [privateState, privateState.secretKey],

  attestationIncome: ({
    privateState,
  }: WitnessContext<Ledger, ThresholdPrivateState>): [
    ThresholdPrivateState,
    bigint,
  ] => [privateState, privateState.attestationIncome],

  attestationSalt: ({
    privateState,
  }: WitnessContext<Ledger, ThresholdPrivateState>): [
    ThresholdPrivateState,
    Uint8Array,
  ] => [privateState, privateState.attestationSalt],
};
