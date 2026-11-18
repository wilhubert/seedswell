import { notFound } from "next/navigation";
import Link from "next/link";
import SeedRow from "@/components/SeedRow";
import WatchButton from "@/components/WatchButton";
import { counterLabel } from "@/lib/board";
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
  "ship-failed": "Marking shipped failed.",
  "watch-failed": "Watching failed.",
};

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
      <p className="build-item__msg">{commit.message}</p>
      <p className="build-item__meta">
        {commit.author ?? "unknown"} ·{" "}
        {commit.committedAt.toISOString().slice(0, 10)}
      </p>
    </li>
  );

  return (
    <main>
      <div className="project-top">
        <SeedRow
          id={seed.id}
          name={seed.name}
          owner={seed.owner}
          counter={counterLabel(seed)}
          pushes={seed.pushCount}
          logoUrl={seed.logoUrl}
          avatarUrl={seed.avatarUrl}
        />
        {isOwner && (
          <Link href={`/seeds/${seed.id}/edit`} className="project-top__edit">
            edit seed
          </Link>
        )}
      </div>
      <div className="project-body">
        {errorMessage && <p className="seed-error">{errorMessage}</p>}
        <div className="project-tabs">
          <span className="tab">SEED INFO</span>
        </div>
        <section className="project-panel">
          {seed.tagline && (
            <>
              <h2>Story</h2>
              <p className="project-story">{seed.tagline}</p>
            </>
          )}
          <h2>Build log</h2>
          {commits.length === 0 ? (
            <p className="build-log__empty">No pushes yet.</p>
          ) : collapse ? (
            <ol className="build-log">
              {commitItem(commits[0])}
              {middleCommits.length > 0 && (
                <li className="build-log__more">
                  <details>
                    <summary>show {middleCommits.length} earlier pushes</summary>
                    <ol className="build-log">
                      {middleCommits.map(commitItem)}
                    </ol>
                  </details>
                </li>
              )}
              {commitItem(commits[commits.length - 1])}
            </ol>
          ) : (
            <ol className="build-log">{commits.map(commitItem)}</ol>
          )}
          {betOpen && (
            <div className="bet">
              <h2>Your bet</h2>
              <div className="bet__actions">
                <form action={shipSeed}>
                  <input type="hidden" name="project_id" value={seed.id} />
                  <button className="btn btn--ship" type="submit">
                    Ship it
                  </button>
                </form>
              </div>
            </div>
          )}
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
    </main>
  );
}
