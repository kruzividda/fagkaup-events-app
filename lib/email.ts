export type TicketInfo = { label: string; ticketUrl: string; qrDataUrl: string };

type ConfirmArgs = {
  to: string;
  eventName: string;
  whenText: string;
  location?: string | null;
  tickets: TicketInfo[];
};

/**
 * Sendir staðfestingarpóst gegnum Resend EF RESEND_API_KEY og RESEND_FROM
 * eru stillt. Annars sleppir hann því hljóðlega. Sýnir einn QR per miða
 * (gestur + maki fá hvor sinn).
 */
export async function sendConfirmationEmail(
  a: ConfirmArgs
): Promise<{ sent: boolean; reason?: string }> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!key || !from || !a.to) return { sent: false, reason: "no_email_config" };

  const ticketsHtml = a.tickets
    .map(
      (t) => `
      <div style="margin:18px 0;text-align:center">
        <p style="margin:0 0 6px;font-weight:600;color:#0B121C">${escapeHtml(t.label)}</p>
        <img src="${t.qrDataUrl}" width="200" height="200" alt="QR miði" style="border-radius:12px"/>
        <p style="margin:6px 0 0">
          <a href="${t.ticketUrl}" style="color:#9a7b33;font-size:13px">Opna miðann</a>
        </p>
      </div>`
    )
    .join("");

  const html = `
  <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;color:#0B121C">
    <h2 style="margin:0 0 4px">Takk fyrir skráninguna!</h2>
    <p style="color:#444">Miðar á <strong>${escapeHtml(a.eventName)}</strong>.</p>
    <p style="margin:12px 0 4px"><strong>Hvenær:</strong> ${escapeHtml(a.whenText)}</p>
    ${a.location ? `<p style="margin:0"><strong>Hvar:</strong> ${escapeHtml(a.location)}</p>` : ""}
    ${ticketsHtml}
  </div>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: a.to, subject: `Staðfesting: ${a.eventName}`, html }),
    });
    if (!res.ok) return { sent: false, reason: `resend_${res.status}` };
    return { sent: true };
  } catch {
    return { sent: false, reason: "fetch_failed" };
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
