import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return new Response("Missing auth code in callback", { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return new Response(`Login failed: ${error.message}`, { status: 401 });
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return new Response(
      `Logged in but session could not be verified: ${userError?.message}`,
      { status: 401 }
    );
  }

  const githubUsername = user.user_metadata?.user_name as string | undefined;
  if (!githubUsername) {
    return new Response("GitHub did not provide a username", { status: 401 });
  }

  // Seed the profile on first sign-in; later logins leave the row untouched.
  const { error: seedError } = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        username: githubUsername,
        avatar_url: (user.user_metadata?.avatar_url as string | undefined) ?? null,
      },
      { onConflict: "id", ignoreDuplicates: true }
    );

  if (seedError) {
    return new Response(`Profile seeding failed: ${seedError.message}`, {
      status: 500,
    });
  }

  return NextResponse.redirect(origin);
}
