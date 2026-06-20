import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow, PageTitle, Card } from "@/components/ui";
import { EventRowActions } from "./EventRowActions";

const STATUS_LABEL: Record<string, string> = {
  draft: "Drög",
  published: "Birtur",
  closed: "Lokaður",
  archived: "Geymdur",
};

export default async function EventsPage() {
  const supabase = createClient();

  const { data: org } = await supabase.from("organizations").select("slug").limit(1).single();
  const orgSlug = org?.slug ?? "fagkaup";

  const { data: events } = await supabase
    .from("events")
    .select("id, name, slug, status, cancelled, starts_at, max_guests")
    .order("starts_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <Eyebrow>Viðburðir</Eyebrow>
          <PageTitle>Allir viðburðir</PageTitle>
        </div>
        <Link
          href="/dashboard/events/new"
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-[#0B121C] transition hover:brightness-110"
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
          {events.map((e) => (
            <Card key={e.id} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Link
                  href={`/dashboard/events/${e.id}`}
                  className="font-display text-lg text-text transition hover:text-accent"
                >
                  {e.name}
                </Link>
                <p className="text-xs text-muted">
                  {new Date(e.starts_at).toLocaleString("is-IS", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                  {" · "}
                  <span className="text-accent">{STATUS_LABEL[e.status] ?? e.status}</span>
                  {e.cancelled && <span className="ml-2 rounded-full border border-danger px-2 py-0.5 text-[11px] text-danger">Felld niður</span>}
                </p>
              </div>
              <EventRowActions
                eventId={e.id}
                status={e.status}
                publicPath={`/${orgSlug}/e/${e.slug}`}
              />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
