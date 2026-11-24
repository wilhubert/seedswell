"use client";

import { track } from "@vercel/analytics";
import { unwatchSeed, watchSeed } from "@/app/seeds/[id]/actions";
import Link from "next/link";

type WatchButtonProps = {
  seedId: string;
  watching: boolean;
  returnTo: string;
  count: number;
  disabled?: boolean;
  loggedIn: boolean;
};

function BellIcon() {
  return (
    <svg
      className="btn__icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

// Desktop keeps the "watch · N" text; on mobile rows the action word hides
// and only the bell + count pill shows.
function watchContent(watching: boolean, count: number) {
  return (
    <>
      <BellIcon />
      <span className="btn__watch-action">{watching ? "stop" : "watch"} ·</span>
      <span className="btn__watch-count">{count}</span>
    </>
  );
}

// Always visible with the watcher count. Watching toggles for any logged-in
// user; the owner's own seed is disabled (you can't watch yourself);
// anonymous visitors get a login link in the same shape.
// Every click on a clickable variant fires the "watch_button" Vercel
// Analytics event (with watch/stop/login intent), so the dashboard shows
// how many people click it.
export default function WatchButton({
  seedId,
  watching,
  returnTo,
  count,
  disabled = false,
  loggedIn,
}: WatchButtonProps) {
  const label = `${watching ? "stop" : "watch"} · ${count}`;

  if (!loggedIn) {
    return (
      <Link
        className="btn btn--watch"
        href={`/auth/login?next=${encodeURIComponent(returnTo)}`}
        aria-label={label}
        onClick={() => track("watch_button", { intent: "login" })}
      >
        {watchContent(watching, count)}
      </Link>
    );
  }

  if (disabled) {
    return (
      <button
        className="btn btn--watch"
        type="button"
        disabled
        title="You can't watch your own seed"
        aria-label={label}
      >
        {watchContent(watching, count)}
      </button>
    );
  }

  return (
    <form action={watching ? unwatchSeed : watchSeed}>
      <input type="hidden" name="project_id" value={seedId} />
      <input type="hidden" name="return_to" value={returnTo} />
      <button
        className={watching ? "btn btn--watch btn--ghost" : "btn btn--watch"}
        type="submit"
        aria-label={label}
        onClick={() =>
          track("watch_button", { intent: watching ? "stop" : "watch" })
        }
      >
        {watchContent(watching, count)}
      </button>
    </form>
  );
}
