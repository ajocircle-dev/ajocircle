"use client";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { chain } from "@/lib/config";
import { short } from "@/lib/format";

export function Connect() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  if (!isConnected) {
    const c = connectors[0];
    return (
      <button className="btn" disabled={!c || isPending} onClick={() => c && connect({ connector: c })}>
        {isPending ? "Connecting…" : "Connect wallet"}
      </button>
    );
  }
  if (chainId !== chain.id) {
    return (
      <button className="btn warn" onClick={() => switchChain({ chainId: chain.id })}>
        Switch to {chain.name}
      </button>
    );
  }
  return (
    <button className="btn ghost" onClick={() => disconnect()} title="Disconnect">
      {short(address)}
    </button>
  );
}
