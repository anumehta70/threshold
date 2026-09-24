import { useState } from "react";
import type {
  IssuerSummary,
  ListingSummary,
  AttestationHandle,
} from "../utils/contract";
import { truncateHash } from "../utils/contract";

type Props = {
  connected: boolean;
  busy: boolean;
  error: string | null;
  issuers: IssuerSummary[];
  listings: ListingSummary[];
  onRegisterIssuer: (name: string) => Promise<IssuerSummary>;
  onCreateListing: (rentAmount: number) => Promise<ListingSummary>;
  onIssueAttestation: (
    issuerId: string,
    income: number
  ) => Promise<AttestationHandle>;
  onSubmitProof: (input: {
    listingId: number;
    attestationId: string;
    income: number;
    salt: string;
    multiplier: number;
  }) => Promise<{ listingId: number; verified: true }>;
};

type Tab = "issuer" | "landlord" | "applicant";

const TABS: { id: Tab; label: string; blurb: string }[] = [
  {
    id: "issuer",
    label: "Payroll / Employer",
    blurb: "Attest to an applicant's income, off-chain and privately.",
  },
  {
    id: "landlord",
    label: "Landlord",
    blurb: "Publish a listing's rent and receive eligibility proofs.",
  },
  {
    id: "applicant",
    label: "Applicant",
    blurb: "Prove your attested income clears a listing's bar.",
  },
];

