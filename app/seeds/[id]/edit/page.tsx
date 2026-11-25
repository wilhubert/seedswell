import { notFound } from "next/navigation";
import Link from "next/link";
import CopyButton from "@/components/CopyButton";
import { getSeedWithLog } from "@/lib/seeds";
import { getOwnWebhookSecret } from "@/lib/secrets";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { editSeed } from "../actions";
import "../../new/new-seed.css";

export const dynamic = "force-dynamic";

// Production serves at seedswell.app; the vercel.app subdomain is gone.
const WEBHOOK_URL_BASE = "https://seedswell.app/api/webhooks";

export default async function EditSeedPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const search = await searchParams;
  const errorMessage =
    search.error === "invalid"
      ? "That did not take — a name (max 80 chars), a tagline of max 200 chars, and an http(s) logo URL if you provide one."
      : search.error === "update-failed"
        ? `Saving failed in the database: ${
            Array.isArray(search.message) ? search.message[0] : search.message
          }`
        : null;

  const result = await getSeedWithLog(id);
  if (!result) {
    notFound();
  }
  const { seed } = result;

  // The edit page is invisible to everyone but the owner: no session or no
  // ownership is a 404, the same as any page that doesn't exist.
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || seed.userId !== user.id) {
    notFound();
  }

  // Edit is the only place setup shows: a connected seed just says so,
  // an unconnected one gets its personal webhook fields.
  const webhookSecret = seed.connectedAt
    ? null
    : await getOwnWebhookSecret(seed.id);

  return (
    <main className="new-seed">
      <h1>Edit seed</h1>
      {errorMessage && <p className="new-seed__error">{errorMessage}</p>}
      <form action={editSeed} className="new-seed__form">
        <input type="hidden" name="project_id" value={seed.id} />
        <label>
          Name
          <input name="name" required maxLength={80} defaultValue={seed.name} />
        </label>
        <label>
          Tagline
          <input
            name="tagline"
            maxLength={200}
            defaultValue={seed.tagline ?? ""}
          />
        </label>
        <label>
          Logo URL (optional)
          <input
            name="logo_url"
            type="url"
            placeholder="https://…"
            defaultValue={seed.logoUrl ?? ""}
          />
        </label>
        <p className="new-seed__fixed">
          The called date is fixed — editing covers name, tagline, and logo.
          <br />
          <Link href={`/seeds/${seed.id}`}>Back to the seed</Link>
        </p>
        <button className="btn" type="submit">
          Save
        </button>
      </form>
      <section className="new-seed__setup">
        <h2>Connect your repo</h2>
        <p className="new-seed__setup-note">
          Connect a GitHub repo and every push lands in this seed's public
          build log — commit title, author, timestamp. The seed works
          without it; the log just stays empty until it's hooked up.
        </p>
        {seed.connectedAt ? (
          <p className="new-seed__setup-note new-seed__setup-note--done">
            Webhook connected. Push to fill the log.
          </p>
        ) : (
          webhookSecret && (
            <>
              <p className="new-seed__setup-note">
                In GitHub, open your repo → Settings → Webhooks → Add
                webhook, then copy these in:
              </p>
              <dl className="new-seed__setup-fields">
                <dt>Payload URL</dt>
                <dd>
                  <code>{`${WEBHOOK_URL_BASE}/${seed.id}`}</code>
                  <CopyButton text={`${WEBHOOK_URL_BASE}/${seed.id}`} />
                </dd>
                <dt>Content type</dt>
                <dd>
                  <code>application/json</code>
                </dd>
                <dt>Secret</dt>
                <dd>
                  <code>{webhookSecret}</code>
                  <CopyButton text={webhookSecret} />
                </dd>
                <dt>Events</dt>
                <dd>
                  <code>Just the push event</code>
                </dd>
              </dl>
              <p className="new-seed__setup-note">
                GitHub sends a one-time ping when you save — this page flips
                to "Webhook connected" as soon as it arrives. Still showing
                this form after adding it? Push once, then check Recent
                deliveries in the webhook settings for the error GitHub saw.
              </p>
            </>
          )
        )}
      </section>
    </main>
  );
}
