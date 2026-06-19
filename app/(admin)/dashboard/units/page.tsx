import { createClient } from "@/lib/supabase/server";
import { Eyebrow, PageTitle } from "@/components/ui";
import { UnitsManager, type Unit } from "./UnitsManager";

export default async function UnitsPage() {
  const supabase = createClient();

  const { data: units } = await supabase.from("business_units").select("id, name").order("sort_order");
  const ids = (units ?? []).map((u) => u.id);
  const { data: locs } = ids.length
    ? await supabase.from("business_unit_locations").select("id, business_unit_id, name").in("business_unit_id", ids).order("sort_order")
    : { data: [] as { id: string; business_unit_id: string; name: string }[] };

  const initial: Unit[] = (units ?? []).map((u) => ({
    id: u.id,
    name: u.name,
    locations: (locs ?? []).filter((l) => l.business_unit_id === u.id).map((l) => ({ id: l.id, name: l.name })),
  }));

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Eyebrow>Uppsetning</Eyebrow>
        <PageTitle>Rekstrareiningar</PageTitle>
        <p className="mt-2 text-sm text-muted">
          Stofnaðu deildir og útibú einu sinni. Þá verða þau smellanleg í skráningarformum — og útibú ráðast af valinni deild.
          Ef þú stofnar engar, skrifar fólk sjálft inn.
        </p>
      </div>
      <UnitsManager initial={initial} />
    </div>
  );
}
