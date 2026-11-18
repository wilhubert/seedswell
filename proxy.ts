import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Nothing to refresh when the visitor carries no session cookies.
  const hasSession = request.cookies
    .getAll()
    .some((cookie) => cookie.name.startsWith("sb-"));
  if (!hasSession) {
    return response;
  }

  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("SUPABASE_URL or SUPABASE_ANON_KEY is not set");
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // Refreshes the session cookie on every request that carries one.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // PKCE confirmation links redirect to the site with a one-time ?code= —
  // the email confirmation itself already succeeded on Supabase's side.
  // Exchange it here so the link lands the user logged in, on any page.
  const code = request.nextUrl.searchParams.get("code");
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    const target = new URL(request.nextUrl.pathname, request.url);
    if (error || !data.session) {
      // Wrong device for the PKCE verifier, or an already-used code: the
      // email is still confirmed, ordinary login completes the account.
      target.pathname = "/auth/login";
      target.search = "?error=confirm-exchange";
    } else {
      target.search = "";
    }
    const redirect = NextResponse.redirect(target);
    // The exchange wrote its session cookies onto the pass-through response;
    // they must travel with the redirect or the login is silently lost.
    for (const { name, value, ...options } of response.cookies.getAll()) {
      redirect.cookies.set(name, value, options);
    }
    return redirect;
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|auth/callback|auth/login|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
