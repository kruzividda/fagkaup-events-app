import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow, PageTitle, Card } from "@/components/ui";

export default async function EventDetailPage({ params }: { params: { eventId: string } }) {
  const supabase = createClient();

  const { data: event } = await supabase
    .from("events")
    .select("name, status, starts_at, location, drinks_enabled, max_guests")
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

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <p className="text-xs text-muted">Skráðir</p>
          <p className="mt-1 font-display text-2xl text-text">{regCount ?? 0}</p>
        </Card>
        <Card>
          <p className="text-xs text-muted">Hámark</p>
          <p className="mt-1 font-display text-2xl text-text">{event.max_guests ?? "—"}</p>
        </Card>
        <Card>
          <p className="text-xs text-muted">Drykkir</p>
          <p className="mt-1 font-display text-2xl text-text">{event.drinks_enabled ? "Já" : "Nei"}</p>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href={`/dashboard/events/${params.eventId}/stats`}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-[#0B121C] transition hover:brightness-110"
        >
          Skoða tölfræði
        </Link>
        <Link
          href={`/dashboard/events/${params.eventId}/form`}
          className="rounded-lg border border-border px-4 py-2 text-sm text-text transition hover:border-accent"
        >
          Skráningarform
        </Link>
        <Link
          href="/dashboard/events"
          className="rounded-lg border border-border px-4 py-2 text-sm text-muted transition hover:text-text"
        >
          Til baka í viðburði
        </Link>
      </div>
    </div>
  );
}
