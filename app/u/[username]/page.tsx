import SeedRow from "@/components/SeedRow";
import "./profile.css";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  return (
    <main className="profile-grid">
      <section className="profile-card">
        <div className="profile-card__avatar" aria-hidden="true" />
        <h1 className="profile-card__name">@{username}</h1>
        <p className="profile-card__bio">
          Placeholder bio until profiles are wired to Supabase.
        </p>
        <div className="profile-card__links">
          <a
            className="btn btn--github"
            href={`https://github.com/${username}`}
          >
            GitHub
          </a>
        </div>
      </section>
      <section className="seeds-col">
        <h2 className="seeds-col__head">SEEDS</h2>
        <SeedRow
          id="alpha"
          name="Seedling One"
          owner={username}
          counter="day 12/30 · 18 to go"
          pushes={47}
          variant="card"
        />
        <SeedRow
          id="bravo"
          name="Seedling Two"
          owner={username}
          counter="day 4/30 · 26 to go"
          pushes={9}
          variant="card"
        />
        <SeedRow
          id="charlie"
          name="Seedling Three"
          owner={username}
          counter="day 27/30 · 3 to go"
          pushes={131}
          variant="card"
        />
        <a className="plant-seed" href="/seeds/new" aria-label="Plant a seed">
          +
        </a>
      </section>
    </main>
  );
}
