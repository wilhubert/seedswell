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
    <svg
      width="23"
      height="23"
      viewBox="0 0 23 23"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M13.1026 9.52695L21.2985 0H19.3563L12.24 8.27235L6.55605 0H0L8.595 12.5091L0 22.5H1.9422L9.4572 13.7637L15.4602 22.5H22.0163L13.1026 9.52695ZM10.4423 12.6194L9.5715 11.3738L2.64195 1.46205H5.62545L11.2176 9.4608L12.0883 10.7064L19.3572 21.1041H16.3737L10.4423 12.6194Z"
        fill="#1E1E1E"
      />
    </svg>
  );
}

function GitHubMark() {
  return (
    <svg
      width="20"
      height="19"
      viewBox="0 0 20 19"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M9.6768 0C4.33037 0 0 4.33037 0 9.6768C0 13.9588 2.76998 17.5755 6.61651 18.8577C7.10035 18.9423 7.28179 18.652 7.28179 18.398C7.28179 18.1682 7.2697 17.4061 7.2697 16.5957C4.8384 17.0433 4.20941 16.003 4.01587 15.4587C3.90701 15.1805 3.43526 14.3217 3.024 14.0918C2.68531 13.9104 2.20147 13.4628 3.0119 13.4508C3.77395 13.4387 4.31827 14.1523 4.49971 14.4426C5.37062 15.9062 6.76166 15.495 7.31808 15.241C7.40275 14.612 7.65677 14.1886 7.93498 13.9467C5.78189 13.7048 3.53203 12.8701 3.53203 9.16877C3.53203 8.11642 3.90701 7.2455 4.5239 6.56813C4.42714 6.32621 4.08845 5.33434 4.62067 4.00378C4.62067 4.00378 5.4311 3.74976 7.28179 4.99565C8.05594 4.77792 8.87846 4.66906 9.70099 4.66906C10.5235 4.66906 11.346 4.77792 12.1202 4.99565C13.9709 3.73766 14.7813 4.00378 14.7813 4.00378C15.3135 5.33434 14.9748 6.32621 14.8781 6.56813C15.495 7.2455 15.87 8.10432 15.87 9.16877C15.87 12.8822 13.608 13.7048 11.4549 13.9467C11.8057 14.2491 12.1081 14.8297 12.1081 15.7369C12.1081 17.0312 12.096 18.0714 12.096 18.398C12.096 18.652 12.2774 18.9544 12.7613 18.8577C16.5836 17.5755 19.3536 13.9467 19.3536 9.6768C19.3536 4.33037 15.0232 0 9.6768 0Z"
        fillRule="evenodd"
        clipRule="evenodd"
        fill="#1E1E1E"
      />
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
          {/* Platform chips are for visitors; the owner gets account
              actions instead — watching is one click away, and the
              edit chip unfolds the form on its own row below. The
              form still writes bio and x_handle to the signed-in
              user's own row only. */}
          {!isSelf && profile.xHandle && (
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
          {!isSelf && profile.avatarUrl && (
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
            <>
              <Link className="btn btn--chip" href="/watching">
                watching
              </Link>
              <details className="profile-card__edit">
                <summary className="btn btn--chip">edit profile</summary>
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
            </>
          )}
        </div>
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
