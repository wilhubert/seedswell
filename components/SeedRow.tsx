import Link from "next/link";
import type { ReactNode } from "react";

type SeedRowProps = {
  id: string;
  name: string;
  owner: string;
  counter: string;
  pushes: number;
  logoUrl?: string | null;
  avatarUrl?: string | null;
  variant?: "board" | "card";
  watch?: ReactNode;
};

export default function SeedRow({
  id,
  name,
  owner,
  counter,
  pushes,
  logoUrl,
  avatarUrl,
  variant = "board",
  watch,
}: SeedRowProps) {
  return (
    // A button can't live inside the link, so the row is the container and
    // the link covers the whole informational area.
    <div
      className={`seed-row${variant === "card" ? " seed-row--card" : ""}`}
    >
      <Link href={`/seeds/${id}`} className="seed-row__link">
        <span className="seed-row__left">
          {logoUrl ? (
            <img src={logoUrl} alt="" className="seed-row__logo" />
          ) : (
            <span className="seed-row__logo" aria-hidden="true">
              {name.slice(0, 1).toLowerCase()}
            </span>
          )}
          <span className="seed-row__name">{name}</span>
          {avatarUrl && (
            <img src={avatarUrl} alt="" className="seed-row__avatar" />
          )}
          <span className="seed-row__owner">@{owner}</span>
        </span>
        <span className="seed-row__counter">{counter}</span>
        <span className="seed-row__pushes">{pushes} pushes</span>
      </Link>
      {watch}
    </div>
  );
}
