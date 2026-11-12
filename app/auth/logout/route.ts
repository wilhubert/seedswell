import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    return new Response(`Logout failed: ${error.message}`, { status: 500 });
  }
  return NextResponse.redirect(new URL("/", request.url), 303);
}
