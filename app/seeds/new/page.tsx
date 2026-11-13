import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { plantSeed } from "./actions";
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
  if (!user) {
    redirect("/auth/login");
  }

  const params = await searchParams;
  const errorMessage =
    params.error === "invalid"
      ? "That did not take — a name and a target of 1–366 days are required, and the logo must be an http(s) URL."
      : params.error === "insert"
        ? `Planting failed in the database: ${
            Array.isArray(params.message) ? params.message[0] : params.message
          }`
        : null;

  return (
    <main className="new-seed">
      <h1>Plant a seed</h1>
      {errorMessage && <p className="new-seed__error">{errorMessage}</p>}
      <form action={plantSeed} className="new-seed__form">
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
        <label>
          Target days
          <input
            name="target_days"
            type="number"
            min={1}
            max={366}
            defaultValue={30}
            required
          />
        </label>
        <button className="btn btn--join" type="submit">
          Plant it
        </button>
      </form>
    </main>
  );
}
