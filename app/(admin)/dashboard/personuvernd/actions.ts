"use server";

import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { revalidatePath } from "next/cache";

async function requireStaff() {
  const profile = await getProfile();
  if (!profile) return null;
  if (profile.role !== "owner" && profile.role !== "admin" && profile.role !== "staff") return null;
  return profile;
}

export type FoundReg = {
  id: string;
  full_name: string | null;
  email: string | null;
  kennitala: string | null;
  status: string;
  anonymized_at: string | null;
  event_name: string | null;
};

export async function searchRegistrations(
  query: string
): Promise<{ ok: boolean; rows?: FoundReg[]; reason?: string }> {
  const profile = await requireStaff();
  if (!profile) return { ok: false, reason: "forbidden" };

  // Hreinsa innslátt svo hann brjóti ekki .or() síuna
  const q = (query ?? "").trim().replace(/[,()*%\\]/g, "").slice(0, 80);
  if (q.length < 2) return { ok: true, rows: [] };

  const supabase = createClient();
  const { data, error } = await supabase
    .from("registrations")
    .select("id, full_name, email, kennitala, status, anonymized_at, created_at, events(name)")
    .eq("org_id", profile.org_id)
    .or(`full_name.ilike.%${q}%,email.ilike.%${q}%,kennitala.ilike.%${q}%`)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return { ok: false, reason: error.message };

  const rows: FoundReg[] = (data ?? []).map((r: any) => ({
    id: r.id,
    full_name: r.full_name,
    email: r.email,
    kennitala: r.kennitala,
    status: r.status,
    anonymized_at: r.anonymized_at,
    event_name: r.events?.name ?? null,
  }));
  return { ok: true, rows };
}

export async function anonymizeRegistration(id: string): Promise<{ ok: boolean; reason?: string }> {
  const profile = await requireStaff();
  if (!profile) return { ok: false, reason: "forbidden" };
  const supabase = createClient();
  const { error } = await supabase.rpc("anonymize_registration", { p_id: id });
  if (error) return { ok: false, reason: error.message };
  revalidatePath("/dashboard/personuvernd");
  return { ok: true };
}

export async function deleteRegistration(id: string): Promise<{ ok: boolean; reason?: string }> {
  const profile = await requireStaff();
  if (!profile) return { ok: false, reason: "forbidden" };
  const supabase = createClient();
  const { error } = await supabase.rpc("delete_registration", { p_id: id });
  if (error) return { ok: false, reason: error.message };
  revalidatePath("/dashboard/personuvernd");
  return { ok: true };
}
