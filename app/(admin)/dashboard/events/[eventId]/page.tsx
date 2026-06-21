import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow, PageTitle, Card } from "@/components/ui";
import { DrinksPanel } from "./DrinksPanel";
import { EventCancelButton } from "./EventCancelButton";
import { EventActions } from "./EventActions";
import { AccessManager } from "./AccessManager";

export const dynamic = "force-dynamic";

type AccessInitial = {
  id: string;
  role: string;
  label: string;
  token: string;
  access_starts_at: string | null;
  access_ends_at: string | null;
  active: boolean;
  created_at: string;
};

export default async function EventDetailPage({ params }: { params: { eventId: string } }) {
  const supabase = createClient();

  const { data: org } = await supabase.from("organizations").select("slug").limit(1).single();
  const orgSlug = org?.slug ?? "fagkaup";

  const { data: event } = await supabase
    .from("events")
    .select(
      "name, slug, status, cancelled, starts_at, location, max_guests, drinks_enabled, drinks_per_person, spouse_gets_drinks, drinks_per_spouse, uses_seating"
    )
    .eq("id", params.eventId)
    .single();
  if (!event) notFound();

  const { count: regCount } = await supabase
    .from("registrations")
    .select("id", { count: "exact", head: true })
    .eq("event_id", params.eventId)
    .eq("status", "registered");

  const { data: accessData } = await supabase.rpc("list_event_access", { p_event_id: params.eventId });
  const accessList =
    (accessData as { ok: boolean; access?: AccessInitial[] } | null)?.ok
      ? (accessData as { access?: AccessInitial[] }).access ?? []
      : [];

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

      {event.cancelled && (
        <div className="rounded-xl border border-danger bg-[rgba(229,103,91,0.08)] px-4 py-3 text-sm text-danger">
          ⛔ Þessum viðburði hefur verið aflýst. Skráningarsíðan sýnir gestum að viðburðinum sé aflýst og engar nýjar skráningar berast.
        </div>
      )}

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
          className="rounded-xl bg-gradient-to-br from-accent to-accent-bright px-4 py-2 text-sm font-semibold text-accent-ink shadow-glow transition hover:brightness-105"
        >
          Skoða tölfræði
        </Link>
        <EventActions eventId={params.eventId} status={event.status} publicPath={`/${orgSlug}/e/${event.slug}`} />
        <Link
          href={`/dashboard/events/${params.eventId}/edit`}
          className="btn-secondary rounded-xl px-4 py-2 text-sm"
        >
          Breyta viðburði
        </Link>
        <Link
          href={`/dashboard/events/${params.eventId}/guests`}
          className="btn-secondary rounded-xl px-4 py-2 text-sm"
        >
          Gestalisti
        </Link>
        <Link
          href={`/dashboard/events/${params.eventId}/form`}
          className="btn-secondary rounded-xl px-4 py-2 text-sm"
        >
          Skráningarform
        </Link>
        <Link
          href="/dashboard/events"
          className="btn-secondary rounded-xl px-4 py-2 text-sm"
        >
          Til baka
        </Link>
        <EventCancelButton eventId={params.eventId} cancelled={!!event.cancelled} />
      </div>

      <DrinksPanel
        eventId={params.eventId}
        drinksEnabled={event.drinks_enabled}
        perPerson={event.drinks_per_person ?? 0}
        spouseGets={event.spouse_gets_drinks}
        perSpouse={event.drinks_per_spouse ?? 0}
      />

      <AccessManager eventId={params.eventId} initial={accessList} />
    </div>
  );
}
