import { boardOrder, type Seed } from "./board";
import { getSupabase } from "./supabase";

export type Commit = {
  sha: string;
  message: string;
  author: string | null;
  url: string | null;
  committedAt: Date;
};

// Every seed query embeds its owning profile for the row display and a
// watcher count for the watch button.
const SEED_SELECT =
  "id, user_id, name, tagline, logo_url, planted_at, target_days, push_count, shipped_at, ship_days, connected_at, watchers(count), profiles(username, avatar_url)";

function mapProfileAndSeed(row: Record<string, unknown>): Seed {
  const profiles = row.profiles as
    | { username: string; avatar_url: string | null }[]
    | { username: string; avatar_url: string | null };
  const profile = Array.isArray(profiles) ? profiles[0] : profiles;
  if (!profile?.username) {
    throw new Error(`Project ${row.id} has no owning profile`);
  }
  const watcherRows = row.watchers as { count: number }[] | { count: number };
  const watchCount = Array.isArray(watcherRows)
    ? Number(watcherRows[0]?.count ?? 0)
    : Number(watcherRows?.count ?? 0);
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
    shipDays: (row.ship_days as number | null) ?? null,
    connectedAt: row.connected_at
      ? new Date(row.connected_at as string)
      : null,
    watchCount,
  };
}

export async function getBoardSeeds(): Promise<Seed[]> {
  const { data, error } = await getSupabase()
    .from("projects")
    .select(SEED_SELECT)
    .order("planted_at", { ascending: false });

  if (error) {
    throw new Error(`Board query failed: ${error.message}`);
  }

  return boardOrder(data.map(mapProfileAndSeed));
}

export async function getProfileByUsername(username: string) {
  const { data, error } = await getSupabase()
    .from("profiles")
    .select("id, username, avatar_url, bio")
    .eq("username", username)
    .maybeSingle();

  if (error) {
    throw new Error(`Profile query failed: ${error.message}`);
  }
  if (!data) {
    return null;
  }
  return {
    id: data.id,
    username: data.username,
    avatarUrl: data.avatar_url,
    bio: data.bio,
  };
}

export async function getSeedsForUser(userId: string): Promise<Seed[]> {
  const { data, error } = await getSupabase()
    .from("projects")
    .select(SEED_SELECT)
    .eq("user_id", userId)
    .order("planted_at", { ascending: false });

  if (error) {
    throw new Error(`User seeds query failed: ${error.message}`);
  }

  return boardOrder(data.map(mapProfileAndSeed));
}

export async function isWatching(userId: string, seedId: string) {
  const { data, error } = await getSupabase()
    .from("watchers")
    .select("project_id")
    .eq("project_id", seedId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    throw new Error(`Watch check failed: ${error.message}`);
  }
  return !!data;
}

export async function getWatchedProjectIds(
  userId: string
): Promise<Set<string>> {
  const { data, error } = await getSupabase()
    .from("watchers")
    .select("project_id")
    .eq("user_id", userId);
  if (error) {
    throw new Error(`Watchlist ids query failed: ${error.message}`);
  }
  return new Set(data.map((row) => row.project_id as string));
}

export async function getWatchedSeeds(userId: string): Promise<Seed[]> {
  const { data, error } = await getSupabase()
    .from("projects")
    .select(`${SEED_SELECT}, watchers!inner(user_id)`)
    .eq("watchers.user_id", userId)
    .order("planted_at", { ascending: false });

  if (error) {
    throw new Error(`Watchlist query failed: ${error.message}`);
  }

  return boardOrder(data.map(mapProfileAndSeed));
}

export async function getSeedWithLog(
  id: string
): Promise<{ seed: Seed; commits: Commit[] } | null> {
  const { data: row, error } = await getSupabase()
    .from("projects")
    .select(
      "id, user_id, name, tagline, logo_url, planted_at, target_days, push_count, shipped_at, ship_days, connected_at, watchers(count), profiles(username, avatar_url)"
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
