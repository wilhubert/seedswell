import { notFound } from "next/navigation";
import SeedRow from "@/components/SeedRow";
import { counterLabel } from "@/lib/board";
import { getSeedWithLog } from "@/lib/seeds";
import { getOwnWebhookSecret } from "@/lib/secrets";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { cancelSeed, shipSeed } from "./actions";
import "./seed.css";

export const dynamic = "force-dynamic";

const WEBHOOK_URL_BASE = "https://seedswell.vercel.app/api/webhooks";

const ERROR_MESSAGES: Record<string, string> = {
  lookup: "Could not find that seed.",
  "not-owner": "Only the owner can conclude this seed.",
  "already-concluded":
    "This seed is already shipped or called off — the book is closed.",
  "ship-failed": "Marking shipped failed.",
  "cancel-failed": "Calling it off failed.",
  "note-invalid":
    "The honesty note is required, up to 500 characters — say why.",
};

export default async function SeedPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const params2 = await searchParams;
  const errorCode = typeof params2.error === "string" ? params2.error : null;
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

  const betOpen = isOwner && !seed.shippedAt && !seed.cancelledAt;

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
          ) : (
            <ol className="build-log">
              {commits.map((commit) => (
                <li key={commit.sha} className="build-item">
                  <p className="build-item__msg">{commit.message}</p>
                  <p className="build-item__meta">
                    {commit.author ?? "unknown"} ·{" "}
                    {commit.committedAt.toISOString().slice(0, 10)}
                  </p>
                </li>
              ))}
            </ol>
          )}
          {seed.cancelNote && (
            <>
              <h2>Called off</h2>
              <p className="project-story seed-cancel-note">{seed.cancelNote}</p>
            </>
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
                <form action={cancelSeed} className="bet__cancel">
                  <input type="hidden" name="project_id" value={seed.id} />
                  <textarea
                    name="note"
                    required
                    maxLength={500}
                    placeholder="Why you called it off — the public honesty note"
                  />
                  <button className="btn" type="submit">
                    Call it off
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
    </main>
  );
}
