"use server";

import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/slug";

export type NewEventInput = {
  name: string;
  description: string;
  event_type: string;
  starts_at: string; // datetime-local
  location: string;
  max_guests: number | "";
  drinks_enabled: boolean;
  drinks_per_person: number | "";
  spouse_gets_drinks: boolean;
  drinks_per_spouse: number | "";
  uses_seating: boolean;
};

const DEFAULT_FIELDS = [
  { field_key: "full_name", label: "Nafn", field_type: "text", requirement: "required", sort_order: 1, visible_if: null },
  { field_key: "email", label: "Tölvupóstur", field_type: "email", requirement: "required", sort_order: 2, visible_if: null },
  { field_key: "phone", label: "Símanúmer", field_type: "phone", requirement: "optional", sort_order: 3, visible_if: null },
  { field_key: "company", label: "Fyrirtæki", field_type: "text", requirement: "optional", sort_order: 4, visible_if: null },
  { field_key: "dietary", label: "Fæðuóþol", field_type: "text", requirement: "optional", sort_order: 5, visible_if: null },
  { field_key: "has_plus_one", label: "Ég kem með maka / +1", field_type: "boolean", requirement: "optional", sort_order: 6, visible_if: null },
  { field_key: "spouse_name", label: "Nafn maka", field_type: "text", requirement: "optional", sort_order: 7, visible_if: { field: "has_plus_one", equals: true } },
  { field_key: "spouse_email", label: "Tölvupóstur maka (fyrir hans miða)", field_type: "email", requirement: "optional", sort_order: 8, visible_if: { field: "has_plus_one", equals: true } },
  { field_key: "consent", label: "Ég samþykki að upplýsingar mínar séu unnar vegna viðburðarins", field_type: "consent", requirement: "required", sort_order: 9, visible_if: null },
];

export async function createEvent(
  input: NewEventInput
): Promise<{ ok: boolean; eventId?: string; error?: string }> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Ekki innskráð(ur)." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id, role")
    .eq("id", user.id)
    .single();
  if (!profile || !["owner", "admin"].includes(profile.role)) {
    return { ok: false, error: "Aðeins kerfisstjóri má stofna viðburði." };
  }

  if (!input.name.trim()) return { ok: false, error: "Heiti vantar." };
  if (!input.starts_at) return { ok: false, error: "Dagsetning vantar." };

  const slug = `${slugify(input.name)}-${Math.random().toString(36).slice(2, 6)}`;

  const { data: event, error } = await supabase
    .from("events")
    .insert({
      org_id: profile.org_id,
      name: input.name.trim(),
      slug,
      description: input.description.trim() || null,
      event_type: input.event_type,
      status: "draft",
      starts_at: new Date(input.starts_at).toISOString(),
      location: input.location.trim() || null,
      max_guests: input.max_guests === "" ? null : input.max_guests,
      drinks_enabled: input.drinks_enabled,
      drinks_per_person: input.drinks_enabled ? Number(input.drinks_per_person || 0) : 0,
      spouse_gets_drinks: input.drinks_enabled && input.spouse_gets_drinks,
      drinks_per_spouse:
        input.drinks_enabled && input.spouse_gets_drinks ? Number(input.drinks_per_spouse || 0) : 0,
      uses_seating: input.uses_seating,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !event) return { ok: false, error: error?.message ?? "Vistun mistókst." };

  const fields = DEFAULT_FIELDS.map((f) => ({ ...f, event_id: event.id }));
  const { error: fieldErr } = await supabase.from("event_form_fields").insert(fields);
  if (fieldErr) return { ok: false, error: fieldErr.message };

  return { ok: true, eventId: event.id };
}
