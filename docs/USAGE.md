# How to Use Threshold

## What You Need

- A modern browser (Chrome, Brave, or Firefox).
- The [Lace wallet](https://www.lace.io/) extension, set to Preprod, with
  some test tDUST for gas. If you don't have Lace installed, Threshold
  still runs in **local demo mode** — a fully working in-browser ledger —
  so you can try every flow without it.
- Three roles to try the full flow: a **payroll/employer** (issues income
  attestations), a **landlord** (publishes a listing), and an **applicant**
  (proves eligibility). You can play all three yourself in one session
  using the three tabs in the app.

## Step-by-Step Guide

1. **Open the app** and click **Connect wallet**. If Lace is installed,
   approve the connection. If it isn't, Threshold assigns you a demo
   identity so you can keep exploring.
2. **Register as a trusted issuer** (Payroll/Employer tab):
   - Enter a company name and click **Register issuer**. Only registered
     issuers can seal attestations applicants can prove against — this
     mirrors an accredited payroll-provider registry.
3. **Seal an income attestation** (same tab):
   - Enter the applicant's real monthly income and click **Seal
     attestation**. This publishes only a commitment hash to the ledger —
     the income itself never leaves your browser.
   - Copy the **attestation code** and **salt** shown and hand them to the
     applicant off-chain (a message, a QR code, however you'd share a
     reference number today) — never post them publicly.
4. **Publish a listing** (Landlord tab):
   - Enter the monthly rent and click **Publish listing**. Rent is already
     public information on any listing site, so it's shown openly.
5. **Prove eligibility** (Applicant tab):
   - Enter the listing ID, the attestation code and salt you were given,
     your income, and the required multiplier (3 means income ≥ 3× rent).
   - Click **Prove & submit**. This proves your attested income clears the
     bar and that you haven't already claimed eligibility for this
     listing — the landlord's contract only ever sees a pass.
6. **Watch the Listings table** at the bottom update in real time: rent
   stays public, the income requirement stays redacted, and the verified
   applicant count increases — with no individual income ever shown.

## What Gets Proved (and What Stays Private)

| | Public (on the ledger) | Private (never leaves your device) |
|---|---|---|
| Issuer registration | Issuer ID | — |
| Listing | Rent amount, landlord ID | — |
| Attestation | Commitment hash, issuer ID | Real income, salt |
| Proof submission | Pass/fail nullifier, updated verified count | Income, salt, which attestation was used |

## Troubleshooting

- **"issuer is not registered"** — the issuer ID used to seal an
  attestation doesn't match a registered issuer. Register the issuer
  first, or double check the ID.
- **"attestation does not match this caller"** — the income, salt, or
  wallet address entered doesn't match what was originally attested.
  Confirm the exact code and salt with your payroll provider.
- **"attested income does not meet this listing's threshold"** — your
  attested income is below rent × multiplier for this listing. Try a
  listing with lower rent or a lower multiplier.
- **"already submitted a proof for this listing"** — each attestation can
  only claim eligibility for a given listing once, to prevent inflating a
  listing's applicant pool with a single attestation.
- **Wallet won't connect** — confirm the Lace extension is unlocked and
  set to the Preprod network. Threshold falls back to local demo mode if
  no wallet is detected, so you can keep working either way.
