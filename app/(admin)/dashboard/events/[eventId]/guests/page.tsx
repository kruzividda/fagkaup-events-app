import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow, PageTitle } from "@/components/ui";
import { GuestList, type GuestRow, type CustomCol } from "./GuestList";

export const dynamic = "force-dynamic";

function formatAnswer(value: unknown, type: string): string {
  if (value === null || value === undefined || value === "") return "";
  if (type === "boolean" || typeof value === "boolean") return value ? "Já" : "Nei";
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

export default async function GuestsPage({ params }: { params: { eventId: string } }) {
  const supabase = createClient();
  const id = params.eventId;

  const { data: event } = await supabase.from("events").select("name, drinks_enabled").eq("id", id).single();
  if (!event) notFound();

  const [regsRes, ticketsRes, checkinsRes, accountsRes, redemptionsRes, fieldsRes] = await Promise.all([
    supabase
      .from("registrations")
      .select("id, full_name, kennitala, email, phone, company, business_unit, location, dietary, has_plus_one, spouse_name, created_at")
      .eq("event_id", id)
      .eq("status", "registered")
      .order("full_name", { ascending: true }),
    supabase.from("tickets").select("id, registration_id, holder_type").eq("event_id", id),
    supabase.from("check_ins").select("ticket_id, checked_in_at").eq("event_id", id),
    supabase.from("drink_accounts").select("id, ticket_id, allowance").eq("event_id", id).eq("scope", "individual"),
    supabase.from("drink_redemptions").select("account_id, quantity").eq("event_id", id),
    supabase
      .from("event_form_fields")
      .select("id, field_key, label, field_type, requirement, is_custom, sort_order")
      .eq("event_id", id)
      .order("sort_order", { ascending: true }),
  ]);

  const regs = regsRes.data ?? [];
  const tickets = ticketsRes.data ?? [];
  const checkins = checkinsRes.data ?? [];
  const accounts = accountsRes.data ?? [];
  const redemptions = redemptionsRes.data ?? [];

  type FieldRow = { id: string; field_key: string; label: string; field_type: string; requirement: string; is_custom: boolean; sort_order: number };
  const allFields = (fieldsRes.data ?? []) as FieldRow[];
  const activeFields = allFields.filter((f) => f.requirement !== "hidden");
  const active = new Set(activeFields.map((f) => f.field_key));
  const cols = {
    kennitala: active.has("kennitala"),
    company: active.has("company"),
    unit: active.has("business_unit"),
    location: active.has("location"),
    dietary: active.has("dietary"),
    spouse: active.has("has_plus_one"),
    phone: active.has("phone"),
    email: active.has("email"),
  };

  // Sérsniðnir reitir (eigin spurningar admins) — sýndir sem dálkar
  const customFields = activeFields.filter((f) => f.is_custom && f.field_type !== "consent");
  const customCols: CustomCol[] = customFields.map((f) => ({ id: f.id, label: f.label, type: f.field_type }));

  // Sækja svör við sérsniðnum reitum
  const answersByReg = new Map<string, Map<string, string>>();
  if (customFields.length > 0) {
    const { data: answers } = await supabase
      .from("registration_answers")
      .select("registration_id, field_id, value")
      .in("field_id", customFields.map((f) => f.id));
    const typeById = new Map(customFields.map((f) => [f.id, f.field_type]));
    for (const a of (answers ?? []) as { registration_id: string; field_id: string; value: unknown }[]) {
      if (!answersByReg.has(a.registration_id)) answersByReg.set(a.registration_id, new Map());
      answersByReg.get(a.registration_id)!.set(a.field_id, formatAnswer(a.value, typeById.get(a.field_id) ?? "text"));
    }
  }

  const checkinByTicket = new Map(checkins.map((c) => [c.ticket_id, c.checked_in_at]));

  const usedByAccount = new Map<string, number>();
  for (const r of redemptions) usedByAccount.set(r.account_id, (usedByAccount.get(r.account_id) ?? 0) + (r.quantity ?? 0));

  // ticket_id -> { allowance, used, remaining }
  const drinksByTicket = new Map<string, { allowance: number; used: number; remaining: number }>();
  for (const a of accounts) {
    if (!a.ticket_id) continue;
    const used = usedByAccount.get(a.id) ?? 0;
    drinksByTicket.set(a.ticket_id, { allowance: a.allowance, used, remaining: Math.max(0, a.allowance - used) });
  }

  const primaryByReg = new Map<string, string>();
  const spouseByReg = new Map<string, string>();
  for (const t of tickets) {
    if (t.holder_type === "guest") spouseByReg.set(t.registration_id, t.id);
    else primaryByReg.set(t.registration_id, t.id);
  }

  const rows: GuestRow[] = regs.map((r) => {
    const pt = primaryByReg.get(r.id);
    const st = spouseByReg.get(r.id);
    const pd = pt ? drinksByTicket.get(pt) ?? null : null;
    const sd = st ? drinksByTicket.get(st) ?? null : null;
    return {
      id: r.id,
      name: r.full_name ?? "—",
      kennitala: r.kennitala ?? null,
      email: r.email ?? null,
      phone: r.phone ?? null,
      company: r.company ?? null,
      unit: r.business_unit ?? null,
      location: r.location ?? null,
      dietary: r.dietary ?? null,
      attended: pt ? checkinByTicket.has(pt) : false,
      checkedInAt: pt ? checkinByTicket.get(pt) ?? null : null,
      hasSpouse: !!r.has_plus_one,
      spouseName: r.spouse_name ?? null,
      spouseAttended: st ? checkinByTicket.has(st) : false,
      drinks: pd,
      spouseDrinks: sd,
      custom: customCols.length ? Object.fromEntries(customCols.map((c) => [c.id, answersByReg.get(r.id)?.get(c.id) ?? ""])) : undefined,
    };
  });

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Eyebrow>Gestalisti</Eyebrow>
          <PageTitle>{event.name}</PageTitle>
        </div>
        <Link href={`/dashboard/events/${id}/stats`} className="text-xs text-muted hover:text-text">
          ← Tölfræði
        </Link>
      </div>

      <GuestList rows={rows} eventId={id} eventName={event.name} showDrinks={event.drinks_enabled} cols={cols} customCols={customCols} />
    </div>
  );
}
