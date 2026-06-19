import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow, PageTitle } from "@/components/ui";
import { GuestList, type GuestRow } from "./GuestList";

export const dynamic = "force-dynamic";

export default async function GuestsPage({ params }: { params: { eventId: string } }) {
  const supabase = createClient();
  const id = params.eventId;

  const { data: event } = await supabase.from("events").select("name").eq("id", id).single();
  if (!event) notFound();

  const [regsRes, ticketsRes, checkinsRes] = await Promise.all([
    supabase
      .from("registrations")
      .select("id, full_name, email, phone, company, business_unit, location, dietary, has_plus_one, spouse_name, created_at")
      .eq("event_id", id)
      .eq("status", "registered")
      .order("full_name", { ascending: true }),
    supabase.from("tickets").select("id, registration_id, holder_type").eq("event_id", id),
    supabase.from("check_ins").select("ticket_id, checked_in_at").eq("event_id", id),
  ]);

  const regs = regsRes.data ?? [];
  const tickets = ticketsRes.data ?? [];
  const checkins = checkinsRes.data ?? [];

  const checkinByTicket = new Map(checkins.map((c) => [c.ticket_id, c.checked_in_at]));
  const primaryByReg = new Map<string, string>();
  const spouseByReg = new Map<string, string>();
  for (const t of tickets) {
    if (t.holder_type === "guest") spouseByReg.set(t.registration_id, t.id);
    else primaryByReg.set(t.registration_id, t.id);
  }

  const rows: GuestRow[] = regs.map((r) => {
    const pt = primaryByReg.get(r.id);
    const st = spouseByReg.get(r.id);
    const checkedInAt = pt ? checkinByTicket.get(pt) ?? null : null;
    return {
      id: r.id,
      name: r.full_name ?? "—",
      email: r.email ?? null,
      phone: r.phone ?? null,
      company: r.company ?? null,
      unit: r.business_unit ?? null,
      location: r.location ?? null,
      dietary: r.dietary ?? null,
      attended: !!checkedInAt,
      checkedInAt,
      hasSpouse: !!r.has_plus_one,
      spouseName: r.spouse_name ?? null,
      spouseAttended: st ? checkinByTicket.has(st) : false,
    };
  });

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Eyebrow>Gestalisti</Eyebrow>
          <PageTitle>{event.name}</PageTitle>
        </div>
        <Link href={`/dashboard/events/${id}/stats`} className="text-xs text-muted hover:text-text">
          ← Tölfræði
        </Link>
      </div>

      <GuestList rows={rows} />
    </div>
  );
}
