"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { googleWalletConfigured, patchWalletDrinks } from "@/lib/google-wallet";

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

/**
 * Uppfærir drykkjateljarann á Google Wallet miða gestsins eftir úttekt.
 * Best-effort: reiknar eftirstöðvar úr gagnagrunni og uppfærir miðann ef
 * hann hefur verið vistaður í Google Wallet. Köllum þetta eftir hverja
 * vel heppnaða drykkjaúttekt (bæði innskráð leið og PIN-session leið).
 */
export async function syncWalletDrinks(token: string): Promise<void> {
  if (!token || !googleWalletConfigured()) return;
  try {
    const admin = createAdminClient();
    const { data: ticket } = await admin.from("tickets").select("id, event_id").eq("token", token).maybeSingle();
    if (!ticket) return;
    const { data: ev } = await admin
      .from("events")
      .select("drinks_enabled, drinks_alcoholic")
      .eq("id", ticket.event_id)
      .maybeSingle();
    if (!ev?.drinks_enabled) return;
    const { data: balances } = await admin
      .from("drink_account_balances")
      .select("allowance, remaining")
      .eq("ticket_id", ticket.id);
    const total = (balances ?? []).reduce((s, b) => s + (Number(b.allowance) || 0), 0);
    const remaining = (balances ?? []).reduce((s, b) => s + (Number(b.remaining) || 0), 0);
    if (total <= 0) return;
    await patchWalletDrinks(token, remaining, total, ev.drinks_alcoholic !== false);
  } catch {
    /* best-effort — aldrei brjóta skönnun vegna wallet-uppfærslu */
  }
}
