import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow, PageTitle, Card, StatCard, BarRow } from "@/components/ui";
import { LiveRefresh } from "@/components/LiveRefresh";

type Reg = { id: string; status: string; company: string | null; business_unit: string | null; location: string | null };
type Ticket = { id: string; registration_id: string };
type CheckIn = { ticket_id: string };
type Account = { id: string; ticket_id: string | null; scope: string; allowance: number };
type Redemption = { account_id: string; ticket_id: string | null; quantity: number; redeemed_by: string | null; redeemed_at: string };
type Profile = { id: string; full_name: string };

function groupAttendance(regs: Reg[], attended: Set<string>, key: keyof Reg) {
  const map = new Map<string, { total: number; attended: number }>();
  for (const r of regs) {
    const k = (r[key] as string) || "Óskráð";
    const cur = map.get(k) ?? { total: 0, attended: 0 };
    cur.total++;
    if (attended.has(r.id)) cur.attended++;
    map.set(k, cur);
  }
  return [...map.entries()]
    .map(([label, v]) => ({ label, ...v }))
    .sort((a, b) => b.total - a.total);
}

function statLabel(raw: unknown, type: string): string {
  if (raw === null || raw === undefined || raw === "") return "Óskráð";
  if (type === "boolean" || typeof raw === "boolean") return raw ? "Já" : "Nei";
  if (Array.isArray(raw)) return raw.join(", ");
  return String(raw);
}

function groupByAnswer(
  regs: Reg[],
  attended: Set<string>,
  fieldId: string,
  type: string,
  answersByReg: Map<string, Map<string, unknown>>
) {
  const map = new Map<string, { total: number; attended: number }>();
  const bump = (label: string, rid: string) => {
    const cur = map.get(label) ?? { total: 0, attended: 0 };
    cur.total++;
    if (attended.has(rid)) cur.attended++;
    map.set(label, cur);
  };
  for (const r of regs) {
    const raw = answersByReg.get(r.id)?.get(fieldId);
    if (type === "multiselect" && Array.isArray(raw)) {
      if (raw.length === 0) bump("Óskráð", r.id);
      else for (const o of raw) bump(String(o), r.id);
    } else {
      bump(statLabel(raw, type), r.id);
    }
  }
  return [...map.entries()].map(([label, v]) => ({ label, ...v })).sort((a, b) => b.total - a.total);
}

