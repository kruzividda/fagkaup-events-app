import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { qrDataUrl } from "@/lib/qr";
import { Eyebrow, Card } from "@/components/ui";

export default async function TicketPage({ params }: { params: { token: string } }) {
  const admin = createAdminClient();

  const { data: ticket } = await admin
    .from("tickets")
    .select("id, event_id, registration_id, table_number, seat_number")
    .eq("token", params.token)
    .single();
  if (!ticket) notFound();

  const [{ data: reg }, { data: event }, { data: balances }] = await Promise.all([
    admin.from("registrations").select("full_name").eq("id", ticket.registration_id).single(),
    admin.from("events").select("name, starts_at, location, drinks_enabled").eq("id", ticket.event_id).single(),
    admin
      .from("drink_account_balances")
      .select("scope, allowance, remaining")
      .eq("ticket_id", ticket.id),
  ]);

  const qr = await qrDataUrl(params.token);

  const totalAllowance = (balances ?? []).reduce((s, b) => s + (b.allowance ?? 0), 0);
  const totalRemaining = (balances ?? []).reduce((s, b) => s + (b.remaining ?? 0), 0);
  const hasDrinks = event?.drinks_enabled && totalAllowance > 0;

  return (
    <main className="mx-auto max-w-sm p-5 space-y-5">
      <div>
        <Eyebrow>Aðgöngumiði</Eyebrow>
        <h1 className="font-display text-2xl font-semibold text-text">{event?.name}</h1>
      </div>

      <Card className="flex flex-col items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qr} alt="QR miði" width={240} height={240} className="rounded-lg" />
        <div className="text-center">
          <p className="font-display text-lg text-text">{reg?.full_name}</p>
          <p className="text-xs text-muted">
            {event?.starts_at
              ? new Date(event.starts_at).toLocaleString("is-IS", { dateStyle: "medium", timeStyle: "short" })
              : ""}
          </p>
          {event?.location && <p className="text-xs text-muted">{event.location}</p>}
        </div>
      </Card>

      {hasDrinks && (
        <Card className="text-center">
          <p className="text-xs text-muted">Drykkir eftir</p>
          <p className="mt-1 font-display text-2xl text-accent">
            {totalRemaining} af {totalAllowance}
          </p>
        </Card>
      )}

      {(ticket.table_number || ticket.seat_number) && (
        <Card className="flex justify-around text-center">
          {ticket.table_number != null && (
            <div>
              <p className="text-xs text-muted">Borð</p>
              <p className="font-display text-xl text-text">{ticket.table_number}</p>
            </div>
          )}
          {ticket.seat_number != null && (
            <div>
              <p className="text-xs text-muted">Sæti</p>
              <p className="font-display text-xl text-text">{ticket.seat_number}</p>
            </div>
          )}
        </Card>
      )}

      <p className="text-center text-xs text-muted">Sýndu þennan QR-kóða við innganginn.</p>
    </main>
  );
}
