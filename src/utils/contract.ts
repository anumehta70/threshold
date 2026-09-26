// ---------------------------------------------------------------------------
// contract.ts — the single seam between Threshold's UI and the Midnight
// network.
// ---------------------------------------------------------------------------

import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
import { CompiledThresholdContractContract, createThresholdPrivateState } from '../../preprod-deployment/contracts/src/index';
import type { InitialAPI, ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { toHex, fromHex } from '@midnight-ntwrk/midnight-js-utils';
import { Transaction } from '@midnight-ntwrk/midnight-js-protocol/ledger';

// Initialize network ID globally
setNetworkId('preprod');

// localStorage key for persisting the registered issuer
const ISSUER_STORAGE_KEY = 'threshold_issuer';

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

/** Persist registered issuer to localStorage so it survives page reloads */
export function saveIssuer(issuer: IssuerSummary): void {
  localStorage.setItem(ISSUER_STORAGE_KEY, JSON.stringify(issuer));
}

/** Load persisted issuer from localStorage */
export function loadSavedIssuer(): IssuerSummary | null {
  try {
    const raw = localStorage.getItem(ISSUER_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as IssuerSummary;
  } catch {
    return null;
  }
}

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS ?? "";
export const RUNTIME_MODE: "local" | "network" = CONTRACT_ADDRESS ? "network" : "local";

// Network state globals
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let networkContract: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let privateStateProviderInstance: any = null;
let walletSecretKey: Uint8Array | null = null;

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

  // Build a random secret key from the wallet's coin public key bytes (deterministic per session)
  const secretKey = new Uint8Array(32);
  const coinKeyHex = coinPublicKey.replace(/[^0-9a-f]/gi, '').slice(0, 64);
  for (let i = 0; i < Math.min(coinKeyHex.length / 2, 32); i++) {
    secretKey[i] = parseInt(coinKeyHex.substring(i * 2, i * 2 + 2), 16);
  }
  walletSecretKey = secretKey;

  // Initial dummy state to satisfy the constructor
  const initialPrivateState = createThresholdPrivateState(secretKey, 0n, new Uint8Array(32));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const accountId = (typeof (wallet as any).getUnshieldedAddress === 'function'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? (await (wallet as any).getUnshieldedAddress()).unshieldedAddress
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    : (await (wallet as any).state?.())?.address) ?? 'default';

  privateStateProviderInstance = levelPrivateStateProvider({
    privateStateStoreName: 'threshold-private-state',
    privateStoragePasswordProvider: async () => "threshold-demo-password",
    signingKeyStoreName: 'threshold-signing-keys',
    accountId,
  });

  const zkConfigProvider = new FetchZkConfigProvider(window.location.origin + '/managed/threshold', fetch.bind(window));

  const providers = {
    privateStateProvider: privateStateProviderInstance,
    publicDataProvider: indexerPublicDataProvider(
      'https://indexer.preprod.midnight.network/api/v4/graphql',
      'wss://indexer.preprod.midnight.network/api/v4/graphql/ws'
    ),
    zkConfigProvider,
    proofProvider: httpClientProofProvider('https://midnight-proof-server.onrender.com', zkConfigProvider),

    // WalletProvider adapter: bridges the DApp connector API to the WalletProvider interface
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
      initialPrivateState
    )
  };

  return networkContract;
}

export async function registerIssuer(name: string): Promise<IssuerSummary> {
  const contract = await getContract();

  // Get wallet coin public key to use as the issuer's on-chain ID
  const wallet = await getConnectedAPI();
  let issuerId = "";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (typeof (wallet as any).getShieldedAddresses === 'function') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const shielded = await (wallet as any).getShieldedAddresses();
    issuerId = shielded.shieldedCoinPublicKey || "";
  }
  if (!issuerId) issuerId = `issuer-${Date.now()}`;

  await contract.callTx.registerIssuer(new Uint8Array(32));

  const issuer: IssuerSummary = { issuerId, name };
  // Persist so user doesn't need to re-register on every page load
  saveIssuer(issuer);
  return issuer;
}

export function listIssuers(): IssuerSummary[] {
  // Return persisted issuer if available
  const saved = loadSavedIssuer();
  return saved ? [saved] : [];
}

export async function createListing(
  rentAmount: number,
  landlordTag: string
): Promise<ListingSummary> {
  const contract = await getContract();
  const result = await contract.callTx.createListing(BigInt(rentAmount));
  return {
    listingId: Number(result?.public ?? 1),
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

  // Generate a random salt for the income commitment
  const saltBytes = new Uint8Array(32);
  crypto.getRandomValues(saltBytes);

  // Update private state witnesses before calling the circuit
  if (privateStateProviderInstance && walletSecretKey) {
    const newState = createThresholdPrivateState(walletSecretKey, BigInt(income), saltBytes);
    await privateStateProviderInstance.set(CONTRACT_ADDRESS, newState);
  }

  // Generate a random attestation ID
  const attestationId = new Uint8Array(32);
  crypto.getRandomValues(attestationId);

  const issuerId = new Uint8Array(32);     // issuer identity bytes
  const applicantAddr = new Uint8Array(32); // applicant address bytes

  await contract.callTx.issueAttestation(attestationId, issuerId, applicantAddr);

  const attestationHex = Array.from(attestationId).map(b => b.toString(16).padStart(2, '0')).join('');
  const saltHex = Array.from(saltBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return { attestationId: attestationHex, income, salt: saltHex };
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

  // Decode the salt hex back to Uint8Array
  const saltBytes = new Uint8Array(32);
  const saltHex = input.salt.replace(/[^0-9a-f]/gi, '').slice(0, 64);
  for (let i = 0; i < Math.min(saltHex.length / 2, 32); i++) {
    saltBytes[i] = parseInt(saltHex.substring(i * 2, i * 2 + 2), 16);
  }

  // Update private state witnesses before calling the circuit
  if (privateStateProviderInstance && walletSecretKey) {
    const newState = createThresholdPrivateState(walletSecretKey, BigInt(input.income), saltBytes);
    await privateStateProviderInstance.set(CONTRACT_ADDRESS, newState);
  }

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
