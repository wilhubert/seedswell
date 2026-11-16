import Link from "next/link";
import { continueWithGitHub, loginWithEmail } from "../actions";
import { authErrorMessage } from "../errors";
import "../auth.css";

export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<string, string> = {
  invalid: "Please provide a valid email and a password.",
  "login-failed": "Login failed. Wrong email or password?",
  "github-start": "GitHub sign-in failed to start. Try again.",
  "confirm-email":
    "Your account is created but needs email confirmation first — check your inbox, then log in here.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const search = await searchParams;
  const errorMessage = authErrorMessage(search, ERROR_MESSAGES);
  const nextRaw = typeof search.next === "string" ? search.next : "/";
  const next = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/";

  return (
    <main className="auth">
      <h1>Log in</h1>
      {errorMessage && <p className="auth__error">{errorMessage}</p>}
      <form action={loginWithEmail} className="auth__form">
        <input type="hidden" name="next" value={next} />
        <label>
          Email
          <input name="email" type="email" required />
        </label>
        <label>
          Password
          <input name="password" type="password" required />
        </label>
        <button className="btn" type="submit">
          Log in
        </button>
      </form>
      <p className="auth__divider">or</p>
      <form action={continueWithGitHub}>
        <input type="hidden" name="next" value={next} />
        <button className="btn btn--github" type="submit">
          Continue with GitHub
        </button>
      </form>
      <p className="auth__alt">
        No account yet?{" "}
        <Link href={`/auth/register?next=${encodeURIComponent(next)}`}>
          Register with email
        </Link>{" "}
        — you only need one to watch seeds and plant your own.
      </p>
    </main>
  );
}
