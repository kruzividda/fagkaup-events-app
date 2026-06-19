"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type OptionInput = { value: string; label: string };
export type VisibleIf = { field: string; equals: string | boolean } | null;
export type BuilderFieldInput = {
  id: string | null;
  field_key: string;
  label: string;
  field_type: string;
  requirement: "required" | "optional" | "hidden";
  is_custom: boolean;
  options: OptionInput[];
  visible_if: VisibleIf;
};

export async function saveFormFields(
  eventId: string,
  fields: BuilderFieldInput[]
): Promise<{ ok: boolean; error?: string; saved?: { field_key: string; id: string }[] }> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Ekki innskráð(ur)." };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || !["owner", "admin"].includes(profile.role)) {
    return { ok: false, error: "Aðeins kerfisstjóri." };
  }

  const { data: ev } = await supabase.from("events").select("id").eq("id", eventId).single();
  if (!ev) return { ok: false, error: "Viðburður fannst ekki." };

  const keptIds = new Set<string>();
  const saved: { field_key: string; id: string }[] = [];

  for (let i = 0; i < fields.length; i++) {
    const f = fields[i];
    const row = {
      event_id: eventId,
      field_key: f.field_key,
      label: f.label,
      field_type: f.field_type,
      requirement: f.requirement,
      is_custom: f.is_custom,
      sort_order: i,
      visible_if: f.visible_if,
    };

    // Para saman eftir (event_id, field_key): uppfærir ef reitur er til,
    // býr til annars. Kemur í veg fyrir "duplicate key" þegar skjárinn man
    // reit enn sem nýjan eftir fyrri vistun.
    const { data: up, error } = await supabase
      .from("event_form_fields")
      .upsert(row, { onConflict: "event_id,field_key" })
      .select("id")
      .single();
    if (error) return { ok: false, error: error.message };

    const fieldId = up?.id as string;
    if (!fieldId) continue;
    keptIds.add(fieldId);
    saved.push({ field_key: f.field_key, id: fieldId });

    // Valkostir (fyrir select/multiselect)
    await supabase.from("event_field_options").delete().eq("field_id", fieldId);
    if ((f.field_type === "select" || f.field_type === "multiselect") && f.options.length) {
      await supabase.from("event_field_options").insert(
        f.options
          .filter((o) => o.label.trim())
          .map((o, oi) => ({ field_id: fieldId, value: (o.value || o.label).trim(), label: o.label.trim(), sort_order: oi }))
      );
    }
  }

  // Eyða reitum sem voru fjarlægðir
  const { data: current } = await supabase.from("event_form_fields").select("id").eq("event_id", eventId);
  const toDelete = (current ?? []).map((c) => c.id as string).filter((id) => !keptIds.has(id));
  if (toDelete.length) await supabase.from("event_form_fields").delete().in("id", toDelete);

  revalidatePath(`/dashboard/events/${eventId}/form`);
  return { ok: true, saved };
}
