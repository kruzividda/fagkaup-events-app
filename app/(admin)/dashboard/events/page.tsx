import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow, PageTitle, Card } from "@/components/ui";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  draft: "Drög",
  published: "Birtur",
  closed: "Lokaður",
  archived: "Geymdur",
};

export default async function EventsPage() {
  const supabase = createClient();

  const { data: events } = await supabase
    .from("events")
    .select("id, name, slug, status, cancelled, starts_at, max_guests, cover_image_path, cover_image_path_mobile")
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

      {!events || events.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">Engir viðburðir enn. Stofnaðu þann fyrsta.</p>
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {events.map((e) => {
            const s = stats[e.id] ?? { registered: 0, guests: 0 };
            const cover = pub(e.cover_image_path) ?? pub(e.cover_image_path_mobile);
            const pct = e.max_guests ? Math.min(100, Math.round((s.registered / e.max_guests) * 100)) : null;
            const full = e.max_guests != null && s.registered >= e.max_guests;
            const statusLabel = e.cancelled ? "Felld niður" : STATUS_LABEL[e.status] ?? e.status;
            return (
              <Link
                key={e.id}
                href={`/dashboard/events/${e.id}`}
                className="group block overflow-hidden rounded-2xl border border-border bg-surface shadow-card transition hover:-translate-y-0.5 hover:border-accent"
              >
                {/* Hero 16:9 */}
                <div className="relative aspect-[16/9] w-full overflow-hidden bg-elevated">
                  {cover ? (
                    <img
                      src={cover}
                      alt={e.name}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-elevated to-surface">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted">
                        <rect x="3" y="4" width="18" height="18" rx="2" />
                        <path d="M16 2v4M8 2v4M3 10h18" />
                      </svg>
                    </div>
                  )}
                  <span
                    className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-semibold backdrop-blur ${
                      e.cancelled
                        ? "bg-[rgba(198,40,40,0.92)] text-white"
                        : e.status === "published"
                        ? "bg-[var(--accent)] text-accent-ink"
                        : "bg-[rgba(0,0,0,0.55)] text-white"
                    }`}
                  >
                    {statusLabel}
                  </span>
                </div>

                {/* Texti + tölur */}
                <div className="p-4 sm:p-5">
                  <p className="line-clamp-2 min-h-[2.8em] font-display text-lg leading-snug text-text">{e.name}</p>
                  <p className="mt-1 text-xs text-muted">
                    {new Date(e.starts_at).toLocaleString("is-IS", { dateStyle: "medium", timeStyle: "short", timeZone: "Atlantic/Reykjavik" })}
                  </p>

                  <div className="mt-4 flex items-end justify-between">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.14em] text-muted">Skráðir</p>
                      <p className="mt-0.5 font-display text-2xl leading-none text-text">
                        {s.registered}
                        {e.max_guests != null && <span className="text-base text-muted"> / {e.max_guests}</span>}
                      </p>
                      {pct != null && (
                        <div className="mt-1.5 h-1.5 w-24 overflow-hidden rounded-full bg-elevated">
                          <div className={`h-full rounded-full ${full ? "bg-danger" : "bg-accent"}`} style={{ width: `${pct}%` }} />
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-muted">Gestir</p>
                      <p className="mt-0.5 font-display text-2xl leading-none text-text">{s.guests}</p>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
