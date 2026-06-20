import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { LandingHeader } from "./LandingHeader";
import { Countdown } from "./Countdown";

export default async function EventLanding({
  params,
}: {
  params: { orgSlug: string; eventSlug: string };
}) {
  const admin = createAdminClient();

  const { data: org } = await admin.from("organizations").select("id, name").eq("slug", params.orgSlug).single();
  if (!org) notFound();

  const { data: event } = await admin
    .from("events")
    .select("id, name, description, status, cancelled, registration_opens_at, registration_closes_at, starts_at, location, cover_image_path, cover_image_path_mobile, theme")
    .eq("org_id", org.id)
    .eq("slug", params.eventSlug)
    .single();
  if (!event) notFound();

  const opensAt = event.registration_opens_at ? new Date(event.registration_opens_at) : null;
  const notYetOpen = !!opensAt && Date.now() < opensAt.getTime();
  const closesAt = event.registration_closes_at ? new Date(event.registration_closes_at) : null;
  const closed = !!closesAt && Date.now() > closesAt.getTime();
  const isCancelled = !!event.cancelled;
  const isOpen = event.status === "published" && !isCancelled && !notYetOpen && !closed;
  const pub = (p: string | null) => (p ? admin.storage.from("event-media").getPublicUrl(p).data.publicUrl : null);
  const desk = pub(event.cover_image_path);
  const mob = pub(event.cover_image_path_mobile);
  const heroDesktop = desk ?? mob;
  const heroMobile = mob ?? desk;

  const dateStr = new Date(event.starts_at).toLocaleString("is-IS", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Atlantic/Reykjavik",
  });
  const skraHref = `/${params.orgSlug}/e/${params.eventSlug}/skra`;
  const opensStr = opensAt
    ? opensAt.toLocaleString("is-IS", { dateStyle: "long", timeStyle: "short", timeZone: "Atlantic/Reykjavik" })
    : "";
  const closesStr = closesAt
    ? closesAt.toLocaleString("is-IS", { dateStyle: "long", timeStyle: "short", timeZone: "Atlantic/Reykjavik" })
    : "";

  const Cta = ({ className = "" }: { className?: string }) => (
    <Link
      href={skraHref}
      className={`rounded-full bg-gradient-to-br from-accent to-accent-bright font-semibold text-accent-ink shadow-glow transition hover:brightness-110 ${className}`}
    >
      Skrá mig
    </Link>
  );

  return (
    <div
      data-theme={event.theme ?? "glamour"}
      className={`min-h-screen ${event.theme === "fagkaup" ? "bg-bg text-text" : ""}`}
    >
      {/* Fastur efsti borði — birtir nafn/takka aðeins þegar skrollað er */}
      <LandingHeader eventName={event.name} isOpen={isOpen} skraHref={skraHref} />

      <main className="mx-auto max-w-6xl px-5 pb-28 pt-4 sm:pb-14">
        <header className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-accent">{org.name}</p>
            <h1 className="font-display text-3xl font-semibold leading-[1.08] text-text sm:text-[44px]">{event.name}</h1>
            <p className="text-sm text-muted">
              {event.location ? `${event.location} · ` : ""}
              {dateStr}
            </p>
          </div>
          {isOpen && <Cta className="mt-1 hidden shrink-0 px-6 py-3 text-[15px] sm:inline-block" />}
        </header>

        {heroDesktop && (
          <div className="mt-6 overflow-hidden rounded-2xl border border-border shadow-card">
            <picture className="block">
              {heroMobile && <source media="(max-width: 639px)" srcSet={heroMobile} />}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={heroDesktop} alt={event.name} className="h-auto w-full object-cover" />
            </picture>
          </div>
        )}

        {event.description && (
          <div className="mt-6 max-w-3xl rounded-2xl border border-border bg-surface p-5 sm:p-6">
            <p className="whitespace-pre-line text-[15px] leading-relaxed text-text">{event.description}</p>
          </div>
        )}

        {isCancelled ? (
          <div className="mt-7 rounded-2xl border border-danger bg-[rgba(229,103,91,0.08)] p-5">
            <p className="text-sm font-semibold text-danger">Þessum viðburði hefur verið aflýst.</p>
          </div>
        ) : notYetOpen && event.status === "published" ? (
          <div className="mt-7 space-y-3 rounded-2xl border border-border bg-surface p-5">
            <p className="text-sm text-muted">Skráning opnar {opensStr}.</p>
            <Countdown target={event.registration_opens_at as string} />
            <span className="inline-block cursor-not-allowed rounded-full bg-elevated px-7 py-3 text-[15px] font-semibold text-muted">
              Skrá mig
            </span>
          </div>
        ) : closed && event.status === "published" ? (
          <div className="mt-7 rounded-2xl border border-border bg-surface p-5">
            <p className="text-sm text-muted">Skráningu er lokið{closesStr ? ` (lokaðist ${closesStr})` : ""}.</p>
          </div>
        ) : isOpen ? (
          <div className="mt-7 hidden sm:block">
            <Cta className="inline-block px-7 py-3 text-[15px]" />
          </div>
        ) : (
          <div className="mt-7 rounded-2xl border border-border bg-surface p-5">
            <p className="text-sm text-muted">Skráning er ekki opin sem stendur.</p>
          </div>
        )}

        {isOpen && closesStr && (
          <p className="mt-3 text-[13px] text-muted">Skráning er opin til {closesStr}.</p>
        )}

        <p className="mt-4">
          <Link
            href={`/${params.orgSlug}/e/${params.eventSlug}/min-skraning`}
            className="text-[13px] text-muted underline-offset-4 hover:text-accent hover:underline"
          >
            Breyttu skráningu þinni eða afbókaðu hér. →
          </Link>
        </p>

        <p className="mt-10 text-[12px] text-muted">Fagkaup Events</p>
      </main>

      {/* Fljótandi takki á síma */}
      {isOpen && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-[var(--bar-bg)] p-4 backdrop-blur-xl sm:hidden">
          <Link
            href={skraHref}
            className="block rounded-xl bg-gradient-to-br from-accent to-accent-bright py-3 text-center text-[15px] font-semibold text-accent-ink shadow-glow"
          >
            Skrá mig
          </Link>
        </div>
      )}
    </div>
  );
}
