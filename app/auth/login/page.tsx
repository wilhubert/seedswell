import Link from "next/link";
import {
  continueWithGitHub,
  loginWithEmail,
  requestPasswordReset,
  resendConfirmationEmail,
} from "../actions";
import { authErrorMessage } from "../errors";
import { emailSigninOpen } from "@/lib/supabase-server";
import "../auth.css";

export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<string, string> = {
  invalid: "Please provide a valid email and a password.",
  "login-failed": "Login failed. Wrong email or password?",
  "github-start": "GitHub sign-in failed to start. Try again.",
  "resend-failed": "Resending the confirmation email failed.",
  "reset-failed": "Sending the password reset email failed.",
  "confirm-exchange":
    "Your email is confirmed, but opening the session failed — log in below and you are set.",
  "profile-seed":
    "You are logged in, but creating your profile failed. Try logging in again.",
};

// States, not errors: keyed by flag presence in the URL (?confirm-email,
// ?resend-sent), never through the error= channel.
const NOTICES: Record<string, string> = {
  "confirm-email":
    "Your account is created but needs email confirmation first — check your inbox, then log in here.",
  "resend-sent":
    "If that address has an unconfirmed account, a new confirmation email is on its way.",
  "reset-sent":
    "If that address has an account, a password reset link is on its way.",
  "reset-done":
    "Password updated — log in below with the new one.",
  "account-deleted":
    "Your account is deleted, along with your seeds and build log. Thanks for shipping in the open while it lasted.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const search = await searchParams;
  const errorMessage = authErrorMessage(search, ERROR_MESSAGES);
  const notices = Object.keys(NOTICES).filter((key) => key in search);
  // A state, not an error: registration succeeded, confirmation is pending.
  const needsConfirmation = "confirm-email" in search;
  const nextRaw = typeof search.next === "string" ? search.next : "/";
  const next = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/";
  // GitHub is the public front door; while email sign-in sits behind the
  // toggle, the email form and register link are absent.
  const closed = !emailSigninOpen();

  return (
    <main className="auth">
      <h1>Log in</h1>
      {errorMessage && <p className="auth__error">{errorMessage}</p>}
      {closed && (
        <p className="auth__notice">
          Continue with GitHub below — email sign-in is switched off for
          the moment.
        </p>
      )}
      {notices.map((key) => (
        <p className="auth__notice" key={key}>
          {NOTICES[key]}
        </p>
      ))}
      {/* A lost first confirmation email otherwise dead-ends an account
          forever: repeat signups never re-send. */}
      {needsConfirmation && !closed && (
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
      {!closed && (
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
          <div className="auth__actions">
            <button className="btn" type="submit">
              Log in
            </button>
            {/* Same form, same email field: the reset request only needs the
                address, and required-input validation covers both buttons. */}
            <button
              className="btn btn--quiet"
              type="submit"
              formAction={requestPasswordReset}
            >
              Forgot password?
            </button>
          </div>
        </form>
      )}
      <p className="auth__divider">or</p>
      <form action={continueWithGitHub}>
        <input type="hidden" name="next" value={next} />
        <button className="btn btn--github" type="submit">
          Continue with GitHub
        </button>
      </form>
      {!closed && (
        <p className="auth__alt">
          No account yet?{" "}
          <Link href={`/auth/register?next=${encodeURIComponent(next)}`}>
            Register with email
          </Link>{" "}
          — you only need one to watch seeds and launch your own.
        </p>
      )}
    </main>
  );
}
