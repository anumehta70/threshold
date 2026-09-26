import { useCallback, useEffect, useState } from "react";
import {
  RUNTIME_MODE,
  type IssuerSummary,
  type ListingSummary,
  type AttestationHandle,
  type ProofResult,
  registerIssuer as registerIssuerCall,
  listIssuers,
  createListing as createListingCall,
  listListings,
  issueAttestation as issueAttestationCall,
  submitProof as submitProofCall,
} from "../utils/contract";

// Window.midnight is declared in src/utils/contract.ts via InitialAPI.
// No need to redeclare it here — just read from contract.ts's global.

export type WalletStatus = "disconnected" | "connecting" | "connected" | "error";

export function useMidnight() {
  const [status, setStatus] = useState<WalletStatus>("disconnected");
  const [address, setAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [issuers, setIssuers] = useState<IssuerSummary[]>(() => listIssuers());
  const [listings, setListings] = useState<ListingSummary[]>(() =>
    listListings()
  );

  const refresh = useCallback(() => {
    setIssuers(listIssuers());
    setListings(listListings());
  }, []);

  const connect = useCallback(async () => {
    setStatus("connecting");
    setError(null);
    try {
      const midnightObj = (window as any).midnight;
      if (!midnightObj) {
        throw new Error("No Midnight wallet found on window object! Please install the 1am/Nightscape extension.");
      }
      
      const providerKey = Object.keys(midnightObj)[0];
      const lace = providerKey ? midnightObj[providerKey] : null;

      if (!lace) {
        throw new Error("window.midnight exists but contains no wallet providers.");
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { address: addr } = await (lace as any).enable() as { address: string };
      setAddress(addr);
      setStatus("connected");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Failed to connect wallet");
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setStatus("disconnected");
    setError(null);
  }, []);

  const registerIssuer = useCallback(
    async (name: string) => {
      setBusy(true);
      setError(null);
      try {
        const issuer = await registerIssuerCall(name);
        refresh();
        return issuer;
      } catch (err) {
        setError(err instanceof Error ? err.message : "registerIssuer failed");
        throw err;
      } finally {
        setBusy(false);
      }
    },
    [refresh]
  );

  const createListing = useCallback(
    async (rentAmount: number) => {
      if (!address) throw new Error("connect a wallet first");
      setBusy(true);
      setError(null);
      try {
        const listing = await createListingCall(rentAmount, address);
        refresh();
        return listing;
      } catch (err) {
        setError(err instanceof Error ? err.message : "createListing failed");
        throw err;
      } finally {
        setBusy(false);
      }
    },
    [address, refresh]
  );

  const issueAttestation = useCallback(
    async (issuerId: string, income: number): Promise<AttestationHandle> => {
      if (!address) throw new Error("connect a wallet first");
      setBusy(true);
      setError(null);
      try {
        return await issueAttestationCall(issuerId, address, income);
      } catch (err) {
        setError(err instanceof Error ? err.message : "issueAttestation failed");
        throw err;
      } finally {
        setBusy(false);
      }
    },
    [address]
  );

  const submitProof = useCallback(
    async (input: {
      listingId: number;
      attestationId: string;
      income: number;
      salt: string;
      multiplier: number;
    }): Promise<ProofResult> => {
      if (!address) throw new Error("connect a wallet first");
      setBusy(true);
      setError(null);
      try {
        const result = await submitProofCall({
          ...input,
          applicantAddress: address,
        });
        refresh();
        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : "submitProof failed");
        throw err;
      } finally {
        setBusy(false);
      }
    },
    [address, refresh]
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    mode: RUNTIME_MODE,
    status,
    address,
    error,
    busy,
    issuers,
    listings,
    connect,
    disconnect,
    registerIssuer,
    createListing,
    issueAttestation,
    submitProof,
  };
}
