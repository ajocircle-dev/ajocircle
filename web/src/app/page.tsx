import { CreateCircle } from "@/components/CreateCircle";
import { CircleList } from "@/components/CircleList";
import { JoinById } from "@/components/JoinById";

export default function Home() {
  return (
    <>
      <section className="hero">
        <h1>Your ajo, without the trust problem.</h1>
        <p className="muted">
          Pool stablecoins with people you know. Everyone pays in each round, one person takes the pot, and the
          contract keeps the books: who paid, who&apos;s next, and what happens if someone misses a payment.
        </p>
      </section>
      <div className="grid2">
        <CreateCircle />
        <div>
          <JoinById />
          <CircleList />
        </div>
      </div>
    </>
  );
}
