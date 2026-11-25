import { notFound } from "next/navigation";
import Link from "next/link";
import SeedRow from "@/components/SeedRow";
import WatchButton from "@/components/WatchButton";
import { counterLabel, counterStack, seedStatus } from "@/lib/board";
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

function utcStamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getUTCDate())} ${MONTHS[date.getUTCMonth()]} ${pad(
    date.getUTCHours()
  )}:${pad(date.getUTCMinutes())} UTC`;
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

  // A long build log keeps only its two ends: the newest push and the
  // seed's first push. Everything between collapses behind a toggle.
  const collapse = commits.length > 2;
  const middleCommits = collapse ? commits.slice(1, -1) : [];

  const commitItem = (commit: (typeof commits)[number]) => (
    <li key={commit.sha} className="build-item">
      <div className="build-item__main">
        <p className="build-item__msg">{commit.message}</p>
        <p className="build-item__meta">{commit.author ?? "unknown"}</p>
      </div>
      <p className="build-item__stamp">{utcStamp(commit.committedAt)}</p>
    </li>
  );

  // The log ends where the seed did: the ship event renders as the
  // newest entry, straight off the project's own receipt fields.
  const shippedItem = seed.shippedAt ? (
    <li className="build-item build-item--shipped">
      <div className="build-item__main">
        <p className="build-item__msg">Shipped 🎉</p>
        {seed.shipUrl && (
          <p className="build-item__meta">
            Visit this seed at {seed.shipUrl}
          </p>
        )}
      </div>
      <p className="build-item__stamp">{utcStamp(seed.shippedAt)}</p>
    </li>
  ) : null;

  const hasEvents = commits.length > 0 || !!shippedItem;
  const logBody = !hasEvents ? (
    <p className="build-log__empty">No pushes yet.</p>
  ) : collapse ? (
    <ol className="build-log">
      {shippedItem}
      {commitItem(commits[0])}
      {middleCommits.length > 0 && (
        <li className="build-log__more">
          <details>
            <summary>Show entire build log</summary>
            <ol className="build-log">
              {middleCommits.map(commitItem)}
            </ol>
          </details>
        </li>
      )}
      {commitItem(commits[commits.length - 1])}
    </ol>
  ) : (
    <ol className="build-log">
      {shippedItem}
      {commits.map(commitItem)}
    </ol>
  );

  return (
    <main>
      <div className="project-top">
        <SeedRow
          id={seed.id}
          name={seed.name}
          owner={seed.owner}
          counter={counterLabel(seed)}
          counterStack={counterStack(seed)}
          pushes={seed.pushCount}
          logoUrl={seed.logoUrl}
          avatarUrl={seed.avatarUrl}
          status={seedStatus(seed)}
          shipUrl={seed.shipUrl}
          watch={
            <WatchButton
              seedId={seed.id}
              watching={watching}
              returnTo={`/seeds/${seed.id}`}
              count={seed.watchCount}
              disabled={isOwner}
              loggedIn={!!user}
            />
          }
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
            {logBody}
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
