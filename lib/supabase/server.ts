import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** Server-component klient. Les session úr cookies + RLS. */
export function createClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Kallað úr Server Component — má hunsa ef middleware sér um refresh.
          }
        },
      },
    }
  );
}
