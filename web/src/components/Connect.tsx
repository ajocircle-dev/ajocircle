"use client";
import { useEffect, useRef, useState } from "react";
import { useAccount, useDisconnect } from "wagmi";
import { chain, explorerUrl } from "@/lib/config";
import { short } from "@/lib/format";
import { Spinner, useWallet } from "./Wallet";

export function Connect() {
  const { address } = useAccount();
  const { disconnect } = useDisconnect();
  const w = useWallet();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const off = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("click", off);
    return () => document.removeEventListener("click", off);
  }, [open]);

  if (!mounted || !w.isConnected) {
    const noWallet = mounted && w.hasWallet === false;
    return (
      <button
        className={`btn ${noWallet ? "ghost" : ""}`}
        onClick={() => w.connect()}
        disabled={w.connecting}
        title={noWallet ? "No browser wallet detected. Click for help." : undefined}
      >
        {w.connecting ? <><Spinner /> Check your wallet…</> : noWallet ? "Get a wallet" : "Connect wallet"}
      </button>
    );
  }
  if (w.wrongNetwork) {
    return (
      <button className="btn warn" onClick={() => w.switchNetwork()} disabled={w.switching}>
        {w.switching ? <><Spinner /> Switching…</> : <>Switch to {chain.name}</>}
      </button>
    );
  }
  return (
    <div className="acct" ref={ref}>
      <button className="btn ghost acct-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="dot ok" aria-hidden /> {short(address)}
      </button>
      {open && (
        <div className="menu">
          <span className="muted small">Connected to {chain.name}</span>
          {explorerUrl && (
            <a href={`${explorerUrl}/address/${address}`} target="_blank" rel="noreferrer">View on explorer ↗</a>
          )}
          <button onClick={() => navigator.clipboard?.writeText(address ?? "").then(() => setOpen(false))}>Copy address</button>
          <button onClick={() => { disconnect(); setOpen(false); }}>Disconnect</button>
        </div>
      )}
    </div>
  );
}
