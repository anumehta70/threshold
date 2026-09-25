// ---------------------------------------------------------------------------
// contract.ts — the single seam between Threshold's UI and the Midnight
// network.
// ---------------------------------------------------------------------------

import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
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

// ---------------------------------------------------------------------------
// Wallet helpers
// ---------------------------------------------------------------------------

declare global {
  interface Window {
    midnight?: { [key: string]: InitialAPI };
  }
}

async function getConnectedAPI(): Promise<ConnectedAPI> {
  const connector: InitialAPI | undefined =
    window.midnight?.nightscape ?? window.midnight?.mnLace;
  if (!connector) {
    throw new Error(
      "No Midnight wallet found! Please install the 1am/Nightscape extension."
    );
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (connector as any).enable() as Promise<ConnectedAPI>;
}

// Lazy-initialised providers
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _providers: any = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getProviders(): Promise<any> {
  if (_providers) return _providers;

  const _wallet = await getConnectedAPI();

  _providers = {
    privateStateProvider: levelPrivateStateProvider({
      privateStateStoreName: 'threshold-private-state',
      signingKeyStoreName: 'threshold-signing-keys',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      privateStoragePasswordProvider: () => 'threshold-demo-pw' as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      accountId: (await (_wallet as any).state?.())?.address ?? 'default',
    }),
    publicDataProvider: indexerPublicDataProvider(
      'https://indexer.preprod.midnight.network/api/v4/graphql',
      'wss://indexer.preprod.midnight.network/api/v4/graphql/ws'
    ),
    proofProvider: httpClientProofProvider(
      'https://midnight-proof-server.onrender.com',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {} as any
    ),
  };

  return _providers;
}

// ---------------------------------------------------------------------------
// Public API used by useMidnight.ts
// ---------------------------------------------------------------------------

export async function registerIssuer(name: string): Promise<IssuerSummary> {
  await getProviders();
  // Real call would go here once contract object is wired up
  return { issuerId: "issuer-" + Date.now(), name };
}

export function listIssuers(): IssuerSummary[] {
  return [];
}

export async function createListing(
  rentAmount: number,
  landlordTag: string
): Promise<ListingSummary> {
  await getProviders();
  return {
    listingId: 1,
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
  await getProviders();
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
  await getProviders();
  return { listingId: input.listingId, verified: true };
}
