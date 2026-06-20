"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui";
import { saveBusinessUnits, type UnitInput } from "./actions";

export type Unit = { id: string | null; name: string; locations: { id: string | null; name: string }[] };

const inputCls = "rounded-lg border border-border bg-elevated px-3 py-2 text-sm text-text outline-none focus:border-accent";

export function UnitsManager({ initial }: { initial: Unit[] }) {
  const router = useRouter();
  const [units, setUnits] = useState<Unit[]>(initial);
  const [saving, startSaving] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function setUnit(i: number, patch: Partial<Unit>) {
    setUnits((p) => p.map((u, idx) => (idx === i ? { ...u, ...patch } : u)));
  }
  function addUnit() {
    setUnits((p) => [...p, { id: null, name: "", locations: [] }]);
  }
  function removeUnit(i: number) {
    setUnits((p) => p.filter((_, idx) => idx !== i));
  }
  function setLoc(ui: number, li: number, name: string) {
    setUnits((p) =>
      p.map((u, idx) =>
        idx === ui ? { ...u, locations: u.locations.map((l, j) => (j === li ? { ...l, name } : l)) } : u
      )
    );
  }
  function addLoc(ui: number) {
    setUnits((p) => p.map((u, idx) => (idx === ui ? { ...u, locations: [...u.locations, { id: null, name: "" }] } : u)));
  }
  function removeLoc(ui: number, li: number) {
    setUnits((p) => p.map((u, idx) => (idx === ui ? { ...u, locations: u.locations.filter((_, j) => j !== li) } : u)));
  }

  function save() {
    setMsg(null);
    const missing = units
      .filter((u) => u.name.trim() && u.locations.filter((l) => l.name.trim()).length === 0)
      .map((u) => u.name.trim());
    if (missing.length) {
      setMsg(`Hver deild þarf a.m.k. eina staðsetningu (svo tölfræðin verði rétt). Vantar hjá: ${missing.join(", ")}.`);
      return;
    }
    const payload: UnitInput[] = units.map((u) => ({ id: u.id, name: u.name, locations: u.locations }));
    startSaving(async () => {
      const res = await saveBusinessUnits(payload);
      if (!res.ok) setMsg(res.error ?? "Vistun mistókst.");
      else {
        setMsg("Vistað ✓");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      {units.map((u, ui) => (
        <Card key={u.id ?? `new-${ui}`} className="space-y-3">
          <div className="flex items-center gap-2">
            <input
              value={u.name}
              onChange={(e) => setUnit(ui, { name: e.target.value })}
              placeholder="Heiti deildar (t.d. Bónus)"
              className={`${inputCls} flex-1 font-medium`}
            />
            <button onClick={() => removeUnit(ui)} className="rounded-md border border-danger px-2.5 py-1.5 text-xs text-danger">
              Eyða
            </button>
          </div>

          <div className="space-y-2 border-l border-border pl-3">
            <p className="text-xs text-muted">Útibú / staðsetningar</p>
            {u.locations.map((l, li) => (
              <div key={l.id ?? `nl-${li}`} className="flex gap-2">
                <input
                  value={l.name}
                  onChange={(e) => setLoc(ui, li, e.target.value)}
                  placeholder="t.d. Skútuvogur"
                  className={`${inputCls} flex-1`}
                />
                <button onClick={() => removeLoc(ui, li)} className="rounded-md border border-border px-2 text-xs text-muted hover:text-danger">
                  ×
                </button>
              </div>
            ))}
            <button onClick={() => addLoc(ui)} className="text-xs text-accent">
              + Bæta við útibúi
            </button>
          </div>
        </Card>
      ))}

      <button onClick={addUnit} className="rounded-lg border border-border px-4 py-2 text-sm text-text hover:border-accent">
        + Bæta við deild
      </button>

      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving} className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-ink hover:brightness-110 disabled:opacity-50">
          {saving ? "Vista…" : "Vista"}
        </button>
        {msg && <span className="text-sm text-muted">{msg}</span>}
      </div>
    </div>
  );
}
