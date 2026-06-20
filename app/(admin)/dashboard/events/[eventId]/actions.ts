"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

function reasonText(r?: string) {
  if (r === "forbidden") return "Aðeins kerfisstjóri má breyta drykkjum.";
  if (r === "not_found") return "Viðburður fannst ekki.";
  return "Aðgerð mistókst.";
}

export async function applyDrinks(
  eventId: string,
  perPerson: number,
  perSpouse: number
): Promise<{ ok: boolean; error?: string; tickets?: number }> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("apply_event_drinks", {
    p_event_id: eventId,
    p_per_person: Math.max(0, Math.floor(perPerson || 0)),
    p_per_spouse: Math.max(0, Math.floor(perSpouse || 0)),
  });
  if (error) return { ok: false, error: error.message };
  const r = data as { ok: boolean; reason?: string; tickets?: number };
  if (!r?.ok) return { ok: false, error: reasonText(r?.reason) };
  revalidatePath(`/dashboard/events/${eventId}`);
  revalidatePath(`/dashboard/events/${eventId}/stats`);
  return { ok: true, tickets: r.tickets };
}

export async function adjustDrinks(
  eventId: string,
  delta: number
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("adjust_event_drinks", {
    p_event_id: eventId,
    p_delta: Math.trunc(delta),
  });
  if (error) return { ok: false, error: error.message };
  const r = data as { ok: boolean; reason?: string };
  if (!r?.ok) return { ok: false, error: reasonText(r?.reason) };
  revalidatePath(`/dashboard/events/${eventId}`);
  revalidatePath(`/dashboard/events/${eventId}/stats`);
  return { ok: true };
}

export async function setEventCancelled(
  eventId: string,
  cancelled: boolean
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await supabase.from("events").update({ cancelled }).eq("id", eventId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/events/${eventId}`);
  revalidatePath("/dashboard/events");
  return { ok: true };
}
