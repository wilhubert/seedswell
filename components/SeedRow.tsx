import Link from "next/link";

type SeedRowProps = {
  id: string;
  name: string;
  owner: string;
  counter: string;
  pushes: number;
  logoUrl?: string | null;
  avatarUrl?: string | null;
  variant?: "board" | "card";
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
}: SeedRowProps) {
  return (
    <Link
      href={`/seeds/${id}`}
      className={`seed-row${variant === "card" ? " seed-row--card" : ""}`}
    >
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
  );
}
