import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { Providers } from "./providers";
import { Connect } from "@/components/Connect";
import { ThemeToggle, themeInitScript } from "@/components/ThemeToggle";
import { WalletBanner } from "@/components/Wallet";
import { Logo } from "@/components/Logo";
import { ajoAddress, chain, explorerUrl } from "@/lib/config";

export const metadata: Metadata = {
  title: "AjoCircle · onchain ajo savings circles on Mezo",
  description:
    "Rotating savings circles (ajo / esusu) with BTC-backed MUSD on Mezo. A smart contract keeps the books, holds collateral and pays each member in turn.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f8f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1615" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <Providers>
          <a className="skip" href="#main">Skip to content</a>
          <header className="top-wrap">
            <div className="top">
              <Link href="/" className="brand" aria-label="AjoCircle home">
                <Logo /> <span>AjoCircle</span>
              </Link>
              <nav className="nav" aria-label="Main">
                <Link href="/dashboard/" className="nav-strong">Dashboard</Link>
                <Link href="/#how">How it works</Link>
                <Link href="/#features">Features</Link>
                <Link href="/#faq">FAQ</Link>
                <Link href="/create/">Create</Link>
              </nav>
              <div className="topright">
                <span className="pill net" title="This app runs on Mezo Testnet"><span className="dot ok" aria-hidden /> {chain.name}</span>
                <ThemeToggle />
                <Connect />
              </div>
            </div>
          </header>
          <WalletBanner />
          <main id="main">{children}</main>
          <footer className="foot">
            <div className="foot-inner">
              <div className="foot-brand">
                <Link href="/" className="brand"><Logo /> <span>AjoCircle</span></Link>
                <p className="muted small">
                  Rotating savings circles, enforced by a smart contract instead of a treasurer. Built for Mezo.
                  Unaudited hackathon build on testnet: no real funds.
                </p>
              </div>
              <div className="foot-links">
                <strong className="small">Project</strong>
                <a href="https://github.com/ajocircle-dev/ajocircle" target="_blank" rel="noreferrer">GitHub ↗</a>
                {explorerUrl && ajoAddress && (
                  <a href={`${explorerUrl}/address/${ajoAddress}`} target="_blank" rel="noreferrer">Contract on explorer ↗</a>
                )}
                <Link href="/circle/?id=1">Demo circle</Link>
              </div>
              <div className="foot-links">
                <strong className="small">Mezo</strong>
                <a href="https://mezo.org" target="_blank" rel="noreferrer">mezo.org ↗</a>
                <a href="https://mezo.org/docs" target="_blank" rel="noreferrer">Docs ↗</a>
                <a href="https://faucet.test.mezo.org/" target="_blank" rel="noreferrer">Testnet faucet ↗</a>
              </div>
            </div>
            <p className="muted small foot-note">
              Built for Mezo <span className="btc">₿</span> · MUSD on {chain.name}
            </p>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
