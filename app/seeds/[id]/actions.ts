"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase-server";

const DAY_MS = 86_400_000;

async function requireOwnOpenSeed(projectId: string) {
  const { supabase, user } = await requireUser();

  const { data: project, error } = await supabase
    .from("projects")
    .select("id, user_id, planted_at, shipped_at")
    .eq("id", projectId)
    .maybeSingle();

  if (error || !project) {
    redirect(`/seeds/${projectId}?error=lookup`);
  }
  if (project.user_id !== user.id) {
    redirect(`/seeds/${projectId}?error=not-owner`);
  }
  if (project.shipped_at) {
    redirect(`/seeds/${projectId}?error=already-shipped`);
  }

  return { supabase, project };
}

export async function shipSeed(formData: FormData) {
  const projectId = String(formData.get("project_id") ?? "");
  const { supabase, project } = await requireOwnOpenSeed(projectId);

  // The receipt records the true day number, late or not.
  const shipDays =
    Math.floor(
      (Date.now() - new Date(project.planted_at).getTime()) / DAY_MS
    ) + 1;

  const { error } = await supabase
    .from("projects")
    .update({ shipped_at: new Date().toISOString(), ship_days: shipDays })
    .eq("id", projectId);
  if (error) {
    redirect(
      `/seeds/${projectId}?error=ship-failed&message=${encodeURIComponent(error.message)}`
    );
  }

  revalidatePath(`/seeds/${projectId}`);
  redirect(`/seeds/${projectId}`);
}

async function toggleWatch(formData: FormData, watch: boolean) {
  const projectId = String(formData.get("project_id") ?? "");
  const returnToRaw = String(formData.get("return_to") ?? "");
  // Same-origin relative paths only; anything else falls back to the seed.
  const returnTo =
    returnToRaw.startsWith("/") && !returnToRaw.startsWith("//")
      ? returnToRaw
      : `/seeds/${projectId}`;
  const { supabase, user } = await requireUser();

  if (watch) {
    const { error } = await supabase
      .from("watchers")
      .upsert({ project_id: projectId, user_id: user.id })
      .eq("project_id", projectId)
      .eq("user_id", user.id);
    if (error) {
      redirect(
        `/seeds/${projectId}?error=watch-failed&message=${encodeURIComponent(error.message)}`
      );
    }
  } else {
    const { error } = await supabase
      .from("watchers")
      .delete()
      .eq("project_id", projectId)
      .eq("user_id", user.id);
    if (error) {
      redirect(
        `/seeds/${projectId}?error=watch-failed&message=${encodeURIComponent(error.message)}`
      );
    }
  }

  revalidatePath(`/seeds/${projectId}`);
  revalidatePath("/watching");
  revalidatePath(returnTo);
  redirect(returnTo);
}

// Upsert because (project_id, user_id) is the primary key: double-clicking
// the watch button must be idempotent, not an error.
export async function watchSeed(formData: FormData) {
  await toggleWatch(formData, true);
}

export async function unwatchSeed(formData: FormData) {
  await toggleWatch(formData, false);
}
