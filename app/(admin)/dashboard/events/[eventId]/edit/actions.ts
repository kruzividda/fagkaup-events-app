"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { NewEventInput } from "../../new/actions";

export async function updateEvent(
  eventId: string,
  input: NewEventInput
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Ekki innskráð(ur)." };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || !["owner", "admin"].includes(profile.role)) {
    return { ok: false, error: "Aðeins kerfisstjóri má breyta viðburðum." };
  }

  if (!input.name.trim()) return { ok: false, error: "Heiti vantar." };
  if (!input.starts_at) return { ok: false, error: "Dagsetning vantar." };

  const { error } = await supabase
    .from("events")
    .update({
      name: input.name.trim(),
      description: input.description.trim() || null,
      event_type: input.event_type,
      starts_at: new Date(input.starts_at).toISOString(),
      location: input.location.trim() || null,
      max_guests: input.max_guests === "" ? null : input.max_guests,
      drinks_enabled: input.drinks_enabled,
      drinks_per_person: input.drinks_enabled ? Number(input.drinks_per_person || 0) : 0,
      spouse_gets_drinks: input.drinks_enabled && input.spouse_gets_drinks,
      drinks_per_spouse:
        input.drinks_enabled && input.spouse_gets_drinks ? Number(input.drinks_per_spouse || 0) : 0,
      uses_seating: input.uses_seating,
    })
    .eq("id", eventId);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/dashboard/events/${eventId}`);
  revalidatePath("/dashboard/events");
  return { ok: true };
}
