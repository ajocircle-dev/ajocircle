import Link from "next/link";

/** Verified ways to get MUSD without opening a large trove. Links are official Mezo / Banxa / Portal sources. */
export function GetMusdSection() {
  return (
    <section id="get-musd" className="section">
      <div className="section-head">
        <span className="kicker">Get MUSD</span>
        <h2 className="h2">Ways to get MUSD without a 2,000 MUSD trove</h2>
        <p className="muted">
          Borrowing against BTC on Mezo has a minimum debt (about 2,000 MUSD). Savers who only need a few dozen or
          hundred MUSD for a circle can use these options instead. Links below are official Mezo or partner pages.
        </p>
      </div>
      <div className="features">
        <div className="feature">
          <h3>Buy with a card (Banxa)</h3>
          <p className="muted">
            On Mezo, open Borrow and choose &ldquo;Buy MUSD&rdquo;. Banxa converts fiat (card, Apple/Google Pay, or bank
            transfer) into MUSD in your connected wallet. No BTC bridge required.
          </p>
          <p className="muted small">
            Sources:{" "}
            <a href="https://mezo.org/blog/buy-musd-directly-with-your-card-banxa-is-live-on-mezo/" target="_blank" rel="noreferrer">
              Mezo Banxa announcement
            </a>
            {" · "}
            <a href="https://mezo.org" target="_blank" rel="noreferrer">mezo.org</a>
          </p>
        </div>
        <div className="feature">
          <h3>Swap on Mezo</h3>
          <p className="muted">
            Use Mezo Swap to trade BTC, USDC, or USDT for MUSD onchain. Stable pairs (MUSD/USDC, MUSD/USDT) use a
            low-slippage curve; BTC/MUSD is a volatile pool.
          </p>
          <p className="muted small">
            Sources:{" "}
            <a href="https://mezo.org/feature/swap" target="_blank" rel="noreferrer">Mezo Swap</a>
            {" · "}
            <a href="https://mezo.org/docs/users/mezo-earn/pools/mezo-swap/" target="_blank" rel="noreferrer">
              Mezo Swap docs
            </a>
          </p>
        </div>
        <div className="feature">
          <h3>Bridge MUSD in</h3>
          <p className="muted">
            If you already hold MUSD on Ethereum or Base, bridge it to Mezo with Wormhole Native Token Transfer via the
            Mezo dApp or Portal Bridge (minimum about 0.01 MUSD).
          </p>
          <p className="muted small">
            Sources:{" "}
            <a href="https://mezo.org/docs/users/musd/musd-bridge/" target="_blank" rel="noreferrer">MUSD Bridge docs</a>
            {" · "}
            <a href="https://mezo.org/blog/mezo-and-musd-go-multichain-with-wormhole/" target="_blank" rel="noreferrer">
              Wormhole announcement
            </a>
            {" · "}
            <a href="https://portalbridge.com" target="_blank" rel="noreferrer">Portal Bridge</a>
          </p>
        </div>
        <div className="feature">
          <h3>Borrow against BTC (optional)</h3>
          <p className="muted">
            Still available if you want a loan: deposit BTC and mint MUSD. The protocol sets a minimum debt of about
            2,000 MUSD, so this is usually more than a small ajo needs.
          </p>
          <p className="muted small">
            Source:{" "}
            <a href="https://mezo.org/docs/users/musd/" target="_blank" rel="noreferrer">MUSD overview</a>
          </p>
        </div>
        <div className="feature orange">
          <h3>Testnet only</h3>
          <p className="muted">
            This live app is on Mezo Testnet. Get test BTC from the{" "}
            <a href="https://faucet.test.mezo.org/" target="_blank" rel="noreferrer">testnet faucet</a>, then borrow test
            MUSD at{" "}
            <a href="https://testnet.mezo.org" target="_blank" rel="noreferrer">testnet.mezo.org</a>. Test tokens have no
            value.
          </p>
        </div>
      </div>
    </section>
  );
}

/** Honest fee / sustainability copy. No protocol fee on-chain today. */
export function SustainSection() {
  return (
    <section id="sustain" className="section">
      <div className="section-head">
        <span className="kicker">Who pays</span>
        <h2 className="h2">Who pays and how it sustains itself</h2>
      </div>
      <div className="card">
        <ul className="plain-list">
          <li>
            <strong>Protocol fee:</strong> AjoCircle currently charges <strong>0%</strong>. There is no cut of
            contributions, collateral, or sMUSD yield. Members keep the full pot and any collateral yield credited at
            close.
          </li>
          <li>
            <strong>Gas:</strong> Each member (or anyone calling <code>settleRound</code>) pays their own Mezo gas in BTC
            for the actions they take: join, contribute, claim, settle. The contract never sponsors gas.
          </li>
          <li>
            <strong>Yield source:</strong> When a deployment wires the MUSD Savings Rate adapter, collateral earns in
            Mezo&apos;s sMUSD vault. That yield is shared among the circle&apos;s members. AjoCircle does not take a
            performance fee.
          </li>
          <li>
            <strong>How the project sustains itself today:</strong> hackathon and grant work (Mezo Wave 1/2 and related
            tracks), not user fees. If a fee is added later it will be disclosed in the UI and docs before any deploy that
            turns it on. We will not invent traction or fee revenue that does not exist.
          </li>
        </ul>
        <p className="muted small" style={{ marginTop: "1rem" }}>
          Want to run a circle yourself?{" "}
          <Link href="/create/">Start your own circle</Link>
          {" · "}
          <Link href="/dashboard/">See every on-chain circle</Link>
        </p>
      </div>
    </section>
  );
}
