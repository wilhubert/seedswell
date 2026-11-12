import { getSupabase } from "./supabase";

const DAY_MS = 86_400_000;

export type Seed = {
  id: string;
  name: string;
  owner: string;
  avatarUrl: string | null;
  logoUrl: string | null;
  plantedAt: Date;
  targetDays: number;
  pushCount: number;
  shippedAt: Date | null;
  cancelledAt: Date | null;
  shipDays: number | null;
};

export async function getBoardSeeds(): Promise<Seed[]> {
  const { data, error } = await getSupabase()
    .from("projects")
    .select(
      "id, name, logo_url, planted_at, target_days, push_count, shipped_at, cancelled_at, ship_days, profiles(username, avatar_url)"
    )
    .is("cancelled_at", null)
    .order("planted_at", { ascending: false });

  if (error) {
    throw new Error(`Board query failed: ${error.message}`);
  }

  const seeds = data.map((row) => {
    const profiles = row.profiles as
      | { username: string; avatar_url: string | null }[]
      | { username: string; avatar_url: string | null };
    const profile = Array.isArray(profiles) ? profiles[0] : profiles;
    if (!profile?.username) {
      throw new Error(`Project ${row.id} has no owning profile`);
    }
    return {
      id: row.id,
      name: row.name,
      owner: profile.username,
      avatarUrl: profile.avatar_url,
      logoUrl: row.logo_url,
      plantedAt: new Date(row.planted_at),
      targetDays: row.target_days,
      pushCount: row.push_count,
      shippedAt: row.shipped_at ? new Date(row.shipped_at) : null,
      cancelledAt: row.cancelled_at ? new Date(row.cancelled_at) : null,
      shipDays: row.ship_days,
    };
  });

  const now = Date.now();
  const deadline = (seed: Seed) =>
    seed.plantedAt.getTime() + seed.targetDays * DAY_MS;

  // A seed vanishes from the board once its called date passes — shipped or not.
  const visible = seeds.filter((seed) => deadline(seed) > now);
  const live = visible
    .filter((seed) => !seed.shippedAt)
    .sort((a, b) => deadline(a) - deadline(b));
  const shipped = visible
    .filter((seed) => seed.shippedAt)
    .sort((a, b) => deadline(a) - deadline(b));

  return [...live, ...shipped];
}

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
