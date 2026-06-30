export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow, PageTitle } from "@/components/ui";
import { BodslistiManager, type InviteRow } from "./BodslistiManager";

export default async function BodslistiPage({ params }: { params: { eventId: string } }) {
  const id = params.eventId;
  const supabase = createClient();

  const { data: event } = await supabase.from("events").select("name").eq("id", id).maybeSingle();
  if (!event) notFound();

  const [invRes, regRes, ticketRes, checkinRes] = await Promise.all([
    supabase.from("invitations").select("id, full_name, email, company, business_unit, status, registration_id").eq("event_id", id),
    supabase.from("registrations").select("id, email, status").eq("event_id", id),
    supabase.from("tickets").select("id, registration_id").eq("event_id", id),
    supabase.from("check_ins").select("ticket_id").eq("event_id", id),
  ]);

  const invitations = invRes.data ?? [];
  const regs = regRes.data ?? [];
  const tickets = ticketRes.data ?? [];
  const checkins = checkinRes.data ?? [];

  // skráning eftir netfangi (aðeins virkar skráningar)
  const regByEmail = new Map<string, string>();
  for (const r of regs) {
    if (r.status === "registered" && r.email) regByEmail.set(r.email.toLowerCase().trim(), r.id);
  }
  // hvaða skráningar eru innritaðar (einhver miði tékkaður inn)
  const checkedTickets = new Set(checkins.map((c) => c.ticket_id));
  const checkedRegs = new Set<string>();
  for (const t of tickets) {
    if (t.registration_id && checkedTickets.has(t.id)) checkedRegs.add(t.registration_id);
  }

  const rows: InviteRow[] = invitations.map((inv) => {
    const regId = inv.registration_id ?? regByEmail.get((inv.email ?? "").toLowerCase().trim()) ?? null;
    let status: InviteRow["status"];
    if (regId && checkedRegs.has(regId)) status = "attended";
    else if (regId) status = "registered";
    else if (inv.status === "declined") status = "declined";
    else status = "invited";
    return {
      id: inv.id,
      full_name: inv.full_name ?? null,
      email: inv.email,
      company: inv.company ?? null,
      business_unit: inv.business_unit ?? null,
      status,
    };
  });

  const total = rows.length;
  const registered = rows.filter((r) => r.status === "registered" || r.status === "attended").length;
  const attended = rows.filter((r) => r.status === "attended").length;
  const rate = total > 0 ? Math.round((attended / total) * 100) : 0;

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Link href={`/dashboard/events/${id}`} className="text-sm text-muted transition hover:text-text">
          ← {event.name}
        </Link>
        <div className="mt-2">
          <Eyebrow>Viðburður</Eyebrow>
          <PageTitle>Boðslisti</PageTitle>
        </div>
        <p className="mt-2 text-sm text-muted">
          Flyttu inn boðslista úr CSV og fylgstu með hverjir hafa skráð sig og mætt. Skráning og mæting uppfærast
          sjálfkrafa þegar gestir skrá sig (með sama netfangi) og þegar þeir eru innritaðir við dyr.
        </p>
      </div>

      <BodslistiManager
        eventId={id}
        eventName={event.name}
        initial={rows}
        counts={{ total, registered, attended, rate }}
      />
    </div>
  );
}
