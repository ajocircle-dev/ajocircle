import Link from "next/link";
import { CircleList } from "@/components/CircleList";
import { JoinById } from "@/components/JoinById";
import { MusdBanner } from "@/components/MusdBanner";
import { LiveStats } from "@/components/LiveStats";
import { HeroArt } from "@/components/HeroArt";
import { faucetUrl } from "@/lib/config";

const STEPS = [
  { t: "Create a circle", d: "Pick the contribution in MUSD, how many members, how long each round lasts, and whether the payout order is join order or random." },
  { t: "Join with collateral", d: "Share the link. Each member joins by signing with their own wallet and, if the circle asks for it, posts one contribution as collateral." },
  { t: "Contribute each round", d: "Every round, every member pays the same amount into the contract before the deadline. Anyone can see who has paid." },
  { t: "The pot rotates", d: "When everyone has paid, or the deadline passes, the whole pot goes to that round's recipient. After N rounds everyone has been paid once and remaining collateral can be claimed back." },
];

const FEATURES = [
  { i: "lock", t: "Non-custodial", d: "Funds sit in an open-source smart contract, not with a collector. No one, including us, can move them outside the rules." },
  { i: "shield", t: "Collateral covers missed payments", d: "If a member misses a round, their collateral is slashed to cover it, so the round's recipient still gets that share." },
  { i: "flag", t: "Defaulters are flagged", d: "A missed payment is recorded onchain against that address, visible to everyone in the circle." },
  { i: "list", t: "Transparent history", d: "Every join, contribution, payout and slash is an onchain event, with a link to the explorer." },
  { i: "btc", t: "MUSD on Mezo", d: "Save in MUSD, a dollar stablecoin backed by Bitcoin on Mezo. Gas is paid in BTC." },
  { i: "shuffle", t: "Fixed or random order", d: "Pay out in the order people joined, or randomize the order when the circle starts." },
];

const FAQ: { q: string; a: React.ReactNode }[] = [
  {
    q: "Is this real money?",
    a: "No. This deployment runs on Mezo Testnet. Test MUSD and test BTC have no value, so you can try everything freely. It is an unaudited hackathon build.",
  },
  {
    q: "Do I need a wallet?",
    a: (
      <>
        Not to look around: circles, members and history load straight from the chain. To create, join or pay you need a
        browser wallet such as <a href="https://metamask.io/download" target="_blank" rel="noreferrer">MetaMask</a> or{" "}
        <a href="https://rabby.io" target="_blank" rel="noreferrer">Rabby</a>. On a phone, open this site inside your
        wallet app&apos;s browser. The app offers to add Mezo Testnet to your wallet for you.
      </>
    ),
  },
  {
    q: "How do I get testnet BTC and MUSD?",
    a: (
      <>
        Get test BTC for gas from the{" "}
        <a href={faucetUrl ?? "https://faucet.test.mezo.org/"} target="_blank" rel="noreferrer">Mezo testnet faucet</a>. To get
        test MUSD, borrow it against test BTC at{" "}
        <a href="https://testnet.mezo.org" target="_blank" rel="noreferrer">testnet.mezo.org</a> (borrowing has a minimum
        debt of 2,000 MUSD). See the <a href="https://mezo.org/docs" target="_blank" rel="noreferrer">Mezo docs</a> for details.
      </>
    ),
  },
  {
    q: "What happens if someone misses a payment?",
    a: "Once the round deadline passes, anyone can settle the round. The missing member's collateral is slashed to cover their share, they are flagged as a defaulter, and the round's pot, including the slashed collateral, is credited to the recipient to claim.",
  },
  {
    q: "Can I leave a circle?",
    a: "Before it starts, yes: leaving refunds your collateral in full. After it starts you can exit early, but you forfeit your collateral and your payout turn, which protects the others.",
  },
  {
    q: "How do I invite people?",
    a: "Every circle page has an invite link with a copy and share button. There is no allowlist: whoever opens the link and signs the join transaction takes a free seat, first come, first served. The page shows how many seats are left.",
  },
];

