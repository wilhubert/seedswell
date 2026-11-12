import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "github",
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  });

  if (error || !data.url) {
    return new Response(
      `GitHub sign-in failed to start: ${
        error?.message ?? "no authorize URL returned"
      }`,
      { status: 500 }
    );
  }

  return NextResponse.redirect(data.url);
}
