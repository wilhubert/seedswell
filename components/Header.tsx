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
        <svg
          width="21"
          height="21"
          viewBox="0 0 21 21"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0.324219 3C0.324219 3 6.46668 1.99146 10.4329 2C14.3146 2.00836 20.3242 3 20.3242 3"
            stroke-width="4"
            stroke="#8FC8EE"
          />
          <path
            d="M0.324219 11C0.324219 11 6.46668 9.99146 10.4329 10C14.3146 10.0084 20.3242 11 20.3242 11"
            stroke-width="4"
            stroke="#5A7D94"
          />
          <path
            d="M0.324219 19C0.324219 19 6.46668 17.9915 10.4329 18.0001C14.3146 18.0084 20.3242 19 20.3242 19"
            stroke-width="4"
            stroke="#2C3E4A"
          />
        </svg>
        seedswell
      </Link>
      {user ? (
        <div className="header-actions">
          <span className="header-user">
            <Link
              href={`/u/${(user.user_metadata?.user_name as string | undefined) ?? user.id}`}
            >
              @
              {(user.user_metadata?.user_name as string | undefined) ?? user.id}
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
