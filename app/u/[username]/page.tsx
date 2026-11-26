import { notFound } from "next/navigation";
import Link from "next/link";
import SeedRow from "@/components/SeedRow";
import {
  getProfileByUsername,
  getSeedsForUser,
  getWatchedProjectIds,
} from "@/lib/seeds";
import { canLaunchSeeds } from "@/lib/supabase-server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { editProfile, deleteAccount } from "./actions";
import "./profile.css";

export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<string, string> = {
  "profile-invalid":
    "Bio over 280 characters, or the X handle is not letters, digits and underscores (max 15).",
  "profile-edit": "Saving your profile failed.",
  "delete-confirm":
    "That did not match your username — type it exactly to confirm the deletion.",
  "account-delete":
    "Deleting your account failed. Nothing was removed — you can retry.",
};

function XLogo() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M7.86159 5.71617L12.7791 0H11.6138L7.344 4.96341L3.93363 0H0L5.157 7.50546L0 13.5H1.16532L5.67432 8.25822L9.27612 13.5H13.2098L7.86159 5.71617ZM6.26535 7.57161L5.7429 6.82425L1.58517 0.87723H3.37527L6.73056 5.67648L7.25301 6.42384L11.6143 12.6625H9.82422L6.26535 7.57161Z"
        fill="#1E1E1E"
      />
    </svg>
  );
}

function GitHubMark() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M7.83821 0C3.5076 0 0 3.5076 0 7.83821C0 11.3066 2.24369 14.2361 5.35937 15.2747C5.75129 15.3433 5.89825 15.1081 5.89825 14.9024C5.89825 14.7162 5.88845 14.099 5.88845 13.4425C3.9191 13.805 3.40962 12.9624 3.25286 12.5215C3.16468 12.2962 2.78256 11.6005 2.44944 11.4144C2.1751 11.2674 1.78319 10.9049 2.43964 10.8951C3.0569 10.8853 3.4978 11.4634 3.64477 11.6985C4.35021 12.8841 5.47695 12.5509 5.92765 12.3452C5.99623 11.8357 6.20198 11.4928 6.42733 11.2968C4.68333 11.1009 2.86095 10.4248 2.86095 7.4267C2.86095 6.5743 3.16468 5.86886 3.66436 5.32018C3.58598 5.12423 3.31164 4.32081 3.74274 3.24306C3.74274 3.24306 4.39919 3.03731 5.89825 4.04648C6.52531 3.87012 7.19156 3.78194 7.8578 3.78194C8.52405 3.78194 9.1903 3.87012 9.81736 4.04648C11.3164 3.02751 11.9729 3.24306 11.9729 3.24306C12.404 4.32081 12.1296 5.12423 12.0512 5.32018C12.5509 5.86886 12.8547 6.5645 12.8547 7.4267C12.8547 10.4346 11.0225 11.1009 9.27848 11.2968C9.56261 11.5418 9.80756 12.0121 9.80756 12.7469C9.80756 13.7952 9.79776 14.6379 9.79776 14.9024C9.79776 15.1081 9.94473 15.3531 10.3366 15.2747C13.4327 14.2361 15.6764 11.2968 15.6764 7.83821C15.6764 3.5076 12.1688 0 7.83821 0Z"
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
              </details>
              {/* The form is a sibling of the details, not a child:
                  non-summary content of a <details> renders inside the
                  browser's internal ::details-content box, so it never
                  became a flex item of this row and never got full
                  width. As a sibling it claims a full line; the CSS
                  shows it only when the chip directly before it is
                  open. */}
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
                  <div className="profile-edit__actions">
                    <button className="btn" type="submit">
                      save
                    </button>
                    {/* Irreversible: retyping the username is the
                        confirmation; the action compares against the
                        signed-in user's own row, never the form. The
                        confirm input and button belong to the hidden
                        sibling form below via the form attribute —
                        forms cannot nest, Enter in the fields still
                        saves, and required on confirm never blocks a
                        save. The details holds only the chip and the
                        confirm content is its sibling: content inside
                        a <details> renders in the browser's internal
                        box and would push the chip out of the buttons
                        row — same reason the edit form is a sibling
                        of its chip above. */}
                    <details className="profile-delete">
                      <summary className="btn btn--danger">
                        delete account
                      </summary>
                    </details>
                    {/* Direct sibling of the details, so the
                        adjacent-sibling hide rule in the CSS matches;
                        flex-basis keeps it on its own full line below
                        the buttons when revealed. */}
                    <div className="profile-delete__confirm">
                      <p className="profile-delete__warning">
                        This permanently removes your profile, seeds, build
                        log and watcher list. There is no undo.
                      </p>
                      <label>
                        Type your username to confirm
                        <input
                          name="confirm"
                          form="delete-account"
                          placeholder={`@${profile.username}`}
                          autoComplete="off"
                          required
                        />
                      </label>
                      <button
                        className="btn btn--danger"
                        type="submit"
                        form="delete-account"
                      >
                        delete my account
                      </button>
                    </div>
                  </div>
              </form>
              <form id="delete-account" action={deleteAccount} hidden />
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
              seed={seed}
              watch={{
                watching: !!user && watched.has(seed.id),
                disabled: !!user && seed.userId === user.id,
                returnTo: `/u/${profile.username}`,
                loggedIn: !!user,
              }}
            />
          ))
        )}
        {canLaunch && (
          <a
            className="btn launch-seed"
            href="/seeds/new"
            aria-label="Launch a seed"
          >
            {/* Figma "Plus": a 38.4px glyph on a 50px tile, 2.5px
                strokes inset 20.83% — matched in viewBox units. */}
            <svg
              width="38.4"
              height="38.4"
              viewBox="0 0 38.4 38.4"
              aria-hidden="true"
            >
              <path
                d="M19.2 8v22.4M8 19.2h22.4"
                stroke="#000"
                strokeWidth="2.5"
              />
            </svg>
          </a>
        )}
      </section>
    </main>
  );
}
