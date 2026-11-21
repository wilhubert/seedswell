import { notFound } from "next/navigation";
import Link from "next/link";
import SeedRow from "@/components/SeedRow";
import WatchButton from "@/components/WatchButton";
import { counterLabel, counterStack, seedStatus } from "@/lib/board";
import {
  getProfileByUsername,
  getSeedsForUser,
  getWatchedProjectIds,
} from "@/lib/seeds";
import { canLaunchSeeds } from "@/lib/supabase-server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { editProfile } from "./actions";
import "./profile.css";

export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<string, string> = {
  "profile-invalid":
    "Bio over 280 characters, or the X handle is not letters, digits and underscores (max 15).",
  "profile-edit": "Saving your profile failed.",
};

function XLogo() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zM17.083 19.77h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function GitHubMark() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { username } = await params;
  const search = await searchParams;
  const errorCode = typeof search.error === "string" ? search.error : null;
  const errorMessage = errorCode
    ? (ERROR_MESSAGES[errorCode] ?? "Something went wrong.")
    : null;
  const saved = "saved" in search;
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
  const watched = user
    ? await getWatchedProjectIds(user.id)
    : new Set<string>();
  // Soft launch: only allowlisted emails may launch, so the plus stays hidden
  // from everyone else — anonymous visitors included.
  const canLaunch = canLaunchSeeds(user);

  return (
    <main className="profile-grid">
      <section className="profile-card">
        {errorMessage && <p className="profile-card__error">{errorMessage}</p>}
        {saved && !errorMessage && (
          <p className="profile-card__saved">Profile saved.</p>
        )}
        <div className="profile-card__id">
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
        </div>
        {profile.bio && <p className="profile-card__bio">{profile.bio}</p>}
        <div className="profile-card__links">
          {/* The X handle is profile content (set by hand for now, like
              bio); the button exists only when it holds a value. */}
          {profile.xHandle && (
            <a
              className="btn btn--x"
              href={`https://x.com/${profile.xHandle}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Follow on
              <XLogo />
            </a>
          )}
          {/* GitHub always provides an avatar at sign-in; email users have
              none, so this link exists only for GitHub-registered users. */}
          {profile.avatarUrl && (
            <a
              className="btn btn--github"
              href={`https://github.com/${profile.username}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Visit on
              <GitHubMark />
            </a>
          )}
          {isSelf && (
            <Link className="btn btn--ghost" href="/watching">
              watching
            </Link>
          )}
        </div>
        {isSelf && (
          /* Owner-only editor, folded to keep the card at rest; the
             action writes bio and x_handle to the signed-in user's own
             row only. */
          <details className="profile-card__edit">
            <summary>edit profile</summary>
            <form className="profile-edit__form" action={editProfile}>
              <label>
                Bio
                <textarea
                  name="bio"
                  defaultValue={profile.bio ?? ""}
                  rows={3}
                  maxLength={280}
                  placeholder="a short description of your interests"
                />
              </label>
              <label>
                X handle
                <input
                  name="x_handle"
                  defaultValue={profile.xHandle ?? ""}
                  placeholder="handle, with or without @"
                />
              </label>
              <button className="btn btn--ghost" type="submit">
                save
              </button>
            </form>
          </details>
        )}
      </section>
      <section className="seeds-col">
        <h2 className="seeds-col__head">SEEDS</h2>
        {seeds.length === 0 ? (
          <p className="seeds-col__empty">No seeds launched yet.</p>
        ) : (
          seeds.map((seed) => (
            <SeedRow
              key={seed.id}
              id={seed.id}
              name={seed.name}
              owner={seed.owner}
              tagline={seed.tagline}
              counter={counterLabel(seed)}
              counterStack={counterStack(seed)}
              pushes={seed.pushCount}
              logoUrl={seed.logoUrl}
              avatarUrl={seed.avatarUrl}
              status={seedStatus(seed)}
              shipUrl={seed.shipUrl}
              watch={
                <WatchButton
                  seedId={seed.id}
                  watching={!!user && watched.has(seed.id)}
                  returnTo={`/u/${profile.username}`}
                  count={seed.watchCount}
                  disabled={!!user && seed.userId === user.id}
                  loggedIn={!!user}
                />
              }
            />
          ))
        )}
        {canLaunch && (
          <a
            className="launch-seed"
            href="/seeds/new"
            aria-label="Launch a seed"
          >
            +
          </a>
        )}
      </section>
    </main>
  );
}
