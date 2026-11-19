"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase-server";

const DAY_MS = 86_400_000;

// Same field rules as the plant form: editing is for fixing story and
// identity, never for moving the called date.
const NAME_MAX = 80;
const TAGLINE_MAX = 200;

export async function editSeed(formData: FormData) {
  const projectId = String(formData.get("project_id") ?? "");
  const { supabase, user } = await requireUser();

  const { data: project, error } = await supabase
    .from("projects")
    .select("id, user_id")
    .eq("id", projectId)
    .maybeSingle();

  if (error || !project) {
    notFound();
  }
  if (project.user_id !== user.id) {
    notFound();
  }

  const name = String(formData.get("name") ?? "").trim();
  const tagline = String(formData.get("tagline") ?? "").trim();
  const logoUrl = String(formData.get("logo_url") ?? "").trim();

  const nameOk = name.length >= 1 && name.length <= NAME_MAX;
  const taglineOk = tagline.length <= TAGLINE_MAX;
  const logoOk = logoUrl === "" || /^https?:\/\//.test(logoUrl);

  if (!nameOk || !taglineOk || !logoOk) {
    redirect(`/seeds/${projectId}/edit?error=invalid`);
  }

  const { error: updateError } = await supabase
    .from("projects")
    .update({ name, tagline: tagline || null, logo_url: logoUrl || null })
    .eq("id", projectId);
  if (updateError) {
    redirect(
      `/seeds/${projectId}/edit?error=update-failed&message=${encodeURIComponent(updateError.message)}`
    );
  }

  revalidatePath(`/seeds/${projectId}`);
  redirect(`/seeds/${projectId}`);
}

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

  // The receipt records the true day number, late or not. A live URL is
  // optional; the board's "built" pill links out when one was given.
  const shipUrl = String(formData.get("ship_url") ?? "").trim();
  if (shipUrl !== "" && !/^https?:\/\//.test(shipUrl)) {
    redirect(`/seeds/${projectId}?error=invalid-url`);
  }

  const shipDays =
    Math.floor(
      (Date.now() - new Date(project.planted_at).getTime()) / DAY_MS
    ) + 1;

  const { error } = await supabase
    .from("projects")
    .update({
      shipped_at: new Date().toISOString(),
      ship_days: shipDays,
      ship_url: shipUrl || null,
    })
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