function Icon({ name }: { name: string }) {
  const p = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  switch (name) {
    case "lock": return <svg {...p}><rect x="4" y="10.5" width="16" height="10" rx="2.5" /><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" /></svg>;
    case "shield": return <svg {...p}><path d="M12 3l7.5 3v5.5c0 4.6-3.2 8.2-7.5 9.5-4.3-1.3-7.5-4.9-7.5-9.5V6z" /><path d="M9 12l2 2 4-4" /></svg>;
    case "flag": return <svg {...p}><path d="M5 21V4M5 4h11l-2 4 2 4H5" /></svg>;
    case "list": return <svg {...p}><path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" /></svg>;
    case "btc": return <svg {...p}><path d="M8 5h5.5a3 3 0 0 1 0 6H8zM8 11h6.5a3 3 0 0 1 0 6H8zM8 5v12M10 3v2M13 3v2M10 17v2M13 17v2" /></svg>;
    default: return <svg {...p}><path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" /></svg>;
  }
}

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow"><span className="btc-dot" aria-hidden /> Built for Mezo · live on testnet</span>
          <h1>
            Your ajo, <span className="grad">without the trust problem.</span>
          </h1>
          <p className="lead">
            AjoCircle brings the ajo / esusu rotating savings circle onchain. Save together in{" "}
            <strong>BTC-backed MUSD on Mezo</strong>. A smart contract collects each round, pays the pot to each member in
            turn, and uses collateral to cover anyone who misses a payment.
          </p>
          <div className="cta">
            <Link className="btn lg" href="/create/">Create a circle</Link>
            <Link className="btn ghost lg" href="/circle/?id=1">Open the demo circle →</Link>
            <Link className="btn ghost lg" href="/dashboard/">View dashboard</Link>
          </div>
          <p className="muted small">No wallet? You can still browse every circle. You only need one to join or pay.</p>
        </div>
        <HeroArt />
      </section>

      <LiveStats />

      <MusdBanner />

      <section id="how" className="section">
        <div className="section-head">
          <span className="kicker">How it works</span>
          <h2 className="h2">Four steps, enforced by code</h2>
        </div>
        <ol className="steps">
          {STEPS.map((s, i) => (
            <li key={s.t} className="step">
              <span className="step-n">{i + 1}</span>
              <h3>{s.t}</h3>
              <p className="muted">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="features" className="section">
        <div className="section-head">
          <span className="kicker">Features</span>
          <h2 className="h2">The circle you know, with the books kept onchain</h2>
        </div>
        <div className="features">
          {FEATURES.map((f) => (
            <div key={f.t} className={`feature ${f.i === "btc" ? "orange" : ""}`}>
              <span className="feature-i"><Icon name={f.i} /></span>
              <h3>{f.t}</h3>
              <p className="muted">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="why" className="section why">
        <div className="why-copy">
          <span className="kicker">Why ajo</span>
          <h2 className="h2">A savings habit millions already trust each other with</h2>
          <p>
            In an ajo (Yoruba), esusu or adashe, a group of people pay a fixed amount into a pot every week or month, and
            each round one member takes the whole pot until everyone has had a turn. It is how many people save for rent,
            school fees, stock for a shop, or a big purchase, without a bank.
          </p>
          <p>
            The weak point is trust. One collector or treasurer holds the cash and keeps the records, often in a notebook or
            a group chat. If they disappear, make a mistake, or a member stops paying after collecting the pot, the group has
            little recourse.
          </p>
          <p>
            AjoCircle keeps the habit and replaces the trusted middle person with a contract: the money is held by code,
            every payment is public, and collateral covers missed payments automatically.
          </p>
        </div>
        <div className="why-stats">
          <div className="stat-tile">
            <strong>28.0%</strong>
            <span>of Nigerian adults saved through a savings club or a person outside the family in 2024</span>
            <cite>Global Findex 2025, World Bank</cite>
          </div>
          <div className="stat-tile">
            <strong>11.7M</strong>
            <span>Nigerian adults use a savings group</span>
            <cite>EFInA A2F 2023</cite>
          </div>
          <div className="stat-tile">
            <strong>13.1M</strong>
            <span>use a savings or thrift collector</span>
            <cite>EFInA A2F 2023</cite>
          </div>
        </div>
      </section>

      <section id="circles" className="section">
        <div className="section-head row-head">
          <div>
            <span className="kicker">Circles</span>
            <h2 className="h2">Join a circle or start your own</h2>
          </div>
          <div className="cta" style={{ margin: 0 }}>
            <Link className="btn ghost" href="/dashboard/">Open dashboard</Link>
            <Link className="btn" href="/create/">+ New circle</Link>
          </div>
        </div>
        <div className="grid2">
          <CircleList />
          <div>
            <JoinById />
            <div className="card demo-card">
              <h3>See one running</h3>
              <p className="muted">
                &ldquo;Yaba Market Ajo&rdquo; is a live demo circle on Mezo Testnet: 3 members, 10 MUSD per round.
              </p>
              <Link className="btn ghost" href="/circle/?id=1">Open demo circle →</Link>
            </div>
          </div>
        </div>
      </section>

      <section id="faq" className="section">
        <div className="section-head">
          <span className="kicker">FAQ</span>
          <h2 className="h2">Questions</h2>
        </div>
        <div className="faq">
          {FAQ.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <div className="faq-a muted">{f.a}</div>
            </details>
          ))}
        </div>
      </section>

      <section className="cta-band">
        <h2 className="h2">Start a circle in under a minute</h2>
        <p className="muted">Set the amount and the members, share the link, and let the contract do the collecting.</p>
        <div className="cta">
          <Link className="btn lg" href="/create/">Create a circle</Link>
          <Link className="btn ghost lg" href="/dashboard/">See all circles</Link>
        </div>
      </section>
    </>
  );
}
