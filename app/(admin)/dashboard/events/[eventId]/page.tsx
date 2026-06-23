import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow, PageTitle, Card } from "@/components/ui";
import { DrinksPanel } from "./DrinksPanel";
import { EventCancelButton } from "./EventCancelButton";
import { EventPublishButton } from "./EventPublishButton";
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

  const [orgRes, eventRes, regRes, accessRes] = await Promise.all([
    supabase.from("organizations").select("slug").limit(1).single(),
    supabase
      .from("events")
      .select(
        "name, slug, status, cancelled, starts_at, location, max_guests, drinks_enabled, drinks_per_person, spouse_gets_drinks, drinks_per_spouse, uses_seating"
      )
      .eq("id", params.eventId)
      .single(),
    supabase
      .from("registrations")
      .select("id", { count: "exact", head: true })
      .eq("event_id", params.eventId)
      .eq("status", "registered"),
    supabase.rpc("list_event_access", { p_event_id: params.eventId }),
  ]);

  const orgSlug = orgRes.data?.slug ?? "fagkaup";
  const event = eventRes.data;
  if (!event) notFound();
  const regCount = regRes.count;
  const accessData = accessRes.data;
  const accessList =
    (accessData as { ok: boolean; access?: AccessInitial[] } | null)?.ok
      ? (accessData as { access?: AccessInitial[] }).access ?? []
      : [];

  return (
    <div className="max-w-2xl space-y-6">
      <Link href="/dashboard/events" className="inline-flex items-center gap-1 text-sm text-muted transition hover:text-text">
        ← Viðburðir
      </Link>

      <div>
        <Eyebrow>Viðburður</Eyebrow>
        <PageTitle>{event.name}</PageTitle>
        <p className="mt-1 text-sm text-muted">
          {new Date(event.starts_at).toLocaleString("is-IS", { dateStyle: "full", timeStyle: "short", timeZone: "Atlantic/Reykjavik" })}
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
        {event.uses_seating && (
          <Link
            href={`/dashboard/events/${params.eventId}/seating`}
            className="btn-secondary rounded-xl px-4 py-2 text-sm"
          >
            Borðaskipan
          </Link>
        )}
      </div>

      <AccessManager eventId={params.eventId} initial={accessList} />

      {event.drinks_enabled && (
        <DrinksPanel
          eventId={params.eventId}
          drinksEnabled={event.drinks_enabled}
          perPerson={event.drinks_per_person ?? 0}
          spouseGets={event.spouse_gets_drinks}
          perSpouse={event.drinks_per_spouse ?? 0}
        />
      )}

      <div className="border-t border-border pt-5">
        <p className="mb-3 text-[11px] uppercase tracking-[0.14em] text-muted">Staða viðburðar</p>
        <div className="flex flex-wrap gap-2">
          <EventPublishButton eventId={params.eventId} status={event.status} />
          <EventCancelButton eventId={params.eventId} cancelled={!!event.cancelled} />
        </div>
      </div>
    </div>
  );
}
