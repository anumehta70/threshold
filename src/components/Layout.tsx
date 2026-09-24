import type { ReactNode } from "react";
import type { WalletStatus } from "../hooks/useMidnight";
import WalletConnect from "./WalletConnect";

type Props = {
  children: ReactNode;
  mode: "local" | "network";
  status: WalletStatus;
  address: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
};

function DoorMark() {
  return (
    <svg width="24" height="28" viewBox="0 0 24 28" aria-hidden="true">
      <path
        d="M2 27V8C2 4.13401 6.47715 1 12 1C17.5228 1 22 4.13401 22 8V27"
        stroke="#B98650"
        strokeWidth="2"
        fill="none"
      />
      <circle cx="8" cy="17" r="1.4" fill="#8B2E2E" />
    </svg>
  );
}

export default function Layout({
  children,
  mode,
  status,
  address,
  onConnect,
  onDisconnect,
}: Props) {
  return (
    <div className="min-h-screen bg-pine-900">
      <header className="border-b border-white/5">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <DoorMark />
            <div>
              <p className="font-display text-lg leading-none text-limewash">
                Threshold
              </p>
              <p className="text-xs leading-none text-limewash/45">
                proof of income
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-wide text-limewash/50 sm:inline-block">
              {mode === "local" ? "local demo ledger" : "preprod"}
            </span>
            <WalletConnect
              status={status}
              address={address}
              onConnect={onConnect}
              onDisconnect={onDisconnect}
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-24 pt-14">{children}</main>

      <footer className="border-t border-white/5 py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 text-xs text-limewash/40 sm:flex-row sm:items-center sm:justify-between">
          <p>Built on Midnight (Compact) for the Builder Challenge.</p>
          <div className="flex gap-4">
            <a
              className="hover:text-oak-400"
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>
            <a
              className="hover:text-oak-400"
              href="https://x.com"
              target="_blank"
              rel="noreferrer"
            >
              X / Twitter
            </a>
            <a
              className="hover:text-oak-400"
              href="https://docs.midnight.network"
              target="_blank"
              rel="noreferrer"
            >
              Midnight docs
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
