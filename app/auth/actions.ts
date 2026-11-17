"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const USERNAME_RE = /^[a-z0-9-]{3,30}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Same-origin relative paths only; anything else falls back to home.
function safeNext(raw: string): string {
  return raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";
}

async function requestOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  if (!host) {
    throw new Error("Could not resolve the request host for OAuth redirect");
  }
  return `${proto}://${host}`;
}

export async function continueWithGitHub(formData: FormData) {
  const next = safeNext(String(formData.get("next") ?? "/"));
  const supabase = await createSupabaseServerClient();

  const origin = await requestOrigin();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "github",
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  });

  if (error || !data.url) {
    redirect("/auth/login?error=github-start");
  }

  // GitHub's own callback lands on /auth/callback and then home; the
  // next-path only rides along for email sessions below.
  redirect(data.url);
}

export async function loginWithEmail(formData: FormData) {
  const next = safeNext(String(formData.get("next") ?? "/"));
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!EMAIL_RE.test(email) || password === "") {
    redirect(`/auth/login?error=invalid&next=${encodeURIComponent(next)}`);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.session || !data.user) {
    redirect(
      `/auth/login?error=login-failed&message=${encodeURIComponent(
        error?.message ?? "unknown"
      )}&next=${encodeURIComponent(next)}`
    );
  }

  // With "Confirm email" on, registration ends before the profile row can
  // be inserted — no session exists yet. First login completes it, the
  // same way the GitHub callback upserts on every sign-in.
  const username = (data.user.user_metadata?.user_name as string | undefined) ?? null;
  if (username) {
    const { error: seedError } = await supabase.from("profiles").upsert(
      { id: data.user.id, username, avatar_url: null, bio: null },
      { onConflict: "id", ignoreDuplicates: true }
    );
    if (seedError) {
      redirect(
        `/auth/login?error=profile-seed&message=${encodeURIComponent(
          seedError.message
        )}`
      );
    }
  }

  revalidatePath("/", "layout");
  redirect(next);
}

export async function registerWithEmail(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const username = String(formData.get("username") ?? "").trim();

  if (!EMAIL_RE.test(email) || password.length < 6 || !USERNAME_RE.test(username)) {
    redirect("/auth/register?error=invalid");
  }

  const supabase = await createSupabaseServerClient();

  // Check the username before creating the account: a profile row without
  // a unique username cannot render anywhere on the site.
  const { data: taken } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();
  if (taken) {
    redirect("/auth/register?error=username-taken");
  }

  // user_name lands in user_metadata so the header resolves the profile
  // link the same way it does for GitHub users.
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { user_name: username },
    },
  });

  if (error) {
    redirect(
      `/auth/register?error=signup&message=${encodeURIComponent(error.message)}`
    );
  }
  if (!data.session || !data.user) {
    // Email confirmation is on in Supabase: no session until the inbox
    // link is clicked. The dashboard setting decides this.
    redirect("/auth/login?error=confirm-email");
  }

  const { error: seedError } = await supabase.from("profiles").insert({
    id: data.user.id,
    username,
    avatar_url: null,
    bio: null,
  });

  if (seedError) {
    // Only reachable in a race on the unique username; the account exists
    // but has no profile. Undo the session and let them try another name.
    await supabase.auth.signOut();
    redirect(`/auth/register?error=username-taken`);
  }

  revalidatePath("/", "layout");
  redirect("/");
}
