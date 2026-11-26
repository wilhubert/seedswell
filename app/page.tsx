import JoinSwellButton from "@/components/JoinSwellButton";
import SeedRow from "@/components/SeedRow";
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
  // GitHub is the front door: only a GitHub-linked account can go
  // straight to launching; anonymous or email-only visitors hit the
  // registration funnel instead.
  const githubLinked = !!user?.identities?.some(
    (identity) => identity.provider === "github",
  );
  const watched = user
    ? await getWatchedProjectIds(user.id)
    : new Set<string>();

  return (
    <main>
      <section className="hero">
          <h1>
            <span>Stop buying domains, start </span>
            <span className="coral-highlight">shipping</span>
          </h1>
          <p className="hero__sub">
            <span className="hero__sub-line">
              Set a deadline. Go public.{" "}
              <span className="hero__sub-tail">
                Ride this swell to the top. 🏄
              </span>
            </span>
          </p>

          {/* Soft launch: registering an account to watch is open to
            everyone; launching stays invite-only at /seeds/new. */}
          <JoinSwellButton
            href={githubLinked ? "/seeds/new" : "/auth/register"}
          />
          <p className="promo">The first 50 seeds are on me!</p>
      </section>
      <section className="board">
        {seeds.length === 0 ? (
          <p className="board__empty">
            Nothing launched yet — be the first seed on the board.
          </p>
        ) : (
          seeds.map((seed) => (
            <SeedRow
              key={seed.id}
              seed={seed}
              watch={{
                watching: !!user && watched.has(seed.id),
                disabled: !!user && seed.userId === user.id,
                returnTo: "/",
                loggedIn: !!user,
              }}
            />
          ))
        )}
      </section>
    </main>
  );
}
