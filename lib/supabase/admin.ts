import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role klient. HUNSAR RLS — aðeins notað server-side fyrir
 * opna skráningu, scan-RPC og útflutning. ALDREI flutt inn í
 * client component eða sent í vafra.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
