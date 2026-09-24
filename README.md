# Threshold

![CI](https://github.com/YOUR_GITHUB_USERNAME/threshold-proof-of-income/actions/workflows/ci.yml/badge.svg)

> Prove your income clears the bar. Not what it is.

## Live Demo

[PREPROD DEMO URL — paste after deploying the frontend, e.g. to Vercel/Netlify]

## Contract Address

| Network | Address |
|---------|---------|
| Preprod | `[CONTRACT ADDRESS — paste here after running the Preprod deploy, see "Deploy to Preprod" below]` |

## What This Product Does

Threshold is a confidential income-verification protocol built on Midnight.
Renters today prove they can afford an apartment by handing landlords pay
stubs and bank statements — far more sensitive financial data than a
simple "income ≥ 3× rent" check actually requires. That over-disclosure
sits in tenant-screening databases as a standing breach risk, while
document-based verification is increasingly unreliable: AI-generated fake
pay stubs increased 500% between April and December 2025, and 93% of
property managers reported applicants submitting fabricated income
documents in the past year.

Threshold replaces the document with a cryptographic attestation. A
registered payroll provider or employer seals a commitment to an
applicant's real income. The applicant later proves — via a Compact
circuit — that this attested income clears a specific listing's
affordability bar, without ever revealing the figure, their employer, or
their transaction history. Because the attestation is a cryptographic
commitment rather than a re-uploadable document, it can't be forged the
way a pay stub can — solving the landlord's fraud problem and the renter's
over-disclosure problem with the same proof.

Built for renters who don't want their full financial history sitting in
a screening database, and landlords who can no longer trust a PDF.

## Privacy Model

- **What is PUBLIC (on-chain, anyone can see):**
  - The registry of trusted issuer IDs (accredited payroll providers).
  - Each listing's rent amount and landlord ID (already public on any
    listing site).
  - Each attestation's commitment hash and which issuer created it.
  - A one-time nullifier per submitted proof, and a listing's running
    verified-applicant count.
- **What is PRIVATE (private witness, never on-chain):**
  - The applicant's real income.
  - The salt binding an attestation to one applicant.
- **What the user PROVES without revealing:**
  - That an attestation genuinely came from a trusted issuer, for this
    applicant, for a specific income (`submitProof` recomputes the
    issuer's commitment and checks it matches) — without revealing the
    income.
  - That the attested income meets a listing's affordability threshold
    (`income >= rent * multiplier`) — without revealing the exact figure.
  - That the applicant has not already claimed eligibility for this
    listing, via a listing-scoped nullifier.

## Tech Stack

- **Contract:** Compact (Midnight smart contract language)
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS
- **Wallet:** Lace (Midnight wallet connector), with a local demo-ledger
  fallback so the UI is fully explorable without a wallet installed
- **Testing:** Vitest — unit tests mirroring the circuits' issuer-trust,
  commitment, threshold, and nullifier logic
- **CI/CD:** GitHub Actions (lint, typecheck, test, build, best-effort
  Compact compile)

## Prerequisites

- [Lace wallet](https://www.lace.io/) browser extension, set to Preprod
- Node.js v22+
- Docker (required by the Midnight Compact toolchain for local proving)
- The [Compact compiler](https://docs.midnight.network) (`compactc` /
  `compact compile`) installed locally to compile `contracts/threshold.compact`

## Setup & Run Locally

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_GITHUB_USERNAME/threshold-proof-of-income.git
cd threshold-proof-of-income

# 2. Install frontend dependencies
npm install

# 3. (Optional) point the app at a deployed contract — otherwise it runs
#    in a local demo-ledger mode that mirrors the circuits exactly
cp .env.example .env
# edit .env and set VITE_CONTRACT_ADDRESS after you deploy (see below)

# 4. Compile the contract (requires the Compact toolchain + Docker)
compact compile contracts/threshold.compact managed/

# 5. Run the frontend
npm run dev
```

### Deploy to Preprod

```bash
# From the project root, after compiling:
compact deploy contracts/threshold.compact \
  --network preprod \
  --wallet <your-lace-wallet-address>
```

Paste the resulting contract address into the **Contract Address** table
above and into `.env` as `VITE_CONTRACT_ADDRESS`.

## Run Tests

```bash
npm test
```

15 tests cover: the issuer-trust check enforced by `issueAttestation`, the
commitment-recomputation, threshold, and replay-protection rules enforced
by `submitProof`, and the hashing helpers used to build commitments and
nullifiers — mirroring the circuit logic in `contracts/threshold.compact`
exactly.

## CI/CD

Every push to `main` and every pull request runs, via
[`.github/workflows/ci.yml`](.github/workflows/ci.yml):

1. `npm ci`
2. `npm run lint`
3. `npm run typecheck`
4. `npm test`
5. `npm run build`
6. A best-effort Compact compile step (runs when `compactc` is available)

## Usage Guide

See [`docs/USAGE.md`](docs/USAGE.md) for a full walkthrough: registering an
issuer, sealing an attestation, publishing a listing, proving eligibility,
and reading the public ledger.

## Product X Profile

[PLACEHOLDER — add your product's X/Twitter profile link here after creating the account]

## Project History

Built for the Midnight Builder Challenge. See [`PROPOSAL.md`](PROPOSAL.md)
for the original Level 3 idea submission this MVP implements.
