import Link from "next/link";
import WatchButton from "./WatchButton";
import {
  counterLabel,
  counterStack,
  seedStatus,
  type Seed,
  type SeedStatus,
} from "@/lib/board";

// The watch context a page supplies beside the seed: is the visitor
// already watching, can they toggle it at all (own seed → no), where
// the toggle should land afterwards, and are they signed in.
type WatchProps = {
  watching: boolean;
  disabled: boolean;
  returnTo: string;
  loggedIn: boolean;
};

type SeedRowProps = {
  seed: Seed;
  variant?: "board" | "card";
  watch?: WatchProps;
};

// The pill is rendered twice in the markup: beside the name (mobile) and
// as its own flex slot in the row (desktop) — CSS can't reparent across
// breakpoints, so the media query picks one per width. Only the desktop
// copy links out: the mobile one sits inside the seed link and an anchor
// can't nest in an anchor, so tapping it opens the seed page.
function statusPill(
  status: SeedStatus,
  shipUrl: string | null | undefined,
  slot: "mobile" | "desktop"
) {
  const className = `seed-row__visit seed-row__visit--${slot} seed-row__visit--${status}`;

  if (status === "built" || status === "delayed") {
    // The label is the receipt: "built" inside the window, "delayed"
    // past it — green for on-time ships, orange for late ones.
    const label = status === "delayed" ? "delayed" : "built";
    const contents = (
      <>
        {label}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 3h6v6" />
          <path d="M10 14 21 3" />
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        </svg>
      </>
    );
    return shipUrl && slot === "desktop" ? (
      <a
        className={className}
        href={shipUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${label} — open the live site`}
      >
        {contents}
      </a>
    ) : (
      <span className={className}>{contents}</span>
    );
  }

  return <span className={className}>{status}</span>;
}

// One component, one props shape: pages hand it the derived Seed and
// the visitor's watch context; the counter, status pill and watch
// button all fall out of those. The status pill is still rendered
// twice in the markup (own slot on desktop, beside the name on
// mobile) and CSS picks one per breakpoint.
export default function SeedRow({ seed, variant = "board", watch }: SeedRowProps) {
  const status = seedStatus(seed);
  const counter = counterLabel(seed);
  const stack = counterStack(seed);
  // The stack's numbers keep the coral highlight only while the seed is
  // still building: an on-time ship turns them green, a late ship or a
  // missed date fades them to muted.
  const tone =
    status === "built"
      ? " seed-row__counter-stack--built"
      : status === "delayed" || status === "dropped"
        ? " seed-row__counter-stack--failed"
        : "";

  return (
    // One row, flat children: state counter, business card, author link,
    // desktop status pill, pushes pill and watch button are siblings so
    // the row can spread them evenly. A button can't live inside a link,
    // and neither can a second anchor — hence the flat structure; the
    // status pill is rendered twice (own slot on desktop, beside the
    // name on mobile) and CSS picks one per breakpoint.
    <div className={`seed-row${variant === "card" ? " seed-row--card" : ""}`}>
      <span className={`seed-row__counter-stack${tone}`}>
        <span className="seed-row__counter-label" aria-hidden="true">
          {counter}
        </span>
        {/* Two stacked rows ("01 D" over "24 H"): what the numbers mean
            depends on the seed's state — time to go while building, time
            it took once shipped, 00/00 for a missed date — and the muted
            letters sit on the number's baseline. The aria-hidden label
            above carries the full day X/30 · N to go reading. */}
        <span className="seed-row__time">
          <span className="seed-row__time-num">{stack.days}</span>
          <span className="seed-row__time-unit">D</span>
        </span>
        <span className="seed-row__time">
          <span className="seed-row__time-num">{stack.hours}</span>
          <span className="seed-row__time-unit">H</span>
        </span>
      </span>
      <Link href={`/seeds/${seed.id}`} className="seed-row__link">
        <span className="seed-row__left">
          {seed.logoUrl ? (
            <img src={seed.logoUrl} alt="" className="seed-row__logo" />
          ) : (
            <span className="seed-row__logo" aria-hidden="true">
              {seed.name.slice(0, 1).toLowerCase()}
            </span>
          )}
          <span className="seed-row__info">
            {/* Mobile status pill sits beside the name: grey building,
                green built, outlined dropped. The name text has its own
                span so the flexed row ellipsizes the text and never
                clips the pill. */}
            <span className="seed-row__name">
              <span className="seed-row__name-text">{seed.name}</span>
              {statusPill(status, seed.shipUrl, "mobile")}
            </span>
            {seed.tagline && (
              <span className="seed-row__tagline">{seed.tagline}</span>
            )}
          </span>
        </span>
      </Link>
      {/* The username is a profile link, not a seed link — @owner points
          at /u/{owner} everywhere the row shows it. */}
      <Link href={`/u/${seed.owner}`} className="seed-row__who">
        {seed.avatarUrl && (
          <img src={seed.avatarUrl} alt="" className="seed-row__avatar" />
        )}
        <span className="seed-row__owner">@{seed.owner}</span>
      </Link>
      {/* Desktop status pill: its own flex slot in the row, outside the
          seed link — a built seed links out to its live site from here. */}
      {statusPill(status, seed.shipUrl, "desktop")}
      <span className="seed-row__pushes">
        <svg
          className="seed-row__pushes-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <span className="seed-row__pushes-count">{seed.pushCount}</span>
        <span className="seed-row__pushes-label"> pushes</span>
      </span>
      {watch && (
        <WatchButton
          seedId={seed.id}
          watching={watch.watching}
          returnTo={watch.returnTo}
          count={seed.watchCount}
          disabled={watch.disabled}
          loggedIn={watch.loggedIn}
        />
      )}
    </div>
  );
}
