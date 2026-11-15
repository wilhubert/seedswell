import SeedRow from "@/components/SeedRow";
import WatchButton from "@/components/WatchButton";
import { counterLabel } from "@/lib/board";
import { getBoardSeeds, getWatchedProjectIds } from "@/lib/seeds";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import "./landing.css";

export const dynamic = "force-dynamic";

export default async function Home() {
  const seeds = await getBoardSeeds();

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const watched = user ? await getWatchedProjectIds(user.id) : new Set<string>();

  return (
    <main>
      <section className="hero">
        <h1>Fresh swell! New ideas seeded today.</h1>
        <p className="hero__sub">
        Launch in front of users from day one. Be there when the next big thing pops up. 🏄
        </p>
        <a className="btn btn--join" href="/seeds/new">
          Join the swell
        </a>
        <p className="promo">The first 100 seeds are on me!</p>
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
              watch={
                <WatchButton
                  seedId={seed.id}
                  watching={!!user && watched.has(seed.id)}
                  returnTo="/"
                  count={seed.watchCount}
                  disabled={!!user && seed.userId === user.id}
                  loggedIn={!!user}
                />
              }
            />
          ))
        )}
      </section>
    </main>
  );
}
