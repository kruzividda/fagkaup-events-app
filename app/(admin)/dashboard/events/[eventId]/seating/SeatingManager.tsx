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
  company: string | null;
  business_unit: string | null;
  location: string | null;
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

  // ---------- Sjálfvirkur borða-generator ----------
  const [groupBy, setGroupBy] = useState<"location" | "business_unit" | "company">("location");
  const [genCap, setGenCap] = useState("10");
  const [fillMode, setFillMode] = useState(false);
  const [groups, setGroups] = useState<{ name: string; people: Person[] }[] | null>(null);
  const [genBusy, setGenBusy] = useState(false);
  const [genErr, setGenErr] = useState<string | null>(null);
  const [genResult, setGenResult] = useState<string | null>(null);

  const fieldOf = (p: Person) =>
    groupBy === "location" ? p.location : groupBy === "business_unit" ? p.business_unit : p.company;

  function analyze() {
    const cap = parseInt(genCap, 10);
    if (!Number.isFinite(cap) || cap < 1) return setGenErr("Sláðu inn gilda borðastærð.");
    setGenErr(null);
    setGenResult(null);
    const map = new Map<string, Person[]>();
    for (const p of people) {
      const v = (fieldOf(p) || "").trim() || "Óflokkað";
      if (!map.has(v)) map.set(v, []);
      map.get(v)!.push(p);
    }
    const gs = Array.from(map.entries()).map(([name, ppl]) => ({ name, people: ppl }));
    gs.sort((a, b) => b.people.length - a.people.length);
    setGroups(gs);
  }

  function moveGroup(idx: number, dir: -1 | 1) {
    setGroups((prev) => {
      if (!prev) return prev;
      const next = [...prev];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  }

  async function reload() {
    const [tRes, tkRes] = await Promise.all([
      supabase.from("event_tables").select("id, table_number, label, capacity").eq("event_id", eventId).order("table_number", { ascending: true }),
      supabase.from("tickets").select("id, table_number, seat_number").eq("event_id", eventId),
    ]);
    setTables((tRes.data ?? []) as SeatTable[]);
    const tk = (tkRes.data ?? []) as { id: string; table_number: number | null; seat_number: number | null }[];
    const tkMap = new Map(tk.map((x) => [x.id, x]));
    setPeople((prev) =>
      prev.map((p) => {
        const m = tkMap.get(p.ticket_id);
        return m ? { ...p, table_number: m.table_number, seat_number: m.seat_number } : p;
      })
    );
  }

  async function generate() {
    if (!groups) return;
    const cap = parseInt(genCap, 10) || 10;
    if (!confirm("Þetta endurgerir alla borðaskipan og eldri úthlutun hverfur. Halda áfram?")) return;

    let tableNo = 0;
    let seatInTable = cap;
    const planTables: { table_number: number; label: string | null; capacity: number }[] = [];
    const assignments: { ticket_id: string; table_number: number; seat_number: number }[] = [];
    const startTable = (label: string) => {
      tableNo++;
      seatInTable = 0;
      planTables.push({ table_number: tableNo, label, capacity: cap });
    };

    for (const g of groups) {
      if (!fillMode || seatInTable >= cap) startTable(g.name);
      for (const person of g.people) {
        if (seatInTable >= cap) startTable(g.name);
        seatInTable++;
        assignments.push({ ticket_id: person.ticket_id, table_number: tableNo, seat_number: seatInTable });
      }
    }

    setGenBusy(true);
    setGenErr(null);
    const { data, error } = await supabase.rpc("apply_seating_plan", {
      p_event_id: eventId,
      p_tables: planTables,
      p_assignments: assignments,
    });
    setGenBusy(false);
    const res = data as { ok: boolean } | null;
    if (error || !res?.ok) return setGenErr("Tókst ekki að vista borðaskipan.");
    await reload();
    setGroups(null);
    setGenResult(`${planTables.length} borð búin til · ${assignments.length} gestum úthlutað.`);
  }

  return (
    <div className="space-y-5">
      {/* Sjálfvirkur generator */}
      <Card className="space-y-3">
        <div>
          <p className="text-[13px] font-medium text-text">Sjálfvirk borðaskipan</p>
          <p className="text-xs text-muted">
            Hópaðu gesti eftir staðsetningu, einingu eða fyrirtæki og láttu kerfið úthluta borðum. Raðaðu hópunum svo
            þeir sem eiga að sitja nálægt hvor öðrum lendi á aðliggjandi borðum.
          </p>
        </div>
        {genErr && <p className="rounded-lg border border-danger bg-[rgba(229,103,91,0.08)] px-3 py-2 text-sm text-danger">{genErr}</p>}
        {genResult && <p className="rounded-lg border border-success bg-[rgba(95,178,138,0.08)] px-3 py-2 text-sm text-success">{genResult}</p>}

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Hópa eftir">
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as "location" | "business_unit" | "company")}
              className="w-full rounded-lg border border-border bg-elevated px-3 py-2 text-sm text-text outline-none focus:border-accent"
            >
              <option value="location">Staðsetning</option>
              <option value="business_unit">Rekstrareining</option>
              <option value="company">Fyrirtæki</option>
            </select>
          </Field>
          <Field label="Borðastærð" required>
            <TextInput value={genCap} onChange={setGenCap} type="number" placeholder="t.d. 10" />
          </Field>
          <div className="flex items-end">
            <button onClick={analyze} className="btn-secondary w-full rounded-lg px-3 py-2 text-sm">
              Greina hópa
            </button>
          </div>
        </div>

        {groups && (
          <div className="space-y-3">
            <div className="space-y-2">
              {groups.map((g, idx) => {
                const cap = parseInt(genCap, 10) || 10;
                const needed = Math.ceil(g.people.length / cap);
                return (
                  <div key={g.name} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-text">{g.name}</p>
                      <p className="text-xs text-muted">
                        {g.people.length} gestir · {needed} borð
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        onClick={() => moveGroup(idx, -1)}
                        disabled={idx === 0}
                        className="btn-secondary rounded-lg px-2 py-1 text-xs disabled:opacity-30"
                        aria-label="Færa upp"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => moveGroup(idx, 1)}
                        disabled={idx === groups.length - 1}
                        className="btn-secondary rounded-lg px-2 py-1 text-xs disabled:opacity-30"
                        aria-label="Færa niður"
                      >
                        ↓
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-[13px] text-text">
              <input type="checkbox" checked={fillMode} onChange={(e) => setFillMode(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
              Leyfa aðliggjandi hópum að deila borði (fyllir borð betur)
            </label>

            <PrimaryButton onClick={generate} disabled={genBusy}>
              {genBusy ? "Bý til…" : "Búa til borðaskipan"}
            </PrimaryButton>
            <p className="text-xs text-muted">
              Athugið: þetta endurgerir alla borðaskipan. Þú getur fínstillt handvirkt að neðan eftir á.
            </p>
          </div>
        )}
      </Card>

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
