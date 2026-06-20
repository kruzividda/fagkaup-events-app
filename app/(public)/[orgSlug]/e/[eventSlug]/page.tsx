import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { LandingHeader } from "./LandingHeader";

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
    .select("id, name, description, status, starts_at, location, cover_image_path, cover_image_path_mobile")
    .eq("org_id", org.id)
    .eq("slug", params.eventSlug)
    .single();
  if (!event) notFound();

  const isOpen = event.status === "published";
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

  const Cta = ({ className = "" }: { className?: string }) => (
    <Link
      href={skraHref}
      className={`rounded-full bg-gradient-to-br from-accent to-accent-bright font-semibold text-[#0A111B] shadow-glow transition hover:brightness-110 ${className}`}
    >
      Skrá mig
    </Link>
  );

  return (
    <div className="min-h-screen">
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

        {isOpen ? (
          <div className="mt-7 hidden sm:block">
            <Cta className="inline-block px-7 py-3 text-[15px]" />
          </div>
        ) : (
          <div className="mt-7 rounded-2xl border border-border bg-surface p-5">
            <p className="text-sm text-muted">Skráning er ekki opin sem stendur.</p>
          </div>
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
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/5 bg-[rgba(10,15,22,0.8)] p-4 backdrop-blur-xl sm:hidden">
          <Link
            href={skraHref}
            className="block rounded-xl bg-gradient-to-br from-accent to-accent-bright py-3 text-center text-[15px] font-semibold text-[#0A111B] shadow-glow"
          >
            Skrá mig
          </Link>
        </div>
      )}
    </div>
  );
}
