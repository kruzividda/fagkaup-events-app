"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { qrDataUrl } from "@/lib/qr";
import { sendConfirmationEmail } from "@/lib/email";

export type RegisterInput = {
  eventId: string;
  core: Record<string, unknown>;
  answers: { field_id: string; value: unknown }[];
};

export async function registerGuest(
  input: RegisterInput
): Promise<{ ok: boolean; token?: string; reason?: string }> {
  const admin = createAdminClient();

  const { data, error } = await admin.rpc("create_registration", {
    p_event_id: input.eventId,
    p_core: input.core,
    p_answers: input.answers,
  });

  if (error) return { ok: false, reason: error.message };
  const result = data as { ok: boolean; ticket_token?: string; reason?: string };
  if (!result?.ok || !result.ticket_token) {
    return { ok: false, reason: result?.reason ?? "unknown" };
  }

  // Staðfestingarpóstur — best-effort, blokkar aldrei skráninguna.
  try {
    const email = String(input.core.email ?? "");
    if (email) {
      const { data: ev } = await admin
        .from("events")
        .select("name, starts_at, location")
        .eq("id", input.eventId)
        .single();
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      const ticketUrl = `${appUrl}/t/${result.ticket_token}`;
      const qr = await qrDataUrl(result.ticket_token);
      await sendConfirmationEmail({
        to: email,
        guestName: String(input.core.full_name ?? ""),
        eventName: ev?.name ?? "Viðburður",
        whenText: ev?.starts_at
          ? new Date(ev.starts_at).toLocaleString("is-IS", { dateStyle: "full", timeStyle: "short" })
          : "",
        location: ev?.location ?? null,
        ticketUrl,
        qrDataUrl: qr,
      });
    }
  } catch {
    // hunsa póstvillur
  }

  return { ok: true, token: result.ticket_token };
}
