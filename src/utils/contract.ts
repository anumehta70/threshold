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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const midnightObj = (window as any).midnight;
  if (!midnightObj) {
    throw new Error(
      "No Midnight wallet found on window object! Please install the 1am/Nightscape extension."
    );
  }
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let connector: any = null;

  // 1. Maybe window.midnight itself is the provider
  if (typeof midnightObj.connect === 'function' || typeof midnightObj.enable === 'function') {
    connector = midnightObj;
  } else {
    // 2. Check known non-enumerable keys explicitly
    const knownKeys = ['mnLace', 'nightscape', 'lace'];
    for (const key of knownKeys) {
      if (midnightObj[key] && (typeof midnightObj[key].connect === 'function' || typeof midnightObj[key].enable === 'function')) {
        connector = midnightObj[key];
        break;
      }
    }

    // 3. Check all other properties just in case
    if (!connector) {
      const allProps = Object.getOwnPropertyNames(midnightObj);
      for (const key of allProps) {
        if (midnightObj[key] && (typeof midnightObj[key].connect === 'function' || typeof midnightObj[key].enable === 'function')) {
          connector = midnightObj[key];
          break;
        }
      }
    }
  }

  if (!connector) {
    throw new Error("window.midnight exists but we could not find a wallet provider with a .connect() or .enable() function.");
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (typeof connector.connect === 'function' ? await connector.connect('preprod') : await (connector as any).enable()) as ConnectedAPI;
}

async function getContract() {
  if (networkContract) return networkContract;

  const wallet = await getConnectedAPI();
  
   
  let coinPublicKey = "";
  let encPublicKey = "";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (typeof (wallet as any).getShieldedAddresses === 'function') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const shielded = await (wallet as any).getShieldedAddresses();
    coinPublicKey = shielded.shieldedCoinPublicKey;
    encPublicKey = shielded.shieldedEncryptionPublicKey;
  }

  if (!coinPublicKey || !encPublicKey) {
    throw new Error("Failed to retrieve real shielded keys from the connected wallet. Ensure your wallet is fully synced.");
  }

  const providers = {
    privateStateProvider: levelPrivateStateProvider({
      privateStateStoreName: 'threshold-private-state',
      privateStoragePasswordProvider: async () => "threshold-demo-password",
      signingKeyStoreName: 'threshold-signing-keys',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      accountId: (typeof (wallet as any).getUnshieldedAddress === 'function' ? (await (wallet as any).getUnshieldedAddress()).unshieldedAddress : (await (wallet as any).state?.())?.address) ?? 'default',
    }),
    publicDataProvider: indexerPublicDataProvider(
      'https://indexer.preprod.midnight.network/api/v4/graphql',
      'wss://indexer.preprod.midnight.network/api/v4/graphql/ws'
    ),
    zkConfigProvider: new FetchZkConfigProvider(window.location.origin + '/managed/threshold', fetch.bind(window)),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    proofProvider: httpClientProofProvider('https://midnight-proof-server.onrender.com', {} as any),
    
    // Create an adapter to bridge the WalletConnectedAPI to the expected WalletProvider interface
    // forwarding all other wallet methods to the injected real wallet API
    walletProvider: new Proxy(wallet, {
      get(target, prop) {
        if (prop === 'getCoinPublicKey') {
          return () => coinPublicKey;
        }
        if (prop === 'getEncryptionPublicKey') {
          return () => encPublicKey;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (target as any)[prop];
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any,
    // Cast the real wallet api to serve as the midnightProvider as well
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    midnightProvider: wallet as any,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { createCircuitCallTxInterface } = await import('@midnight-ntwrk/midnight-js-contracts' as any);
  
  networkContract = {
    callTx: createCircuitCallTxInterface(
      providers,
      CompiledThresholdContractContract,
      CONTRACT_ADDRESS,
      undefined // no private state persistence needed for these public interactions
    )
  };

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
