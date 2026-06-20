export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { Eyebrow, Card } from "@/components/ui";
import { RegistrationForm, type FormField } from "./RegistrationForm";

export default async function RegisterPage({
  params,
}: {
  params: { orgSlug: string; eventSlug: string };
}) {
  const admin = createAdminClient();

  const { data: org } = await admin.from("organizations").select("id").eq("slug", params.orgSlug).single();
  if (!org) notFound();

  const { data: event } = await admin
    .from("events")
    .select("id, name, status, description, starts_at, location, cover_image_path")
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

  const ids = (fields ?? []).map((f) => f.id);
  const { data: options } = ids.length
    ? await admin.from("event_field_options").select("field_id, value, label, sort_order").in("field_id", ids).order("sort_order")
    : { data: [] as { field_id: string; value: string; label: string }[] };

  const optsByField = new Map<string, { value: string; label: string }[]>();
  for (const o of options ?? []) {
    const arr = optsByField.get(o.field_id) ?? [];
    arr.push({ value: o.value, label: o.label });
    optsByField.set(o.field_id, arr);
  }

  const formFields: FormField[] = (fields ?? []).map((f) => ({
    id: f.id,
    field_key: f.field_key,
    label: f.label,
    field_type: f.field_type as FormField["field_type"],
    requirement: f.requirement as FormField["requirement"],
    is_custom: f.is_custom,
    visible_if: (f.visible_if as FormField["visible_if"]) ?? null,
    options: optsByField.get(f.id) ?? [],
  }));

  // Rekstrareiningar + útibú (org-level) fyrir smellanlega reiti
  const { data: units } = await admin.from("business_units").select("id, name").eq("org_id", org.id).order("sort_order");
  const unitIds = (units ?? []).map((u) => u.id);
  const { data: locs } = unitIds.length
    ? await admin.from("business_unit_locations").select("business_unit_id, name").in("business_unit_id", unitIds).order("sort_order")
    : { data: [] as { business_unit_id: string; name: string }[] };
  const orgUnits = (units ?? []).map((u) => ({
    name: u.name,
    locations: (locs ?? []).filter((l) => l.business_unit_id === u.id).map((l) => l.name),
  }));

  const pub = (p: string | null) => (p ? admin.storage.from("event-media").getPublicUrl(p).data.publicUrl : null);
  const desk = pub(event.cover_image_path);
  const mob = pub(event.cover_image_path_mobile);
  const heroDesktop = desk ?? mob;
  const heroMobile = mob ?? desk;

  return (
    <div className="relative min-h-screen">
      {/* Hero bakgrunnur — fastur, sést í gegnum sandblásna glerið */}
      {heroDesktop && (
        <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
          <picture>
            {heroMobile && <source media="(max-width: 639px)" srcSet={heroMobile} />}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={heroDesktop} alt="" className="h-full w-full object-cover" />
          </picture>
          <div className="absolute inset-0 bg-gradient-to-b from-[rgba(8,12,18,0.30)] via-[rgba(8,12,18,0.55)] to-[rgba(8,12,18,0.94)]" />
        </div>
      )}

      <main className="relative z-10 min-h-screen">
        {/* Bil sem sýnir hero efst */}
        {heroDesktop && <div className="h-[36vh] sm:h-[40vh]" />}

        {/* Glerflöturinn sem skrollar yfir hero */}
        <div
          className={`min-h-screen border-t border-white/10 ${
            heroDesktop ? "rounded-t-[28px] bg-[rgba(11,16,23,0.55)] backdrop-blur-2xl" : ""
          }`}
        >
          <div className="mx-auto max-w-lg space-y-6 px-5 pb-20 pt-8 sm:pt-10">
            <header className="space-y-3">
              <Eyebrow>Skráning</Eyebrow>
              <h1 className="font-display text-[32px] font-semibold leading-[1.1] text-text">{event.name}</h1>
              {(event.starts_at || event.location) && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {event.starts_at && (
                    <span className="rounded-full border border-white/10 bg-[rgba(255,255,255,0.06)] px-3 py-1.5 text-[13px] text-text backdrop-blur">
                      {new Date(event.starts_at).toLocaleString("is-IS", {
                        dateStyle: "long",
                        timeStyle: "short",
                        timeZone: "Atlantic/Reykjavik",
                      })}
                    </span>
                  )}
                  {event.location && (
                    <span className="rounded-full border border-white/10 bg-[rgba(255,255,255,0.06)] px-3 py-1.5 text-[13px] text-text backdrop-blur">
                      {event.location}
                    </span>
                  )}
                </div>
              )}
            </header>

            {event.status !== "published" ? (
              <Card>
                <p className="text-sm text-muted">Skráning er ekki opin sem stendur.</p>
              </Card>
            ) : (
              <Card accent className="sm:p-7">
                <RegistrationForm
                  eventId={event.id}
                  orgSlug={params.orgSlug}
                  eventSlug={params.eventSlug}
                  fields={formFields}
                  orgUnits={orgUnits}
                />
              </Card>
            )}

            <p className="text-center text-[12px] text-muted">Fagkaup Events</p>
          </div>
        </div>
      </main>
    </div>
  );
}
