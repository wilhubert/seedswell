import { notFound } from "next/navigation";
import Link from "next/link";
import SeedRow from "@/components/SeedRow";
import { counterLabel } from "@/lib/board";
import { getProfileByUsername, getSeedsForUser } from "@/lib/seeds";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import "./profile.css";

export const dynamic = "force-dynamic";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const profile = await getProfileByUsername(username);
  if (!profile) {
    notFound();
  }

  const seeds = await getSeedsForUser(profile.id);

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isSelf = !!user && user.id === profile.id;

  return (
    <main className="profile-grid">
      <section className="profile-card">
        {profile.avatarUrl ? (
          <img
            className="profile-card__avatar"
            src={profile.avatarUrl}
            alt={`@${profile.username}`}
          />
        ) : (
          <div className="profile-card__avatar" aria-hidden="true" />
        )}
        <h1 className="profile-card__name">@{profile.username}</h1>
        {profile.bio && <p className="profile-card__bio">{profile.bio}</p>}
        <div className="profile-card__links">
          {/* GitHub always provides an avatar at sign-in; email users have
              none, so this link exists only for GitHub-registered users. */}
          {profile.avatarUrl && (
            <a
              className="btn btn--github"
              href={`https://github.com/${profile.username}`}
            >
              GitHub
            </a>
          )}
          {isSelf && (
            <Link className="btn btn--ghost" href="/watching">
              watching
            </Link>
          )}
        </div>
      </section>
      <section className="seeds-col">
        <h2 className="seeds-col__head">SEEDS</h2>
        {seeds.length === 0 ? (
          <p className="seeds-col__empty">No seeds planted yet.</p>
        ) : (
          seeds.map((seed) => (
            <SeedRow
              key={seed.id}
              id={seed.id}
              name={seed.name}
              owner={seed.owner}
              counter={counterLabel(seed)}
              pushes={seed.pushCount}
              logoUrl={seed.logoUrl}
              avatarUrl={seed.avatarUrl}
              variant="card"
            />
          ))
        )}
        <a className="plant-seed" href="/seeds/new" aria-label="Plant a seed">
          +
        </a>
      </section>
    </main>
  );
}
