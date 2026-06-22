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
  drinks_alcoholic: boolean;
  uses_seating: boolean;
  qr_enabled: boolean;
  theme: string;
  registration_opens_at: string;
  registration_closes_at: string;
};

const DEFAULT_FIELDS = [
  { field_key: "full_name", label: "Nafn", field_type: "text", requirement: "required", sort_order: 1, visible_if: null },
  { field_key: "kennitala", label: "Kennitala", field_type: "text", requirement: "required", sort_order: 2, visible_if: null },
  { field_key: "email", label: "Tölvupóstur", field_type: "email", requirement: "required", sort_order: 3, visible_if: null },
  { field_key: "phone", label: "Símanúmer", field_type: "phone", requirement: "optional", sort_order: 4, visible_if: null },
  { field_key: "company", label: "Fyrirtæki", field_type: "text", requirement: "optional", sort_order: 5, visible_if: null },
  { field_key: "dietary", label: "Fæðuóþol", field_type: "text", requirement: "optional", sort_order: 6, visible_if: null },
  { field_key: "has_plus_one", label: "Ég kem með maka / +1", field_type: "boolean", requirement: "optional", sort_order: 7, visible_if: null },
  { field_key: "spouse_name", label: "Nafn maka", field_type: "text", requirement: "optional", sort_order: 8, visible_if: { field: "has_plus_one", equals: true } },
  { field_key: "spouse_email", label: "Tölvupóstur maka (fyrir hans miða)", field_type: "email", requirement: "optional", sort_order: 9, visible_if: { field: "has_plus_one", equals: true } },
  { field_key: "consent", label: "Ég samþykki að upplýsingar mínar séu unnar vegna viðburðarins", field_type: "consent", requirement: "required", sort_order: 10, visible_if: null },
];

// Golfmót: golf-sértækir reitir, enginn maki
const GOLF_FIELDS = [
  { field_key: "full_name", label: "Nafn", field_type: "text", requirement: "required", sort_order: 1, visible_if: null, is_custom: false },
  { field_key: "kennitala", label: "Kennitala", field_type: "text", requirement: "required", sort_order: 2, visible_if: null, is_custom: false },
  { field_key: "forgjof", label: "Forgjöf", field_type: "text", requirement: "optional", sort_order: 3, visible_if: null, is_custom: true },
  { field_key: "golfklubbur", label: "Golfklúbbur", field_type: "text", requirement: "optional", sort_order: 4, visible_if: null, is_custom: true },
  { field_key: "golfbox_numer", label: "Golfbox númer", field_type: "text", requirement: "optional", sort_order: 5, visible_if: null, is_custom: true },
  { field_key: "email", label: "Netfang", field_type: "email", requirement: "required", sort_order: 6, visible_if: null, is_custom: false },
  { field_key: "phone", label: "Símanúmer", field_type: "phone", requirement: "optional", sort_order: 7, visible_if: null, is_custom: false },
  { field_key: "company", label: "Fyrirtæki", field_type: "text", requirement: "optional", sort_order: 8, visible_if: null, is_custom: false },
  { field_key: "dietary", label: "Annað (t.d. fæðuóþol)", field_type: "text", requirement: "optional", sort_order: 9, visible_if: null, is_custom: false },
  { field_key: "vantar_golfbil", label: "Vantar golfbíl?", field_type: "boolean", requirement: "optional", sort_order: 10, visible_if: null, is_custom: true },
  { field_key: "consent", label: "Ég samþykki að upplýsingar mínar séu unnar vegna viðburðarins", field_type: "consent", requirement: "required", sort_order: 11, visible_if: null, is_custom: false },
];

function templateFor(eventType: string) {
  return eventType === "golfmot" ? GOLF_FIELDS : DEFAULT_FIELDS;
}

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
      drinks_alcoholic: input.drinks_enabled ? input.drinks_alcoholic : false,
      theme: input.theme === "fagkaup" ? "fagkaup" : "glamour",
      uses_seating: input.uses_seating,
      qr_enabled: input.qr_enabled !== false,
      registration_opens_at: input.registration_opens_at ? new Date(input.registration_opens_at).toISOString() : null,
      registration_closes_at: input.registration_closes_at ? new Date(input.registration_closes_at).toISOString() : null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !event) return { ok: false, error: error?.message ?? "Vistun mistókst." };

  const fields = templateFor(input.event_type).map((f) => ({
    is_custom: false,
    ...f,
    event_id: event.id,
  }));
  const { error: fieldErr } = await supabase.from("event_form_fields").insert(fields);
  if (fieldErr) return { ok: false, error: fieldErr.message };

  return { ok: true, eventId: event.id };
}

export async function setCover(
  eventId: string,
  slot: "desktop" | "mobile",
  path: string | null
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const column = slot === "mobile" ? "cover_image_path_mobile" : "cover_image_path";
  const { error } = await supabase.from("events").update({ [column]: path }).eq("id", eventId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
