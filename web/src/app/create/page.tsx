import Link from "next/link";
import { CreateCircle } from "@/components/CreateCircle";
import { MusdBanner } from "@/components/MusdBanner";

export default function CreatePage() {
  return (
    <div className="create-page">
      <div className="page-head">
        <Link href="/" className="muted small">← Home</Link>
        <h1>Start a circle</h1>
        <p className="muted">
          You set the rules once; the contract enforces them for every round. After creating, share the circle&apos;s link so
          members can join.
        </p>
      </div>
      <div className="grid2 create-grid">
        <CreateCircle />
        <aside className="card tips">
          <h2>Good to know</h2>
          <ul>
            <li><strong>Pot size</strong> = contribution × members. Each member receives it once.</li>
            <li><strong>Round length</strong> is the deadline for everyone to pay. After it passes, anyone can settle the round.</li>
            <li><strong>Collateral</strong> (one contribution) is returned at the end, or slashed to cover a missed payment.</li>
            <li><strong>Payout order</strong> is join order, or shuffled when you start the circle.</li>
            <li>The creator joins like everyone else, and starts the circle once every seat is filled.</li>
            <li>Mezo Testnet only: gas is test BTC, savings are test MUSD.</li>
          </ul>
        </aside>
      </div>
      <MusdBanner />
    </div>
  );
}
