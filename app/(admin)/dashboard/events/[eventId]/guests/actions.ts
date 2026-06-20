"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function cancelRegistrationAdmin(
  registrationId: string,
  eventId: string
): Promise<{ ok: boolean; reason?: string }> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("admin_cancel_registration", { p_registration_id: registrationId });
  if (error) return { ok: false, reason: error.message };
  const res = (data as { ok: boolean; reason?: string }) ?? { ok: false };
  if (res.ok) {
    revalidatePath(`/dashboard/events/${eventId}/guests`);
    revalidatePath(`/dashboard/events/${eventId}`);
    revalidatePath(`/dashboard/events/${eventId}/stats`);
  }
  return res;
}

export async function reactivateRegistrationAdmin(
  registrationId: string,
  eventId: string
): Promise<{ ok: boolean; reason?: string }> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("admin_reactivate_registration", { p_registration_id: registrationId });
  if (error) return { ok: false, reason: error.message };
  const res = (data as { ok: boolean; reason?: string }) ?? { ok: false };
  if (res.ok) {
    revalidatePath(`/dashboard/events/${eventId}/guests`);
    revalidatePath(`/dashboard/events/${eventId}`);
    revalidatePath(`/dashboard/events/${eventId}/stats`);
  }
  return res;
}
