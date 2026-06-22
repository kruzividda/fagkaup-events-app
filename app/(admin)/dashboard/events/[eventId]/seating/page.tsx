import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow, PageTitle } from "@/components/ui";
import { LiveRefresh } from "@/components/LiveRefresh";
import { SeatingManager, type SeatTable, type Person } from "./SeatingManager";

export const dynamic = "force-dynamic";

export default async function SeatingPage({ params }: { params: { eventId: string } }) {
  const supabase = createClient();
  const id = params.eventId;

  const { data: event } = await supabase.from("events").select("name, uses_seating").eq("id", id).single();
  if (!event) notFound();

  const [tablesRes, regsRes, ticketsRes] = await Promise.all([
    supabase.from("event_tables").select("id, table_number, label, capacity").eq("event_id", id).order("table_number", { ascending: true }),
    supabase.from("registrations").select("id, full_name, status, spouse_name, company, business_unit, location").eq("event_id", id).eq("status", "registered"),
    supabase.from("tickets").select("id, registration_id, holder_type, holder_name, table_number, seat_number").eq("event_id", id),
  ]);

  const tables = (tablesRes.data ?? []) as SeatTable[];
  type Reg = { id: string; full_name: string; status: string; spouse_name: string | null; company: string | null; business_unit: string | null; location: string | null };
  const regById = new Map<string, Reg>((regsRes.data as Reg[] | null ?? []).map((r) => [r.id, r]));

  const people: Person[] = (ticketsRes.data ?? [])
    .filter((t) => regById.has(t.registration_id))
    .map((t) => {
      const reg = regById.get(t.registration_id)!;
      const name = t.holder_type === "primary" ? reg.full_name : t.holder_name || reg.spouse_name || "+1";
      return {
        ticket_id: t.id,
        name,
        holder_type: t.holder_type,
        table_number: t.table_number,
        seat_number: t.seat_number,
        company: reg.company,
        business_unit: reg.business_unit,
        location: reg.location,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "is"));

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href={`/dashboard/events/${id}`} className="text-sm text-muted hover:text-text">
          ← Til baka í viðburð
        </Link>
        <div className="mt-2 flex items-center justify-between gap-3">
          <div>
            <Eyebrow>Borðaskipan</Eyebrow>
            <PageTitle>{event.name}</PageTitle>
          </div>
          <LiveRefresh eventId={id} tables={["registrations", "tickets"]} />
        </div>
        {!event.uses_seating && (
          <p className="mt-2 rounded-lg border border-border bg-surface px-3 py-2 text-[13px] text-muted">
            Ábending: „Nota borðaskipan“ er ekki virkt fyrir þennan viðburð. Þú getur samt úthlutað borðum hér — þau birtast á
            miðum gesta. Kveiktu á valkostinum í stillingum viðburðar ef þú vilt.
          </p>
        )}
      </div>

      <SeatingManager eventId={id} initialTables={tables} initialPeople={people} />
    </div>
  );
}