export default function ThresholdFlow({
  connected,
  busy,
  error,
  issuers,
  listings,
  onRegisterIssuer,
  onCreateListing,
  onIssueAttestation,
  onSubmitProof,
}: Props) {
  const [tab, setTab] = useState<Tab>("issuer");

  // ---- Issuer panel state ---------------------------------------------------
  const [issuerName, setIssuerName] = useState("Northwind Payroll Co.");
  const [issuerNotice, setIssuerNotice] = useState<string | null>(null);
  const [selectedIssuerId, setSelectedIssuerId] = useState("");
  const [attestIncome, setAttestIncome] = useState("7500");
  const [lastAttestation, setLastAttestation] =
    useState<AttestationHandle | null>(null);

  async function handleRegisterIssuer(e: React.FormEvent) {
    e.preventDefault();
    setIssuerNotice(null);
    const issuer = await onRegisterIssuer(issuerName.trim() || "Unnamed issuer");
    setSelectedIssuerId(issuer.issuerId);
    setIssuerNotice(`"${issuer.name}" registered as a trusted issuer.`);
  }

  async function handleIssueAttestation(e: React.FormEvent) {
    e.preventDefault();
    setIssuerNotice(null);
    if (!selectedIssuerId) {
      setIssuerNotice("Register or select an issuer first.");
      return;
    }
    const handle = await onIssueAttestation(
      selectedIssuerId,
      Number(attestIncome) || 0
    );
    setLastAttestation(handle);
    setIssuerNotice(
      "Attestation sealed. Hand the code below to the applicant off-chain — never post it publicly."
    );
  }

  // ---- Landlord panel state --------------------------------------------------
  const [rentAmount, setRentAmount] = useState("2200");
  const [landlordNotice, setLandlordNotice] = useState<string | null>(null);

  async function handleCreateListing(e: React.FormEvent) {
    e.preventDefault();
    setLandlordNotice(null);
    const listing = await onCreateListing(Number(rentAmount) || 0);
    setLandlordNotice(
      `Listing #${listing.listingId} published at $${listing.rentAmount}/mo — applicants can now prove eligibility.`
    );
  }

  // ---- Applicant panel state -------------------------------------------------
  const [applyListingId, setApplyListingId] = useState("");
  const [applyAttestationId, setApplyAttestationId] = useState("");
  const [applyIncome, setApplyIncome] = useState("");
  const [applySalt, setApplySalt] = useState("");
  const [applyMultiplier, setApplyMultiplier] = useState("3");
  const [applyNotice, setApplyNotice] = useState<string | null>(null);

  function useLastAttestation() {
    if (!lastAttestation) return;
    setApplyAttestationId(lastAttestation.attestationId);
    setApplyIncome(String(lastAttestation.income));
    setApplySalt(lastAttestation.salt);
  }

  async function handleSubmitProof(e: React.FormEvent) {
    e.preventDefault();
    setApplyNotice(null);
    const result = await onSubmitProof({
      listingId: Number(applyListingId),
      attestationId: applyAttestationId.trim(),
      income: Number(applyIncome) || 0,
      salt: applySalt.trim(),
      multiplier: Number(applyMultiplier) || 3,
    });
    setApplyNotice(
      `Proved eligible for listing #${result.listingId}. Your income was never disclosed.`
    );
  }

  return (
    <div className="space-y-16">
      {/* ---- Role tabs ---------------------------------------------------- */}
      <div>
        <div className="flex flex-wrap gap-2 border-b border-white/10 pb-px">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={
                "relative rounded-t-md px-4 py-2.5 text-sm font-medium transition " +
                (tab === t.id
                  ? "bg-pine-800/60 text-limewash"
                  : "text-limewash/45 hover:text-limewash/70")
              }
            >
              {t.label}
              {tab === t.id && (
                <span className="absolute inset-x-0 -bottom-px h-[2px] bg-oxblood-500" />
              )}
            </button>
          ))}
        </div>
        <p className="mt-3 text-sm text-limewash/50">
          {TABS.find((t) => t.id === tab)?.blurb}
        </p>
      </div>

      {/* ---- Issuer panel --------------------------------------------------- */}
      {tab === "issuer" && (
        <div className="grid gap-8 md:grid-cols-2">
          <form onSubmit={handleRegisterIssuer} className="card p-6">
            <h3 className="font-display text-xl text-limewash">
              Register as a trusted issuer
            </h3>
            <p className="mt-2 text-sm text-limewash/55">
              Only registered payroll providers/employers can issue
              attestations applicants can prove against.
            </p>
            <label className="mt-5 block text-sm text-limewash/70">
              Company name
              <input
                value={issuerName}
                onChange={(e) => setIssuerName(e.target.value)}
                className="mt-1 w-full rounded-md border border-white/10 bg-pine-900 px-3 py-2 text-limewash focus:border-oak-500"
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="mt-5 w-full rounded-md bg-oak-500 py-2.5 text-sm font-medium text-pine-950 transition hover:bg-oak-400 disabled:opacity-40"
            >
              {busy ? "Registering…" : "Register issuer"}
            </button>

            {issuers.length > 0 && (
              <div className="mt-5">
                <p className="text-xs uppercase tracking-wide text-limewash/40">
                  Trusted issuers
                </p>
                <div className="mt-2 space-y-1">
                  {issuers.map((i) => (
                    <button
                      type="button"
                      key={i.issuerId}
                      onClick={() => setSelectedIssuerId(i.issuerId)}
                      className={
                        "block w-full rounded-md border px-3 py-2 text-left text-sm transition " +
                        (selectedIssuerId === i.issuerId
                          ? "border-oxblood-500/60 bg-oxblood-500/10 text-limewash"
                          : "border-white/10 text-limewash/60 hover:border-white/20")
                      }
                    >
                      {i.name}
                      <span className="ml-2 font-mono text-xs text-limewash/35">
                        {truncateHash(i.issuerId)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </form>

          <form onSubmit={handleIssueAttestation} className="card p-6">
            <h3 className="font-display text-xl text-limewash">
              Issue an income attestation
            </h3>
            <p className="mt-2 text-sm text-limewash/55">
              Only a commitment reaches the ledger — the income figure stays
              between you and the applicant.
            </p>

            <label className="mt-5 block text-sm text-limewash/70">
              Applicant's real income (monthly)
              <input
                type="number"
                min={0}
                value={attestIncome}
                onChange={(e) => setAttestIncome(e.target.value)}
                className="mt-1 w-full rounded-md border border-white/10 bg-pine-900 px-3 py-2 font-mono text-limewash focus:border-oak-500"
              />
            </label>

            <button
              type="submit"
              disabled={!connected || busy || !selectedIssuerId}
              className="mt-5 w-full rounded-md bg-oxblood-500 py-2.5 text-sm font-medium text-limewash transition hover:bg-oxblood-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? "Sealing…" : "Seal attestation"}
            </button>

            {!connected && (
              <p className="mt-3 text-xs text-limewash/40">
                Connect a wallet to issue attestations.
              </p>
            )}
            {issuerNotice && (
              <p className="mt-3 text-xs text-sage">{issuerNotice}</p>
            )}

            {lastAttestation && (
              <div className="mt-4 rounded-md border border-oak-500/30 bg-pine-900 p-3 font-mono text-xs text-limewash/70">
                <p className="text-limewash/40">attestation code (hand to applicant off-chain)</p>
                <p className="mt-1 break-all">{lastAttestation.attestationId}</p>
                <p className="mt-2 text-limewash/40">salt</p>
                <p className="mt-1 break-all">{lastAttestation.salt}</p>
              </div>
            )}
          </form>
        </div>
      )}

      {/* ---- Landlord panel --------------------------------------------------- */}
      {tab === "landlord" && (
        <form onSubmit={handleCreateListing} className="card max-w-md p-6">
          <h3 className="font-display text-xl text-limewash">
            Publish a listing
          </h3>
          <p className="mt-2 text-sm text-limewash/55">
            Rent is already public information — only the applicant's income
            stays hidden.
          </p>
          <label className="mt-5 block text-sm text-limewash/70">
            Monthly rent
            <input
              type="number"
              min={0}
              value={rentAmount}
              onChange={(e) => setRentAmount(e.target.value)}
              className="mt-1 w-full rounded-md border border-white/10 bg-pine-900 px-3 py-2 font-mono text-limewash focus:border-oak-500"
            />
          </label>
          <button
            type="submit"
            disabled={!connected || busy}
            className="mt-5 w-full rounded-md bg-oak-500 py-2.5 text-sm font-medium text-pine-950 transition hover:bg-oak-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "Publishing…" : "Publish listing"}
          </button>
          {!connected && (
            <p className="mt-3 text-xs text-limewash/40">
              Connect a wallet to publish a listing.
            </p>
          )}
          {landlordNotice && (
            <p className="mt-3 text-xs text-sage">{landlordNotice}</p>
          )}
        </form>
      )}

      {/* ---- Applicant panel --------------------------------------------------- */}
      {tab === "applicant" && (
        <form onSubmit={handleSubmitProof} className="card max-w-lg p-6">
          <h3 className="font-display text-xl text-limewash">
            Prove eligibility for a listing
          </h3>
          <p className="mt-2 text-sm text-limewash/55">
            Uses the attestation your employer/payroll sealed for you. The
            landlord's contract only ever sees a pass.
          </p>

          {lastAttestation && (
            <button
              type="button"
              onClick={useLastAttestation}
              className="mt-4 text-sm text-oak-400 hover:text-oak-300"
            >
              Use my most recent attestation
            </button>
          )}

          <label className="mt-4 block text-sm text-limewash/70">
            Listing ID
            <input
              type="number"
              min={0}
              value={applyListingId}
              onChange={(e) => setApplyListingId(e.target.value)}
              placeholder="e.g. 0"
              className="mt-1 w-full rounded-md border border-white/10 bg-pine-900 px-3 py-2 font-mono text-limewash focus:border-oak-500"
            />
          </label>

          <label className="mt-4 block text-sm text-limewash/70">
            Attestation code
            <input
              value={applyAttestationId}
              onChange={(e) => setApplyAttestationId(e.target.value)}
              placeholder="from your payroll provider"
              className="mt-1 w-full rounded-md border border-white/10 bg-pine-900 px-3 py-2 font-mono text-xs text-limewash focus:border-oak-500"
            />
          </label>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="block text-sm text-limewash/70">
              Your income (private)
              <input
                type="number"
                min={0}
                value={applyIncome}
                onChange={(e) => setApplyIncome(e.target.value)}
                className="mt-1 w-full rounded-md border border-white/10 bg-pine-900 px-3 py-2 font-mono text-limewash focus:border-oak-500"
              />
            </label>
            <label className="block text-sm text-limewash/70">
              Salt
              <input
                value={applySalt}
                onChange={(e) => setApplySalt(e.target.value)}
                className="mt-1 w-full rounded-md border border-white/10 bg-pine-900 px-3 py-2 font-mono text-xs text-limewash focus:border-oak-500"
              />
            </label>
          </div>

          <label className="mt-4 block text-sm text-limewash/70">
            Required multiplier (income ≥ rent × N)
            <input
              type="number"
              min={1}
              value={applyMultiplier}
              onChange={(e) => setApplyMultiplier(e.target.value)}
              className="mt-1 w-32 rounded-md border border-white/10 bg-pine-900 px-3 py-2 font-mono text-limewash focus:border-oak-500"
            />
          </label>

          <button
            type="submit"
            disabled={!connected || busy || !applyListingId || !applyAttestationId}
            className="mt-5 w-full rounded-md border border-oxblood-500 py-2.5 text-sm font-medium text-oxblood-400 transition hover:bg-oxblood-500 hover:text-limewash disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "Proving…" : "Prove & submit"}
          </button>

          {!connected && (
            <p className="mt-3 text-xs text-limewash/40">
              Connect a wallet to submit a proof.
            </p>
          )}
          {applyNotice && (
            <p className="mt-3 text-xs text-sage">{applyNotice}</p>
          )}
        </form>
      )}

      {error && (
        <div className="rounded-md border border-rust/40 bg-rust/10 px-4 py-3 text-sm text-rust">
          {error}
        </div>
      )}

      {/* ---- The threshold line: public above, proven-not-shown below ------- */}
      <div>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-display text-2xl text-limewash">Listings</h2>
          <p className="text-xs text-limewash/40">
            what's public — rent and headcount, never income
          </p>
        </div>
        <div className="threshold-line mb-6" />

        {listings.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/10 px-6 py-10 text-center text-sm text-limewash/40">
            No listings published yet. Publish one from the Landlord tab to
            see it appear here.
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-pine-800/80 text-xs uppercase tracking-wide text-limewash/45">
                <tr>
                  <th className="px-4 py-3 font-normal">Listing</th>
                  <th className="px-4 py-3 font-normal">Rent / mo</th>
                  <th className="px-4 py-3 font-normal">Requires income ≥</th>
                  <th className="px-4 py-3 font-normal">Verified applicants</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {listings.map((listing) => (
                  <tr key={listing.listingId} className="bg-pine-900/40">
                    <td className="px-4 py-3 font-mono text-limewash/80">
                      #{listing.listingId}
                    </td>
                    <td className="px-4 py-3 font-mono text-limewash/70">
                      ${listing.rentAmount}
                    </td>
                    <td className="px-4 py-3">
                      <span className="sealed-figure">•••</span>
                    </td>
                    <td className="px-4 py-3 text-limewash/70">
                      {listing.verifiedCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
