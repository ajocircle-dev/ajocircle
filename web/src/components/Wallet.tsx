"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAccount, useConnect, useSwitchChain } from "wagmi";
import { numberToHex } from "viem";
import { chain, faucetUrl } from "@/lib/config";
import { friendlyError } from "@/lib/errors";
import { useToast } from "./Toasts";

type Eip1193 = { request: (a: { method: string; params?: unknown[] }) => Promise<unknown> };

function injectedProvider(): Eip1193 | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { ethereum?: Eip1193 }).ethereum;
}

export type WalletState = {
  /** null until checked on the client (avoids hydration mismatch). */
  hasWallet: boolean | null;
  isConnected: boolean;
  wrongNetwork: boolean;
  connecting: boolean;
  switching: boolean;
  /** Connected and on the right chain. */
  ready: boolean;
  connect: () => Promise<boolean>;
  switchNetwork: () => Promise<boolean>;
  /**
   * Call before any action. Returns true only if the wallet was already ready.
   * Otherwise it takes the next step (explain/install, connect, switch) and returns false,
   * so the action never silently does nothing.
   */
  ensure: () => Promise<boolean>;
  showHelp: () => void;
};

const Ctx = createContext<WalletState | null>(null);
export function useWallet() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useWallet outside WalletProvider");
  return v;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const { isConnected, chainId } = useAccount();
  const { connectAsync, connectors, isPending: connecting } = useConnect();
  const { switchChainAsync, isPending: switching } = useSwitchChain();
  const [hasWallet, setHasWallet] = useState<boolean | null>(null);
  const [help, setHelp] = useState(false);

  useEffect(() => {
    const check = () => setHasWallet(!!injectedProvider());
    check();
    // Some wallets inject late; also listen for EIP-6963 announcements.
    window.addEventListener("ethereum#initialized", check, { once: true });
    window.addEventListener("eip6963:announceProvider", check);
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    const t = setTimeout(check, 1200);
    return () => {
      window.removeEventListener("ethereum#initialized", check);
      window.removeEventListener("eip6963:announceProvider", check);
      clearTimeout(t);
    };
  }, []);

  const wrongNetwork = isConnected && chainId !== chain.id;
  const ready = isConnected && !wrongNetwork;

  const switchNetwork = useCallback(async () => {
    try {
      await switchChainAsync({ chainId: chain.id });
      toast.push({ kind: "success", title: `Switched to ${chain.name}` });
      return true;
    } catch (e) {
      const code = (e as { code?: number; cause?: { code?: number } }).code ?? (e as { cause?: { code?: number } }).cause?.code;
      const unknownChain = code === 4902 || /unrecognized chain|not been added|unknown chain/i.test(String((e as Error).message));
      const p = injectedProvider();
      if (unknownChain && p) {
        try {
          await p.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: numberToHex(chain.id),
                chainName: chain.name,
                nativeCurrency: chain.nativeCurrency,
                rpcUrls: chain.rpcUrls.default.http,
                blockExplorerUrls: chain.blockExplorers ? [chain.blockExplorers.default.url] : undefined,
              },
            ],
          });
          toast.push({ kind: "success", title: `${chain.name} added to your wallet` });
          return true;
        } catch (e2) {
          toast.push({ kind: "error", title: "Couldn't add the network", body: friendlyError(e2) });
          return false;
        }
      }
      toast.push({ kind: "error", title: `Couldn't switch to ${chain.name}`, body: friendlyError(e) });
      return false;
    }
  }, [switchChainAsync, toast]);

  const connect = useCallback(async () => {
    if (!injectedProvider()) {
      setHasWallet(false);
      setHelp(true);
      return false;
    }
    const c = connectors[0];
    if (!c) {
      setHelp(true);
      return false;
    }
    try {
      const res = await connectAsync({ connector: c });
      toast.push({ kind: "success", title: "Wallet connected" });
      if (res.chainId !== chain.id) return switchNetwork();
      return true;
    } catch (e) {
      toast.push({ kind: "error", title: "Wallet not connected", body: friendlyError(e) });
      return false;
    }
  }, [connectAsync, connectors, switchNetwork, toast]);

  const ensure = useCallback(async () => {
    if (ready) return true;
    if (!injectedProvider()) {
      setHasWallet(false);
      setHelp(true);
      return false;
    }
    if (!isConnected) {
      const ok = await connect();
      if (ok) toast.push({ kind: "info", title: "You're set", body: "Wallet connected on Mezo Testnet. Tap the button again to continue." });
      return false;
    }
    if (wrongNetwork) await switchNetwork();
    return false;
  }, [ready, isConnected, wrongNetwork, connect, switchNetwork, toast]);

  const value = useMemo<WalletState>(
    () => ({ hasWallet, isConnected, wrongNetwork, connecting, switching, ready, connect, switchNetwork, ensure, showHelp: () => setHelp(true) }),
    [hasWallet, isConnected, wrongNetwork, connecting, switching, ready, connect, switchNetwork, ensure],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      {help && <NoWalletModal onClose={() => setHelp(false)} />}
    </Ctx.Provider>
  );
}

