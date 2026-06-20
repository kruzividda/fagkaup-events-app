"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { qrDataUrl } from "@/lib/qr";
import { sendConfirmationEmail, type TicketInfo } from "@/lib/email";

export type MyBooking = {
  fullName: string | null;
  email: string | null;
  phone: string | null;
  dietary: string | null;
  hasSpouse: boolean;
  spouseName: string | null;
  primaryCheckedIn: boolean;
  spouseCheckedIn: boolean;
  cancelled: boolean;
};

type FindResult = {
  found: boolean;
  cancelled?: boolean;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  dietary?: string | null;
  has_plus_one?: boolean;
  spouse_name?: string | null;
  primary_token?: string | null;
  spouse_token?: string | null;
  primary_checked_in?: boolean;
  spouse_checked_in?: boolean;
};

async function find(eventId: string, kennitala: string): Promise<FindResult> {
  const admin = createAdminClient();
  const { data } = await admin.rpc("find_my_registration", { p_event_id: eventId, p_kennitala: kennitala });
  return (data as FindResult) ?? { found: false };
}

export async function lookupMyBooking(
  eventId: string,
  kennitala: string
): Promise<{ found: boolean; booking?: MyBooking }> {
  const r = await find(eventId, kennitala);
  if (!r.found) return { found: false };
  return {
    found: true,
    booking: {
      fullName: r.full_name ?? null,
      email: r.email ?? null,
      phone: r.phone ?? null,
      dietary: r.dietary ?? null,
      hasSpouse: !!r.has_plus_one,
      spouseName: r.spouse_name ?? null,
      primaryCheckedIn: !!r.primary_checked_in,
      spouseCheckedIn: !!r.spouse_checked_in,
      cancelled: !!r.cancelled,
    },
  };
}

export async function updateMyBooking(
  eventId: string,
  kennitala: string,
  phone: string,
  dietary: string
): Promise<{ ok: boolean; reason?: string }> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("update_my_registration", {
    p_event_id: eventId,
    p_kennitala: kennitala,
    p_phone: phone,
    p_dietary: dietary,
  });
  if (error) return { ok: false, reason: error.message };
  return (data as { ok: boolean; reason?: string }) ?? { ok: false };
}

export async function cancelMyBooking(
  eventId: string,
  kennitala: string
): Promise<{ ok: boolean; reason?: string }> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("cancel_my_registration", { p_event_id: eventId, p_kennitala: kennitala });
  if (error) return { ok: false, reason: error.message };
  return (data as { ok: boolean; reason?: string }) ?? { ok: false };
}

export async function reactivateMyBooking(
  eventId: string,
  kennitala: string
): Promise<{ ok: boolean; reason?: string }> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("reactivate_my_registration", { p_event_id: eventId, p_kennitala: kennitala });
  if (error) return { ok: false, reason: error.message };
  return (data as { ok: boolean; reason?: string }) ?? { ok: false };
}

export async function cancelMySpouse(
  eventId: string,
  kennitala: string
): Promise<{ ok: boolean; reason?: string }> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("cancel_my_spouse", { p_event_id: eventId, p_kennitala: kennitala });
  if (error) return { ok: false, reason: error.message };
  return (data as { ok: boolean; reason?: string }) ?? { ok: false };
}

export async function addMySpouse(
  eventId: string,
  kennitala: string,
  spouseName: string,
  spouseEmail: string
): Promise<{ ok: boolean; reason?: string }> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("add_my_spouse", {
    p_event_id: eventId,
    p_kennitala: kennitala,
    p_spouse_name: spouseName,
    p_spouse_email: spouseEmail,
  });
  if (error) return { ok: false, reason: error.message };
  const res = (data as { ok: boolean; reason?: string; spouse_token?: string }) ?? { ok: false };
  // Sendu maka sinn miða (best-effort) ef netfang er gefið
  if (res.ok && res.spouse_token && spouseEmail.trim()) {
    try {
      const ev = await eventInfo(eventId);
      await sendConfirmationEmail({
        to: spouseEmail.trim(),
        eventName: ev.name,
        whenText: ev.whenText,
        location: ev.location,
        tickets: [await ticket(spouseName || "Maki", res.spouse_token)],
      });
    } catch {
      /* hunsa */
    }
  }
  return { ok: res.ok, reason: res.reason };
}

export async function resendMyBooking(
  eventId: string,
  kennitala: string
): Promise<{ ok: boolean; sent: boolean; reason?: string }> {
  const r = await find(eventId, kennitala);
  if (!r.found || !r.primary_token) return { ok: false, sent: false, reason: "not_found" };
  try {
    const ev = await eventInfo(eventId);
    const tickets: TicketInfo[] = [await ticket(r.full_name || "Gestur", r.primary_token)];
    const out = await sendConfirmationEmail({
      to: r.email ?? "",
      eventName: ev.name,
      whenText: ev.whenText,
      location: ev.location,
      tickets: r.spouse_token ? [...tickets, await ticket(r.spouse_name || "Maki", r.spouse_token)] : tickets,
    });
    return { ok: true, sent: out.sent, reason: out.reason };
  } catch {
    return { ok: false, sent: false, reason: "send_failed" };
  }
}

// ---- hjálparföll ----
async function eventInfo(eventId: string): Promise<{ name: string; whenText: string; location: string | null }> {
  const admin = createAdminClient();
  const { data } = await admin.from("events").select("name, starts_at, location").eq("id", eventId).single();
  const whenText = data?.starts_at
    ? new Date(data.starts_at).toLocaleString("is-IS", {
        dateStyle: "full",
        timeStyle: "short",
        timeZone: "Atlantic/Reykjavik",
      })
    : "";
  return { name: data?.name ?? "Viðburður", whenText, location: data?.location ?? null };
}

async function ticket(label: string, token: string): Promise<TicketInfo> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return { label, ticketUrl: `${appUrl}/t/${token}`, qrDataUrl: await qrDataUrl(token) };
}
