import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow, PageTitle } from "@/components/ui";
import { EventsBrowser, type EventItem } from "./EventsBrowser";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const supabase = createClient();

  const { data: events } = await supabase
    .from("events")
    .select("id, name, slug, status, cancelled, starts_at, event_type, max_guests, cover_image_path, cover_image_path_mobile")
    .order("starts_at", { ascending: false });

  const pub = (p: string | null) =>
    p ? supabase.storage.from("event-media").getPublicUrl(p).data.publicUrl : null;

  // Skráningartölur per viðburð (virkar skráningar)
  const ids = (events ?? []).map((e) => e.id);
  const stats: Record<string, { registered: number; guests: number }> = {};
  if (ids.length) {
    const { data: regs } = await supabase
      .from("registrations")
      .select("event_id, has_plus_one")
      .in("event_id", ids)
      .eq("status", "registered");
    for (const r of regs ?? []) {
      const m = (stats[r.event_id] ??= { registered: 0, guests: 0 });
      m.registered += 1;
      m.guests += 1 + (r.has_plus_one ? 1 : 0);
    }
  }

  const items: EventItem[] = (events ?? []).map((e) => {
    const s = stats[e.id] ?? { registered: 0, guests: 0 };
    return {
      id: e.id,
      name: e.name,
      status: e.status,
      cancelled: !!e.cancelled,
      starts_at: e.starts_at,
      event_type: e.event_type,
      max_guests: e.max_guests,
      cover: pub(e.cover_image_path) ?? pub(e.cover_image_path_mobile),
      registered: s.registered,
      guests: s.guests,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <Eyebrow>Viðburðir</Eyebrow>
          <PageTitle>Allir viðburðir</PageTitle>
        </div>
        <Link
          href="/dashboard/events/new"
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-ink transition hover:brightness-110"
        >
          Nýr viðburður
        </Link>
      </div>

      <EventsBrowser items={items} nowIso={new Date().toISOString()} />
    </div>
  );
}
