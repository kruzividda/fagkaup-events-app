import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { Eyebrow, Card } from "@/components/ui";

export default async function EventLanding({
  params,
}: {
  params: { orgSlug: string; eventSlug: string };
}) {
  const admin = createAdminClient();

  const { data: org } = await admin
    .from("organizations")
    .select("id, name")
    .eq("slug", params.orgSlug)
    .single();
  if (!org) notFound();

  const { data: event } = await admin
    .from("events")
    .select("id, name, description, status, starts_at, location, location_address")
    .eq("org_id", org.id)
    .eq("slug", params.eventSlug)
    .single();
  if (!event) notFound();

  const isOpen = event.status === "published";

  return (
    <main className="mx-auto max-w-lg p-5 space-y-6">
      <div>
        <Eyebrow>{org.name}</Eyebrow>
        <h1 className="font-display text-3xl font-semibold text-text">{event.name}</h1>
        <p className="mt-2 text-sm text-muted">
          {new Date(event.starts_at).toLocaleString("is-IS", { dateStyle: "full", timeStyle: "short" })}
        </p>
        {event.location && <p className="text-sm text-muted">{event.location}</p>}
      </div>

      {event.description && (
        <Card>
          <p className="whitespace-pre-line text-sm text-text">{event.description}</p>
        </Card>
      )}

      {isOpen ? (
        <Link
          href={`/${params.orgSlug}/e/${params.eventSlug}/skra`}
          className="inline-block rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-[#0B121C] transition hover:brightness-110"
        >
          Skrá mig
        </Link>
      ) : (
        <Card>
          <p className="text-sm text-muted">Skráning er ekki opin sem stendur.</p>
        </Card>
      )}
    </main>
  );
}
