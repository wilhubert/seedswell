import Link from "next/link";
import type { ReactNode } from "react";
import { type CounterStack, type SeedStatus } from "@/lib/board";

type SeedRowProps = {
  id: string;
  name: string;
  owner: string;
  counter: string;
  counterStack?: CounterStack | null;
  pushes: number;
  logoUrl?: string | null;
  avatarUrl?: string | null;
  tagline?: string | null;
  status: SeedStatus;
  shipUrl?: string | null;
  variant?: "board" | "card";
  watch?: ReactNode;
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

export default function SeedRow({
  id,
  name,
  owner,
  counter,
  counterStack,
  pushes,
  logoUrl,
  avatarUrl,
  tagline,
  status,
  shipUrl,
  variant = "board",
  watch,
}: SeedRowProps) {
  return (
    // One row, flat children: state counter, business card, author link,
    // desktop status pill, pushes pill and watch button are siblings so
    // the row can spread them evenly. A button can't live inside a link,
    // and neither can a second anchor — hence the flat structure; the
    // status pill is rendered twice (own slot on desktop, beside the
    // name on mobile) and CSS picks one per breakpoint.
    <div className={`seed-row${variant === "card" ? " seed-row--card" : ""}`}>
      <span className="seed-row__counter">
        {counterStack ? (
          <>
            <span className="seed-row__counter-label" aria-hidden="true">
              {counter}
            </span>
            {/* Two stacked rows: whole days to go ("01 D", heavy) above
                the leftover hours ("24 H", light) — the muted letters sit
                on the number's baseline. The aria-hidden label above
                carries the full day X/30 · N to go reading. */}
            <span className="seed-row__counter-stack">
              <span className="seed-row__time">
                <span className="seed-row__time-num">{counterStack.days}</span>
                <span className="seed-row__time-unit">D</span>
              </span>
              <span className="seed-row__time">
                <span className="seed-row__time-num">
                  {counterStack.hours}
                </span>
                <span className="seed-row__time-unit">H</span>
              </span>
            </span>
          </>
        ) : (
          counter
        )}
      </span>
      <Link href={`/seeds/${id}`} className="seed-row__link">
        <span className="seed-row__left">
          {logoUrl ? (
            <img src={logoUrl} alt="" className="seed-row__logo" />
          ) : (
            <span className="seed-row__logo" aria-hidden="true">
              {name.slice(0, 1).toLowerCase()}
            </span>
          )}
          <span className="seed-row__info">
            {/* Mobile status pill sits beside the name: grey building,
                green built, outlined dropped. The name text has its own
                span so the flexed row ellipsizes the text and never
                clips the pill. */}
            <span className="seed-row__name">
              <span className="seed-row__name-text">{name}</span>
              {statusPill(status, shipUrl, "mobile")}
            </span>
            {tagline && <span className="seed-row__tagline">{tagline}</span>}
          </span>
        </span>
      </Link>
      {/* The username is a profile link, not a seed link — @owner points
          at /u/{owner} everywhere the row shows it. */}
      <Link href={`/u/${owner}`} className="seed-row__who">
        {avatarUrl && (
          <img src={avatarUrl} alt="" className="seed-row__avatar" />
        )}
        <span className="seed-row__owner">@{owner}</span>
      </Link>
      {/* Desktop status pill: its own flex slot in the row, outside the
          seed link — a built seed links out to its live site from here. */}
      {statusPill(status, shipUrl, "desktop")}
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
        <span className="seed-row__pushes-count">{pushes}</span>
        <span className="seed-row__pushes-label"> pushes</span>
      </span>
      {watch}
    </div>
  );
}
