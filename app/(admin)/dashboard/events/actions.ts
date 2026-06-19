"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function setEventStatus(
  eventId: string,
  status: "draft" | "published" | "closed"
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await supabase.from("events").update({ status }).eq("id", eventId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/events");
  return { ok: true };
}
