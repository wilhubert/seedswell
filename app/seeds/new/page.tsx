import { canLaunchSeeds } from "@/lib/supabase-server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { launchSeed } from "./actions";
import "./new-seed.css";

export const dynamic = "force-dynamic";

export default async function NewSeedPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Soft launch: viewing, registering and watching are open, launching is
  // invite-only. Shown as a state, not hidden — an honest wall beats a
  // silent bounce.
  if (!canLaunchSeeds(user)) {
    return (
      <main className="new-seed">
        <h1>Launch a seed</h1>
        <p className="new-seed__fixed">
          Launching is invite-only while the swell warms up — the first seeds
          are on me. You can still{" "}
          <a href="/auth/register">create an account</a> to watch them grow.
        </p>
      </main>
    );
  }

  const params = await searchParams;
  const errorMessage =
    params.error === "invalid"
      ? "That did not take — a name (max 80 chars), a target of 1–30 days, and an http(s) logo URL if you provide one."
      : params.error === "insert"
        ? `Launching failed in the database: ${
            Array.isArray(params.message) ? params.message[0] : params.message
          }`
        : null;

  return (
    <main className="new-seed">
      <h1>Launch a seed</h1>
      {errorMessage && <p className="new-seed__error">{errorMessage}</p>}
      <form action={launchSeed} className="new-seed__form">
        <label>
          Name
          <input name="name" required maxLength={80} />
        </label>
        <label>
          Tagline
          <input name="tagline" maxLength={200} />
        </label>
        <label>
          Logo URL (optional)
          <input name="logo_url" type="url" placeholder="https://…" />
        </label>
        <fieldset className="new-seed__radios">
          <legend>Ship in</legend>
          <label>
            <input type="radio" name="target_days" value="1" />
            24 hours
          </label>
          <label>
            <input type="radio" name="target_days" value="7" defaultChecked />
            7 days
          </label>
          <label>
            <input type="radio" name="target_days" value="30" />
            30 days
          </label>
        </fieldset>
        <button className="btn btn--join" type="submit">
          Launch it
        </button>
      </form>
    </main>
  );
}
