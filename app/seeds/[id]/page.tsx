import { notFound } from "next/navigation";
import Link from "next/link";
import SeedRow from "@/components/SeedRow";
import BuildSpark, { type SparkDay } from "@/components/BuildSpark";
import { DAY_MS } from "@/lib/board";
import { getSeedPosts, getSeedWithLog, getWatchers, isWatching } from "@/lib/seeds";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { deleteUpdate, postUpdate, shipSeed } from "./actions";
import "./seed.css";

export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<string, string> = {
  lookup: "Could not find that seed.",
  "not-owner": "Only the owner can do that.",
  "already-shipped": "This seed is already shipped — the book is closed.",
  "invalid-url": "The live URL must start with http:// or https://",
  "ship-failed": "Marking shipped failed.",
  "watch-failed": "Watching failed.",
  "invalid-update": "An update needs 1–280 characters.",
  "post-failed": "Posting that update failed.",
  "delete-failed": "Deleting that update failed.",
  "delete-blocked":
    "Could not delete that update — apply the seed_posts delete policy (supabase/migrations/0009_seed_posts_delete.sql) to the database.",
};

// Figma log stamps: "08 Nov 08:29 UTC" — git times render in UTC.
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function utcDay(date: Date): string {
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`;
}

// The build log as data: one entry per UTC day of the bet, counted
// straight off `committed_at` — no schema change, no extra data.
// Commits dated before planting are pre-bet history and stay off the
// graph. A seed still building plots up to today; a shipped one stops
// at (and marks) its ship day.
function sparklineDays(
  plantedAt: Date,
  shippedAt: Date | null,
  commits: { committedAt: Date }[]
): SparkDay[] {
  const utcDayStartMs = (d: Date) =>
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const plantMs = utcDayStartMs(plantedAt);
  const endMs = shippedAt ? utcDayStartMs(shippedAt) : utcDayStartMs(new Date());
  const totalDays = Math.floor((endMs - plantMs) / DAY_MS) + 1;
  if (totalDays <= 0) {
    return [];
  }
  // Long-running seeds keep only the last 90 days on the graph.
  const startMs = plantMs + Math.max(totalDays - 90, 0) * DAY_MS;
  const spanDays = Math.min(totalDays, 90);

  const counts = new Map<number, number>();
  for (const commit of commits) {
    const ms = utcDayStartMs(commit.committedAt);
    if (ms >= startMs && ms <= endMs) {
      counts.set(ms, (counts.get(ms) ?? 0) + 1);
    }
  }

  return Array.from({ length: spanDays }, (_, i) => {
    const ms = startMs + i * DAY_MS;
    return {
      day: utcDay(new Date(ms)),
      commits: counts.get(ms) ?? 0,
      shipped: !!shippedAt && ms === utcDayStartMs(shippedAt),
    };
  });
}

export default async function SeedPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const search = await searchParams;
  const errorCode = typeof search.error === "string" ? search.error : null;
  const errorMessage = errorCode ? (ERROR_MESSAGES[errorCode] ?? "Something went wrong.") : null;

  const result = await getSeedWithLog(id);
  if (!result) {
    notFound();
  }
  const { seed, commits } = result;
  const posts = await getSeedPosts(seed.id);
  const watchers = await getWatchers(seed.id);

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isOwner = !!user && user.id === seed.userId;

  const betOpen = isOwner && !seed.shippedAt;
  const watching =
    !isOwner && !!user ? await isWatching(user!.id, seed.id) : false;

  // The build log is the graph — no row list, no commit text. The ship
  // event stays in it as the marked last bar.
  const sparkDays = sparklineDays(seed.plantedAt, seed.shippedAt, commits);

  return (
    <main>
      <div className="project-top">
        <SeedRow
          seed={seed}
          watch={{
            watching,
            disabled: isOwner,
            returnTo: `/seeds/${seed.id}`,
            loggedIn: !!user,
          }}
        />
      </div>
      <div className="project-body">
        <div className="project-col">
          {errorMessage && <p className="seed-error">{errorMessage}</p>}
          <div className="project-col-head">
            <span className="project-col-head__label">SEED INFO</span>
            {isOwner && (
              <Link
                href={`/seeds/${seed.id}/edit`}
                className="project-col-head__action"
              >
                edit
              </Link>
            )}
          </div>
          <section className="project-panel">
            {seed.tagline && (
              <>
                <h2>STORY</h2>
                <p className="project-story">{seed.tagline}</p>
              </>
            )}
            <h2>BUILD LOG</h2>
            {sparkDays.length > 0 ? (
              <BuildSpark days={sparkDays} totalCommits={commits.length} />
            ) : (
              <p className="build-log__empty">No pushes yet.</p>
            )}
            {watchers.length > 0 && (
              <>
                <h2>WATCHERS</h2>
                <ul className="watchers">
                  {watchers.map((watcher) => (
                    <li key={watcher.username}>
                      <Link
                        href={`/u/${watcher.username}`}
                        className="watchers__who"
                      >
                        {watcher.avatarUrl ? (
                          <img
                            src={watcher.avatarUrl}
                            alt=""
                            className="seed-row__avatar"
                          />
                        ) : (
                          <span
                            className="watchers__initial"
                            aria-hidden="true"
                          >
                            {watcher.username.slice(0, 1).toLowerCase()}
                          </span>
                        )}
                        <span className="watchers__name">
                          @{watcher.username}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        </div>
        <div className="project-col">
          <div className="project-col-head">
            <span className="project-col-head__label">FOUNDER ACTIVITIES</span>
            {isOwner && (
              <details className="composer">
                <summary>post</summary>
                <form action={postUpdate} className="composer__form">
                  <input type="hidden" name="project_id" value={seed.id} />
                  <textarea
                    name="body"
                    className="composer__input"
                    maxLength={280}
                    required
                    placeholder="What shipped, what's next, what you need…"
                  />
                  <button className="btn composer__submit" type="submit">
                    post update
                  </button>
                </form>
              </details>
            )}
          </div>
          <section className="project-panel project-panel--updates">
            <h2>UPDATES</h2>
            {posts.length === 0 ? (
              <p className="updates__empty">
                No founder updates yet. Watch this seed to catch the first one.
              </p>
            ) : (
              <ol className="updates">
                {posts.map((post, index) => (
                  <li
                    key={post.id}
                    className={`updates__item${
                      isOwner ? " updates__item--owner" : ""
                    }`}
                  >
                    {isOwner && (
                      <form action={deleteUpdate} className="updates__delete">
                        <input
                          type="hidden"
                          name="project_id"
                          value={seed.id}
                        />
                        <input type="hidden" name="post_id" value={post.id} />
                        <button
                          type="submit"
                          className="updates__delete-btn"
                          aria-label="Delete update"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            width="18"
                            height="18"
                            fill="none"
                            aria-hidden="true"
                          >
                            <circle
                              cx="12"
                              cy="12"
                              r="9.25"
                              stroke="currentColor"
                              strokeWidth="1.5"
                            />
                            <path
                              d="M8.6 8.6l6.8 6.8M15.4 8.6l-6.8 6.8"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                            />
                          </svg>
                        </button>
                      </form>
                    )}
                    <span className="updates__num">{index + 1}.</span>
                    <p className="updates__body">{post.body}</p>
                  </li>
                ))}
              </ol>
            )}
          </section>
          {betOpen && (
            <form action={shipSeed} className="ship">
              <input type="hidden" name="project_id" value={seed.id} />
              <input
                type="url"
                name="ship_url"
                className="ship__url"
                placeholder="Add your URL when you’re ready to ship"
              />
              <button className="btn btn--ship" type="submit">
                Ship!
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
