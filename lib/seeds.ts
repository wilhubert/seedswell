import { boardOrder, type Seed } from "./board";
import { getSupabase } from "./supabase";

export type Commit = {
  sha: string;
  message: string;
  author: string | null;
  url: string | null;
  committedAt: Date;
};

export type SeedPost = {
  id: string;
  body: string;
  createdAt: Date;
};

// Every seed query embeds its owning profile for the row display and a
// watcher count for the watch button. The profile embed must name its FK:
// watchers added a second projects→profiles path and PostgREST won't guess.
const SEED_SELECT =
  "id, user_id, name, tagline, logo_url, planted_at, target_days, push_count, shipped_at, ship_days, ship_url, connected_at, watchers(count), profiles!projects_user_id_fkey(username, avatar_url)";

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
    shipUrl: (row.ship_url as string | null) ?? null,
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
    .select("id, username, avatar_url, bio, x_handle")
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
    xHandle: data.x_handle ?? null,
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

export type Watcher = {
  userId: string;
  username: string;
  avatarUrl: string | null;
};

// Who watches a seed, oldest watch first — the first believers keep
// their place at the front of the list. Watch rows are public content
// (the board shows the counts), so this is readable by anyone.
export async function getWatchers(projectId: string): Promise<Watcher[]> {
  const { data, error } = await getSupabase()
    .from("watchers")
    .select(
      "user_id, profiles!watchers_user_id_fkey(username, avatar_url)"
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });
  if (error) {
    throw new Error(`Watchers query failed: ${error.message}`);
  }
  return data.flatMap((row) => {
    // The profiles embed arrives as an object or an array depending on
    // the generated types; take the first entry either way.
    const profiles = row.profiles as
      | { username: string; avatar_url: string | null }[]
      | { username: string; avatar_url: string | null }
      | null;
    const profile = Array.isArray(profiles) ? profiles[0] : profiles;
    // The FK guarantees a profile row; null only if it was mass-deleted
    // under the read — skip rather than break the page.
    if (!profile?.username) {
      return [];
    }
    return [
      {
        userId: row.user_id as string,
        username: profile.username,
        avatarUrl: profile.avatar_url,
      },
    ];
  });
}

export async function getSeedsByIds(ids: string[]): Promise<Seed[]> {
  if (ids.length === 0) {
    return [];
  }
  const { data, error } = await getSupabase()
    .from("projects")
    .select(SEED_SELECT)
    .in("id", ids);
  if (error) {
    throw new Error(`Seeds by id query failed: ${error.message}`);
  }
  return boardOrder(data.map(mapProfileAndSeed));
}

export async function getSeedWithLog(
  id: string
): Promise<{ seed: Seed; commits: Commit[] } | null> {
  const { data: row, error } = await getSupabase()
    .from("projects")
    .select(SEED_SELECT)
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

// The numbered founder updates on the seed page: chronological, so a
// new post appends at the bottom as number n+1 and older posts keep
// their numbers.
export async function getSeedPosts(projectId: string): Promise<SeedPost[]> {
  const { data, error } = await getSupabase()
    .from("seed_posts")
    .select("id, body, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Seed posts query failed: ${error.message}`);
  }

  return data.map((post) => ({
    id: post.id,
    body: post.body,
    createdAt: new Date(post.created_at),
  }));
}
