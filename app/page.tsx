import SeedRow from "@/components/SeedRow";
import { counterLabel, getBoardSeeds } from "@/lib/seeds";
import "./landing.css";

export const dynamic = "force-dynamic";

export default async function Home() {
  const seeds = await getBoardSeeds();

  return (
    <main>
      <section className="hero">
        <h1>Plant a seed. Call a date. Ship in public.</h1>
        <p className="hero__sub">
          A public countdown board for people building software.
        </p>
        <a className="btn btn--join" href="/seeds/new">
          Join the swell
        </a>
      </section>
      <section className="board">
        {seeds.length === 0 ? (
          <p className="board__empty">
            Nothing planted yet — be the first seed on the board.
          </p>
        ) : (
          seeds.map((seed) => (
            <SeedRow
              key={seed.id}
              id={seed.id}
              name={seed.name}
              owner={seed.owner}
              counter={counterLabel(seed)}
              pushes={seed.pushCount}
              logoUrl={seed.logoUrl}
              avatarUrl={seed.avatarUrl}
            />
          ))
        )}
      </section>
    </main>
  );
}
