import QRCode from "qrcode";

/** Býr til QR sem data-URL (PNG). Notað server-side á miðasíðu og í pósti. */
export async function qrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    width: 280,
    margin: 1,
    color: { dark: "#0B121C", light: "#FFFFFF" },
  });
}
