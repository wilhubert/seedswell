import { redirect } from "next/navigation";
import { updatePassword } from "../actions";
import { authErrorMessage } from "../errors";
import { emailSigninOpen, requireUser } from "@/lib/supabase-server";
import "../auth.css";

export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<string, string> = {
  invalid: "The new password needs at least 6 characters.",
  "reset-failed": "Updating the password failed.",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const search = await searchParams;
  // Password reset is email-auth territory; same toggle wall as the other
  // email flows.
  if (!emailSigninOpen()) {
    redirect("/auth/login?closed");
  }

  // The reset link lands here logged in: the middleware (proxy.ts) exchanged
  // the ?code= the email carried. A stale or already-used link carries no
  // session and requireUser bounces it to the login page.
  const { user } = await requireUser();
  const errorMessage = authErrorMessage(search, ERROR_MESSAGES);

  return (
    <main className="auth">
      <h1>Set a new password</h1>
      {errorMessage && <p className="auth__error">{errorMessage}</p>}
      <p className="auth__notice">
        Setting a new password for {user.email}. You will be logged out
        afterwards — the next log in uses the new password.
      </p>
      <form action={updatePassword} className="auth__form">
        <label>
          New password
          <input name="password" type="password" minLength={6} required />
        </label>
        <button className="btn" type="submit">
          Update password
        </button>
      </form>
    </main>
  );
}
