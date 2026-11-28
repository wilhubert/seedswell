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

// White GitHub mark for the dark auth button; the profile page's copy is
// dark-filled, so this one lives here with currentColor.
function GitHubMark() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M7.83821 0C3.5076 0 0 3.5076 0 7.83821C0 11.3066 2.24369 14.2361 5.35937 15.2747C5.75129 15.3433 5.89825 15.1081 5.89825 14.9024C5.89825 14.7162 5.88845 14.099 5.88845 13.4425C3.9191 13.805 3.40962 12.9624 3.25286 12.5215C3.16468 12.2962 2.78256 11.6005 2.44944 11.4144C2.1751 11.2674 1.78319 10.9049 2.43964 10.8951C3.0569 10.8853 3.4978 11.4634 3.64477 11.6985C4.35021 12.8841 5.47695 12.5509 5.92765 12.3452C5.99623 11.8357 6.20198 11.4928 6.42733 11.2968C4.68333 11.1009 2.86095 10.4248 2.86095 7.4267C2.86095 6.5743 3.16468 5.86886 3.66436 5.32018C3.58598 5.12423 3.31164 4.32081 3.74274 3.24306C3.74274 3.24306 4.39919 3.03731 5.89825 4.04648C6.52531 3.87012 7.19156 3.78194 7.8578 3.78194C8.52405 3.78194 9.1903 3.87012 9.81736 4.04648C11.3164 3.02751 11.9729 3.24306 11.9729 3.24306C12.404 4.32081 12.1296 5.12423 12.0512 5.32018C12.5509 5.86886 12.8547 6.5645 12.8547 7.4267C12.8547 10.4346 11.0225 11.1009 9.27848 11.2968C9.56261 11.5418 9.80756 12.0121 9.80756 12.7469C9.80756 13.7952 9.79776 14.6379 9.79776 14.9024C9.79776 15.1081 9.94473 15.3531 10.3366 15.2747C13.4327 14.2361 15.6764 11.2968 15.6764 7.83821C15.6764 3.5076 12.1688 0 7.83821 0Z"
        fillRule="evenodd"
        clipRule="evenodd"
        fill="currentColor"
      />
    </svg>
  );
}

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
  "reset-done": "Password updated — log in below with the new one.",
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
  const next =
    nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/";
  // GitHub is the public front door; while email sign-in sits behind the
  // toggle, the email form and register link are absent.
  const closed = !emailSigninOpen();

  return (
    <main className="auth">
      <h1>Log in</h1>
      {errorMessage && <p className="auth__error">{errorMessage}</p>}
      {closed && (
        <p className="auth__notice">
          Continue with GitHub below — email sign-in is switched off for the
          moment.
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
            <input
              name="email"
              type="email"
              placeholder="you@example.com"
              required
            />
          </label>
          <button className="btn" type="submit">
            Resend confirmation email
          </button>
        </form>
      )}
      {!closed && (
        <form action={loginWithEmail} className="auth__form">
          <input type="hidden" name="next" value={next} />
          <div className="auth__field">
            <label htmlFor="login-email">Email</label>
            <input id="login-email" name="email" type="email" required />
          </div>
          <div className="auth__field">
            <div className="auth__label-row">
              <label htmlFor="login-password">Password</label>
              {/* Same form, same email field: the reset request only needs
                  the address, and required-input validation covers both
                  submit buttons. */}
              <button
                className="auth__forgot"
                type="submit"
                formAction={requestPasswordReset}
              >
                Forgot?
              </button>
            </div>
            <input id="login-password" name="password" type="password" required />
          </div>
          <button className="btn auth__submit" type="submit">
            Login
          </button>
        </form>
      )}
      {!closed && (
        <p className="auth__signup">
          No account yet?{" "}
          <Link href={`/auth/register?next=${encodeURIComponent(next)}`}>
            Sign up here
          </Link>
        </p>
      )}
      <p className="auth__divider">or</p>
      <form action={continueWithGitHub}>
        <input type="hidden" name="next" value={next} />
        <button className="btn btn--github auth__submit" type="submit">
          <GitHubMark />
          Continue with GitHub
        </button>
      </form>
    </main>
  );
}
