import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("SUPABASE_URL or SUPABASE_ANON_KEY is not set");
  }

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Server Components cannot write cookies; middleware refreshes the session instead.
        }
      },
    },
  });
}

// Every "logged-in only" path in server actions and RSC pages: resolve the
// session, demand a user, bounce to /auth/login otherwise. redirect() works
// by throwing, so never wrap this call in try/catch.
export async function requireUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/auth/login");
  }
  return { supabase, user };
}
