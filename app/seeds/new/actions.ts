"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function plantSeed(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/auth/login");
  }

  const name = String(formData.get("name") ?? "")
    .trim()
    .slice(0, 80);
  const tagline = String(formData.get("tagline") ?? "")
    .trim()
    .slice(0, 200);
  const logoUrl = String(formData.get("logo_url") ?? "")
    .trim()
    .slice(0, 500);
  const targetDaysRaw = Number(formData.get("target_days"));
  const targetDays = Number.isInteger(targetDaysRaw)
    ? Math.min(Math.max(targetDaysRaw, 1), 366)
    : null;

  const nameOk = name.length > 0;
  const logoOk = logoUrl === "" || /^https?:\/\//.test(logoUrl);
  if (!nameOk || !targetDays || !logoOk) {
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
    redirect(`/seeds/new?error=insert&message=${encodeURIComponent(error?.message ?? "unknown")}`);
  }

  redirect(`/seeds/${data.id}`);
}
