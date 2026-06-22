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

  // ---------- Sjálfvirkur borða-generator (handvalin borðnúmer per einingu) ----------
  type Group = { name: string; people: Person[]; tableNums: string };
  const [groupBy, setGroupBy] = useState<"business_unit" | "location" | "company">("business_unit");
  const [genCap, setGenCap] = useState("10");
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [genBusy, setGenBusy] = useState(false);
  const [genErr, setGenErr] = useState<string | null>(null);
  const [genResult, setGenResult] = useState<string | null>(null);

  const fieldOf = (p: Person) =>
    groupBy === "location" ? p.location : groupBy === "business_unit" ? p.business_unit : p.company;

  const parseNums = (s: string): number[] =>
    s
      .split(/[,\s]+/)
      .map((x) => parseInt(x, 10))
      .filter((n) => Number.isFinite(n) && n > 0);

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
    const gs: Group[] = Array.from(map.entries()).map(([name, ppl]) => ({ name, people: ppl, tableNums: "" }));
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

  function setGroupNums(idx: number, value: string) {
    setGroups((prev) => (prev ? prev.map((g, i) => (i === idx ? { ...g, tableNums: value } : g)) : prev));
  }

  // Fylla borðnúmer í beinni röð (1,2,3…) sem upphafspunkt — má svo breyta handvirkt
  function autofill() {
    if (!groups) return;
    const cap = parseInt(genCap, 10) || 10;
    let next = 1;
    setGroups(
      groups.map((g) => {
        const needed = Math.max(1, Math.ceil(g.people.length / cap));
        const nums: number[] = [];
        for (let k = 0; k < needed; k++) nums.push(next++);
        return { ...g, tableNums: nums.join(",") };
      })
    );
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

    // Validera: nóg borð per hóp + engin tvínotuð borðnúmer
    const seen = new Map<number, string>();
    const conflicts: number[] = [];
    for (const g of groups) {
      const nums = parseNums(g.tableNums);
      if (nums.length === 0) return setGenErr(`Vantar borðnúmer fyrir „${g.name}“.`);
      if (nums.length * cap < g.people.length)
        return setGenErr(`Of fá borð fyrir „${g.name}“ (${g.people.length} gestir, ${nums.length} borð × ${cap}).`);
      for (const n of nums) {
        if (seen.has(n) && seen.get(n) !== g.name) conflicts.push(n);
        seen.set(n, g.name);
      }
    }
    if (conflicts.length) return setGenErr(`Borðnúmer notuð oftar en einu sinni: ${[...new Set(conflicts)].sort((a, b) => a - b).join(", ")}.`);

    if (!confirm("Þetta endurgerir alla borðaskipan og eldri úthlutun hverfur. Halda áfram?")) return;

    // Borð: eitt per númer, með heiti einingar
    const labelByNum = new Map<number, string>();
    for (const g of groups) for (const n of parseNums(g.tableNums)) if (!labelByNum.has(n)) labelByNum.set(n, g.name);
    const planTables = [...labelByNum.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([n, label]) => ({ table_number: n, label, capacity: cap }));

    // Úthlutun: fylla borð hverrar einingar upp að borðastærð
    const assignments: { ticket_id: string; table_number: number; seat_number: number }[] = [];
    for (const g of groups) {
      const nums = parseNums(g.tableNums);
      let i = 0;
      for (const n of nums) {
        for (let seat = 1; seat <= cap && i < g.people.length; seat++) {
          assignments.push({ ticket_id: g.people[i].ticket_id, table_number: n, seat_number: seat });
          i++;
        }
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
      {/* Borða-generator */}
      <Card className="space-y-3">
        <div>
          <p className="text-[13px] font-medium text-text">Borða-generator</p>
          <p className="text-xs text-muted">
            Hópaðu gesti og fáðu fjölda borða sem hver eining þarf. Sláðu svo inn borðnúmerin sem hver eining á að sitja
            við (eins og salaskipanin ykkar) — kerfið fyllir þau. Tóm? Notaðu „Auto-fylla í röð“ sem upphafspunkt.
          </p>
        </div>
        {genErr && <p className="rounded-lg border border-danger bg-[rgba(229,103,91,0.08)] px-3 py-2 text-sm text-danger">{genErr}</p>}
        {genResult && <p className="rounded-lg border border-success bg-[rgba(95,178,138,0.08)] px-3 py-2 text-sm text-success">{genResult}</p>}

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Hópa eftir">
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as "business_unit" | "location" | "company")}
              className="w-full rounded-lg border border-border bg-elevated px-3 py-2 text-sm text-text outline-none focus:border-accent"
            >
              <option value="business_unit">Rekstrareining</option>
              <option value="location">Staðsetning</option>
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
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted">
                {people.length} gestir ·{" "}
                {groups.reduce((s, g) => s + Math.max(1, Math.ceil(g.people.length / (parseInt(genCap, 10) || 10))), 0)} borð þarf (lágmark)
              </p>
              <button onClick={autofill} className="btn-secondary rounded-lg px-3 py-1.5 text-xs">
                Auto-fylla í röð
              </button>
            </div>

            <div className="space-y-2">
              {groups.map((g, idx) => {
                const cap = parseInt(genCap, 10) || 10;
                const needed = Math.max(1, Math.ceil(g.people.length / cap));
                const have = parseNums(g.tableNums).length;
                const short = have > 0 && have * cap < g.people.length;
                return (
                  <div key={g.name} className="space-y-2 rounded-xl border border-border bg-surface p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium text-text">{g.name}</p>
                      <div className="flex shrink-0 items-center gap-1">
                        <span className="text-xs text-muted">
                          {g.people.length} · {needed} borð
                        </span>
                        <button onClick={() => moveGroup(idx, -1)} disabled={idx === 0} className="btn-secondary rounded-lg px-2 py-1 text-xs disabled:opacity-30" aria-label="Færa upp">
                          ↑
                        </button>
                        <button onClick={() => moveGroup(idx, 1)} disabled={idx === groups.length - 1} className="btn-secondary rounded-lg px-2 py-1 text-xs disabled:opacity-30" aria-label="Færa niður">
                          ↓
                        </button>
                      </div>
                    </div>
                    <input
                      value={g.tableNums}
                      onChange={(e) => setGroupNums(idx, e.target.value)}
                      placeholder="Borðnúmer, t.d. 8,9,14,15"
                      className={`w-full rounded-lg border bg-elevated px-3 py-2 text-sm text-text outline-none focus:border-accent ${short ? "border-danger" : "border-border"}`}
                    />
                    {short && <p className="text-[12px] text-danger">Of fá borð — þarf a.m.k. {needed}.</p>}
                  </div>
                );
              })}
            </div>

            <PrimaryButton onClick={generate} disabled={genBusy}>
              {genBusy ? "Bý til…" : "Búa til borðaskipan"}
            </PrimaryButton>
            <p className="text-xs text-muted">Þetta endurgerir alla borðaskipan. Þú getur fínstillt handvirkt að neðan eftir á.</p>
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