export default async function StatsPage({ params }: { params: { eventId: string } }) {
  const supabase = createClient();
  const id = params.eventId;

  const { data: event } = await supabase
    .from("events")
    .select("name, starts_at, drinks_enabled")
    .eq("id", id)
    .single();
  if (!event) notFound();

  const [regsRes, ticketsRes, checkinsRes, invitesRes, accountsRes, redemptionsRes, profilesRes, fieldsRes] =
    await Promise.all([
      supabase.from("registrations").select("id, status, company, business_unit, location").eq("event_id", id),
      supabase.from("tickets").select("id, registration_id").eq("event_id", id),
      supabase.from("check_ins").select("ticket_id").eq("event_id", id),
      supabase.from("invitations").select("id").eq("event_id", id),
      supabase.from("drink_accounts").select("id, ticket_id, scope, allowance").eq("event_id", id),
      supabase.from("drink_redemptions").select("account_id, ticket_id, quantity, redeemed_by, redeemed_at").eq("event_id", id),
      supabase.from("profiles").select("id, full_name"),
      supabase.from("event_form_fields").select("id, field_key, label, field_type, requirement, is_custom, sort_order").eq("event_id", id).order("sort_order", { ascending: true }),
    ]);

  const regs = (regsRes.data ?? []) as Reg[];
  const tickets = (ticketsRes.data ?? []) as Ticket[];
  const checkins = (checkinsRes.data ?? []) as CheckIn[];
  const invitedCount = (invitesRes.data ?? []).length;
  const accounts = (accountsRes.data ?? []) as Account[];
  const redemptions = (redemptionsRes.data ?? []) as Redemption[];
  const profiles = (profilesRes.data ?? []) as Profile[];

  // Reitir sem eru raunverulega í forminu (ekki faldir) — ráða hvaða sundurliðanir birtast
  type FieldRow = { id: string; field_key: string; label: string; field_type: string; requirement: string; is_custom: boolean; sort_order: number };
  const allFields = (fieldsRes.data ?? []) as FieldRow[];
  const activeFieldRows = allFields.filter((f) => f.requirement !== "hidden");
  const activeFields = new Set(activeFieldRows.map((f) => f.field_key));
  const customStatFields = activeFieldRows.filter((f) => f.is_custom && f.field_type !== "consent");


  // ---- Mæting ----
  const ticketToReg = new Map(tickets.map((t) => [t.id, t.registration_id]));
  const attendedRegIds = new Set<string>();
  for (const c of checkins) {
    const rid = ticketToReg.get(c.ticket_id);
    if (rid) attendedRegIds.add(rid);
  }
  const registered = regs.filter((r) => r.status === "registered");
  const registeredCount = registered.length;
  const attendedCount = registered.filter((r) => attendedRegIds.has(r.id)).length;
  const noShow = Math.max(0, registeredCount - attendedCount);
  const attendanceRate = registeredCount > 0 ? Math.round((attendedCount / registeredCount) * 100) : 0;

  // ---- Drykkir (heild) ----
  const totalAllowance = accounts.reduce((s, a) => s + (a.allowance ?? 0), 0);
  const redeemedTotal = redemptions.reduce((s, r) => s + (r.quantity ?? 0), 0);
  const drinksRemaining = Math.max(0, totalAllowance - redeemedTotal);
  const utilization = totalAllowance > 0 ? Math.round((redeemedTotal / totalAllowance) * 100) : 0;

  // ---- Drykkjanotkun per gest (persónulegir reikningar) ----
  const personalAccounts = accounts.filter((a) => a.ticket_id && (a.scope === "individual" || a.scope === "spouse"));
  const redeemedByAccount = new Map<string, number>();
  for (const r of redemptions) redeemedByAccount.set(r.account_id, (redeemedByAccount.get(r.account_id) ?? 0) + (r.quantity ?? 0));

  const perTicket = new Map<string, { allow: number; used: number }>();
  for (const a of personalAccounts) {
    const cur = perTicket.get(a.ticket_id!) ?? { allow: 0, used: 0 };
    cur.allow += a.allowance ?? 0;
    cur.used += redeemedByAccount.get(a.id) ?? 0;
    perTicket.set(a.ticket_id!, cur);
  }
  let usedAll = 0, usedSome = 0, usedNone = 0;
  for (const { allow, used } of perTicket.values()) {
    if (allow <= 0) continue;
    if (used >= allow) usedAll++;
    else if (used > 0) usedSome++;
    else usedNone++;
  }

  // ---- Tímalína (30 mín bil) ----
  const buckets = new Map<number, number>();
  const slot = 30 * 60 * 1000;
  for (const r of redemptions) {
    const key = Math.floor(new Date(r.redeemed_at).getTime() / slot) * slot;
    buckets.set(key, (buckets.get(key) ?? 0) + (r.quantity ?? 0));
  }
  const timeline = [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([k, v]) => ({ label: new Date(k).toLocaleTimeString("is-IS", { hour: "2-digit", minute: "2-digit" }), value: v }));
  const maxBucket = Math.max(1, ...timeline.map((t) => t.value));

  // ---- Barþjónar ----
  const profileName = new Map(profiles.map((p) => [p.id, p.full_name]));
  const byBartender = new Map<string, { drinks: number; txns: number }>();
  for (const r of redemptions) {
    const k = r.redeemed_by ?? "óþekkt";
    const cur = byBartender.get(k) ?? { drinks: 0, txns: 0 };
    cur.drinks += r.quantity ?? 0;
    cur.txns += 1;
    byBartender.set(k, cur);
  }
  const bartenders = [...byBartender.entries()]
    .map(([k, v]) => ({ name: k === "óþekkt" ? "Óþekkt" : profileName.get(k) ?? "Óþekkt", ...v }))
    .sort((a, b) => b.drinks - a.drinks);

  const byCompany = groupAttendance(registered, attendedRegIds, "company");
  const byUnit = groupAttendance(registered, attendedRegIds, "business_unit");
  const byLocation = groupAttendance(registered, attendedRegIds, "location");

  // ---- Sundurliðun eftir sérsniðnum reitum (t.d. Golfklúbbur, Vantar golfbíl) ----
  const answersByReg = new Map<string, Map<string, unknown>>();
  if (customStatFields.length > 0) {
    const { data: answers } = await supabase
      .from("registration_answers")
      .select("registration_id, field_id, value")
      .in("field_id", customStatFields.map((f) => f.id));
    for (const a of (answers ?? []) as { registration_id: string; field_id: string; value: unknown }[]) {
      if (!answersByReg.has(a.registration_id)) answersByReg.set(a.registration_id, new Map());
      answersByReg.get(a.registration_id)!.set(a.field_id, a.value);
    }
  }
  const customGroups = customStatFields
    .map((f) => ({
      title: f.label,
      type: f.field_type,
      rows: groupByAnswer(registered, attendedRegIds, f.id, f.field_type, answersByReg),
    }))
    // Flokkar (já/nei, val) alltaf; frítexti aðeins ef fá ólík svör (sleppum t.d. golfbox-númerum)
    .filter((g) => {
      const meaningful = g.rows.filter((r) => r.label !== "Óskráð");
      if (meaningful.length === 0) return false;
      if (g.type === "boolean" || g.type === "select" || g.type === "multiselect") return true;
      return meaningful.length <= 15;
    });

  return (
    <div className="max-w-3xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <Eyebrow>Tölfræði</Eyebrow>
          <PageTitle>{event.name}</PageTitle>
          <div className="mt-1">
            <LiveRefresh eventId={params.eventId} tables={["registrations", "check_ins", "drink_redemptions", "drink_accounts", "invitations"]} />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/events/${params.eventId}/guests`}
            className="rounded-xl bg-gradient-to-br from-accent to-accent-bright px-4 py-2 text-sm font-semibold text-accent-ink shadow-glow transition hover:brightness-105"
          >
            Gestalisti
          </Link>
          <Link href="/dashboard/events" className="text-xs text-muted hover:text-text">
            ← Viðburðir
          </Link>
        </div>
      </div>

      {/* Skráningar */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted">Skráningar</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <StatCard label="Boðaðir" value={invitedCount} />
          <StatCard label="Skráðir" value={registeredCount} />
          <StatCard label="Mættir" value={attendedCount} />
          <StatCard label="Ómættir" value={noShow} />
          <StatCard label="Mæting" value={`${attendanceRate}%`} />
        </div>
      </section>

      {/* Drykkir */}
      {event.drinks_enabled && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted">Drykkir</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Í boði" value={totalAllowance} />
            <StatCard label="Nýttir" value={redeemedTotal} />
            <StatCard label="Eftir" value={drinksRemaining} />
            <StatCard label="Nýting" value={`${utilization}%`} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Nýttu alla" value={usedAll} />
            <StatCard label="Nýttu hluta" value={usedSome} />
            <StatCard label="Nýttu enga" value={usedNone} />
          </div>
        </section>
      )}

      {/* Tímalína */}
      {event.drinks_enabled && timeline.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted">Drykkjanotkun yfir kvöldið</h2>
          <Card>
            <div className="flex h-32 items-end gap-1">
              {timeline.map((b) => (
                <div key={b.label} className="flex flex-1 flex-col items-center justify-end">
                  <div
                    className="w-full rounded-t bg-accent"
                    style={{ height: `${Math.max(4, (b.value / maxBucket) * 100)}%` }}
                    title={`${b.label}: ${b.value}`}
                  />
                  <span className="mt-1 text-[9px] text-muted">{b.label}</span>
                </div>
              ))}
            </div>
          </Card>
        </section>
      )}

      {/* Mæting eftir hópum — aðeins reitir sem eru í forminu */}
      {(() => {
        const groups = [
          { show: activeFields.has("company"), title: "Eftir fyrirtækjum", rows: byCompany },
          { show: activeFields.has("business_unit"), title: "Eftir rekstrareiningum", rows: byUnit },
          { show: activeFields.has("location"), title: "Eftir staðsetningum", rows: byLocation },
          ...customGroups.map((g) => ({ show: true, title: g.title, rows: g.rows })),
        ].filter((g) => g.show);
        if (groups.length === 0) return null;
        const cols = groups.length === 1 ? "md:grid-cols-1" : groups.length === 2 ? "md:grid-cols-2" : "md:grid-cols-3";
        return (
          <section className={`grid gap-4 ${cols}`}>
            {groups.map((g) => (
              <GroupCard key={g.title} title={g.title} rows={g.rows} />
            ))}
          </section>
        );
      })()}

      {/* Barþjónar */}
      {event.drinks_enabled && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted">Afköst barþjóna</h2>
          {bartenders.length === 0 ? (
            <Card>
              <p className="text-sm text-muted">Engar drykkjaúttektir enn.</p>
            </Card>
          ) : (
            <Card className="space-y-2">
              {bartenders.map((b) => (
                <div key={b.name} className="flex justify-between text-sm">
                  <span className="text-text">{b.name}</span>
                  <span className="text-muted">
                    {b.drinks} drykkir · {b.txns} afgreiðslur
                  </span>
                </div>
              ))}
            </Card>
          )}
        </section>
      )}
    </div>
  );
}

function GroupCard({ title, rows }: { title: string; rows: { label: string; total: number; attended: number }[] }) {
  return (
    <Card className="space-y-3">
      <h3 className="text-sm font-semibold text-text">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">Engin gögn.</p>
      ) : (
        rows.slice(0, 8).map((r) => (
          <BarRow key={r.label} label={r.label} value={r.attended} total={r.total} caption={`${r.attended}/${r.total} mætt`} />
        ))
      )}
    </Card>
  );
}
