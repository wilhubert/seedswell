import { notFound } from "next/navigation";
import SeedRow from "@/components/SeedRow";
import { counterLabel } from "@/lib/board";
import { getSeedWithLog } from "@/lib/seeds";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import "./seed.css";

export const dynamic = "force-dynamic";

const WEBHOOK_URL_BASE = "https://seedswell.vercel.app/api/webhooks";

export default async function SeedPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  let webhookSecret: string | null = null;
  if (isOwner && !seed.connectedAt) {
    const { data, error } = await supabase.rpc("get_own_webhook_secret", {
      p_project_id: seed.id,
    });
    if (error) {
      throw new Error(`Webhook secret lookup failed: ${error.message}`);
    }
    webhookSecret = (data as string | null) ?? null;
    if (!webhookSecret) {
      throw new Error(`No webhook secret found for seed ${seed.id}`);
    }
  }

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
                    {commit.url && (
                      <>
                        {" · "}
                        <a href={commit.url}>view</a>
                      </>
                    )}
                  </p>
                </li>
              ))}
            </ol>
          )}
          {isOwner && (
            <div className="setup">
              <h2>Connect your repo</h2>
              {seed.connectedAt ? (
                <p className="setup__done">Webhook connected. Push to fill the log.</p>
              ) : (
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
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
