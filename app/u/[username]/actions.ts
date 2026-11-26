"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase-server";
import { getSupabaseServiceClient } from "@/lib/supabase-service";

// Bio lives where the Figma bio goes; 280 keeps the card honest without a
// database constraint (column is text, the limit is conversational).
const BIO_MAX = 280;

// X handles: letters, digits, underscores, 15 chars max. A leading @ is
// accepted and stripped so "typed as seen" still works.
const X_HANDLE_RE = /^[A-Za-z0-9_]{1,15}$/;

export async function editProfile(formData: FormData) {
  const { supabase, user } = await requireUser();

  // The redirect target and the update target come from the signed-in
  // user's own row, never from the form — a spoofed username in the POST
  // changes nothing.
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError || !profile) {
    // A signed-in user without a profile row should not exist — sign-up
    // seeds one. If it somehow does, home with a generic failure.
    redirect("/?error=profile-missing");
  }

  const bio = String(formData.get("bio") ?? "").trim();
  const xHandle = String(formData.get("x_handle") ?? "")
    .trim()
    .replace(/^@+/, "");

  const bioOk = bio.length <= BIO_MAX;
  const xOk = xHandle === "" || X_HANDLE_RE.test(xHandle);

  if (!bioOk || !xOk) {
    redirect(`/u/${profile.username}?error=profile-invalid`);
  }

  const { error } = await supabase
    .from("profiles")
    .update({ bio: bio || null, x_handle: xHandle || null })
    .eq("id", user.id);

  if (error) {
    redirect(
      `/u/${profile.username}?error=profile-edit&message=${encodeURIComponent(
        error.message
      )}`
    );
  }

  revalidatePath(`/u/${profile.username}`);
  redirect(`/u/${profile.username}?saved`);
}

// Account deletion is destructive and irreversible: the FK chain from
// auth.users cascades, so the profile, seeds, commits, watchers and posts
// all go with it. The user must retype their username to confirm.
export async function deleteAccount(formData: FormData) {
  const { supabase, user } = await requireUser();

  // Same rule as editProfile: the confirmation target comes from the
  // signed-in user's own row, never from the form or the URL.
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError || !profile) {
    redirect("/?error=profile-missing");
  }

  // Case-insensitive and forgiving of a leading @, so "typed as seen"
  // works — but the typed text must match the real username.
  const confirmName = String(formData.get("confirm") ?? "")
    .trim()
    .replace(/^@+/, "");
  if (confirmName.toLowerCase() !== profile.username.toLowerCase()) {
    redirect(`/u/${profile.username}?error=delete-confirm`);
  }

  // Sign out before deleting: if deletion then fails, the user is logged
  // out but the account is intact — log back in and retry. The other
  // order can strand a live session on a deleted user.
  const { error: signOutError } = await supabase.auth.signOut();
  if (signOutError) {
    redirect(
      `/u/${profile.username}?error=account-delete&message=${encodeURIComponent(
        signOutError.message
      )}`
    );
  }

  // Deleting the auth user needs the service role — there is no client-side
  // API for a user to delete themselves. RLS never applies here; the id
  // comes from the verified session, not from the form.
  const service = getSupabaseServiceClient();
  const { error } = await service.auth.admin.deleteUser(user.id);
  if (error) {
    redirect(
      `/u/${profile.username}?error=account-delete&message=${encodeURIComponent(
        error.message
      )}`
    );
  }

  redirect("/auth/login?account-deleted");
}
