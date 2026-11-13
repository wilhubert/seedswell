import { boardOrder, type Seed } from "./board";
import { getSupabase } from "./supabase";

export type Commit = {
  sha: string;
  message: string;
  author: string | null;
  url: string | null;
  committedAt: Date;
};

function mapProfileAndSeed(row: Record<string, unknown>): Seed {
  const profiles = row.profiles as
    | { username: string; avatar_url: string | null }[]
    | { username: string; avatar_url: string | null };
  const profile = Array.isArray(profiles) ? profiles[0] : profiles;
  if (!profile?.username) {
    throw new Error(`Project ${row.id} has no owning profile`);
  }
  return {
    id: row.id as string,
    userId: row.user_id as string,
    name: row.name as string,
    tagline: (row.tagline as string | null) ?? null,
    owner: profile.username,
    avatarUrl: profile.avatar_url,
    logoUrl: (row.logo_url as string | null) ?? null,
    plantedAt: new Date(row.planted_at as string),
    targetDays: row.target_days as number,
    pushCount: row.push_count as number,
    shippedAt: row.shipped_at ? new Date(row.shipped_at as string) : null,
    cancelledAt: row.cancelled_at
      ? new Date(row.cancelled_at as string)
      : null,
    shipDays: (row.ship_days as number | null) ?? null,
    connectedAt: row.connected_at
      ? new Date(row.connected_at as string)
      : null,
  };
}

export async function getBoardSeeds(): Promise<Seed[]> {
  const { data, error } = await getSupabase()
    .from("projects")
    .select(
      "id, user_id, name, logo_url, planted_at, target_days, push_count, shipped_at, cancelled_at, ship_days, connected_at, profiles(username, avatar_url)"
    )
    .is("cancelled_at", null)
    .order("planted_at", { ascending: false });

  if (error) {
    throw new Error(`Board query failed: ${error.message}`);
  }

  return boardOrder(data.map(mapProfileAndSeed));
}

export async function getSeedWithLog(
  id: string
): Promise<{ seed: Seed; commits: Commit[] } | null> {
  const { data: row, error } = await getSupabase()
    .from("projects")
    .select(
      "id, user_id, name, tagline, logo_url, planted_at, target_days, push_count, shipped_at, cancelled_at, ship_days, connected_at, profiles(username, avatar_url)"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Seed query failed: ${error.message}`);
  }
  if (!row) {
    return null;
  }

  const { data: commitRows, error: commitError } = await getSupabase()
    .from("commits")
    .select("sha, message, author, url, committed_at")
    .eq("project_id", id)
    .order("pushed_at", { ascending: false });

  if (commitError) {
    throw new Error(`Build log query failed: ${commitError.message}`);
  }

  const commits = commitRows.map((commit) => ({
    sha: commit.sha,
    message: commit.message,
    author: commit.author,
    url: commit.url,
    committedAt: new Date(commit.committed_at),
  }));

  return { seed: mapProfileAndSeed(row), commits };
}
