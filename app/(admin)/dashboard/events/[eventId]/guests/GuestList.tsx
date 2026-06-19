"use client";

import { useMemo, useState } from "react";
import { slugify } from "@/lib/slug";

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
type SortKey = "name" | "company" | "unit" | "location" | "status";

function timeOf(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("is-IS", { hour: "2-digit", minute: "2-digit" });
}

function exportCsv(rows: GuestRow[], eventName: string) {
  const headers = ["Nafn", "Fyrirtæki", "Rekstrareining", "Staðsetning", "Fæðuóþol", "Sími", "Netfang", "Maki", "Maki mætt", "Staða", "Innritun"];
  const esc = (v: unknown) => `"${(v ?? "").toString().replace(/"/g, '""')}"`;
  const lines = rows.map((r) => [
    r.name,
    r.company ?? "",
    r.unit ?? "",
    r.location ?? "",
    r.dietary ?? "",
    r.phone ?? "",
    r.email ?? "",
    r.hasSpouse ? r.spouseName || "+1" : "",
    r.hasSpouse ? (r.spouseAttended ? "Já" : "Nei") : "",
    r.attended ? "Mætt" : "Ómætt",
    r.attended && r.checkedInAt ? new Date(r.checkedInAt).toLocaleString("is-IS") : "",
  ]);
  const body = [headers, ...lines].map((row) => row.map(esc).join(";")).join("\r\n");
  const csv = "\uFEFFsep=;\r\n" + body;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `gestalisti-${slugify(eventName) || "vidburdur"}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function GuestList({ rows, eventName }: { rows: GuestRow[]; eventName: string }) {
  const [tab, setTab] = useState<Tab>("all");
  const [q, setQ] = useState("");
  const [unit, setUnit] = useState("");
  const [loc, setLoc] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "name", dir: 1 });

  const units = useMemo(
    () => [...new Set(rows.map((r) => r.unit).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, "is")),
    [rows]
  );
  const locs = useMemo(
    () => [...new Set(rows.map((r) => r.location).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, "is")),
    [rows]
  );

  const attendedCount = rows.filter((r) => r.attended).length;
  const counts = { all: rows.length, in: attendedCount, out: rows.length - attendedCount };

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = rows.filter((r) => {
      if (tab === "in" && !r.attended) return false;
      if (tab === "out" && r.attended) return false;
      if (unit && r.unit !== unit) return false;
      if (loc && r.location !== loc) return false;
      if (!needle) return true;
      return [r.name, r.company, r.unit, r.location, r.spouseName, r.email]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(needle));
    });
    const val = (r: GuestRow): string | number =>
      sort.key === "status" ? (r.attended ? 1 : 0) : ((r[sort.key] as string) || "").toLowerCase();
    out.sort((a, b) => {
      const av = val(a);
      const bv = val(b);
      if (av < bv) return -1 * sort.dir;
      if (av > bv) return 1 * sort.dir;
      return a.name.localeCompare(b.name, "is");
    });
    return out;
  }, [rows, tab, q, unit, loc, sort]);

  function toggleSort(key: SortKey) {
    setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: 1 }));
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: "all", label: `Allir ${counts.all}` },
    { key: "in", label: `Mættir ${counts.in}` },
    { key: "out", label: `Ómættir ${counts.out}` },
  ];

  const selectCls =
    "rounded-xl border border-border bg-elevated px-3 py-2 text-sm text-text outline-none focus:border-accent";

  const SortHead = ({ k, children, className = "" }: { k: SortKey; children: React.ReactNode; className?: string }) => (
    <th className={`cursor-pointer select-none whitespace-nowrap px-3 py-2.5 text-left font-medium text-muted ${className}`} onClick={() => toggleSort(k)}>
      <span className="inline-flex items-center gap-1">
        {children}
        {sort.key === k && <span className="text-accent">{sort.dir === 1 ? "↑" : "↓"}</span>}
      </span>
    </th>
  );

  return (
    <div className="space-y-4">
      {/* Stýringar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1.5">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-full border px-3.5 py-2 text-sm font-medium transition ${
                tab === t.key
                  ? "border-accent bg-gradient-to-br from-accent to-accent-bright text-[#0A111B] shadow-glow"
                  : "border-border bg-elevated text-text hover:border-accent"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <select value={unit} onChange={(e) => setUnit(e.target.value)} className={selectCls}>
          <option value="">Allar deildir</option>
          {units.map((u) => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>

        <select value={loc} onChange={(e) => setLoc(e.target.value)} className={selectCls}>
          <option value="">Allar staðsetningar</option>
          {locs.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Leita…"
          className="min-w-[140px] flex-1 rounded-xl border border-border bg-elevated px-3 py-2 text-sm text-text placeholder:text-[#5C6B7D] outline-none focus:border-accent"
        />

        <button
          onClick={() => exportCsv(filtered, eventName)}
          className="rounded-xl border border-accent px-4 py-2 text-sm font-semibold text-accent transition hover:bg-[rgba(200,164,92,0.08)]"
        >
          Flytja út (Excel)
        </button>
      </div>

      <p className="text-[13px] text-muted">
        Sýni {filtered.length} af {rows.length}
        {(unit || loc || q || tab !== "all") && " (síað)"}
      </p>

      {/* Tafla */}
      <div className="overflow-hidden rounded-2xl border border-border shadow-card">
        <div className="max-h-[68vh] overflow-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-surface text-[13px]">
              <tr className="border-b border-border">
                <SortHead k="name">Nafn</SortHead>
                <SortHead k="company" className="hidden sm:table-cell">Fyrirtæki</SortHead>
                <SortHead k="unit" className="hidden md:table-cell">Rekstrareining</SortHead>
                <SortHead k="location" className="hidden md:table-cell">Staðsetning</SortHead>
                <th className="hidden whitespace-nowrap px-3 py-2.5 text-left font-medium text-muted lg:table-cell">Fæðuóþol</th>
                <th className="hidden whitespace-nowrap px-3 py-2.5 text-left font-medium text-muted lg:table-cell">Maki</th>
                <SortHead k="status" className="text-right">Staða</SortHead>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={r.id} className={`border-b border-border/60 transition hover:bg-elevated ${i % 2 ? "bg-[rgba(255,255,255,0.012)]" : ""}`}>
                  <td className="px-3 py-2.5">
                    <span className="font-medium text-text">{r.name}</span>
                    <span className="block text-[12px] text-muted sm:hidden">
                      {[r.company, r.unit].filter(Boolean).join(" · ")}
                    </span>
                  </td>
                  <td className="hidden px-3 py-2.5 text-muted sm:table-cell">{r.company ?? "—"}</td>
                  <td className="hidden px-3 py-2.5 text-muted md:table-cell">{r.unit ?? "—"}</td>
                  <td className="hidden px-3 py-2.5 text-muted md:table-cell">{r.location ?? "—"}</td>
                  <td className="hidden px-3 py-2.5 lg:table-cell">
                    {r.dietary ? <span className="text-accent">{r.dietary}</span> : <span className="text-muted">—</span>}
                  </td>
                  <td className="hidden px-3 py-2.5 text-muted lg:table-cell">
                    {r.hasSpouse ? (
                      <span>
                        {r.spouseName || "+1"} <span className={r.spouseAttended ? "text-success" : "text-muted"}>· {r.spouseAttended ? "mætt" : "ómætt"}</span>
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right">
                    {r.attended ? (
                      <span className="text-success">✓ Mætt{r.checkedInAt ? ` · ${timeOf(r.checkedInAt)}` : ""}</span>
                    ) : (
                      <span className="text-muted">Ómætt</span>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-sm text-muted">
                    Enginn gestur passar við síuna.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
