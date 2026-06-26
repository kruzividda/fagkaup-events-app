export const dynamic = "force-dynamic";

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow, PageTitle, Card } from "@/components/ui";
import { EVENT_TYPE_OPTIONS } from "@/lib/event-templates";

export default async function FormTemplatesPage() {
  const supabase = createClient();

  // Sniðmáts-viðburðir org-sins + fjöldi reita per tegund
  const { data: templates } = await supabase
    .from("events")
    .select("id, event_type")
    .eq("is_template", true);

  const ids = (templates ?? []).map((t) => t.id);
  const countByType = new Map<string, number>();
  if (ids.length) {
    const { data: fields } = await supabase.from("event_form_fields").select("event_id").in("event_id", ids);
    const byEvent = new Map<string, number>();
    for (const f of fields ?? []) byEvent.set(f.event_id, (byEvent.get(f.event_id) ?? 0) + 1);
    for (const t of templates ?? []) countByType.set(t.event_type, byEvent.get(t.id) ?? 0);
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Eyebrow>Skráningarform</Eyebrow>
        <PageTitle>Form sniðmát</PageTitle>
        <p className="mt-2 text-sm text-muted">
          Stilltu sjálfgefið skráningarform fyrir hverja viðburðartegund. Nýir viðburðir af þeirri tegund fá afrit
          af sniðmátinu — sem þú getur svo breytt frekar á hverjum viðburði fyrir sig. Breytingar á sniðmáti hafa
          ekki áhrif á viðburði sem þegar eru til.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {EVENT_TYPE_OPTIONS.map((opt) => {
          const count = countByType.get(opt.value);
          const custom = count !== undefined;
          return (
            <Link key={opt.value} href={`/dashboard/form-templates/${opt.value}`}>
              <Card className="flex h-full items-center justify-between gap-3 transition hover:border-accent">
                <div>
                  <p className="font-display text-base text-text">{opt.label}</p>
                  <p className="text-[13px] text-muted">
                    {custom ? `Sérsniðið · ${count} reitir` : "Sjálfgefið form"}
                  </p>
                </div>
                <span className="text-muted">→</span>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
