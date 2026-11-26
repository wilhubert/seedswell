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
          Seeds you watch and their ship receipts. Shipped seeds keep their
          receipt here until you stop watching.
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
                <SeedRow seed={seed} variant="card" />
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
