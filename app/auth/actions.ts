"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient, emailSigninOpen } from "@/lib/supabase-server";

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
  // Email sign-in is behind the toggle; the login page stops showing
  // the form, this is the enforcement point for direct POSTs.
  if (!emailSigninOpen()) {
    redirect("/auth/login?closed");
  }

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

export async function resendConfirmationEmail(formData: FormData) {
  if (!emailSigninOpen()) {
    redirect("/auth/login?closed");
  }

  const email = String(formData.get("email") ?? "").trim();
  if (!EMAIL_RE.test(email)) {
    redirect("/auth/login?error=invalid");
  }

  const supabase = await createSupabaseServerClient();
  // Supabase answers identically whether the address has a pending signup or
  // not, so the copy below stays conditional on purpose — no enumeration.
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    // Same route as signUp: the resent confirmation link must land the
    // code on the callback route that exchanges it for a session.
    options: { emailRedirectTo: `${await requestOrigin()}/auth/callback` },
  });
  if (error) {
    redirect(
      `/auth/login?error=resend-failed&message=${encodeURIComponent(
        error.message
      )}`
    );
  }

  redirect("/auth/login?resend-sent");
}

export async function registerWithEmail(formData: FormData) {
  // Email registration is behind the toggle; same wall the register page
  // shows, enforced against direct POSTs.
  if (!emailSigninOpen()) {
    redirect("/auth/register?closed");
  }

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

  // user_name is what the app reads (header, profile seeding), matching the
  // GitHub metadata layout; full_name and name are the keys the Supabase
  // dashboard and third-party tools display, which is why all three carry
  // the same value.
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { user_name: username, full_name: username, name: username },
      // Without this, Supabase sends the confirmation link to the Site URL
      // and the code lands on "/" — where nothing exchanges it for a
      // session. It must land on the same route GitHub OAuth uses.
      // The URL also has to be in Supabase's Redirect URLs allowlist.
      emailRedirectTo: `${await requestOrigin()}/auth/callback`,
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
    redirect("/auth/login?confirm-email");
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
