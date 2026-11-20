"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { requireLauncher } from "@/lib/supabase-server";
import { seedIdentityOk } from "@/lib/seed-fields";

export async function launchSeed(formData: FormData) {
  // The page already walls off visitors who can't launch; this is the
  // enforcement point.
  const { supabase, user } = await requireLauncher();

  const name = String(formData.get("name") ?? "").trim();
  const tagline = String(formData.get("tagline") ?? "").trim();
  const logoUrl = String(formData.get("logo_url") ?? "").trim();
  const targetDays = Number(formData.get("target_days"));

  const identityOk = seedIdentityOk(name, tagline, logoUrl);
  const daysOk =
    Number.isInteger(targetDays) && targetDays >= 1 && targetDays <= 30;

  if (!identityOk || !daysOk) {
    redirect("/seeds/new?error=invalid");
  }

  const webhookSecret = randomBytes(32).toString("hex");

  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: user.id,
      name,
      tagline: tagline || null,
      logo_url: logoUrl || null,
      target_days: targetDays,
      webhook_secret: webhookSecret,
    })
    .select("id")
    .single();

  if (error || !data) {
    redirect(
      `/seeds/new?error=insert&message=${encodeURIComponent(error?.message ?? "unknown")}`
    );
  }

  redirect(`/seeds/${data.id}`);
}
