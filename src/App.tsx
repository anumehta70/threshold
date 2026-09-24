import Layout from "./components/Layout";
import ThresholdFlow from "./components/ThresholdFlow";
import { useMidnight } from "./hooks/useMidnight";

export default function App() {
  const {
    mode,
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
  } = useMidnight();

  return (
    <Layout
      mode={mode}
      status={status}
      address={address}
      onConnect={connect}
      onDisconnect={disconnect}
    >
      <section className="grid gap-10 lg:grid-cols-[3fr_2fr] lg:items-center">
        <div>
          <p className="text-xs uppercase tracking-wide text-oxblood-400/90">
            Confidential income proofs on Midnight
          </p>
          <h1 className="mt-3 max-w-xl font-display text-4xl leading-tight text-limewash sm:text-5xl">
            Prove you can afford it.
            <br />
            Not what you earn.
          </h1>
          <p className="mt-5 max-w-md text-limewash/60">
            Threshold lets a renter prove their income clears a listing's
            bar — no pay stub, no bank statement, no exact figure ever
            reaching the landlord.
          </p>
        </div>

        <div className="card p-6 font-mono text-sm">
          <p className="text-xs text-limewash/40">listing #02 · preview</p>
          <div className="mt-4 space-y-2 text-limewash/70">
            <div className="flex justify-between">
              <span>monthly rent</span>
              <span>$2,200</span>
            </div>
            <div className="flex justify-between">
              <span>applicant income</span>
              <span className="sealed-figure">•••••</span>
            </div>
            <div className="flex justify-between">
              <span>required (3×)</span>
              <span>$6,600</span>
            </div>
            <div className="flex justify-between border-t border-white/10 pt-2 text-limewash/90">
              <span>meets threshold</span>
              <span className="text-sage">proved ✓</span>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-20">
        <ThresholdFlow
          connected={status === "connected"}
          busy={busy}
          error={error}
          issuers={issuers}
          listings={listings}
          onRegisterIssuer={registerIssuer}
          onCreateListing={createListing}
          onIssueAttestation={issueAttestation}
          onSubmitProof={submitProof}
        />
      </div>
    </Layout>
  );
}
