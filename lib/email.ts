type ConfirmArgs = {
  to: string;
  guestName: string | null;
  eventName: string;
  whenText: string;
  location?: string | null;
  ticketUrl: string;
  qrDataUrl: string;
};

/**
 * Sendir staðfestingarpóst gegnum Resend EF RESEND_API_KEY og RESEND_FROM
 * eru stillt. Annars sleppir hann því hljóðlega (loup-ið virkar samt).
 */
export async function sendConfirmationEmail(
  a: ConfirmArgs
): Promise<{ sent: boolean; reason?: string }> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!key || !from || !a.to) return { sent: false, reason: "no_email_config" };

  const html = `
  <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;color:#0B121C">
    <h2 style="margin:0 0 4px">Takk fyrir skráninguna!</h2>
    <p style="color:#444">Hér er miðinn þinn á <strong>${escapeHtml(a.eventName)}</strong>.</p>
    <p style="margin:16px 0 4px"><strong>Hvenær:</strong> ${escapeHtml(a.whenText)}</p>
    ${a.location ? `<p style="margin:0 0 16px"><strong>Hvar:</strong> ${escapeHtml(a.location)}</p>` : ""}
    <div style="text-align:center;margin:20px 0">
      <img src="${a.qrDataUrl}" width="220" height="220" alt="QR miði" style="border-radius:12px"/>
    </div>
    <p style="text-align:center">
      <a href="${a.ticketUrl}" style="display:inline-block;background:#C8A45C;color:#0B121C;
         text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600">
        Opna miðann
      </a>
    </p>
  </div>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: a.to,
        subject: `Staðfesting: ${a.eventName}`,
        html,
      }),
    });
    if (!res.ok) return { sent: false, reason: `resend_${res.status}` };
    return { sent: true };
  } catch {
    return { sent: false, reason: "fetch_failed" };
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
