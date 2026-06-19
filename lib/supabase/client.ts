import { createBrowserClient } from "@supabase/ssr";

/** Vafra-klient fyrir starfsfólk. Notar anon-lykil + RLS. */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
