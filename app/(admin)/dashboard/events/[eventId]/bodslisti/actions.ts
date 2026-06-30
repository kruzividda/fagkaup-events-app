"use server";

import { createClient } from "@/lib/supabase/server";

export type ImportRow = {
  full_name?: string | null;
  email: string;
  company?: string | null;
  business_unit?: string | null;
  location?: string | null;
};

async function adminFor(eventId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, ok: false as const, error: "Ekki innskráð(ur)." };
  const { data: profile } = await supabase.from("profiles").select("org_id, role").eq("id", user.id).single();
  if (!profile || !["owner", "admin"].includes(profile.role)) {
    return { supabase, ok: false as const, error: "Aðeins kerfisstjóri." };
  }
  const { data: ev } = await supabase.from("events").select("id, org_id").eq("id", eventId).maybeSingle();
  if (!ev || ev.org_id !== profile.org_id) return { supabase, ok: false as const, error: "Viðburður fannst ekki." };
  return { supabase, ok: true as const, user, orgId: ev.org_id as string };
}

const cleanEmail = (s: string) => s.trim().toLowerCase();
const clean = (s?: string | null) => {
  const v = (s ?? "").trim();
  return v === "" ? null : v;
};

/** Flytur inn boðslista. Tekur við þegar-greindum línum (CSV greint í vafra). */
export async function importInvitations(
  eventId: string,
  rows: ImportRow[],
  filename?: string
): Promise<{ ok: boolean; imported?: number; skipped?: number; error?: string }> {
  const ctx = await adminFor(eventId);
  if (!ctx.ok) return { ok: false, error: ctx.error };
  const { supabase, orgId, user } = ctx;

  // Sía gildar línur + fjarlægja tvítekin netföng (fyrsta vinnur)
  const seen = new Set<string>();
  const valid: ImportRow[] = [];
  let skipped = 0;
  for (const r of rows) {
    const email = cleanEmail(r.email ?? "");
    if (!/.+@.+\..+/.test(email) || seen.has(email)) {
      skipped++;
      continue;
    }
    seen.add(email);
    valid.push({
      email,
      full_name: clean(r.full_name),
      company: clean(r.company),
      business_unit: clean(r.business_unit),
      location: clean(r.location),
    });
  }
  if (valid.length === 0) return { ok: false, error: "Engin gild netföng fundust í skránni." };

  // Skrá innflutning
  const { data: imp } = await supabase
    .from("invitation_imports")
    .insert({ event_id: eventId, filename: filename ?? null, row_count: valid.length, uploaded_by: user.id })
    .select("id")
    .single();

  // Upsert á (event_id, email). Sleppum status -> ekki yfirskrifað fyrir þá
  // sem eru þegar skráðir; nýjar línur fá sjálfgefið 'invited'.
  const payload = valid.map((r) => ({
    event_id: eventId,
    org_id: orgId,
    email: r.email,
    full_name: r.full_name,
    company: r.company,
    business_unit: r.business_unit,
    location: r.location,
    import_id: imp?.id ?? null,
  }));

  const { error } = await supabase.from("invitations").upsert(payload, { onConflict: "event_id,email" });
  if (error) return { ok: false, error: error.message };

  return { ok: true, imported: valid.length, skipped };
}

export async function deleteInvitation(eventId: string, id: string): Promise<{ ok: boolean; error?: string }> {
  const ctx = await adminFor(eventId);
  if (!ctx.ok) return { ok: false, error: ctx.error };
  const { error } = await ctx.supabase.from("invitations").delete().eq("id", id).eq("event_id", eventId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Eyðir öllum boðum sem eru EKKI tengd skráningu (til að endurflytja hreint). */
export async function clearUnregisteredInvitations(eventId: string): Promise<{ ok: boolean; error?: string }> {
  const ctx = await adminFor(eventId);
  if (!ctx.ok) return { ok: false, error: ctx.error };
  const { error } = await ctx.supabase
    .from("invitations")
    .delete()
    .eq("event_id", eventId)
    .is("registration_id", null);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
