// Shared error-line extraction for the auth pages: an `error` code from the
// search params picks the sentence from the page's table; an optional
// `message` from Supabase is appended as detail, never shown alone.
export function authErrorMessage(
  search: Record<string, string | string[] | undefined>,
  messages: Record<string, string>
): string | null {
  const code = typeof search.error === "string" ? search.error : null;
  if (!code) {
    return null;
  }
  const base = messages[code] ?? "Something went wrong.";
  const detail = typeof search.message === "string" ? search.message : null;
  return detail ? `${base} (${detail})` : base;
}
