"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui";
import { applyDrinks, adjustDrinks } from "./actions";

const numCls =
  "w-20 rounded-xl border border-border bg-elevated px-3 py-2 text-sm text-text outline-none focus:border-accent focus:ring-2 focus:ring-[rgba(200,164,92,0.22)]";

export function DrinksPanel({
  eventId,
  drinksEnabled,
  perPerson,
  spouseGets,
  perSpouse,
}: {
  eventId: string;
  drinksEnabled: boolean;
  perPerson: number;
  spouseGets: boolean;
  perSpouse: number;
}) {
  const router = useRouter();
  const [pp, setPp] = useState<number | "">(perPerson || (drinksEnabled ? perPerson : 2));
  const [spouseOn, setSpouseOn] = useState(spouseGets);
  const [ps, setPs] = useState<number | "">(perSpouse || 1);
  const [busy, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, okMsg: string) {
    setMsg(null);
    start(async () => {
      const res = await fn();
      setMsg(res.ok ? okMsg : res.error ?? "Mistókst.");
      if (res.ok) router.refresh();
    });
  }

  return (
    <Card accent className="space-y-5">
      <div>
        <p className="font-display text-lg text-text">Drykkjastjórnun</p>
        <p className="mt-1 text-sm text-muted">
          {drinksEnabled
            ? `Núna: ${perPerson} á mann${spouseGets ? `, ${perSpouse} á maka` : ""}.`
            : "Drykkir eru ekki virkir á þessum viðburði enn."}
        </p>
      </div>

      {/* Stilla og beita á alla núverandi gesti */}
      <div className="space-y-3 rounded-xl border border-border bg-elevated p-4">
        <p className="text-[13px] font-medium text-text">Stilla og beita á alla skráða gesti</p>
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
          <label className="flex items-center gap-2">
            Á mann
            <input
              type="number"
              min={0}
              value={pp}
              onChange={(e) => setPp(e.target.value === "" ? "" : Number(e.target.value))}
              className={numCls}
            />
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={spouseOn} onChange={(e) => setSpouseOn(e.target.checked)} className="accent-[var(--accent)]" />
            Maki fær drykki
          </label>
          {spouseOn && (
            <label className="flex items-center gap-2">
              Á maka
              <input
                type="number"
                min={0}
                value={ps}
                onChange={(e) => setPs(e.target.value === "" ? "" : Number(e.target.value))}
                className={numCls}
              />
            </label>
          )}
        </div>
        <button
          onClick={() => run(() => applyDrinks(eventId, Number(pp || 0), spouseOn ? Number(ps || 0) : 0), "Drykkjum beitt á alla gesti ✓")}
          disabled={busy}
          className="rounded-xl bg-gradient-to-br from-accent to-accent-bright px-4 py-2.5 text-sm font-semibold text-accent-ink shadow-glow transition hover:brightness-105 disabled:opacity-50"
        >
          Beita á alla gesti
        </button>
        <p className="text-xs text-muted">
          Setur inneign hjá öllum skráðum (líka þeim sem voru skráðir áður en drykkir voru virkir). Notuð drykki er haldið.
        </p>
      </div>

      {/* Lifandi á viðburðinum */}
      <div className="space-y-3 rounded-xl border border-border bg-elevated p-4">
        <p className="text-[13px] font-medium text-text">Lifandi um kvöldið</p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => run(() => adjustDrinks(eventId, -1), "Fækkað um 1 hjá öllum ✓")}
            disabled={busy}
            className="btn-secondary rounded-xl px-4 py-2.5 text-sm"
          >
            − 1 á alla
          </button>
          <button
            onClick={() => run(() => adjustDrinks(eventId, 1), "Bætt við 1 hjá öllum ✓")}
            disabled={busy}
            className="btn-secondary rounded-xl px-4 py-2.5 text-sm"
          >
            + 1 á alla
          </button>
        </div>
        <p className="text-xs text-muted">
          Bætir við eða fækkar einum drykk hjá öllum gestum samstundis. Inneign fer aldrei undir 0.
        </p>
      </div>

      {msg && <p className="text-sm text-muted">{msg}</p>}
    </Card>
  );
}
