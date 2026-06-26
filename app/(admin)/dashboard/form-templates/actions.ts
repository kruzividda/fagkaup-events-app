"use server";

import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/slug";
import { templateFor, TEMPLATE_NAME_PREFIX } from "@/lib/event-templates";
import { EVENT_TYPE_OPTIONS } from "@/lib/event-templates";

/**
 * Finnur (eða býr til í fyrsta sinn) falinn sniðmáts-viðburð fyrir tegund.
 * Sniðmátið er venjulegur viðburður með is_template = true sem ritstýrt er
 * með sama form-builder og venjulegir viðburðir.
 */
export async function getOrCreateTemplate(
  eventType: string
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Ekki innskráð(ur)." };

  const { data: profile } = await supabase.from("profiles").select("org_id, role").eq("id", user.id).single();
  if (!profile || !["owner", "admin"].includes(profile.role)) {
    return { ok: false, error: "Aðeins kerfisstjóri má breyta sniðmátum." };
  }

  const opt = EVENT_TYPE_OPTIONS.find((o) => o.value === eventType);
  if (!opt) return { ok: false, error: "Óþekkt viðburðartegund." };

  // Til staðar?
  const { data: existing } = await supabase
    .from("events")
    .select("id")
    .eq("org_id", profile.org_id)
    .eq("is_template", true)
    .eq("event_type", eventType)
    .limit(1)
    .maybeSingle();
  if (existing?.id) return { ok: true, id: existing.id };

  // Búa til nýtt sniðmát og sá sjálfgefnum reitum
  const slug = `snidmat-${slugify(eventType)}-${Math.random().toString(36).slice(2, 6)}`;
  const { data: created, error } = await supabase
    .from("events")
    .insert({
      org_id: profile.org_id,
      name: `${TEMPLATE_NAME_PREFIX}${opt.label}`,
      slug,
      event_type: eventType,
      status: "draft",
      is_template: true,
      starts_at: new Date().toISOString(),
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error || !created) return { ok: false, error: error?.message ?? "Gat ekki búið til sniðmát." };

  const fields = templateFor(eventType).map((f) => ({ is_custom: false, ...f, event_id: created.id }));
  const { error: fieldErr } = await supabase.from("event_form_fields").insert(fields);
  if (fieldErr) return { ok: false, error: fieldErr.message };

  return { ok: true, id: created.id };
}
