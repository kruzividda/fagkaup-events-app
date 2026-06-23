"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { EVENT_TYPE_OPTIONS } from "@/components/form";

const STATUS_LABEL: Record<string, string> = {
  draft: "Drög",
  published: "Birtur",
  closed: "Lokaður",
  archived: "Geymdur",
};

const TYPE_LABEL: Record<string, string> = Object.fromEntries(EVENT_TYPE_OPTIONS.map((o) => [o.value, o.label]));

export type EventItem = {
  id: string;
  name: string;
  status: string;
  cancelled: boolean;
  starts_at: string;
  event_type: string;
  max_guests: number | null;
  cover: string | null;
  registered: number;
  guests: number;
};

function EventCard({ e }: { e: EventItem }) {
  const pct = e.max_guests ? Math.min(100, Math.round((e.registered / e.max_guests) * 100)) : null;
  const full = e.max_guests != null && e.registered >= e.max_guests;
  const statusLabel = e.cancelled ? "Felld niður" : STATUS_LABEL[e.status] ?? e.status;
  return (
    <Link
      href={`/dashboard/events/${e.id}`}
      className="group block overflow-hidden rounded-2xl border border-border bg-surface shadow-card transition hover:-translate-y-0.5 hover:border-accent"
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-elevated">
        {e.cover ? (
          <Image
            src={e.cover}
            alt={e.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
            className="object-cover transition duration-500 group-hover:scale-[1.04]"
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
        <span className="absolute right-3 top-3 rounded-full bg-[rgba(0,0,0,0.55)] px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
          {TYPE_LABEL[e.event_type] ?? "Viðburður"}
        </span>
      </div>

      <div className="p-4 sm:p-5">
        <p className="line-clamp-2 min-h-[2.8em] font-display text-lg leading-snug text-text">{e.name}</p>
        <p className="mt-1 text-xs text-muted">
          {new Date(e.starts_at).toLocaleString("is-IS", { dateStyle: "medium", timeStyle: "short", timeZone: "Atlantic/Reykjavik" })}
        </p>

        <div className="mt-4 flex items-end justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted">Skráðir</p>
            <p className="mt-0.5 font-display text-2xl leading-none text-text">
              {e.registered}
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
            <p className="mt-0.5 font-display text-2xl leading-none text-text">{e.guests}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}

export function EventsBrowser({ items, nowIso }: { items: EventItem[]; nowIso: string }) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("");

  const { upcoming, past } = useMemo(() => {
    const now = new Date(nowIso).getTime();
    const q = query.trim().toLowerCase();
    const filtered = items.filter(
      (e) => (type === "" || e.event_type === type) && (q === "" || e.name.toLowerCase().includes(q))
    );
    const up = filtered
      .filter((e) => new Date(e.starts_at).getTime() >= now)
      .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
    const pa = filtered
      .filter((e) => new Date(e.starts_at).getTime() < now)
      .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());
    return { upcoming: up, past: pa };
  }, [items, query, type, nowIso]);

  const total = upcoming.length + past.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Leita að viðburði…"
            className="w-full rounded-xl border border-border bg-surface py-2.5 pl-9 pr-3 text-sm text-text outline-none transition focus:border-accent"
          />
        </div>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text outline-none transition focus:border-accent sm:w-64"
        >
          <option value="">Allar tegundir</option>
          {EVENT_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {total === 0 ? (
        <p className="rounded-2xl border border-border bg-surface px-4 py-6 text-center text-sm text-muted">
          {items.length === 0 ? "Engir viðburðir enn. Stofnaðu þann fyrsta." : "Enginn viðburður passar við leitina."}
        </p>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {upcoming.map((e) => (
                <EventCard key={e.id} e={e} />
              ))}
            </div>
          )}

          {past.length > 0 && (
            <>
              <div className="flex items-center gap-3 pt-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Liðnir viðburðir</span>
                <span className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted">{past.length}</span>
              </div>
              <div className="grid gap-5 opacity-75 sm:grid-cols-2 xl:grid-cols-3">
                {past.map((e) => (
                  <EventCard key={e.id} e={e} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
