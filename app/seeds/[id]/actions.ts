"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase-server";
import { dayNumber } from "@/lib/board";
import { seedIdentityOk } from "@/lib/seed-fields";

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

  if (!seedIdentityOk(name, tagline, logoUrl)) {
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

  const shipDays = dayNumber(project.planted_at);

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

// Founder updates are insert-only: the check is ownership in the action
// (clear errors) *and* the RLS policy (cannot be bypassed).
// Founder updates are insert-only for everyone else, but the owner can
// retract their own posts: ownership is checked in the action (clear
// errors) *and* in the RLS policy (cannot be bypassed).
export async function deleteUpdate(formData: FormData) {
  const projectId = String(formData.get("project_id") ?? "");
  const postId = String(formData.get("post_id") ?? "");
  const { supabase, user } = await requireUser();

  const { data: project, error } = await supabase
    .from("projects")
    .select("id, user_id")
    .eq("id", projectId)
    .maybeSingle();

  if (error || !project) {
    redirect(`/seeds/${projectId}?error=lookup`);
  }
  if (project.user_id !== user.id) {
    redirect(`/seeds/${projectId}?error=not-owner`);
  }

  // select() asks PostgREST for the deleted row back: with RLS
  // blocking the delete (policy missing) the call "succeeds" with zero
  // rows gone, so a missing row is an explicit error, not a silent
  // no-op that reloads the page looking unchanged.
  const { data: deleted, error: deleteError } = await supabase
    .from("seed_posts")
    .delete()
    .eq("id", postId)
    .eq("project_id", projectId)
    .select("id");
  if (deleteError) {
    redirect(
      `/seeds/${projectId}?error=delete-failed&message=${encodeURIComponent(deleteError.message)}`
    );
  }
  if (!deleted || deleted.length === 0) {
    redirect(`/seeds/${projectId}?error=delete-blocked`);
  }

  revalidatePath(`/seeds/${projectId}`);
  redirect(`/seeds/${projectId}`);
}

export async function postUpdate(formData: FormData) {
  const projectId = String(formData.get("project_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  const { supabase, user } = await requireUser();

  if (body.length === 0 || body.length > 280) {
    redirect(`/seeds/${projectId}?error=invalid-update`);
  }

  const { data: project, error } = await supabase
    .from("projects")
    .select("id, user_id")
    .eq("id", projectId)
    .maybeSingle();

  if (error || !project) {
    redirect(`/seeds/${projectId}?error=lookup`);
  }
  if (project.user_id !== user.id) {
    redirect(`/seeds/${projectId}?error=not-owner`);
  }

  const { error: insertError } = await supabase
    .from("seed_posts")
    .insert({ project_id: projectId, body });
  if (insertError) {
    redirect(
      `/seeds/${projectId}?error=post-failed&message=${encodeURIComponent(insertError.message)}`
    );
  }

  revalidatePath(`/seeds/${projectId}`);
  redirect(`/seeds/${projectId}`);
}
