// These tests mirror the exact logic enforced by the Compact circuits in
// contracts/threshold.compact (issueAttestation's issuer-trust check,
// submitProof's commitment-recomputation + threshold + nullifier guards).
// They run in plain TypeScript so they exercise the same rules the circuit
// will enforce on-chain, without requiring the compactc toolchain in this
// environment.
import { describe, expect, it } from "vitest";
import {
  registerIssuer,
  createListing,
  issueAttestation,
  submitProof,
  attestationCommitmentHash,
  proofNullifierHash,
  truncateHash,
  RUNTIME_MODE,
} from "../src/utils/contract";

describe("runtime mode", () => {
  it("defaults to local ledger simulation without a configured contract address", () => {
    expect(RUNTIME_MODE).toBe("local");
  });
});

describe("registerIssuer", () => {
  it("registers a new trusted issuer with a stable id", async () => {
    const issuer = await registerIssuer("Acme Payroll");
    expect(issuer.name).toBe("Acme Payroll");
    expect(issuer.issuerId).toHaveLength(64); // sha256 hex
  });
});

describe("createListing", () => {
  it("publishes a listing with the given rent and a zero starting count", async () => {
    const listing = await createListing(2000, "wallet:landlord-a");
    expect(listing.rentAmount).toBe(2000);
    expect(listing.verifiedCount).toBe(0);
  });
});

describe("issueAttestation — mirrors the circuit's issuer-trust check", () => {
  it("rejects attestations from an issuer that was never registered", async () => {
    await expect(
      issueAttestation("not-a-real-issuer-id", "wallet:applicant-a", 6000)
    ).rejects.toThrow(/not registered/i);
  });

  it("issues a handle containing the attestation id and salt for a registered issuer", async () => {
    const issuer = await registerIssuer("Beacon HR");
    const handle = await issueAttestation(
      issuer.issuerId,
      "wallet:applicant-b",
      9000
    );
    expect(handle.attestationId).toBeTruthy();
    expect(handle.salt).toBeTruthy();
    expect(handle.income).toBe(9000);
  });
});

describe("submitProof — mirrors the circuit's commitment + threshold + nullifier checks", () => {
  it("verifies a proof when the attested income clears rent * multiplier", async () => {
    const issuer = await registerIssuer("Crestline Payroll");
    const listing = await createListing(2000, "wallet:landlord-b");
    const handle = await issueAttestation(
      issuer.issuerId,
      "wallet:applicant-c",
      6500
    );

    const result = await submitProof({
      listingId: listing.listingId,
      attestationId: handle.attestationId,
      income: handle.income,
      salt: handle.salt,
      applicantAddress: "wallet:applicant-c",
      multiplier: 3,
    });

    expect(result.verified).toBe(true);
  });

  it("rejects a proof when the attested income does not clear the threshold", async () => {
    const issuer = await registerIssuer("Underbar Payroll");
    const listing = await createListing(2000, "wallet:landlord-c");
    const handle = await issueAttestation(
      issuer.issuerId,
      "wallet:applicant-d",
      4000 // needs 6000 to clear 3x rent
    );

    await expect(
      submitProof({
        listingId: listing.listingId,
        attestationId: handle.attestationId,
        income: handle.income,
        salt: handle.salt,
        applicantAddress: "wallet:applicant-d",
        multiplier: 3,
      })
    ).rejects.toThrow(/does not meet/i);
  });

  it("rejects a proof whose caller doesn't match the attestation's applicant", async () => {
    const issuer = await registerIssuer("Fairway Payroll");
    const listing = await createListing(1500, "wallet:landlord-d");
    const handle = await issueAttestation(
      issuer.issuerId,
      "wallet:applicant-e",
      9000
    );

    await expect(
      submitProof({
        listingId: listing.listingId,
        attestationId: handle.attestationId,
        income: handle.income,
        salt: handle.salt,
        applicantAddress: "wallet:someone-else", // impersonation attempt
        multiplier: 3,
      })
    ).rejects.toThrow(/does not match/i);
  });

  it("rejects a replayed proof for the same listing and applicant", async () => {
    const issuer = await registerIssuer("Havenwood Payroll");
    const listing = await createListing(1800, "wallet:landlord-e");
    const handle = await issueAttestation(
      issuer.issuerId,
      "wallet:applicant-f",
      9000
    );

    const proofInput = {
      listingId: listing.listingId,
      attestationId: handle.attestationId,
      income: handle.income,
      salt: handle.salt,
      applicantAddress: "wallet:applicant-f",
      multiplier: 3,
    };

    await submitProof(proofInput);
    await expect(submitProof(proofInput)).rejects.toThrow(/already submitted/i);
  });

  it("never leaks the income figure through the verified proof result", async () => {
    const issuer = await registerIssuer("Silvergate Payroll");
    const listing = await createListing(1000, "wallet:landlord-f");
    const handle = await issueAttestation(
      issuer.issuerId,
      "wallet:applicant-g",
      12000
    );

    const result = await submitProof({
      listingId: listing.listingId,
      attestationId: handle.attestationId,
      income: handle.income,
      salt: handle.salt,
      applicantAddress: "wallet:applicant-g",
      multiplier: 3,
    });

    expect(JSON.stringify(result)).not.toContain("12000");
  });
});

describe("hashing helpers", () => {
  it("produces deterministic attestation commitments for identical inputs", async () => {
    const a = await attestationCommitmentHash(5000, "wallet:x", "fixed-salt");
    const b = await attestationCommitmentHash(5000, "wallet:x", "fixed-salt");
    expect(a).toBe(b);
  });

  it("produces a different commitment when the income changes", async () => {
    const a = await attestationCommitmentHash(5000, "wallet:x", "salt");
    const b = await attestationCommitmentHash(5001, "wallet:x", "salt");
    expect(a).not.toBe(b);
  });

  it("produces different nullifiers for different listings", async () => {
    const a = await proofNullifierHash(0, "wallet:x");
    const b = await proofNullifierHash(1, "wallet:x");
    expect(a).not.toBe(b);
  });

  it("truncates hashes for compact display", () => {
    const t = truncateHash("abcdef1234567890abcdef1234567890");
    expect(t.startsWith("abcdef")).toBe(true);
    expect(t.endsWith("567890")).toBe(true);
    expect(t).toContain("…");
  });

  it("shows an em-dash placeholder for an empty hash", () => {
    expect(truncateHash("")).toBe("—");
  });
});
