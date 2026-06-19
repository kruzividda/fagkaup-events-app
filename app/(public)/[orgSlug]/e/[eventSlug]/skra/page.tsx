import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { Eyebrow } from "@/components/ui";
import { RegistrationForm, type FormField } from "./RegistrationForm";

export default async function RegisterPage({
  params,
}: {
  params: { orgSlug: string; eventSlug: string };
}) {
  const admin = createAdminClient();

  const { data: org } = await admin
    .from("organizations")
    .select("id")
    .eq("slug", params.orgSlug)
    .single();
  if (!org) notFound();

  const { data: event } = await admin
    .from("events")
    .select("id, name, status")
    .eq("org_id", org.id)
    .eq("slug", params.eventSlug)
    .single();
  if (!event) notFound();

  const { data: fields } = await admin
    .from("event_form_fields")
    .select("id, field_key, label, field_type, requirement, is_custom, visible_if")
    .eq("event_id", event.id)
    .neq("requirement", "hidden")
    .order("sort_order", { ascending: true });

  return (
    <main className="mx-auto max-w-lg p-5 space-y-6">
      <div>
        <Eyebrow>Skráning</Eyebrow>
        <h1 className="font-display text-2xl font-semibold text-text">{event.name}</h1>
      </div>

      {event.status !== "published" ? (
        <p className="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-muted">
          Skráning er ekki opin sem stendur.
        </p>
      ) : (
        <RegistrationForm
          eventId={event.id}
          orgSlug={params.orgSlug}
          eventSlug={params.eventSlug}
          fields={(fields ?? []) as FormField[]}
        />
      )}
    </main>
  );
}
