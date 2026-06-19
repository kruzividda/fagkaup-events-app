"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type UnitInput = {
  id: string | null;
  name: string;
  locations: { id: string | null; name: string }[];
};

export async function saveBusinessUnits(units: UnitInput[]): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Ekki innskráð(ur)." };
  const { data: profile } = await supabase.from("profiles").select("org_id, role").eq("id", user.id).single();
  if (!profile || !["owner", "admin"].includes(profile.role)) return { ok: false, error: "Aðeins kerfisstjóri." };
  const orgId = profile.org_id;

  const { data: current } = await supabase.from("business_units").select("id").eq("org_id", orgId);
  const currentUnitIds = new Set((current ?? []).map((u) => u.id as string));
  const keptUnitIds = new Set<string>();

  for (let i = 0; i < units.length; i++) {
    const u = units[i];
    if (!u.name.trim()) continue;
    let unitId = u.id;
    if (unitId && currentUnitIds.has(unitId)) {
      await supabase.from("business_units").update({ name: u.name.trim(), sort_order: i }).eq("id", unitId);
    } else {
      const { data: ins, error } = await supabase
        .from("business_units")
        .insert({ org_id: orgId, name: u.name.trim(), sort_order: i })
        .select("id")
        .single();
      if (error) return { ok: false, error: error.message };
      unitId = ins?.id as string;
    }
    if (!unitId) continue;
    keptUnitIds.add(unitId);

    // Staðsetningar: einfalt — eyða og setja aftur inn (ekki vísað í af öðru)
    await supabase.from("business_unit_locations").delete().eq("business_unit_id", unitId);
    const locs = u.locations.filter((l) => l.name.trim());
    if (locs.length) {
      await supabase
        .from("business_unit_locations")
        .insert(locs.map((l, li) => ({ business_unit_id: unitId, name: l.name.trim(), sort_order: li })));
    }
  }

  const toDelete = [...currentUnitIds].filter((id) => !keptUnitIds.has(id));
  if (toDelete.length) await supabase.from("business_units").delete().in("id", toDelete);

  revalidatePath("/dashboard/units");
  return { ok: true };
}
