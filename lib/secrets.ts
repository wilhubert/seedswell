import { createSupabaseServerClient } from "./supabase-server";

// Owners read their own webhook secret through the SECURITY DEFINER function;
// the projects table never exposes the column to any API role.
export async function getOwnWebhookSecret(projectId: string): Promise<string> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_own_webhook_secret", {
    p_project_id: projectId,
  });
  if (error) {
    throw new Error(`Webhook secret lookup failed: ${error.message}`);
  }
  const secret = data as string | null;
  if (!secret) {
    throw new Error(`No webhook secret found for project ${projectId}`);
  }
  return secret;
}
