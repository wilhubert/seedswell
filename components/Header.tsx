import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export default async function Header() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="site-header">
      <Link href="/" className="brand">
        <span className="brand__mark" aria-hidden="true" />
        Seedswell
      </Link>
      {user ? (
        <div className="header-actions">
          <span className="header-user">
            <Link href={`/u/${(user.user_metadata?.user_name as string | undefined) ?? user.id}`}>
              @{(user.user_metadata?.user_name as string | undefined) ?? user.id}
            </Link>
          </span>
          <form action="/auth/logout" method="post">
            <button className="btn" type="submit">
              log out
            </button>
          </form>
        </div>
      ) : (
        <a className="btn" href="/auth/login">
          login
        </a>
      )}
    </header>
  );
}
