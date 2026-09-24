import type { WalletStatus } from "../hooks/useMidnight";

type Props = {
  status: WalletStatus;
  address: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
};

export default function WalletConnect({
  status,
  address,
  onConnect,
  onDisconnect,
}: Props) {
  if (status === "connected" && address) {
    return (
      <button
        onClick={onDisconnect}
        className="group flex items-center gap-2 rounded-full border border-oak-500/30 bg-pine-800 px-4 py-2 text-sm text-limewash/90 transition hover:border-rust/50 hover:text-rust"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-sage" />
        <span className="font-mono text-xs">{address}</span>
        <span className="text-limewash/40 group-hover:text-rust">
          disconnect
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={onConnect}
      disabled={status === "connecting"}
      className="rounded-full bg-oxblood-500 px-5 py-2 text-sm font-medium text-limewash transition hover:bg-oxblood-400 disabled:cursor-wait disabled:opacity-70"
    >
      {status === "connecting" ? "Connecting…" : "Connect wallet"}
    </button>
  );
}
