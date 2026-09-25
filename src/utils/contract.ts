// ---------------------------------------------------------------------------
// contract.ts — the single seam between Threshold's UI and the Midnight
// network.
// ---------------------------------------------------------------------------

import { DAppConnectorWalletProvider } from '@midnight-ntwrk/dapp-connector-api';
import { browserLevelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { fetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
import { Contract, getMidnightProvider } from '@midnight-ntwrk/midnight-js-contracts';
import { CompiledThresholdContractContract } from '@midnight-ntwrk/threshold-contract';

export type IssuerSummary = {
  issuerId: string;
  name: string;
};

export type ListingSummary = {
  listingId: number;
  rentAmount: number;
  landlordTag: string;
  verifiedCount: number;
};

export type AttestationHandle = {
  attestationId: string;
  income: number;
  salt: string;
};

export type ProofResult = {
  listingId: number;
  verified: true;
};

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS ?? "";
export const RUNTIME_MODE: "local" | "network" = CONTRACT_ADDRESS ? "network" : "local";

// Network state globals
let networkContract: Contract<any, any> | null = null;
let networkWallet: DAppConnectorWalletProvider | null = null;

async function getContract() {
  if (networkContract) return networkContract;

  const connector = window.midnight?.nightscape || window.midnight?.mnLace;
  if (!connector) throw new Error("No Midnight wallet found! Please install the 1am/Nightscape extension.");

  const wallet = await DAppConnectorWalletProvider.build(connector);
  networkWallet = wallet;
  
  const providers = {
    privateStateProvider: browserLevelPrivateStateProvider({
      storeName: 'threshold-private-state',
    }),
    publicDataProvider: indexerPublicDataProvider(
      'https://indexer.preprod.midnight.network/api/v4/graphql',
      'wss://indexer.preprod.midnight.network/api/v4/graphql/ws'
    ),
    zkConfigProvider: fetchZkConfigProvider(window.location.origin + '/managed/threshold'),
    proofProvider: httpClientProofProvider('https://midnight-proof-server.onrender.com'),
    walletProvider: wallet,
    midnightProvider: await getMidnightProvider(wallet),
  };

  networkContract = await Contract.build(
    providers,
    CONTRACT_ADDRESS,
    CompiledThresholdContractContract
  );

  return networkContract;
}

export async function registerIssuer(name: string): Promise<IssuerSummary> {
  const contract = await getContract();
  const tx = await contract.callTx.registerIssuer();
  return { issuerId: tx.public.issuerId?.toString() || "", name };
}

export function listIssuers(): IssuerSummary[] {
  // Read from indexer in real app, mocked here for fast UI reload
  return [];
}

export async function createListing(
  rentAmount: number,
  landlordTag: string
): Promise<ListingSummary> {
  const contract = await getContract();
  await contract.callTx.createListing(BigInt(rentAmount), new Uint8Array(32) /* landlord mock */);
  return {
    listingId: 1, // mock returned from tx
    rentAmount,
    landlordTag,
    verifiedCount: 0,
  };
}

export function listListings(): ListingSummary[] {
  return [];
}

export async function issueAttestation(
  issuerId: string,
  applicantAddress: string,
  income: number
): Promise<AttestationHandle> {
  const contract = await getContract();
  await contract.callTx.issueAttestation(new Uint8Array(32) /* mock pubkey */);
  return { attestationId: "attest-" + Date.now(), income, salt: "salt123" };
}

export async function submitProof(input: {
  listingId: number;
  attestationId: string;
  income: number;
  salt: string;
  applicantAddress: string;
  multiplier: number;
}): Promise<ProofResult> {
  const contract = await getContract();
  await contract.callTx.submitProof(BigInt(input.listingId));
  return { listingId: input.listingId, verified: true };
}
