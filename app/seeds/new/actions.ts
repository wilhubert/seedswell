"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const NAME_MAX = 80;
const TAGLINE_MAX = 200;

export async function plantSeed(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/auth/login");
  }

  const name = String(formData.get("name") ?? "").trim();
  const tagline = String(formData.get("tagline") ?? "").trim();
  const logoUrl = String(formData.get("logo_url") ?? "").trim();
  const targetDays = Number(formData.get("target_days"));

  const nameOk = name.length >= 1 && name.length <= NAME_MAX;
  const taglineOk = tagline.length <= TAGLINE_MAX;
  const hasLogo = logoUrl !== "";
  const logoOk = !hasLogo || /^https?:\/\//.test(logoUrl);
  const daysOk =
    Number.isInteger(targetDays) && targetDays >= 1 && targetDays <= 30;

  if (!nameOk || !taglineOk || !logoOk || !daysOk) {
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
