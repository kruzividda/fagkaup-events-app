"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type AccessRow = {
  id: string;
  role: string;
  label: string;
  token: string;
  access_starts_at: string | null;
  access_ends_at: string | null;
  active: boolean;
  created_at: string;
};

export async function listAccess(eventId: string): Promise<AccessRow[]> {
  const supabase = createClient();
  const { data } = await supabase.rpc("list_event_access", { p_event_id: eventId });
  const res = data as { ok: boolean; access?: AccessRow[] } | null;
  return res?.ok ? res.access ?? [] : [];
}

export async function createAccess(
  eventId: string,
  role: string,
  label: string,
  pin: string,
  starts: string,
  ends: string
): Promise<{ ok: boolean; token?: string; pin?: string; reason?: string }> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("create_event_access", {
    p_event_id: eventId,
    p_role: role,
    p_label: label,
    p_pin: pin,
    p_starts: starts ? new Date(starts).toISOString() : null,
    p_ends: ends ? new Date(ends).toISOString() : null,
  });
  if (error) return { ok: false, reason: error.message };
  const res = (data as { ok: boolean; token?: string; reason?: string }) ?? { ok: false };
  if (res.ok) revalidatePath(`/dashboard/events/${eventId}`);
  return { ...res, pin };
}

export async function toggleAccess(id: string, active: boolean, eventId: string): Promise<{ ok: boolean }> {
  const supabase = createClient();
  const { data } = await supabase.rpc("set_event_access_active", { p_id: id, p_active: active });
  const res = (data as { ok: boolean }) ?? { ok: false };
  if (res.ok) revalidatePath(`/dashboard/events/${eventId}`);
  return res;
}

export async function removeAccess(id: string, eventId: string): Promise<{ ok: boolean }> {
  const supabase = createClient();
  const { data } = await supabase.rpc("delete_event_access", { p_id: id });
  const res = (data as { ok: boolean }) ?? { ok: false };
  if (res.ok) revalidatePath(`/dashboard/events/${eventId}`);
  return res;
}
