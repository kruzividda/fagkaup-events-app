"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/auth";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

async function requireAccountAdmin() {
  const profile = await getProfile();
  if (!profile || !(profile.role === "owner" || profile.role === "admin")) return null;
  return profile;
}

export async function inviteUser(
  email: string,
  fullName: string,
  role: "admin" | "staff"
): Promise<{ ok: boolean; link?: string; reason?: string }> {
  const profile = await requireAccountAdmin();
  if (!profile) return { ok: false, reason: "forbidden" };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, reason: "bad_email" };
  if (role !== "admin" && role !== "staff") return { ok: false, reason: "bad_role" };

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "invite",
    email: email.trim().toLowerCase(),
    options: {
      data: { org_id: profile.org_id, role, full_name: fullName.trim() || email },
      redirectTo: `${APP_URL}/auth/callback?next=/welcome`,
    },
  });

  if (error) {
    const msg = error.message?.toLowerCase() ?? "";
    if (msg.includes("already") || msg.includes("registered") || msg.includes("exists"))
      return { ok: false, reason: "email_exists" };
    return { ok: false, reason: "error" };
  }
  revalidatePath("/dashboard/users");
  return { ok: true, link: data.properties?.action_link };
}

export async function changeRole(profileId: string, role: "admin" | "staff"): Promise<{ ok: boolean; reason?: string }> {
  const supabase = createClient();
  const { data } = await supabase.rpc("set_user_role", { p_id: profileId, p_role: role });
  const r = (data as { ok: boolean; reason?: string }) ?? { ok: false };
  if (r.ok) revalidatePath("/dashboard/users");
  return r;
}

export async function updateName(profileId: string, name: string): Promise<{ ok: boolean; reason?: string }> {
  const supabase = createClient();
  const { data } = await supabase.rpc("set_user_name", { p_id: profileId, p_name: name });
  const r = (data as { ok: boolean; reason?: string }) ?? { ok: false };
  if (r.ok) revalidatePath("/dashboard/users");
  return r;
}

export async function resetPassword(profileId: string): Promise<{ ok: boolean; link?: string; reason?: string }> {
  const profile = await requireAccountAdmin();
  if (!profile) return { ok: false, reason: "forbidden" };

  const admin = createAdminClient();
  const { data: target } = await admin.from("profiles").select("org_id").eq("id", profileId).single();
  if (!target || target.org_id !== profile.org_id) return { ok: false, reason: "not_found" };

  const { data: userRes, error: getErr } = await admin.auth.admin.getUserById(profileId);
  const email = userRes?.user?.email;
  if (getErr || !email) return { ok: false, reason: "error" };

  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: `${APP_URL}/auth/callback?next=/welcome` },
  });
  if (error) return { ok: false, reason: "error" };
  return { ok: true, link: data.properties?.action_link };
}

export async function removeUser(profileId: string): Promise<{ ok: boolean; reason?: string }> {
  const profile = await requireAccountAdmin();
  if (!profile) return { ok: false, reason: "forbidden" };
  if (profileId === profile.id) return { ok: false, reason: "is_self" };

  const admin = createAdminClient();
  // Staðfesta að notandinn sé í sama fyrirtæki og ekki owner
  const { data: target } = await admin.from("profiles").select("org_id, role").eq("id", profileId).single();
  if (!target || target.org_id !== profile.org_id) return { ok: false, reason: "not_found" };
  if (target.role === "owner") return { ok: false, reason: "is_owner" };

  const { error } = await admin.auth.admin.deleteUser(profileId);
  if (error) return { ok: false, reason: "error" };
  revalidatePath("/dashboard/users");
  return { ok: true };
}
