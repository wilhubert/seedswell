"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const DAY_MS = 86_400_000;

async function requireOwnOpenSeed(projectId: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/auth/login");
  }

  const { data: project, error } = await supabase
    .from("projects")
    .select("id, user_id, planted_at, shipped_at, cancelled_at")
    .eq("id", projectId)
    .maybeSingle();

  if (error || !project) {
    redirect(`/seeds/${projectId}?error=lookup`);
  }
  if (project.user_id !== user.id) {
    redirect(`/seeds/${projectId}?error=not-owner`);
  }
  if (project.shipped_at || project.cancelled_at) {
    redirect(`/seeds/${projectId}?error=already-concluded`);
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

export async function cancelSeed(formData: FormData) {
  const projectId = String(formData.get("project_id") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  const { supabase } = await requireOwnOpenSeed(projectId);

  if (note.length < 1 || note.length > 500) {
    redirect(`/seeds/${projectId}?error=note-invalid`);
  }

  const { error } = await supabase
    .from("projects")
    .update({
      cancelled_at: new Date().toISOString(),
      cancel_note: note,
    })
    .eq("id", projectId);
  if (error) {
    redirect(
      `/seeds/${projectId}?error=cancel-failed&message=${encodeURIComponent(error.message)}`
    );
  }

  revalidatePath(`/seeds/${projectId}`);
  redirect(`/seeds/${projectId}`);
}
