import Link from "next/link";
import {
  continueWithGitHub,
  loginWithEmail,
  resendConfirmationEmail,
} from "../actions";
import { authErrorMessage } from "../errors";
import "../auth.css";

export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<string, string> = {
  invalid: "Please provide a valid email and a password.",
  "login-failed": "Login failed. Wrong email or password?",
  "github-start": "GitHub sign-in failed to start. Try again.",
  "resend-sent":
    "If that address has an unconfirmed account, a new confirmation email is on its way.",
  "resend-failed": "Resending the confirmation email failed.",
  "profile-seed":
    "You are logged in, but creating your profile failed. Try logging in again.",
};

const CONFIRM_EMAIL_NOTICE =
  "Your account is created but needs email confirmation first — check your inbox, then log in here.";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const search = await searchParams;
  const errorMessage = authErrorMessage(search, ERROR_MESSAGES);
  // A state, not an error: registration succeeded, confirmation is pending.
  const needsConfirmation = "confirm-email" in search;
  const nextRaw = typeof search.next === "string" ? search.next : "/";
  const next = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/";

  return (
    <main className="auth">
      <h1>Log in</h1>
      {errorMessage && <p className="auth__error">{errorMessage}</p>}
      {needsConfirmation && (
        <p className="auth__notice">{CONFIRM_EMAIL_NOTICE}</p>
      )}
      {/* A lost first confirmation email otherwise dead-ends an account
          forever: repeat signups never re-send. */}
      {needsConfirmation && (
        <form action={resendConfirmationEmail} className="auth__form">
          <label>
            Lost the confirmation email?
            <input name="email" type="email" placeholder="you@example.com" required />
          </label>
          <button className="btn" type="submit">
            Resend confirmation email
          </button>
        </form>
      )}
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
