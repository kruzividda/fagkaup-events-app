"use server";

import { createClient } from "@/lib/supabase/server";

export type ScanResult = Record<string, unknown> & { ok: boolean; reason?: string };

/** Innritun við dyr. Hafnar miða sem tilheyrir öðrum viðburði. */
export async function scanCheckin(eventId: string, token: string): Promise<ScanResult> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("process_checkin", {
    p_event_id: eventId,
    p_token: token,
  });
  if (error) return { ok: false, reason: error.message };
  return (data as ScanResult) ?? { ok: false, reason: "no_data" };
}

/** Drykkjaúttekt. Hafnar miða sem tilheyrir öðrum viðburði. */
export async function scanDrink(eventId: string, token: string, quantity = 1): Promise<ScanResult> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("redeem_drink", {
    p_event_id: eventId,
    p_token: token,
    p_quantity: quantity,
  });
  if (error) return { ok: false, reason: error.message };
  return (data as ScanResult) ?? { ok: false, reason: "no_data" };
}
