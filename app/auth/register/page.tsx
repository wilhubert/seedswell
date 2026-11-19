import Link from "next/link";
import { continueWithGitHub, registerWithEmail } from "../actions";
import { authErrorMessage } from "../errors";
import { emailSigninOpen } from "@/lib/supabase-server";
import "../auth.css";

export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<string, string> = {
  invalid:
    "That did not take — a username of 3–30 lowercase letters, numbers or hyphens, a valid email, and a password of at least 6 characters.",
  "username-taken": "This username is already taken.",
  signup: "Registration failed.",
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const search = await searchParams;
  const errorMessage = authErrorMessage(search, ERROR_MESSAGES);
  // GitHub is the public front door; while email registration sits behind
  // the toggle, the email form is absent.
  const closed = !emailSigninOpen();

  return (
    <main className="auth">
      <h1>Register</h1>
      {errorMessage && <p className="auth__error">{errorMessage}</p>}
      {closed && (
        <p className="auth__notice">
          Continue with GitHub below — email registration is switched off
          for the moment.
        </p>
      )}
      {!closed && (
        <form action={registerWithEmail} className="auth__form">
        <label>
          Username
          <input
            name="username"
            required
            pattern="[a-z0-9-]{3,30}"
            placeholder="lowercase, numbers, hyphens"
          />
        </label>
        <label>
          Email
          <input name="email" type="email" required />
        </label>
        <label>
          Password
          <input name="password" type="password" minLength={6} required />
        </label>
        <button className="btn" type="submit">
          Register
        </button>
      </form>
      )}
      {!closed && <p className="auth__divider">or</p>}
      <form action={continueWithGitHub}>
        <button className="btn btn--github" type="submit">
          Continue with GitHub
        </button>
      </form>
      {!closed && (
        <p className="auth__alt">
          Already registered?{" "}
          <Link href="/auth/login">Log in</Link>. Email registration is all a
          watcher needs — GitHub is only needed to connect a repo.
        </p>
      )}
    </main>
  );
}
