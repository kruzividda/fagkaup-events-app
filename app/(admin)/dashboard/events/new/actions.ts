"use server";

import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/slug";
import { templateFor } from "@/lib/event-templates";

export type NewEventInput = {
  name: string;
  description: string;
  event_type: string;
  template_id?: string;
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
  sender_name: string;
  sender_email: string;
  theme: string;
  registration_opens_at: string;
  registration_closes_at: string;
};



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

  // Leysa valið form-sniðmát (ef gefið): ræður flokki (event_type) og reitum.
  let resolvedType = input.event_type;
  let templateEventId: string | null = null;
  if (input.template_id) {
    const { data: ft } = await supabase
      .from("form_templates")
      .select("event_type, template_event_id")
      .eq("id", input.template_id)
      .maybeSingle();
    if (ft) {
      resolvedType = ft.event_type as string;
      templateEventId = (ft.template_event_id as string | null) ?? null;
    }
  }

  const slug = `${slugify(input.name)}-${Math.random().toString(36).slice(2, 6)}`;

  const { data: event, error } = await supabase
    .from("events")
    .insert({
      org_id: profile.org_id,
      name: input.name.trim(),
      slug,
      description: input.description.trim() || null,
      event_type: resolvedType,
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
      sender_name: input.sender_name?.trim() || null,
      sender_email: input.sender_email?.trim() || null,
      registration_opens_at: input.registration_opens_at ? new Date(input.registration_opens_at).toISOString() : null,
      registration_closes_at: input.registration_closes_at ? new Date(input.registration_closes_at).toISOString() : null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !event) return { ok: false, error: error?.message ?? "Vistun mistókst." };

  // Afrita reiti úr völdu sniðmáti ef það á is_template viðburð, annars sjálfgefið.
  if (templateEventId) {
    const { error: copyErr } = await supabase.rpc("copy_form_fields", { p_from: templateEventId, p_to: event.id });
    if (copyErr) return { ok: false, error: copyErr.message };
  } else {
    const fields = templateFor(resolvedType).map((f) => ({
      is_custom: false,
      ...f,
      event_id: event.id,
    }));
    const { error: fieldErr } = await supabase.from("event_form_fields").insert(fields);
    if (fieldErr) return { ok: false, error: fieldErr.message };
  }

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
