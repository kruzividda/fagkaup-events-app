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
  heroImageUrl?: string | null;
  drinksTotal?: number | null;
  drinksRemaining?: number | null;
  drinksAlcoholic?: boolean | null;
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
  if (t.drinksTotal && t.drinksTotal > 0) {
    textModulesData.push({
      id: "drinks",
      header: "Drykkir eftir",
      body: drinkDisplay(t.drinksRemaining ?? t.drinksTotal, t.drinksTotal, t.drinksAlcoholic ?? true),
    });
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
  if (t.heroImageUrl) {
    genericObject.heroImage = {
      sourceUri: { uri: t.heroImageUrl },
      contentDescription: { defaultValue: { language: "is", value: t.eventName } },
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

// ---- Drykkjateljari á miðanum (live uppfærsla) ----------------------------

/**
 * Texti fyrir drykkjastöðu. Sýnir eina krús/glas fyrir hvern drykk sem er
 * eftir, plús töluna (🍺🍺 · 2 af 4). Óáfengt -> glas (🥤). Fyrir fleiri en
 * 10 drykki (eða 0 eftir) sýnum við aðeins töluna.
 */
export function drinkDisplay(remaining: number, total: number, alcoholic?: boolean): string {
  const r = Math.max(0, Math.floor(remaining));
  const t = Math.max(r, Math.floor(total));
  const mug = alcoholic === false ? "🥤" : "🍺";
  if (t > 0 && t <= 10 && r > 0) {
    return `${mug.repeat(r)}  ·  ${r} af ${t}`;
  }
  return `${r} af ${t}`;
}

const WO_API = "https://walletobjects.googleapis.com/walletobjects/v1";
let cachedToken: { token: string; exp: number } | null = null;

async function getAccessToken(): Promise<string | null> {
  const saEmail = process.env.GOOGLE_WALLET_SA_EMAIL;
  let saKey = process.env.GOOGLE_WALLET_SA_KEY;
  if (!saEmail || !saKey) return null;
  saKey = saKey.replace(/\\n/g, "\n");

  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.exp - 60 > now) return cachedToken.token;

  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: saEmail,
    scope: "https://www.googleapis.com/auth/wallet_object.issuer",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claims))}`;
  let assertion: string;
  try {
    const sig = crypto.createSign("RSA-SHA256").update(signingInput).sign(saKey, "base64url");
    assertion = `${signingInput}.${sig}`;
  } catch {
    return null;
  }
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!data.access_token) return null;
    cachedToken = { token: data.access_token, exp: now + (data.expires_in ?? 3600) };
    return data.access_token;
  } catch {
    return null;
  }
}

/**
 * Uppfærir drykkjateljarann á þegar vistuðum Google Wallet miða.
 * Best-effort: ef miðinn er ekki vistaður (404) eða skilríki vantar -> hunsa.
 * Heldur öðrum textareitum (hvenær/hvar/sæti) óbreyttum.
 */
export async function patchWalletDrinks(
  token: string,
  remaining: number,
  total: number,
  alcoholic?: boolean
): Promise<boolean> {
  const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID;
  if (!issuerId) return false;
  const access = await getAccessToken();
  if (!access) return false;

  const objectId = `${issuerId}.tkt_${token}`;
  try {
    const getRes = await fetch(`${WO_API}/genericObject/${encodeURIComponent(objectId)}`, {
      headers: { Authorization: `Bearer ${access}` },
    });
    if (!getRes.ok) return false; // 404 = ekki vistaður enn
    const obj = (await getRes.json()) as { textModulesData?: Array<{ id?: string; header?: string; body?: string }> };
    const mods = Array.isArray(obj.textModulesData) ? obj.textModulesData : [];
    const merged = mods.filter((m) => m.id !== "drinks");
    merged.push({ id: "drinks", header: "Drykkir eftir", body: drinkDisplay(remaining, total, alcoholic) });

    const patchRes = await fetch(`${WO_API}/genericObject/${encodeURIComponent(objectId)}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${access}`, "Content-Type": "application/json" },
      body: JSON.stringify({ textModulesData: merged }),
    });
    return patchRes.ok;
  } catch {
    return false;
  }
}