function isMobile() {
  return typeof navigator !== "undefined" && /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);
}

export function NoWalletModal({ onClose }: { onClose: () => void }) {
  const [mobile, setMobile] = useState(false);
  const [here, setHere] = useState("");
  useEffect(() => {
    setMobile(isMobile());
    setHere(window.location.host + window.location.pathname + window.location.search);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="nowallet-title" onClick={(e) => e.stopPropagation()}>
        <button className="modal-x" aria-label="Close" onClick={onClose}>×</button>
        <div className="modal-badge" aria-hidden>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2.5" y="6" width="19" height="14" rx="3" />
            <path d="M16 13h2.5M2.5 10h19M6 6V4.5A1.5 1.5 0 0 1 7.5 3h9" />
          </svg>
        </div>
        <h2 id="nowallet-title">You need a crypto wallet for this</h2>
        <p className="muted">
          We couldn&apos;t find a browser wallet. AjoCircle never holds your keys: joining, contributing and claiming are
          transactions <em>you</em> sign, so you need a wallet such as MetaMask or Rabby. You can keep browsing circles
          without one.
        </p>
        {mobile ? (
          <div className="wallet-options">
            <a className="wallet-opt" href={`https://metamask.app.link/dapp/${here}`}>
              <strong>Open in MetaMask app</strong>
              <span className="muted small">Opens this page in MetaMask&apos;s built-in browser</span>
            </a>
            <a className="wallet-opt" href="https://metamask.io/download" target="_blank" rel="noreferrer">
              <strong>Get MetaMask</strong>
              <span className="muted small">iOS and Android</span>
            </a>
            <a className="wallet-opt" href="https://rabby.io" target="_blank" rel="noreferrer">
              <strong>Get Rabby</strong>
              <span className="muted small">iOS and Android</span>
            </a>
          </div>
        ) : (
          <div className="wallet-options">
            <a className="wallet-opt" href="https://metamask.io/download" target="_blank" rel="noreferrer">
              <strong>Install MetaMask</strong>
              <span className="muted small">Chrome, Firefox, Brave, Edge</span>
            </a>
            <a className="wallet-opt" href="https://rabby.io" target="_blank" rel="noreferrer">
              <strong>Install Rabby</strong>
              <span className="muted small">Chrome, Brave, Edge</span>
            </a>
          </div>
        )}
        <div className="note small">
          <strong>On a phone?</strong> Mobile browsers like Safari and Chrome can&apos;t talk to wallets directly. Open
          this site from the browser inside your wallet app (MetaMask, Rabby, Trust Wallet…).
        </div>
        <p className="muted small">
          After installing, refresh this page. This is a testnet app: test BTC for gas comes from the{" "}
          {faucetUrl ? <a href={faucetUrl} target="_blank" rel="noreferrer">Mezo faucet</a> : "Mezo faucet"}, and nothing here costs real money.
        </p>
        <div className="modal-actions">
          <button className="btn ghost" onClick={() => window.location.reload()}>I installed one, refresh</button>
          <button className="btn" onClick={onClose}>Keep browsing</button>
        </div>
      </div>
    </div>
  );
}

/** Thin global strip: wrong network (with a switch button) or no wallet detected. */
export function WalletBanner() {
  const w = useWallet();
  if (w.wrongNetwork)
    return (
      <div className="banner warn" role="status">
        <span>Your wallet is on another network. AjoCircle runs on <strong>{chain.name}</strong>.</span>
        <button className="btn small-btn" onClick={() => w.switchNetwork()} disabled={w.switching}>
          {w.switching ? <><Spinner /> Switching…</> : `Switch to ${chain.name}`}
        </button>
      </div>
    );
  return null;
}

export function Spinner() {
  return <span className="spinner" aria-hidden />;
}
