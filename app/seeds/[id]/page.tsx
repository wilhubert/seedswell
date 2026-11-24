import { notFound } from "next/navigation";
import Link from "next/link";
import SeedRow from "@/components/SeedRow";
import WatchButton from "@/components/WatchButton";
import { counterLabel, counterStack, seedStatus } from "@/lib/board";
import { getSeedWithLog, isWatching } from "@/lib/seeds";
import { getOwnWebhookSecret } from "@/lib/secrets";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { shipSeed } from "./actions";
import "./seed.css";

export const dynamic = "force-dynamic";

// Production serves at seedswell.app; the vercel.app subdomain is gone.
const WEBHOOK_URL_BASE = "https://seedswell.app/api/webhooks";

const ERROR_MESSAGES: Record<string, string> = {
  lookup: "Could not find that seed.",
  "not-owner": "Only the owner can ship this seed.",
  "already-shipped": "This seed is already shipped — the book is closed.",
  "invalid-url": "The live URL must start with http:// or https://",
  "ship-failed": "Marking shipped failed.",
  "watch-failed": "Watching failed.",
};

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

// Build log timestamp — Figma "08 Nov 08:29 UTC": zero-padded day, short
// month, HH:MM, explicitly UTC. The log is a server render, so the label
// can't drift with the visitor's timezone.
function utcStamp(date: Date): string {
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  return `${day} ${MONTHS[date.getUTCMonth()]} ${hours}:${minutes} UTC`;
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
  const errorMessage = errorCode
    ? (ERROR_MESSAGES[errorCode] ?? "Something went wrong.")
    : null;

  const result = await getSeedWithLog(id);
  if (!result) {
    notFound();
  }
  const { seed, commits } = result;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isOwner = !!user && user.id === seed.userId;

  // Setup instructions exist only for the owner of a not-yet-connected seed.
  const needsSetup = isOwner && !seed.connectedAt;
  const webhookSecret = needsSetup
    ? await getOwnWebhookSecret(seed.id)
    : null;

  const betOpen = isOwner && !seed.shippedAt;
  const watching =
    !isOwner && !!user ? await isWatching(user!.id, seed.id) : false;

  // A long build log keeps only its two ends: the newest push and the
  // seed's first push. Everything between collapses behind a toggle.
  const collapse = commits.length > 2;
  const middleCommits = collapse ? commits.slice(1, -1) : [];

  const commitItem = (commit: (typeof commits)[number]) => (
    <li key={commit.sha} className="build-item">
      <div className="build-item__head">
        <p className="build-item__msg">{commit.message}</p>
        <time className="build-item__time" dateTime={commit.committedAt.toISOString()}>
          {utcStamp(commit.committedAt)}
        </time>
      </div>
      <p className="build-item__meta">
        {commit.author ?? "unknown author"}
      </p>
    </li>
  );

  return (
    <main>
      <div className="project-top">
        <SeedRow
          id={seed.id}
          name={seed.name}
          tagline={seed.tagline}
          owner={seed.owner}
          counter={counterLabel(seed)}
          counterStack={counterStack(seed)}
          pushes={seed.pushCount}
          logoUrl={seed.logoUrl}
          avatarUrl={seed.avatarUrl}
          status={seedStatus(seed)}
          shipUrl={seed.shipUrl}
        />
        {isOwner && (
          <Link href={`/seeds/${seed.id}/edit`} className="project-top__edit">
            edit seed
          </Link>
        )}
      </div>
      <div className="project-body">
        {errorMessage && <p className="seed-error">{errorMessage}</p>}
        <div className="project-grid">
          <section className="project-col">
            <span className="project-tab">SEED INFO</span>
            <section className="project-panel">
              <h2>STORY</h2>
              {seed.tagline ? (
                <p className="project-story">{seed.tagline}</p>
              ) : (
                <p className="project-story project-story--empty">
                  No story yet — the owner can add one from “edit seed”.
                </p>
              )}
            </section>
            <div className="watch">
              <WatchButton
                seedId={seed.id}
                watching={watching}
                returnTo={`/seeds/${seed.id}`}
                count={seed.watchCount}
                disabled={isOwner}
                loggedIn={!!user}
              />
              <p className="watch__hint">
                Watched seeds land on your watchlist with their ship receipts.
              </p>
            </div>
          </section>
          <section className="project-col">
            <span className="project-tab">BUILD LOG</span>
            <section className="project-panel project-panel--log">
              {commits.length === 0 && !seed.shippedAt ? (
                <p className="build-log__empty">No pushes yet.</p>
              ) : (
                <ol className="build-log">
                  {/* The ship receipt crowns the log: the moment the book
                      closed, with a link out to the live site. */}
                  {seed.shippedAt && (
                    <li className="build-item build-item--shipped">
                      <div className="build-item__head">
                        <p className="build-item__msg">Shipped 🎉</p>
                        <time
                          className="build-item__time"
                          dateTime={seed.shippedAt.toISOString()}
                        >
                          {utcStamp(seed.shippedAt)}
                        </time>
                      </div>
                      {seed.shipUrl && (
                        <a
                          className="build-item__meta build-item__link"
                          href={seed.shipUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Visit this seed at {seed.shipUrl}
                        </a>
                      )}
                    </li>
                  )}
                  {collapse ? (
                    <>
                      {commitItem(commits[0])}
                      {middleCommits.length > 0 && (
                        <li className="build-log__more">
                          <details>
                            <summary>
                              show {middleCommits.length} earlier pushes
                            </summary>
                            <ol className="build-log">
                              {middleCommits.map(commitItem)}
                            </ol>
                          </details>
                        </li>
                      )}
                      {commitItem(commits[commits.length - 1])}
                    </>
                  ) : (
                    commits.map(commitItem)
                  )}
                </ol>
              )}
            </section>
            {betOpen && (
              <div className="bet">
                <h2>Your bet</h2>
                <div className="bet__actions">
                  <form action={shipSeed}>
                    <input type="hidden" name="project_id" value={seed.id} />
                    <input
                      type="url"
                      name="ship_url"
                      placeholder="https://… live site (optional)"
                    />
                    <button className="btn btn--ship" type="submit">
                      Ship it
                    </button>
                  </form>
                </div>
              </div>
            )}
            {isOwner && (
              <div className="setup">
                <h2>Connect your repo</h2>
                {seed.connectedAt ? (
                  <p className="setup__done">
                    Webhook connected. Push to fill the log.
                  </p>
                ) : webhookSecret ? (
                  <>
                    <p className="setup__steps">
                      Your repo → Settings → Webhooks → Add webhook:
                    </p>
                    <dl className="setup__fields">
                      <dt>Payload URL</dt>
                      <dd>
                        <code>{`${WEBHOOK_URL_BASE}/${seed.id}`}</code>
                      </dd>
                      <dt>Content type</dt>
                      <dd>
                        <code>application/json</code>
                      </dd>
                      <dt>Secret</dt>
                      <dd>
                        <code>{webhookSecret}</code>
                      </dd>
                      <dt>Events</dt>
                      <dd>
                        <code>Just the push event</code>
                      </dd>
                    </dl>
                  </>
                ) : null}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
