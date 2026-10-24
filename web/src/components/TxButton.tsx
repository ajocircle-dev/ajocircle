"use client";
import type { ReactNode } from "react";
import { Spinner, useWallet } from "./Wallet";

/**
 * A button for an onchain action. Never a silent no-op:
 * - no wallet → opens the "you need a wallet" help
 * - not connected → connects; wrong network → switches
 * - running → spinner + busy text, other actions disabled
 */
export function TxButton({
  id,
  current,
  busy,
  onRun,
  children,
  busyText,
  variant = "",
  disabled,
  disabledReason,
  needsWalletText,
}: {
  id: string;
  current: string;
  busy: boolean;
  onRun: () => void;
  children: ReactNode;
  busyText?: string;
  variant?: "" | "ghost" | "warn";
  disabled?: boolean;
  disabledReason?: string;
  needsWalletText?: string;
}) {
  const w = useWallet();
  const running = current === id;
  let label: ReactNode = children;
  if (running) label = <><Spinner /> {busyText ?? "Working…"}</>;
  else if (!w.ready) {
    if (w.hasWallet === false) label = needsWalletText ? `${needsWalletText} (wallet needed)` : <>{children} · wallet needed</>;
    else if (!w.isConnected) label = needsWalletText ?? <>Connect wallet to continue</>;
    else if (w.wrongNetwork) label = "Switch network to continue";
  }
  return (
    <button
      type="button"
      className={`btn ${variant} ${!w.ready && !running ? "needs-wallet" : ""}`}
      disabled={running || (busy && !running) || (w.ready && disabled)}
      aria-busy={running}
      title={w.ready && disabled ? disabledReason : undefined}
      onClick={async () => {
        if (!(await w.ensure())) return;
        onRun();
      }}
    >
      {label}
    </button>
  );
}
