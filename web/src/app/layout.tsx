import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { Providers } from "./providers";
import { Connect } from "@/components/Connect";
import { chain } from "@/lib/config";

export const metadata: Metadata = {
  title: "AjoCircle: onchain savings circles",
  description: "Rotating savings (ajo / esusu) with stablecoins, enforced by a smart contract instead of trust.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <header className="top">
            <Link href="/" className="brand">
              <span className="logo">◎</span> AjoCircle
            </Link>
            <div className="topright">
              <span className="pill">{chain.name}</span>
              <Connect />
            </div>
          </header>
          <main>{children}</main>
          <footer className="muted small">
            AjoCircle · savings circles without the WhatsApp group treasurer · unaudited hackathon build
          </footer>
        </Providers>
      </body>
    </html>
  );
}
