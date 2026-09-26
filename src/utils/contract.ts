// ---------------------------------------------------------------------------
// contract.ts — the single seam between Threshold's UI and the Midnight
// network.
// ---------------------------------------------------------------------------

import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
import { CompiledThresholdContractContract } from '../../preprod-deployment/contracts/src/index';
import type { InitialAPI, ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';

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

/** Shorten a long hex/address string for display. */
export function truncateHash(hash: string): string {
  if (!hash || hash.length <= 12) return hash;
  return `${hash.slice(0, 6)}…${hash.slice(-4)}`;
}

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS ?? "";
export const RUNTIME_MODE: "local" | "network" = CONTRACT_ADDRESS ? "network" : "local";

// Network state globals
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let networkContract: any = null;

declare global {
  interface Window {
    midnight?: { [key: string]: InitialAPI };
  }
}

async function getConnectedAPI(): Promise<ConnectedAPI> {
  const connector: InitialAPI | undefined =
    window.midnight?.['nightscape'] ?? window.midnight?.['mnLace'];
  if (!connector) {
    throw new Error(
      "No Midnight wallet found! Please install the 1am/Nightscape extension."
    );
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return await (connector as any).enable() as ConnectedAPI;
}

async function getContract() {
  if (networkContract) return networkContract;

  const wallet = await getConnectedAPI();
  
  const providers = {
    privateStateProvider: levelPrivateStateProvider({
      privateStateStoreName: 'threshold-private-state',
      privateStoragePasswordProvider: async () => "threshold-demo-password",
      signingKeyStoreName: 'threshold-signing-keys',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      accountId: (await (wallet as any).state?.())?.address ?? 'default',
    }),
    publicDataProvider: indexerPublicDataProvider(
      'https://indexer.preprod.midnight.network/api/v4/graphql',
      'wss://indexer.preprod.midnight.network/api/v4/graphql/ws'
    ),
    zkConfigProvider: new FetchZkConfigProvider(window.location.origin + '/managed/threshold', fetch.bind(window)),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    proofProvider: httpClientProofProvider('https://midnight-proof-server.onrender.com', {} as any),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    walletProvider: wallet as any,
    // We mock getMidnightProvider by just casting the wallet api since the library export is missing in this version
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    midnightProvider: wallet as any,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Contract = (await import('@midnight-ntwrk/midnight-js-contracts' as any)).Contract;
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  networkContract = await (Contract as any).build(
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
  // We need to encode the landlord tag correctly according to what the contract expects.
  // Assuming a generic Uint8Array for now as per the original snippet.
  await contract.callTx.createListing(BigInt(rentAmount), new Uint8Array(32));
  return {
    listingId: 1, // Will come from indexer/tx in fully built app
    rentAmount,
    landlordTag,
    verifiedCount: 0,
  };
}

export function listListings(): ListingSummary[] {
  return [];
}

export async function issueAttestation(
  _issuerId: string,
  _applicantAddress: string,
  income: number
): Promise<AttestationHandle> {
  const contract = await getContract();
  await contract.callTx.issueAttestation(new Uint8Array(32) /* applicant pubkey */);
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
