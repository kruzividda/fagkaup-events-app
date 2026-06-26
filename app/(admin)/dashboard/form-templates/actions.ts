"use server";

import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/slug";
import { templateFor, TEMPLATE_NAME_PREFIX } from "@/lib/event-templates";

export type FormTemplate = {
  id: string;
  label: string;
  event_type: string;
  sort_order: number;
  fieldCount: number | null;
};

async function adminContext() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null as { org_id: string; role: string } | null };
  const { data: profile } = await supabase.from("profiles").select("org_id, role").eq("id", user.id).single();
  return { supabase, user, profile: (profile as { org_id: string; role: string }) ?? null };
}

function isAdmin(role?: string) {
  return role === "owner" || role === "admin";
}

/** Listar (óarkíveruð) sniðmát fyrirtækisins + fjölda reita. */
export async function listFormTemplates(): Promise<{ ok: boolean; templates: FormTemplate[]; error?: string }> {
  const { supabase, profile } = await adminContext();
  if (!profile) return { ok: false, templates: [], error: "Ekki innskráð(ur)." };

  const { data: rows } = await supabase
    .from("form_templates")
    .select("id, label, event_type, sort_order, template_event_id")
    .eq("archived", false)
    .order("sort_order", { ascending: true });

  const list = (rows ?? []) as { id: string; label: string; event_type: string; sort_order: number; template_event_id: string | null }[];

  // Telja reiti fyrir sniðmát sem eiga is_template viðburð
  const eventIds = list.map((r) => r.template_event_id).filter(Boolean) as string[];
  const counts = new Map<string, number>();
  if (eventIds.length) {
    const { data: fields } = await supabase.from("event_form_fields").select("event_id").in("event_id", eventIds);
    for (const f of (fields ?? []) as { event_id: string }[]) counts.set(f.event_id, (counts.get(f.event_id) ?? 0) + 1);
  }

  return {
    ok: true,
    templates: list.map((r) => ({
      id: r.id,
      label: r.label,
      event_type: r.event_type,
      sort_order: r.sort_order,
      fieldCount: r.template_event_id ? counts.get(r.template_event_id) ?? 0 : null,
    })),
  };
}

/** Bætir við nýju sniðmáti. baseType ræður sjálfgefnum reitum + flokki. */
export async function createFormTemplate(
  label: string,
  baseType: string
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const { supabase, profile } = await adminContext();
  if (!profile) return { ok: false, error: "Ekki innskráð(ur)." };
  if (!isAdmin(profile.role)) return { ok: false, error: "Aðeins kerfisstjóri." };
  const name = label.trim();
  if (!name) return { ok: false, error: "Heiti vantar." };

  const { data: maxRow } = await supabase
    .from("form_templates")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = ((maxRow?.sort_order as number | undefined) ?? 0) + 1;

  const { data, error } = await supabase
    .from("form_templates")
    .insert({ org_id: profile.org_id, label: name, event_type: baseType, sort_order: nextOrder })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "Gat ekki búið til sniðmát." };
  return { ok: true, id: data.id };
}

/** Endurnefnir sniðmát. */
export async function renameFormTemplate(id: string, label: string): Promise<{ ok: boolean; error?: string }> {
  const { supabase, profile } = await adminContext();
  if (!profile) return { ok: false, error: "Ekki innskráð(ur)." };
  if (!isAdmin(profile.role)) return { ok: false, error: "Aðeins kerfisstjóri." };
  const name = label.trim();
  if (!name) return { ok: false, error: "Heiti vantar." };
  const { error } = await supabase.from("form_templates").update({ label: name }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Eyðir sniðmáti (og földu is_template viðburðinum hans). Viðburðir sem þegar
 *  voru búnir til halda sínum reitum óbreyttum. */
export async function deleteFormTemplate(id: string): Promise<{ ok: boolean; error?: string }> {
  const { supabase, profile } = await adminContext();
  if (!profile) return { ok: false, error: "Ekki innskráð(ur)." };
  if (!isAdmin(profile.role)) return { ok: false, error: "Aðeins kerfisstjóri." };

  const { data: row } = await supabase
    .from("form_templates")
    .select("id, template_event_id, org_id")
    .eq("id", id)
    .maybeSingle();
  if (!row) return { ok: false, error: "Sniðmát fannst ekki." };

  if (row.template_event_id) {
    // Aðeins falinn sniðmáts-viðburður — öryggis vegna staðfestum is_template
    await supabase.from("events").delete().eq("id", row.template_event_id).eq("is_template", true);
  }
  const { error } = await supabase.from("form_templates").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Skilar (eða býr til) földum is_template viðburði sniðmátsins fyrir ritil. */
export async function getOrCreateTemplateEvent(
  formTemplateId: string
): Promise<{ ok: boolean; eventId?: string; label?: string; error?: string }> {
  const { supabase, user, profile } = await adminContext();
  if (!profile || !user) return { ok: false, error: "Ekki innskráð(ur)." };
  if (!isAdmin(profile.role)) return { ok: false, error: "Aðeins kerfisstjóri." };

  const { data: row } = await supabase
    .from("form_templates")
    .select("id, label, event_type, template_event_id")
    .eq("id", formTemplateId)
    .maybeSingle();
  if (!row) return { ok: false, error: "Sniðmát fannst ekki." };

  if (row.template_event_id) {
    const { data: ev } = await supabase.from("events").select("id").eq("id", row.template_event_id).maybeSingle();
    if (ev?.id) return { ok: true, eventId: ev.id, label: row.label };
  }

  // Búa til falinn sniðmáts-viðburð og sá reitum
  const slug = `snidmat-${slugify(row.event_type)}-${Math.random().toString(36).slice(2, 6)}`;
  const { data: created, error } = await supabase
    .from("events")
    .insert({
      org_id: profile.org_id,
      name: `${TEMPLATE_NAME_PREFIX}${row.label}`,
      slug,
      event_type: row.event_type,
      status: "draft",
      is_template: true,
      starts_at: new Date().toISOString(),
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error || !created) return { ok: false, error: error?.message ?? "Gat ekki búið til sniðmát." };

  const fields = templateFor(row.event_type).map((f) => ({ is_custom: false, ...f, event_id: created.id }));
  const { error: fieldErr } = await supabase.from("event_form_fields").insert(fields);
  if (fieldErr) return { ok: false, error: fieldErr.message };

  await supabase.from("form_templates").update({ template_event_id: created.id }).eq("id", row.id);
  return { ok: true, eventId: created.id, label: row.label };
}
