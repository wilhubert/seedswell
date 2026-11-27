import Link from "next/link";
import SeedRow from "@/components/SeedRow";
import { getWatchedProjectIds, getSeedsByIds } from "@/lib/seeds";
import { requireUser } from "@/lib/supabase-server";
import "./watching.css";

export const dynamic = "force-dynamic";

export default async function WatchingPage() {
  const { user } = await requireUser();

  const watchedIds = await getWatchedProjectIds(user.id);
  const seeds = await getSeedsByIds([...watchedIds]);

  return (
    <main>
      <section className="watching">
        <h1>Watching</h1>
        <p className="watching__sub">
          Seeds you watch and their shipping status. Shipped seeds are kept here until you stop watching.
        </p>
        {seeds.length === 0 ? (
          <p className="watching__empty">
            Nothing watched yet — open a seed and hit Watch.{" "}
            <Link href="/" className="watching__link">
              Back to the board
            </Link>
          </p>
        ) : (
          <ol className="watching__list">
            {seeds.map((seed) => (
              <li key={seed.id}>
                {/* Standard board rows: the page is a signed-in watch
                    list, so every row shows the watch chip as its
                    state (watching: true) — it is also the only way
                    to stop watching from here. Own seeds can't be
                    unwatched, same rule as the board. */}
                <SeedRow
                  seed={seed}
                  watch={{
                    watching: true,
                    disabled: seed.userId === user.id,
                    returnTo: "/watching",
                    loggedIn: true,
                  }}
                />
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
