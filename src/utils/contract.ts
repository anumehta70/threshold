// ---------------------------------------------------------------------------
// contract.ts — the single seam between Threshold's UI and the Midnight
// network.
//
// Two modes, same interface:
//   1. "local"   — an in-memory ledger that mirrors the Compact circuits'
//                  logic exactly (see contracts/threshold.compact). Used
//                  automatically until a deployed contract address is
//                  configured, so the UI is fully clickable during review.
//   2. "network" — talks to the real deployed contract on Preprod through
//                  the Midnight.js SDK + the Lace wallet connector.
//
// Wiring step after `compact compile` + Preprod deploy:
//   1. Set VITE_CONTRACT_ADDRESS in .env (see README "Setup & Run Locally").
//   2. Import the generated contract API from `managed/threshold/` and
//      replace the NETWORK MODE TODOs below with real calls to
//      `@midnight-ntwrk/midnight-js-contracts` using that generated API.
// The logic below (hashing, threshold checks, nullifier rules) is not a
// placeholder — it is the same rule the on-chain circuits enforce, so local
// mode behaves identically to the deployed one from a user's perspective.
// ---------------------------------------------------------------------------

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
  // These two only ever live in the applicant's browser/session — in a
  // real deployment the issuer hands them to the applicant off-chain
  // (e.g. a signed link or a QR code), never through the contract.
  income: number;
  salt: string;
};

export type ProofResult = {
  listingId: number;
  verified: true;
};

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS ?? "";
export const RUNTIME_MODE: "local" | "network" = CONTRACT_ADDRESS
  ? "network"
  : "local";

// ---- Shared crypto-ish helpers (mirror the circuit's persistentHash) ------

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randomSalt(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Mirrors: persistentHash(pad(32,income) ++ applicantAddress ++ salt) */
export async function attestationCommitmentHash(
  income: number,
  applicantAddress: string,
  salt: string
): Promise<string> {
  return sha256Hex(`attest:${income}:${applicantAddress}:${salt}`);
}

/** Mirrors: persistentHash(pad(32,listingId) ++ applicantAddress) */
export async function proofNullifierHash(
  listingId: number,
  applicantAddress: string
): Promise<string> {
  return sha256Hex(`nullifier:${listingId}:${applicantAddress}`);
}

export function truncateHash(hash: string): string {
  if (!hash) return "—";
  return `${hash.slice(0, 6)}…${hash.slice(-6)}`;
}

// ---- Local ledger simulator (mode 1) --------------------------------------

type LocalAttestation = {
  attestationId: string;
  issuerId: string;
  commitment: string;
};

type LocalListing = ListingSummary;

class LocalLedger {
  private issuers: IssuerSummary[] = [];
  private listings: LocalListing[] = [];
  private attestations: LocalAttestation[] = [];
  private nullifiers = new Set<string>();
  private nextAttestationSeq = 0;

  async registerIssuer(name: string): Promise<IssuerSummary> {
    const issuerId = await sha256Hex(`issuer:${name}:${randomSalt()}`);
    const issuer = { issuerId, name };
    this.issuers.push(issuer);
    return issuer;
  }

  listIssuers(): IssuerSummary[] {
    return this.issuers;
  }

  async createListing(
    rentAmount: number,
    landlordTag: string
  ): Promise<ListingSummary> {
    const listingId = this.listings.length;
    const listing: ListingSummary = {
      listingId,
      rentAmount,
      landlordTag,
      verifiedCount: 0,
    };
    this.listings.push(listing);
    return listing;
  }

  listListings(): ListingSummary[] {
    return this.listings;
  }

  async issueAttestation(
    issuerId: string,
    applicantAddress: string,
    income: number
  ): Promise<AttestationHandle> {
    const issuer = this.issuers.find((i) => i.issuerId === issuerId);
    if (!issuer) throw new Error("issuer is not registered");

    this.nextAttestationSeq += 1;
    const attestationId = await sha256Hex(
      `attestation-id:${issuerId}:${this.nextAttestationSeq}`
    );
    const salt = randomSalt();
    const commitment = await attestationCommitmentHash(
      income,
      applicantAddress,
      salt
    );

    this.attestations.push({ attestationId, issuerId, commitment });

    return { attestationId, income, salt };
  }

  async submitProof(input: {
    listingId: number;
    attestationId: string;
    income: number;
    salt: string;
    applicantAddress: string;
    multiplier: number;
  }): Promise<ProofResult> {
    const listing = this.listings[input.listingId];
    if (!listing) throw new Error("listing does not exist");

    const attestation = this.attestations.find(
      (a) => a.attestationId === input.attestationId
    );
    if (!attestation) throw new Error("attestation does not exist");

    const recomputed = await attestationCommitmentHash(
      input.income,
      input.applicantAddress,
      input.salt
    );
    if (recomputed !== attestation.commitment) {
      throw new Error("attestation does not match this caller");
    }

    const required = listing.rentAmount * input.multiplier;
    if (input.income < required) {
      throw new Error(
        `attested income does not meet this listing's threshold (needs >= ${required})`
      );
    }

    const nullifier = await proofNullifierHash(
      input.listingId,
      input.applicantAddress
    );
    if (this.nullifiers.has(nullifier)) {
      throw new Error("already submitted a proof for this listing");
    }
    this.nullifiers.add(nullifier);
    listing.verifiedCount += 1;

    return { listingId: input.listingId, verified: true };
  }
}

const localLedger = new LocalLedger();

// ---- Public API used by the UI ---------------------------------------------

export async function registerIssuer(name: string): Promise<IssuerSummary> {
  if (RUNTIME_MODE === "local") return localLedger.registerIssuer(name);
  throw new Error(
    "Network mode is not wired yet — set up the generated contract API from managed/ first."
  );
}

export function listIssuers(): IssuerSummary[] {
  return RUNTIME_MODE === "local" ? localLedger.listIssuers() : [];
}

export async function createListing(
  rentAmount: number,
  landlordTag: string
): Promise<ListingSummary> {
  if (RUNTIME_MODE === "local")
    return localLedger.createListing(rentAmount, landlordTag);
  throw new Error(
    "Network mode is not wired yet — set up the generated contract API from managed/ first."
  );
}

export function listListings(): ListingSummary[] {
  return RUNTIME_MODE === "local" ? localLedger.listListings() : [];
}

export async function issueAttestation(
  issuerId: string,
  applicantAddress: string,
  income: number
): Promise<AttestationHandle> {
  if (RUNTIME_MODE === "local")
    return localLedger.issueAttestation(issuerId, applicantAddress, income);
  throw new Error(
    "Network mode is not wired yet — set up the generated contract API from managed/ first."
  );
}

export async function submitProof(input: {
  listingId: number;
  attestationId: string;
  income: number;
  salt: string;
  applicantAddress: string;
  multiplier: number;
}): Promise<ProofResult> {
  if (RUNTIME_MODE === "local") return localLedger.submitProof(input);
  throw new Error(
    "Network mode is not wired yet — set up the generated contract API from managed/ first."
  );
}
