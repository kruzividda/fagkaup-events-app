import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow, PageTitle, Card } from "@/components/ui";
import { DrinksPanel } from "./DrinksPanel";

export const dynamic = "force-dynamic";

export default async function EventDetailPage({ params }: { params: { eventId: string } }) {
  const supabase = createClient();

  const { data: event } = await supabase
    .from("events")
    .select(
      "name, status, starts_at, location, max_guests, drinks_enabled, drinks_per_person, spouse_gets_drinks, drinks_per_spouse, uses_seating"
    )
    .eq("id", params.eventId)
    .single();
  if (!event) notFound();

  const { count: regCount } = await supabase
    .from("registrations")
    .select("id", { count: "exact", head: true })
    .eq("event_id", params.eventId)
    .eq("status", "registered");

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Eyebrow>Viðburður</Eyebrow>
        <PageTitle>{event.name}</PageTitle>
        <p className="mt-1 text-sm text-muted">
          {new Date(event.starts_at).toLocaleString("is-IS", { dateStyle: "full", timeStyle: "short" })}
          {event.location ? ` · ${event.location}` : ""}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Card>
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted">Skráðir</p>
          <p className="mt-1 font-display text-2xl text-text">{regCount ?? 0}</p>
        </Card>
        <Card>
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted">Hámark</p>
          <p className="mt-1 font-display text-2xl text-text">{event.max_guests ?? "—"}</p>
        </Card>
        <Card>
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted">Drykkir</p>
          <p className="mt-1 font-display text-2xl text-text">{event.drinks_enabled ? "Já" : "Nei"}</p>
        </Card>
        <Card>
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted">Borðaskipan</p>
          <p className="mt-1 font-display text-2xl text-text">{event.uses_seating ? "Já" : "Nei"}</p>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href={`/dashboard/events/${params.eventId}/stats`}
          className="rounded-xl bg-gradient-to-br from-accent to-accent-bright px-4 py-2 text-sm font-semibold text-[#0A111B] shadow-glow transition hover:brightness-105"
        >
          Skoða tölfræði
        </Link>
        <Link
          href={`/dashboard/events/${params.eventId}/edit`}
          className="rounded-xl border border-border px-4 py-2 text-sm text-text transition hover:border-accent"
        >
          Breyta viðburði
        </Link>
        <Link
          href={`/dashboard/events/${params.eventId}/form`}
          className="rounded-xl border border-border px-4 py-2 text-sm text-text transition hover:border-accent"
        >
          Skráningarform
        </Link>
        <Link
          href="/dashboard/events"
          className="rounded-xl border border-border px-4 py-2 text-sm text-muted transition hover:text-text"
        >
          Til baka
        </Link>
      </div>

      <DrinksPanel
        eventId={params.eventId}
        drinksEnabled={event.drinks_enabled}
        perPerson={event.drinks_per_person ?? 0}
        spouseGets={event.spouse_gets_drinks}
        perSpouse={event.drinks_per_spouse ?? 0}
      />
    </div>
  );
}
