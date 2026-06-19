"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui";

export type GuestRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  unit: string | null;
  location: string | null;
  dietary: string | null;
  attended: boolean;
  checkedInAt: string | null;
  hasSpouse: boolean;
  spouseName: string | null;
  spouseAttended: boolean;
};

type Tab = "all" | "in" | "out";

function timeOf(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("is-IS", { hour: "2-digit", minute: "2-digit" });
}

export function GuestList({ rows }: { rows: GuestRow[] }) {
  const [tab, setTab] = useState<Tab>("all");
  const [q, setQ] = useState("");

  const attendedCount = rows.filter((r) => r.attended).length;
  const counts = { all: rows.length, in: attendedCount, out: rows.length - attendedCount };

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (tab === "in" && !r.attended) return false;
      if (tab === "out" && r.attended) return false;
      if (!needle) return true;
      return [r.name, r.company, r.unit, r.location, r.spouseName, r.email]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(needle));
    });
  }, [rows, tab, q]);

  const TABS: { key: Tab; label: string }[] = [
    { key: "all", label: `Allir ${counts.all}` },
    { key: "in", label: `Mættir ${counts.in}` },
    { key: "out", label: `Ómættir ${counts.out}` },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1.5">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                tab === t.key
                  ? "border-accent bg-gradient-to-br from-accent to-accent-bright text-[#0A111B] shadow-glow"
                  : "border-border bg-elevated text-text hover:border-accent"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Leita…"
          className="flex-1 min-w-[160px] rounded-xl border border-border bg-elevated px-4 py-2.5 text-sm text-text placeholder:text-[#5C6B7D] outline-none focus:border-accent focus:ring-2 focus:ring-[rgba(200,164,92,0.22)]"
        />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">Enginn gestur passar við leitina.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-text">{r.name}</p>
                  {(r.company || r.unit || r.location) && (
                    <p className="mt-0.5 truncate text-[13px] text-muted">
                      {[r.company, r.unit, r.location].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  {r.dietary && (
                    <span className="mt-2 inline-block rounded-full border border-border px-2.5 py-0.5 text-[12px] text-accent">
                      {r.dietary}
                    </span>
                  )}
                  {r.hasSpouse && (
                    <p className="mt-2 text-[13px] text-muted">
                      Maki: {r.spouseName || "+1"}{" "}
                      <span className={r.spouseAttended ? "text-success" : "text-muted"}>
                        · {r.spouseAttended ? "mætt" : "ómætt"}
                      </span>
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  {r.attended ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(95,178,138,0.4)] bg-[rgba(95,178,138,0.1)] px-3 py-1 text-[13px] text-success">
                      ✓ Mætt
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full border border-border px-3 py-1 text-[13px] text-muted">
                      Ómætt
                    </span>
                  )}
                  {r.attended && r.checkedInAt && (
                    <p className="mt-1 text-[12px] text-muted">kl. {timeOf(r.checkedInAt)}</p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
