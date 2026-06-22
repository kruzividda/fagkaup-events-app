"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui";
import { Field, TextInput, PrimaryButton } from "@/components/form";

export type SeatTable = { id: string; table_number: number; label: string | null; capacity: number | null };
export type Person = {
  ticket_id: string;
  name: string;
  holder_type: string;
  table_number: number | null;
  seat_number: number | null;
};

export function SeatingManager({
  eventId,
  initialTables,
  initialPeople,
}: {
  eventId: string;
  initialTables: SeatTable[];
  initialPeople: Person[];
}) {
  const supabase = createClient();
  const [tables, setTables] = useState<SeatTable[]>(initialTables);
  const [people, setPeople] = useState<Person[]>(initialPeople);

  const [num, setNum] = useState("");
  const [label, setLabel] = useState("");
  const [cap, setCap] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const assignedCount = (n: number) => people.filter((p) => p.table_number === n).length;
  const unassigned = people.filter((p) => p.table_number == null).length;

  async function addTable() {
    setErr(null);
    const n = parseInt(num, 10);
    if (!Number.isFinite(n) || num.trim() === "") return setErr("Sláðu inn borðnúmer.");
    if (tables.some((t) => t.table_number === n)) return setErr("Borð með þessu númeri er þegar til.");
    setBusy(true);
    const { data, error } = await supabase
      .from("event_tables")
      .insert({
        event_id: eventId,
        table_number: n,
        label: label.trim() || null,
        capacity: cap.trim() ? parseInt(cap, 10) : null,
      })
      .select("id, table_number, label, capacity")
      .single();
    setBusy(false);
    if (error || !data) return setErr("Tókst ekki að bæta við borði.");
    setTables((prev) => [...prev, data as SeatTable].sort((a, b) => a.table_number - b.table_number));
    setNum("");
    setLabel("");
    setCap("");
  }

  async function removeTable(t: SeatTable) {
    if (!confirm(`Eyða borði ${t.table_number}? Úthlutanir á það borð losna.`)) return;
    await supabase.from("tickets").update({ table_number: null, seat_number: null }).eq("event_id", eventId).eq("table_number", t.table_number);
    await supabase.from("event_tables").delete().eq("id", t.id);
    setTables((prev) => prev.filter((x) => x.id !== t.id));
    setPeople((prev) => prev.map((p) => (p.table_number === t.table_number ? { ...p, table_number: null, seat_number: null } : p)));
  }

  async function persist(ticketId: string, table_number: number | null, seat_number: number | null) {
    await supabase.from("tickets").update({ table_number, seat_number }).eq("id", ticketId);
  }

  function setTableFor(p: Person, value: string) {
    const tn = value === "" ? null : parseInt(value, 10);
    setPeople((prev) => prev.map((x) => (x.ticket_id === p.ticket_id ? { ...x, table_number: tn } : x)));
    persist(p.ticket_id, tn, tn == null ? null : p.seat_number);
  }

  function setSeatLocal(p: Person, value: string) {
    const sn = value.trim() === "" ? null : parseInt(value, 10);
    setPeople((prev) => prev.map((x) => (x.ticket_id === p.ticket_id ? { ...x, seat_number: Number.isFinite(sn as number) ? sn : null } : x)));
  }

  function saveSeat(p: Person) {
    persist(p.ticket_id, p.table_number, p.table_number == null ? null : p.seat_number);
  }

  return (
    <div className="space-y-5">
      {/* Borð */}
      <Card className="space-y-3">
        <p className="text-[13px] font-medium text-text">Borð ({tables.length})</p>
        {err && <p className="rounded-lg border border-danger bg-[rgba(229,103,91,0.08)] px-3 py-2 text-sm text-danger">{err}</p>}
        {tables.length > 0 && (
          <div className="space-y-2">
            {tables.map((t) => {
              const used = assignedCount(t.table_number);
              const full = t.capacity != null && used >= t.capacity;
              return (
                <div key={t.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text">
                      Borð {t.table_number}
                      {t.label ? <span className="ml-1 text-muted">· {t.label}</span> : null}
                    </p>
                    <p className="text-xs text-muted">
                      {used} {t.capacity != null ? `af ${t.capacity}` : "úthlutað"}
                      {full ? <span className="ml-1 text-accent">· fullt</span> : null}
                    </p>
                  </div>
                  <button onClick={() => removeTable(t)} className="btn-secondary-danger rounded-lg px-2.5 py-1 text-xs">
                    Eyða
                  </button>
                </div>
              );
            })}
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Borðnúmer" required>
            <TextInput value={num} onChange={setNum} type="number" placeholder="t.d. 1" />
          </Field>
          <Field label="Heiti (valfrjálst)">
            <TextInput value={label} onChange={setLabel} placeholder="t.d. Sviðsborð" />
          </Field>
          <Field label="Sæti (valfrjálst)">
            <TextInput value={cap} onChange={setCap} type="number" placeholder="t.d. 8" />
          </Field>
        </div>
        <PrimaryButton onClick={addTable} disabled={busy}>
          {busy ? "Bæti við…" : "Bæta við borði"}
        </PrimaryButton>
      </Card>

      {/* Úthlutun gesta */}
      <Card className="space-y-2">
        <div className="mb-1 flex items-center justify-between">
          <p className="text-[13px] font-medium text-text">Gestir ({people.length})</p>
          {unassigned > 0 && <span className="text-[12px] text-accent">{unassigned} óúthlutað</span>}
        </div>
        {people.length === 0 && <p className="text-sm text-muted">Engir skráðir gestir enn.</p>}
        {people.map((p) => (
          <div key={p.ticket_id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-text">
                {p.name}
                {p.holder_type !== "primary" && <span className="ml-1 text-[12px] text-muted">(maki/+1)</span>}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <select
                value={p.table_number ?? ""}
                onChange={(e) => setTableFor(p, e.target.value)}
                className="rounded-lg border border-border bg-elevated px-2 py-1 text-xs text-text outline-none focus:border-accent"
              >
                <option value="">Ekkert borð</option>
                {tables.map((t) => (
                  <option key={t.id} value={t.table_number}>
                    Borð {t.table_number}
                    {t.label ? ` · ${t.label}` : ""}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={p.seat_number ?? ""}
                disabled={p.table_number == null}
                onChange={(e) => setSeatLocal(p, e.target.value)}
                onBlur={() => saveSeat(p)}
                placeholder="Sæti"
                className="w-16 rounded-lg border border-border bg-elevated px-2 py-1 text-xs text-text outline-none focus:border-accent disabled:opacity-40"
              />
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
