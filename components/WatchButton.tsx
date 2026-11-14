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

// Always visible with the watcher count. Watching toggles for any logged-in
// user; the owner's own seed is disabled (you can't watch yourself);
// anonymous visitors get a login link in the same shape.
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
      <Link className="btn btn--watch" href="/auth/login">
        {label}
      </Link>
    );
  }

  if (disabled) {
    return (
      <button className="btn btn--watch" type="button" disabled
        title="You can't watch your own seed"
      >
        {label}
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
      >
        {label}
      </button>
    </form>
  );
}
