import crypto from "crypto";

// Google Wallet "Save to Google Wallet" hlekkur.
// Sofandi þar til skilríki eru sett í env (GOOGLE_WALLET_*). Engin ný pakkning —
// JWT er undirritað með innbyggðu Node crypto (RS256).

function b64url(input: string): string {
  return Buffer.from(input, "utf8").toString("base64url");
}

export function googleWalletConfigured(): boolean {
  return !!(
    process.env.GOOGLE_WALLET_ISSUER_ID &&
    process.env.GOOGLE_WALLET_SA_EMAIL &&
    process.env.GOOGLE_WALLET_SA_KEY
  );
}

export type WalletTicket = {
  token: string;
  eventName: string;
  holderName: string;
  whenText?: string | null;
  location?: string | null;
  tableNumber?: number | null;
  seatNumber?: number | null;
};

export function googleWalletSaveUrl(t: WalletTicket): string | null {
  const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID;
  const saEmail = process.env.GOOGLE_WALLET_SA_EMAIL;
  let saKey = process.env.GOOGLE_WALLET_SA_KEY;
  if (!issuerId || !saEmail || !saKey) return null;
  saKey = saKey.replace(/\\n/g, "\n"); // env geymir oft \n sem bókstafi

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const classId = `${issuerId}.fagkaup_event_ticket`;
  const objectId = `${issuerId}.tkt_${t.token}`;

  const textModulesData: Array<{ id: string; header: string; body: string }> = [];
  if (t.whenText) textModulesData.push({ id: "when", header: "Hvenær", body: t.whenText });
  if (t.location) textModulesData.push({ id: "where", header: "Hvar", body: t.location });
  if (t.tableNumber != null) {
    const seat = t.seatNumber != null ? ` · Sæti ${t.seatNumber}` : "";
    textModulesData.push({ id: "seat", header: "Borð / Sæti", body: `Borð ${t.tableNumber}${seat}` });
  }

  const genericObject: Record<string, unknown> = {
    id: objectId,
    classId,
    hexBackgroundColor: "#0B121C",
    cardTitle: { defaultValue: { language: "is", value: "Aðgöngumiði" } },
    header: { defaultValue: { language: "is", value: t.eventName } },
    subheader: { defaultValue: { language: "is", value: t.holderName } },
    barcode: { type: "QR_CODE", value: t.token },
    textModulesData,
  };
  if (appUrl) {
    genericObject.logo = {
      sourceUri: { uri: `${appUrl}/icon-192.png` },
      contentDescription: { defaultValue: { language: "is", value: "Fagkaup" } },
    };
  }

  const claims = {
    iss: saEmail,
    aud: "google",
    typ: "savetowallet",
    iat: Math.floor(Date.now() / 1000),
    payload: {
      genericClasses: [{ id: classId }],
      genericObjects: [genericObject],
    },
  };

  const header = { alg: "RS256", typ: "JWT" };
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claims))}`;
  try {
    const signature = crypto.createSign("RSA-SHA256").update(signingInput).sign(saKey, "base64url");
    return `https://pay.google.com/gp/v/save/${signingInput}.${signature}`;
  } catch {
    return null; // röng/ógild skilríki -> sleppa hnappnum frekar en að brjóta síðuna
  }
}
