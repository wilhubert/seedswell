"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase-server";

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
