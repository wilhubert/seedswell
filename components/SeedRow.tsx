import Link from "next/link";
import type { ReactNode } from "react";
import type { CounterStack } from "@/lib/board";

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
  shipped?: boolean;
  shipUrl?: string | null;
  variant?: "board" | "card";
  watch?: ReactNode;
};

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
  shipped = false,
  shipUrl,
  variant = "board",
  watch,
}: SeedRowProps) {
  return (
    // One row, flat children: state counter, business card, author link,
    // visit pill, pushes pill and watch button are siblings so the row can
    // spread them evenly. A button can't live inside a link, and neither
    // can a second anchor — hence the flat structure.
    <div className={`seed-row${variant === "card" ? " seed-row--card" : ""}`}>
      <span className="seed-row__counter">
        {counterStack ? (
          <>
            <span className="seed-row__counter-label" aria-hidden="true">
              {counter}
            </span>
            <span className="seed-row__counter-stack">
              <span className="seed-row__time seed-row__time--day">
                <span className="seed-row__time-num">{counterStack.top}</span>
                <span className="seed-row__time-unit">
                  {counterStack.topUnit}
                </span>
              </span>
              <span className="seed-row__time seed-row__time--sub">days</span>
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
            <span className="seed-row__name">{name}</span>
            {tagline && <span className="seed-row__tagline">{tagline}</span>}
          </span>
        </span>
      </Link>
      <Link href={`/seeds/${id}`} className="seed-row__who">
        {avatarUrl && (
          <img src={avatarUrl} alt="" className="seed-row__avatar" />
        )}
        <span className="seed-row__owner">@{owner}</span>
      </Link>
      {/* Status pill: "building" from the moment the seed exists, green
          "built" once it ships — linking to the live site when the owner
          left one on the ship receipt. */}
      {shipped ? (
        shipUrl ? (
          <a
            className="seed-row__visit seed-row__visit--built"
            href={shipUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="built — open the live site"
          >
            built
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M15 3h6v6" />
              <path d="M10 14 21 3" />
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            </svg>
          </a>
        ) : (
          <span className="seed-row__visit seed-row__visit--built">built</span>
        )
      ) : (
        <span className="seed-row__visit seed-row__visit--building">
          building
        </span>
      )}
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
