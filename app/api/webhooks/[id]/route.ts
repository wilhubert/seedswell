import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase-service";
import { verifyGitHubSignature } from "@/lib/webhook";

// Node runtime: crypto behavior and raw-body access are predictable here.
export const runtime = "nodejs";

type GitHubCommit = {
  id: string;
  message: string;
  timestamp?: string;
  author?: { name?: string; username?: string } | null;
  url?: string;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // The raw bytes exactly as GitHub signed them — read before any parsing.
  const rawBody = await request.text();

  // Push payloads should be tiny; anything huge is abuse, not a delivery.
  if (rawBody.length > 1_000_000) {
    return NextResponse.json(
      { error: "Payload too large" },
      { status: 413 }
    );
  }

  // The project is identified only by the URL id and the verified secret,
  // never by anything inside the payload.
  const service = getSupabaseServiceClient();
  const { data: project, error: projectError } = await service
    .from("projects")
    .select("id, webhook_secret, connected_at, push_count")
    .eq("id", id)
    .maybeSingle();

  if (projectError) {
    return NextResponse.json(
      { error: `Project lookup failed: ${projectError.message}` },
      { status: 500 }
    );
  }
  if (!project) {
    return NextResponse.json({ error: "Unknown project" }, { status: 404 });
  }

  const signature = request.headers.get("x-hub-signature-256");
  if (!verifyGitHubSignature(rawBody, signature, project.webhook_secret)) {
    return NextResponse.json(
      { error: "Signature verification failed" },
      { status: 401 }
    );
  }

  const event = request.headers.get("x-github-event");

  if (event === "ping") {
    if (!project.connected_at) {
      const { error } = await service
        .from("projects")
        .update({ connected_at: new Date().toISOString() })
        .eq("id", id);
      if (error) {
        return NextResponse.json(
          { error: `Connect failed: ${error.message}` },
          { status: 500 }
        );
      }
    }
    return NextResponse.json({ ok: true, event: "ping" });
  }

  if (event === "push") {
    let payload: { commits?: GitHubCommit[] };
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: "Push body is not valid JSON" },
        { status: 400 }
      );
    }

    const commits = payload.commits ?? [];
    if (commits.length > 0) {
      const rows = commits.map((commit) => ({
        project_id: id,
        sha: commit.id,
        message: commit.message,
        author: commit.author?.name ?? commit.author?.username ?? null,
        // Only store links we would be willing to render as hrefs.
        url: commit.url?.startsWith("https://") ? commit.url : null,
        committed_at: commit.timestamp ?? new Date().toISOString(),
        pushed_at: new Date().toISOString(),
      }));
      // Upsert by (project_id, sha): duplicate deliveries change nothing.
      const { error } = await service
        .from("commits")
        .upsert(rows, { onConflict: "project_id,sha" });
      if (error) {
        return NextResponse.json(
          { error: `Commit upsert failed: ${error.message}` },
          { status: 500 }
        );
      }
    }

    // Mark connected on first push as well: a webhook added before its ping
    // was deliverable must not stay "unconnected" forever.
    const updates: Record<string, unknown> = {
      push_count: project.push_count + 1,
    };
    if (!project.connected_at) {
      updates.connected_at = new Date().toISOString();
    }
    const { error } = await service
      .from("projects")
      .update(updates)
      .eq("id", id);
    if (error) {
      return NextResponse.json(
        { error: `Push count update failed: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      event: "push",
      commits: commits.length,
    });
  }

  return NextResponse.json({ ok: true, event, ignored: true });
}
