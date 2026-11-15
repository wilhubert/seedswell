import { notFound } from "next/navigation";
import Link from "next/link";
import { getSeedWithLog } from "@/lib/seeds";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { editSeed } from "../actions";
import "../../new/new-seed.css";

export const dynamic = "force-dynamic";

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
    </main>
  );
}
