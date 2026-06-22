import { createClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  org_id: string;
  full_name: string;
  role: "owner" | "admin" | "staff" | "door" | "bartender";
};

/** Sækir profile fyrir innskráðan notanda (eða null). */
export async function getProfile(): Promise<Profile | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, org_id, full_name, role")
    .eq("id", user.id)
    .single();

  return (data as Profile) ?? null;
}
