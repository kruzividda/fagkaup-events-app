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
    .select("id, name, slug, status, cancelled, starts_at, max_guests")
    .order("starts_at", { ascending: false });

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
        <div className="space-y-3">
          {events.map((e) => {
            const s = stats[e.id] ?? { registered: 0, guests: 0 };
            const pct = e.max_guests ? Math.min(100, Math.round((s.registered / e.max_guests) * 100)) : null;
            const full = e.max_guests != null && s.registered >= e.max_guests;
            return (
              <Link
                key={e.id}
                href={`/dashboard/events/${e.id}`}
                className="block rounded-2xl border border-border bg-surface p-5 shadow-card transition hover:border-accent"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-display text-lg text-text">{e.name}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {new Date(e.starts_at).toLocaleString("is-IS", { dateStyle: "medium", timeStyle: "short", timeZone: "Atlantic/Reykjavik" })}
                      {" · "}
                      <span className={e.cancelled ? "text-danger" : "text-accent"}>
                        {e.cancelled ? "Felld niður" : STATUS_LABEL[e.status] ?? e.status}
                      </span>
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-6">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.14em] text-muted">Skráðir</p>
                      <p className="mt-0.5 font-display text-2xl leading-none text-text">
                        {s.registered}
                        {e.max_guests != null && (
                          <span className="text-base text-muted"> / {e.max_guests}</span>
                        )}
                      </p>
                      {pct != null && (
                        <div className="mt-1.5 h-1.5 w-28 overflow-hidden rounded-full bg-elevated">
                          <div
                            className={`h-full rounded-full ${full ? "bg-danger" : "bg-accent"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.14em] text-muted">Gestir m/ maka</p>
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
