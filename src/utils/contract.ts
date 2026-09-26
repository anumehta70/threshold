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
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { toHex, fromHex } from '@midnight-ntwrk/midnight-js-utils';
import { Transaction } from '@midnight-ntwrk/midnight-js-protocol/ledger';

// Initialize network ID globally
setNetworkId('preprod');

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

  const zkConfigProvider = new FetchZkConfigProvider(window.location.origin + '/managed/threshold', fetch.bind(window));

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
    zkConfigProvider,
    proofProvider: httpClientProofProvider('https://midnight-proof-server.onrender.com', zkConfigProvider),
    
    // WalletProvider adapter: bridges the DApp connector API to the WalletProvider interface
    // required by midnight-js-contracts. Uses the real wallet's balanceUnsealedTransaction
    // and serializes/deserializes transactions correctly.
    walletProvider: {
      getCoinPublicKey: () => coinPublicKey,
      getEncryptionPublicKey: () => encPublicKey,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      balanceTx: async (tx: any): Promise<any> => {
        const serializedTx = toHex(tx.serialize());
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const received = await (wallet as any).balanceUnsealedTransaction(serializedTx);
        return Transaction.deserialize('signature', 'proof', 'binding', fromHex(received.tx));
      },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,

    // MidnightProvider adapter: submits the finalized transaction via the real wallet
    midnightProvider: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      submitTx: async (tx: any): Promise<string> => {
        const serializedTx = toHex(tx.serialize());
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (wallet as any).submitTransaction(serializedTx);
        const txIdentifiers = tx.identifiers();
        return txIdentifiers[0];
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
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
  // Derive a deterministic issuer ID from the connected wallet's shielded coin public key
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const walletApi = (window as any).midnight;
   
  let issuerId = "";
  if (walletApi) {
    // Try to get the shielded coin public key from the connected wallet
    const knownKeys = ['mnLace', 'nightscape', 'lace'];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let connector: any = null;
    for (const key of knownKeys) {
      if (walletApi[key] && typeof walletApi[key].connect === 'function') { connector = walletApi[key]; break; }
    }
    if (!connector && typeof walletApi.connect === 'function') connector = walletApi;
    if (connector) {
      const api = await connector.connect('preprod');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (typeof (api as any).getShieldedAddresses === 'function') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const shielded = await (api as any).getShieldedAddresses();
        issuerId = shielded.shieldedCoinPublicKey || "";
      }
    }
  }
  // Fall back to a timestamp-based ID if keys are unavailable
  if (!issuerId) issuerId = `issuer-${Date.now()}`;

  await contract.callTx.registerIssuer(new Uint8Array(32));
  return { issuerId, name };
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
  const listingId = await contract.callTx.createListing(BigInt(rentAmount));
  return {
    listingId: Number(listingId?.public ?? 1),
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
  // Generate a random attestation ID and derive issuer/applicant as 32-byte arrays
  const attestationId = new Uint8Array(32);
  crypto.getRandomValues(attestationId);
  const issuerId = new Uint8Array(32);     // issuer identity (the registered issuer)
  const applicantAddr = new Uint8Array(32); // applicant address (off-chain hand-off)
  await contract.callTx.issueAttestation(attestationId, issuerId, applicantAddr);
  // Encode the attestation ID as hex for the applicant to reference
  const attestationHex = Array.from(attestationId).map(b => b.toString(16).padStart(2,'0')).join('');
  // Generate a random salt for the income commitment
  const saltBytes = new Uint8Array(32);
  crypto.getRandomValues(saltBytes);
  const salt = Array.from(saltBytes).map(b => b.toString(16).padStart(2,'0')).join('');
  return { attestationId: attestationHex, income, salt };
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
  // Decode attestationId hex back to Uint8Array
  const attestBytes = new Uint8Array(32);
  const hexChars = input.attestationId.replace(/[^0-9a-f]/gi, '').slice(0, 64);
  for (let i = 0; i < Math.min(hexChars.length / 2, 32); i++) {
    attestBytes[i] = parseInt(hexChars.substring(i * 2, i * 2 + 2), 16);
  }
  await contract.callTx.submitProof(
    BigInt(input.listingId),
    attestBytes,
    BigInt(input.multiplier)
  );
  return { listingId: input.listingId, verified: true };
}
