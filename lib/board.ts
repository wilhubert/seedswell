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
  cancelledAt: Date | null;
  shipDays: number | null;
  connectedAt: Date | null;
};

const DAY_MS = 86_400_000;

// The `day N/30 · X to go` counter is always computed, never stored.
export function counterLabel(seed: Seed): string {
  if (seed.shippedAt) {
    return `shipped · ${seed.shipDays} days`;
  }
  if (seed.cancelledAt) {
    return "called off";
  }
  const day = Math.floor((Date.now() - seed.plantedAt.getTime()) / DAY_MS) + 1;
  const remainingMs =
    seed.plantedAt.getTime() + seed.targetDays * DAY_MS - Date.now();
  const toGo = Math.max(Math.ceil(remainingMs / DAY_MS), 0);
  if (day <= seed.targetDays) {
    return `day ${day}/${seed.targetDays} · ${toGo} to go`;
  }
  return `day ${day}/${seed.targetDays} · ${day - seed.targetDays} over`;
}

// Board rule: live seeds sort nearest their called date first; a seed
// vanishes once its date passes, shipped or not; a shipped seed still inside
// its window lingers under the live ones with its receipt; called-off seeds
// are gone.
export function boardOrder(seeds: Seed[]): Seed[] {
  const now = Date.now();
  const deadline = (seed: Seed) =>
    seed.plantedAt.getTime() + seed.targetDays * DAY_MS;

  const visible = seeds.filter(
    (seed) => !seed.cancelledAt && deadline(seed) > now
  );
  const live = visible
    .filter((seed) => !seed.shippedAt)
    .sort((a, b) => deadline(a) - deadline(b));
  const shipped = visible
    .filter((seed) => seed.shippedAt)
    .sort((a, b) => deadline(a) - deadline(b));

  return [...live, ...shipped];
}
