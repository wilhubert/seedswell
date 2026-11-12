import { boardOrder, type Seed } from "./board";
import { getSupabase } from "./supabase";

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

  return boardOrder(seeds);
}
