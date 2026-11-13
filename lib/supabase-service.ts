import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

// Server-only: the service role key bypasses RLS and must never be given a
// NEXT_PUBLIC_ prefix, appear in client code, or land in logs.
export function getSupabaseServiceClient(): SupabaseClient {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set");
  }

  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}
