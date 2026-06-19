"use server";

import { createClient } from "@/lib/supabase/server";

export type ScanResult = Record<string, unknown> & { ok: boolean; reason?: string };

/** Innritun við dyr. Kallar process_checkin með lotu dyravarðar. */
export async function scanCheckin(token: string): Promise<ScanResult> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("process_checkin", { p_token: token });
  if (error) return { ok: false, reason: error.message };
  return (data as ScanResult) ?? { ok: false, reason: "no_data" };
}

/** Drykkjaúttekt. Kallar redeem_drink með lotu barþjóns. */
export async function scanDrink(token: string, quantity = 1): Promise<ScanResult> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("redeem_drink", {
    p_token: token,
    p_quantity: quantity,
  });
  if (error) return { ok: false, reason: error.message };
  return (data as ScanResult) ?? { ok: false, reason: "no_data" };
}
