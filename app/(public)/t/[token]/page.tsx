export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { qrDataUrl } from "@/lib/qr";
import { Eyebrow, Card } from "@/components/ui";

export default async function TicketPage({ params }: { params: { token: string } }) {
  const admin = createAdminClient();

  const { data: ticket } = await admin
    .from("tickets")
    .select("id, event_id, registration_id, table_number, seat_number, holder_type, holder_name")
    .eq("token", params.token)
    .single();
  if (!ticket) notFound();

  const [{ data: reg }, { data: event }, { data: balances }, { data: siblings }] = await Promise.all([
    admin.from("registrations").select("full_name").eq("id", ticket.registration_id).single(),
    admin.from("events").select("name, starts_at, location, drinks_enabled, qr_enabled, slug, org_id").eq("id", ticket.event_id).single(),
    admin.from("drink_account_balances").select("allowance, remaining").eq("ticket_id", ticket.id),
    admin
      .from("tickets")
      .select("token, holder_type, holder_name")
      .eq("registration_id", ticket.registration_id)
      .neq("id", ticket.id),
  ]);

  const qr = await qrDataUrl(params.token);

  const holderName =
    ticket.holder_type === "guest"
      ? ticket.holder_name || "Maki"
      : reg?.full_name || ticket.holder_name || "Gestur";

  const totalAllowance = (balances ?? []).reduce((s, b) => s + (b.allowance ?? 0), 0);
  const totalRemaining = (balances ?? []).reduce((s, b) => s + (b.remaining ?? 0), 0);
  const hasDrinks = event?.drinks_enabled && totalAllowance > 0;
  const showQr = event?.qr_enabled !== false || hasDrinks;

  // „Breyta skráningu“-hlekkur (þegar QR er ekki sýnt verður þetta staðfesting)
  let editUrl: string | null = null;
  if (event?.org_id && event?.slug) {
    const { data: org } = await admin.from("organizations").select("slug").eq("id", event.org_id).single();
    if (org?.slug) editUrl = `/${org.slug}/e/${event.slug}/min-skraning`;
  }

  const sibling = (siblings ?? [])[0];

  return (
    <main className="fk-rise mx-auto max-w-sm px-5 py-8 space-y-5">
      <div>
        <Eyebrow>{showQr ? "Aðgöngumiði" : "Staðfesting"}</Eyebrow>
        <h1 className="font-display text-2xl font-semibold text-text">{event?.name}</h1>
      </div>

      <Card accent className="flex flex-col items-center gap-4">
        {showQr && (
          <div className="rounded-2xl bg-white p-3 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.6)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt="QR miði" width={232} height={232} className="block rounded-lg" />
          </div>
        )}
        {!showQr && <p className="text-center font-display text-lg text-accent">Takk fyrir skráninguna!</p>}
        <div className="text-center">
          <p className="font-display text-xl text-text">{holderName}</p>
          {ticket.holder_type === "guest" && <p className="text-xs text-accent">Maki / +1</p>}
          <p className="mt-1 text-xs text-muted">
            {event?.starts_at
              ? new Date(event.starts_at).toLocaleString("is-IS", { dateStyle: "medium", timeStyle: "short" })
              : ""}
          </p>
          {event?.location && <p className="text-xs text-muted">{event.location}</p>}
        </div>
      </Card>

      {hasDrinks && (
        <Card accent className="text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">Drykkir eftir</p>
          <p className="mt-1.5 font-display text-[34px] leading-none text-accent">
            {totalRemaining} <span className="text-xl text-muted">af {totalAllowance}</span>
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

      {sibling && (
        <Link
          href={`/t/${sibling.token}`}
          className="block rounded-xl border border-border bg-surface px-4 py-3 text-center text-sm text-text transition hover:border-accent"
        >
          {sibling.holder_type === "guest"
            ? `Sjá miða maka: ${sibling.holder_name || "Maki"} →`
            : `Sjá aðalmiða: ${sibling.holder_name || "Gestur"} →`}
        </Link>
      )}

      {showQr ? (
        <p className="text-center text-xs text-muted">
          {event?.qr_enabled !== false ? "Sýndu þennan QR-kóða við innganginn." : "Sýndu þennan kóða á barnum."}
        </p>
      ) : (
        <>
          {editUrl && (
            <Link
              href={editUrl}
              className="block rounded-xl border border-border bg-surface px-4 py-3 text-center text-sm text-text transition hover:border-accent"
            >
              Breyta skráningu →
            </Link>
          )}
          <p className="text-center text-xs text-muted">Engan kóða þarf að sýna við inngang.</p>
        </>
      )}
    </main>
  );
}
