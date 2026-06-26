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
  const result = data as { ok: boolean; ticket_token?: string; spouse_token?: string | null; edit_token?: string; reason?: string };
  if (!result?.ok || !result.ticket_token) {
    return { ok: false, reason: result?.reason ?? "unknown" };
  }

  // Staðfestingarpóstar — best-effort, blokka aldrei skráninguna.
  // Gestur fær sinn miða á sitt netfang; maki fær sinn á netfang maka (ef gefið).
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const primaryEmail = String(input.core.email ?? "");
    const spouseEmail = String(input.core.spouse_email ?? "");
    const guestName = String(input.core.full_name ?? "Gestur");
    const spouseName = String(input.core.spouse_name ?? "Maki");

    const { data: ev } = await admin
      .from("events")
      .select("name, slug, org_id, starts_at, location, qr_enabled, drinks_enabled, sender_name, sender_email")
      .eq("id", input.eventId)
      .single();
    let manageUrl: string | null = null;
    if (ev?.slug && ev?.org_id && result.edit_token) {
      const { data: org } = await admin.from("organizations").select("slug").eq("id", ev.org_id).single();
      if (org?.slug) manageUrl = `${appUrl}/${org.slug}/e/${ev.slug}/min-skraning?token=${result.edit_token}`;
    }
    const whenText = ev?.starts_at
      ? new Date(ev.starts_at).toLocaleString("is-IS", { dateStyle: "full", timeStyle: "short" })
      : "";

    const primaryTicket = {
      label: guestName,
      ticketUrl: `${appUrl}/t/${result.ticket_token}`,
      qrDataUrl: await qrDataUrl(result.ticket_token),
    };
    const spouseTicket = result.spouse_token
      ? {
          label: spouseName,
          ticketUrl: `${appUrl}/t/${result.spouse_token}`,
          qrDataUrl: await qrDataUrl(result.spouse_token),
        }
      : null;

    const common = {
      eventName: ev?.name ?? "Viðburður",
      whenText,
      location: ev?.location ?? null,
      showQr: ev?.qr_enabled !== false || !!ev?.drinks_enabled,
      fromName: ev?.sender_name ?? null,
      fromEmail: ev?.sender_email ?? null,
    };

    // Póstur til aðalgests
    if (primaryEmail) {
      const tickets = spouseTicket && !spouseEmail ? [primaryTicket, spouseTicket] : [primaryTicket];
      await sendConfirmationEmail({ to: primaryEmail, ...common, manageUrl, tickets });
    }
    // Sér póstur til maka ef netfang maka er gefið
    if (spouseEmail && spouseTicket) {
      await sendConfirmationEmail({ to: spouseEmail, ...common, tickets: [spouseTicket] });
    }
  } catch {
    // hunsa póstvillur
  }

  return { ok: true, token: result.ticket_token };
}
