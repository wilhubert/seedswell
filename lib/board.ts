export type Seed = {
  id: string;
  userId: string;
  name: string;
  tagline: string | null;
  owner: string;
  avatarUrl: string | null;
  logoUrl: string | null;
  plantedAt: Date;
  targetDays: number;
  pushCount: number;
  shippedAt: Date | null;
  shipDays: number | null;
  shipUrl: string | null;
  connectedAt: Date | null;
  watchCount: number;
};

export const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;

// The day number a seed is on: day 1 runs from planting through the first
// 24h. Shared by the counter and the ship receipt, which "records the
// true day number, late or not".
export function dayNumber(plantedAt: Date | string): number {
  return Math.floor((Date.now() - new Date(plantedAt).getTime()) / DAY_MS) + 1;
}

// Status is derived, never stored. A seed builds until its deadline; a
// ship inside the window is "built", one after it is "delayed" — the
// receipt still counts the true day number, the pill carries the shame —
// and a seed that misses its date without shipping has "dropped" until
// it ships or is abandoned.
export type SeedStatus = "building" | "built" | "delayed" | "dropped";

export function seedStatus(seed: Seed, now: Date = new Date()): SeedStatus {
  const deadline = seed.plantedAt.getTime() + seed.targetDays * DAY_MS;
  if (seed.shippedAt) {
    return seed.shippedAt.getTime() > deadline ? "delayed" : "built";
  }
  return now.getTime() < deadline ? "building" : "dropped";
}

// The `day N/30 · X to go` counter is always computed, never stored.
export function counterLabel(seed: Seed): string {
  if (seed.shippedAt) {
    return `shipped · ${seed.shipDays} days`;
  }
  const day = dayNumber(seed.plantedAt);
  const remainingMs =
    seed.plantedAt.getTime() + seed.targetDays * DAY_MS - Date.now();
  const toGo = Math.max(Math.ceil(remainingMs / DAY_MS), 0);
  if (day <= seed.targetDays) {
    return `day ${day}/${seed.targetDays} · ${toGo} to go`;
  }
  return `day ${day}/${seed.targetDays} · ${day - seed.targetDays} over`;
}

// Stacked readout for the row's time block: the remaining time split into
// whole days ("01" over a muted D) and the leftover hours ("24" over a
// muted H, never more than a day's worth). Zero-padded to hold the shape.
export type CounterStack = {
  days: string;
  hours: string;
};

export function counterStack(seed: Seed): CounterStack | null {
  if (seed.shippedAt) {
    return null;
  }
  const remainingMs =
    seed.plantedAt.getTime() + seed.targetDays * DAY_MS - Date.now();
  if (remainingMs <= 0) {
    return null;
  }
  const days = Math.floor(remainingMs / DAY_MS);
  // Leftover hours cap at 24: ceil keeps the last hour of a day showing
  // 24 instead of dropping to 0 early.
  const hours = Math.ceil((remainingMs % DAY_MS) / HOUR_MS);
  return {
    days: String(days).padStart(2, "0"),
    hours: String(hours).padStart(2, "0"),
  };
}

// Board rule: live seeds sort nearest their called date first; a seed
// vanishes once its date passes, shipped or not; a shipped seed still inside
// its window lingers under the live ones with its receipt.
export function boardOrder(seeds: Seed[]): Seed[] {
  const now = Date.now();
  const deadline = (seed: Seed) =>
    seed.plantedAt.getTime() + seed.targetDays * DAY_MS;

  const visible = seeds.filter((seed) => deadline(seed) > now);
  const live = visible
    .filter((seed) => !seed.shippedAt)
    .sort((a, b) => deadline(a) - deadline(b));
  const shipped = visible
    .filter((seed) => seed.shippedAt)
    .sort((a, b) => deadline(a) - deadline(b));

  return [...live, ...shipped];
}
