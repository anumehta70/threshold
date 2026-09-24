# Threshold — Proof of Income Without the Paper Trail

**Category:** Consumer focus
**Track:** Consumer & Social

## Problem

Renters prove they can afford an apartment by handing landlords pay stubs
and bank statements — full financial history, account numbers, employer
details — just to establish one fact: income at or above roughly 3x rent.
This backfires for both sides at once. For landlords, document-based
verification has become unreliable: 93% of property managers reported
applicants submitting fabricated income documents in the past year, and
AI-generated fake pay stubs increased 500% between April and December 2025
— convincing enough that manual review can no longer reliably catch them.
For renters, submitting real documents means handing over far more
sensitive financial data than the landlord actually needs, which then sits
in tenant-screening databases carrying their own breach risk. The
industry's current fix — linking directly into a renter's payroll or bank
account for "verified" data — solves the fraud problem but makes the
privacy problem worse, since the landlord (or their screening vendor) now
sees the applicant's exact income and full transaction history.

## Solution

Threshold is a Midnight-powered income verification protocol. A payroll
provider or employer issues a signed, private income attestation directly
to the employee — a cryptographic credential tied to their real payroll
record, not a re-uploadable document. When applying for a rental, the
applicant proves via a Compact circuit that their attested income meets or
exceeds a given rent threshold. The landlord's contract receives only a
valid pass/fail proof — never the exact income, employer, or transaction
history. Because the underlying value is cryptographically attested rather
than a document, it can't be forged the way a pay stub can, solving the
landlord's fraud problem and the renter's over-disclosure problem with the
same proof.

## Why it matters

This addresses a documented, current failure mode in an everyday process —
not a hypothetical — while giving both sides something today's tools
can't: verifiable, unforgeable proof of eligibility with zero unnecessary
financial disclosure.

## Privacy model (summary — see README for the full breakdown)

- **Public:** trusted-issuer registry, listing rent amounts, attestation
  commitment hashes, proof nullifiers, per-listing verified-applicant
  counts.
- **Private:** the applicant's real income, the salt binding an
  attestation to one applicant.
- **Proved without disclosure:** that an attestation genuinely came from a
  trusted issuer for this applicant, and that the attested income clears a
  listing's affordability bar — without ever revealing the figure.
