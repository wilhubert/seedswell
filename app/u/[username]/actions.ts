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

// Avatar photos: email-registered users have no GitHub-synced avatar, so
// they can attach one to the same save. PNG/JPEG/WebP only, 2 MB max —
// next.config.ts raises the server-action body limit to match.
const PHOTO_MAX_BYTES = 2 * 1024 * 1024;
const PHOTO_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

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

  // The photo upload runs with the user's own session client, so the
  // storage RLS policies in 0010 are the boundary: every path starts
  // with the verified user's id, never a value from the form. Absent
  // or empty files leave the stored avatar untouched.
  const photo = formData.get("photo");
  const photoOriginal = formData.get("photo_original");
  let avatarUrl: string | undefined;
  if (photo instanceof File && photo.size > 0) {
    // Both files are validated before anything uploads — a rejected
    // archive copy must not leave a half-applied save behind.
    const displayExt = PHOTO_TYPES[photo.type];
    if (!displayExt) {
      redirect(`/u/${profile.username}?error=avatar-type`);
    }
    if (photo.size > PHOTO_MAX_BYTES) {
      redirect(`/u/${profile.username}?error=avatar-size`);
    }

    // The untouched original arrives only when the picker actually
    // downscaled; it is archived next to the display copy and nothing
    // ever references it, so it spends storage but never egress. A
    // future bigger-avatar design can re-derive from it.
    const original =
      photoOriginal instanceof File && photoOriginal.size > 0
        ? photoOriginal
        : null;
    const originalExt = original ? PHOTO_TYPES[original.type] : null;
    if (original && (!originalExt || original.size > PHOTO_MAX_BYTES)) {
      redirect(`/u/${profile.username}?error=avatar-type`);
    }

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(`${user.id}/avatar.${displayExt}`, photo, {
        upsert: true,
        contentType: photo.type,
      });
    if (uploadError) {
      redirect(
        `/u/${profile.username}?error=avatar-upload&message=${encodeURIComponent(
          uploadError.message
        )}`
      );
    }

    if (original && originalExt) {
      const { error: archiveError } = await supabase.storage
        .from("avatars")
        .upload(`${user.id}/original.${originalExt}`, original, {
          upsert: true,
          contentType: original.type,
        });
      if (archiveError) {
        redirect(
          `/u/${profile.username}?error=avatar-upload&message=${encodeURIComponent(
            archiveError.message
          )}`
        );
      }
    }

    const { data: publicUrl } = supabase.storage
      .from("avatars")
      .getPublicUrl(`${user.id}/avatar.${displayExt}`);
    // The object path is stable, so a replaced photo keeps its URL — the
    // version param busts the browser cache so the new photo shows at once.
    avatarUrl = `${publicUrl.publicUrl}?v=${Date.now()}`;
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      bio: bio || null,
      x_handle: xHandle || null,
      ...(avatarUrl !== undefined ? { avatar_url: avatarUrl } : {}),
    })
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

  // Storage objects have no FK to auth.users — the auth deletion cascades
  // the database rows but would strand the avatar files in the bucket
  // forever. They are removed here, while the session is still live so
  // the owner-scoped RLS delete policy from 0010 applies, and BEFORE the
  // auth deletion: this order makes the recoverable failure the possible
  // one (account alive without its photo — retry and re-upload), never
  // the unrecoverable one (auth user gone, files orphaned, nobody left
  // to retry).
  const { data: objects, error: listError } = await supabase.storage
    .from("avatars")
    .list(user.id);
  if (listError) {
    redirect(
      `/u/${profile.username}?error=account-delete&message=${encodeURIComponent(
        listError.message
      )}`
    );
  }
  if (objects && objects.length > 0) {
    const { error: removeError } = await supabase.storage
      .from("avatars")
      .remove(objects.map((object) => `${user.id}/${object.name}`));
    if (removeError) {
      redirect(
        `/u/${profile.username}?error=account-delete&message=${encodeURIComponent(
          removeError.message
        )}`
      );
    }
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
