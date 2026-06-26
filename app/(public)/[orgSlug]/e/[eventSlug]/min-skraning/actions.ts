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

async function find(token: string): Promise<FindResult> {
  const admin = createAdminClient();
  const { data } = await admin.rpc("find_my_registration_t", { p_token: token });
  return (data as FindResult) ?? { found: false };
}

export async function lookupMyBooking(token: string): Promise<{ found: boolean; booking?: MyBooking }> {
  const r = await find(token);
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

export async function updateMyBooking(token: string, phone: string, dietary: string): Promise<{ ok: boolean; reason?: string }> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("update_my_registration_t", { p_token: token, p_phone: phone, p_dietary: dietary });
  if (error) return { ok: false, reason: error.message };
  return (data as { ok: boolean; reason?: string }) ?? { ok: false };
}

export async function cancelMyBooking(token: string): Promise<{ ok: boolean; reason?: string }> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("cancel_my_registration_t", { p_token: token });
  if (error) return { ok: false, reason: error.message };
  return (data as { ok: boolean; reason?: string }) ?? { ok: false };
}

export async function reactivateMyBooking(token: string): Promise<{ ok: boolean; reason?: string }> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("reactivate_my_registration_t", { p_token: token });
  if (error) return { ok: false, reason: error.message };
  return (data as { ok: boolean; reason?: string }) ?? { ok: false };
}

export async function cancelMySpouse(token: string): Promise<{ ok: boolean; reason?: string }> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("cancel_my_spouse_t", { p_token: token });
  if (error) return { ok: false, reason: error.message };
  return (data as { ok: boolean; reason?: string }) ?? { ok: false };
}

export async function addMySpouse(
  eventId: string,
  token: string,
  spouseName: string,
  spouseEmail: string
): Promise<{ ok: boolean; reason?: string }> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("add_my_spouse_t", {
    p_token: token,
    p_spouse_name: spouseName,
    p_spouse_email: spouseEmail,
  });
  if (error) return { ok: false, reason: error.message };
  const res = (data as { ok: boolean; reason?: string; spouse_token?: string }) ?? { ok: false };
  if (res.ok && res.spouse_token && spouseEmail.trim()) {
    try {
      const ev = await eventInfo(eventId);
      await sendConfirmationEmail({
        to: spouseEmail.trim(),
        eventName: ev.name,
        whenText: ev.whenText,
        location: ev.location,
        showQr: ev.showQr,
        fromName: ev.fromName,
        fromEmail: ev.fromEmail,
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
  orgSlug: string,
  eventSlug: string,
  token: string
): Promise<{ ok: boolean; sent: boolean; reason?: string }> {
  const r = await find(token);
  if (!r.found || !r.primary_token) return { ok: false, sent: false, reason: "not_found" };
  try {
    const ev = await eventInfo(eventId);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const manageUrl = `${appUrl}/${orgSlug}/e/${eventSlug}/min-skraning?token=${token}`;
    const tickets: TicketInfo[] = [await ticket(r.full_name || "Gestur", r.primary_token)];
    const out = await sendConfirmationEmail({
      to: r.email ?? "",
      eventName: ev.name,
      whenText: ev.whenText,
      location: ev.location,
      showQr: ev.showQr,
      fromName: ev.fromName,
      fromEmail: ev.fromEmail,
      manageUrl,
      tickets: r.spouse_token ? [...tickets, await ticket(r.spouse_name || "Maki", r.spouse_token)] : tickets,
    });
    return { ok: true, sent: out.sent, reason: out.reason };
  } catch {
    return { ok: false, sent: false, reason: "send_failed" };
  }
}

/**
 * Beidni um magic link i tolvuposti thegar gestur er ekki med hlekkinn.
 * Hlekkurinn fer ADEINS a netfangid sem er skrad - svarid er alltaf eins.
 */
export async function requestEditLink(
  eventId: string,
  orgSlug: string,
  eventSlug: string,
  email: string
): Promise<{ ok: boolean }> {
  const admin = createAdminClient();
  try {
    const { data } = await admin.rpc("request_edit_link", { p_event_id: eventId, p_email: email });
    const r = (data as { found?: boolean; email?: string | null; full_name?: string | null; edit_token?: string }) ?? {};
    if (r.found && r.edit_token && r.email) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      const manageUrl = `${appUrl}/${orgSlug}/e/${eventSlug}/min-skraning?token=${r.edit_token}`;
      const detail = await find(r.edit_token);
      const ev = await eventInfo(eventId);
      const tickets: TicketInfo[] = detail.primary_token ? [await ticket(r.full_name || "Gestur", detail.primary_token)] : [];
      await sendConfirmationEmail({
        to: r.email,
        eventName: ev.name,
        whenText: ev.whenText,
        location: ev.location,
        showQr: ev.showQr,
        fromName: ev.fromName,
        fromEmail: ev.fromEmail,
        manageUrl,
        tickets,
      });
    }
  } catch {
    /* hunsa - svar er alltaf eins */
  }
  return { ok: true };
}

// ---- hjalparfoll ----
async function eventInfo(eventId: string): Promise<{ name: string; whenText: string; location: string | null; showQr: boolean; fromName: string | null; fromEmail: string | null }> {
  const admin = createAdminClient();
  const { data } = await admin.from("events").select("name, starts_at, location, qr_enabled, drinks_enabled, sender_name, sender_email").eq("id", eventId).single();
  const whenText = data?.starts_at
    ? new Date(data.starts_at).toLocaleString("is-IS", { dateStyle: "full", timeStyle: "short", timeZone: "Atlantic/Reykjavik" })
    : "";
  return {
    name: data?.name ?? "Vidburdur",
    whenText,
    location: data?.location ?? null,
    showQr: data?.qr_enabled !== false || !!data?.drinks_enabled,
    fromName: data?.sender_name ?? null,
    fromEmail: data?.sender_email ?? null,
  };
}

async function ticket(label: string, token: string): Promise<TicketInfo> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return { label, ticketUrl: `${appUrl}/t/${token}`, qrDataUrl: await qrDataUrl(token) };
}
