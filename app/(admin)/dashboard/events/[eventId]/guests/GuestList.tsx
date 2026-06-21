"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { slugify } from "@/lib/slug";
import { downloadXlsx, type CellValue } from "@/lib/xlsx";
import { cancelRegistrationAdmin, reactivateRegistrationAdmin } from "./actions";

type Drinks = { allowance: number; used: number; remaining: number };

export type GuestRow = {
  id: string;
  name: string;
  cancelled: boolean;
  kennitala: string | null;
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
  drinks: Drinks | null;
  spouseDrinks: Drinks | null;
  custom?: Record<string, string>;
};

export type CustomCol = { id: string; label: string; type: string };

export type Cols = {
  kennitala: boolean;
  company: boolean;
  unit: boolean;
  location: boolean;
  dietary: boolean;
  spouse: boolean;
  phone: boolean;
  email: boolean;
};

type Tab = "all" | "in" | "out" | "cancelled";
type SortKey = "name" | "company" | "unit" | "location" | "status" | "drinks";

const pad2 = (n: number) => String(n).padStart(2, "0");
// Ísland er UTC+0 -> handvirkt snið svo server og client gefi sama streng (engin hydration-villa)
function timeOf(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`;
}
function dateTimeOf(iso: string) {
  const d = new Date(iso);
  return `${pad2(d.getUTCDate())}.${pad2(d.getUTCMonth() + 1)}.${d.getUTCFullYear()} ${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`;
}

function exportRows(rows: GuestRow[], eventName: string, showDrinks: boolean, cols: Cols, customCols: CustomCol[]) {
  const headers = [
    "Nafn",
    ...(cols.kennitala ? ["Kennitala"] : []),
    ...(cols.company ? ["Fyrirtæki"] : []),
    ...(cols.unit ? ["Rekstrareining"] : []),
    ...(cols.location ? ["Staðsetning"] : []),
    ...(cols.dietary ? ["Fæðuóþol"] : []),
    ...(cols.phone ? ["Sími"] : []),
    ...(cols.email ? ["Netfang"] : []),
    ...(cols.spouse ? ["Maki", "Maki mætt"] : []),
    ...customCols.map((c) => c.label),
    "Staða", "Innritun",
    ...(showDrinks ? ["Drykkir nýttir", "Drykkir inneign", "Drykkir eftir", ...(cols.spouse ? ["Maki nýttir", "Maki eftir"] : [])] : []),
  ];
  const data: CellValue[][] = rows.map((r) => [
    r.name,
    ...(cols.kennitala ? [r.kennitala ?? ""] : []),
    ...(cols.company ? [r.company ?? ""] : []),
    ...(cols.unit ? [r.unit ?? ""] : []),
    ...(cols.location ? [r.location ?? ""] : []),
    ...(cols.dietary ? [r.dietary ?? ""] : []),
    ...(cols.phone ? [r.phone ?? ""] : []),
    ...(cols.email ? [r.email ?? ""] : []),
    ...(cols.spouse ? [r.hasSpouse ? r.spouseName || "+1" : "", r.hasSpouse ? (r.spouseAttended ? "Já" : "Nei") : ""] : []),
    ...customCols.map((c) => r.custom?.[c.id] ?? ""),
    r.cancelled ? "Afskráð" : r.attended ? "Mætt" : "Ómætt",
    r.attended && r.checkedInAt ? dateTimeOf(r.checkedInAt) : "",
    ...(showDrinks
      ? [
          r.drinks ? r.drinks.used : "",
          r.drinks ? r.drinks.allowance : "",
          r.drinks ? r.drinks.remaining : "",
          ...(cols.spouse ? [r.spouseDrinks ? r.spouseDrinks.used : "", r.spouseDrinks ? r.spouseDrinks.remaining : ""] : []),
        ]
      : []),
  ]);
  downloadXlsx(`gestalisti-${slugify(eventName) || "vidburdur"}.xlsx`, headers, data, "Gestalisti");
}

export function GuestList({
  rows,
  eventId,
  eventName,
  showDrinks,
  cols,
  customCols,
}: {
  rows: GuestRow[];
  eventId: string;
  eventName: string;
  showDrinks: boolean;
  cols: Cols;
  customCols: CustomCol[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("all");
  const [q, setQ] = useState("");
  const [unit, setUnit] = useState("");
  const [loc, setLoc] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "name", dir: 1 });
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function afskra(id: string) {
    setBusyId(id);
    const res = await cancelRegistrationAdmin(id, eventId);
    setBusyId(null);
    setConfirmId(null);
    if (res.ok) router.refresh();
  }

  async function reactivate(id: string) {
    setBusyId(id);
    const res = await reactivateRegistrationAdmin(id, eventId);
    setBusyId(null);
    if (res.ok) router.refresh();
  }

  const units = useMemo(
    () => [...new Set(rows.map((r) => r.unit).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, "is")),
    [rows]
  );
  const locs = useMemo(
    () => [...new Set(rows.map((r) => r.location).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, "is")),
    [rows]
  );

  const activeRows = rows.filter((r) => !r.cancelled);
  const cancelledCount = rows.length - activeRows.length;
  const attendedCount = activeRows.filter((r) => r.attended).length;
  const counts = { all: activeRows.length, in: attendedCount, out: activeRows.length - attendedCount, cancelled: cancelledCount };

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = rows.filter((r) => {
      if (tab === "cancelled" && !r.cancelled) return false;
      if (tab !== "cancelled" && tab !== "all" && r.cancelled) return false; // afskráðir aðeins í Allir/Afskráð
      if (tab === "in" && !r.attended) return false;
      if (tab === "out" && r.attended) return false;
      if (unit && r.unit !== unit) return false;
      if (loc && r.location !== loc) return false;
      if (!needle) return true;
      return [r.name, r.company, r.unit, r.location, r.spouseName, r.email]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(needle));
    });
    const val = (r: GuestRow): string | number => {
      if (sort.key === "status") return r.attended ? 1 : 0;
      if (sort.key === "drinks") return r.drinks ? r.drinks.used : -1;
      return ((r[sort.key] as string) || "").toLowerCase();
    };
    out.sort((a, b) => {
      // virkir efst, afskráðir neðst
      if (a.cancelled !== b.cancelled) return a.cancelled ? 1 : -1;
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
    ...(counts.cancelled > 0 ? [{ key: "cancelled" as Tab, label: `Afskráð ${counts.cancelled}` }] : []),
  ];

  const selectCls = "rounded-xl border border-border bg-elevated px-3 py-2 text-sm text-text outline-none focus:border-accent";
  const colCount =
    1 + (cols.company ? 1 : 0) + (cols.unit ? 1 : 0) + (cols.location ? 1 : 0) + (cols.dietary ? 1 : 0) + (cols.spouse ? 1 : 0) + customCols.length + (showDrinks ? 1 : 0) + 2;

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
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1.5">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-full px-3.5 py-2 text-sm font-medium transition ${
                tab === t.key
                  ? "border border-accent bg-gradient-to-br from-accent to-accent-bright text-accent-ink shadow-glow"
                  : "btn-secondary"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {cols.unit && (
          <select value={unit} onChange={(e) => setUnit(e.target.value)} className={selectCls}>
            <option value="">Allar deildir</option>
            {units.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        )}

        {cols.location && (
          <select value={loc} onChange={(e) => setLoc(e.target.value)} className={selectCls}>
            <option value="">Allar staðsetningar</option>
            {locs.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        )}

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Leita…"
          className="min-w-[140px] flex-1 rounded-xl border border-border bg-elevated px-3 py-2 text-sm text-text placeholder:text-muted outline-none focus:border-accent"
        />

        <button
          onClick={() => exportRows(filtered, eventName, showDrinks, cols, customCols)}
          className="rounded-xl border border-accent px-4 py-2 text-sm font-semibold text-accent transition hover:bg-accent-soft"
        >
          Flytja út (Excel)
        </button>
      </div>

      <p className="text-[13px] text-muted">
        Sýni {filtered.length} af {rows.length}
        {(unit || loc || q || tab !== "all") && " (síað)"}
      </p>

      {/* Spjöld á síma */}
      <div className="space-y-3 lg:hidden">
        {filtered.map((r) => (
          <div key={r.id} className={`rounded-xl border border-border bg-surface p-4 ${r.cancelled ? "opacity-60" : ""}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-text">{r.name}</p>
                {(cols.company || cols.unit || cols.location) && (
                  <p className="text-[13px] text-muted">
                    {[cols.company ? r.company : null, cols.unit ? r.unit : null, cols.location ? r.location : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
              </div>
              <span className="shrink-0 text-right text-[13px]">
                {r.cancelled ? (
                  <span className="text-danger">⛔ Afskráð</span>
                ) : r.attended ? (
                  <span className="text-success">✓ Mætt{r.checkedInAt ? ` · ${timeOf(r.checkedInAt)}` : ""}</span>
                ) : (
                  <span className="text-muted">Ómætt</span>
                )}
              </span>
            </div>

            {cols.spouse && r.hasSpouse && (
              <p className="mt-2 text-[13px] text-muted">
                Maki: <span className="text-text">{r.spouseName || "+1"}</span>
                <span className={r.spouseAttended ? "text-success" : "text-muted"}> · {r.spouseAttended ? "mætt" : "ómætt"}</span>
              </p>
            )}
            {cols.dietary && r.dietary && <p className="mt-1 text-[13px] text-accent">Fæðuóþol: {r.dietary}</p>}
            {customCols.map((c) =>
              r.custom?.[c.id] ? (
                <p key={c.id} className="mt-1 text-[13px] text-muted">
                  {c.label}: <span className="text-text">{r.custom[c.id]}</span>
                </p>
              ) : null
            )}
            {showDrinks && r.drinks && (
              <p className="mt-1 text-[13px] text-muted">
                Drykkir: <span className="text-text">{r.drinks.used}/{r.drinks.allowance}</span> ({r.drinks.remaining} eftir)
                {cols.spouse && r.spouseDrinks && (
                  <span className="block">Maki drykkir: {r.spouseDrinks.used}/{r.spouseDrinks.allowance}</span>
                )}
              </p>
            )}

            <div className="mt-3 flex justify-end">
              {r.cancelled ? (
                <button
                  onClick={() => reactivate(r.id)}
                  disabled={busyId === r.id}
                  className="rounded-lg border border-success px-3 py-1.5 text-[13px] font-semibold text-success transition hover:bg-[rgba(95,178,138,0.08)] disabled:opacity-60"
                >
                  {busyId === r.id ? "…" : "Endurskrá"}
                </button>
              ) : confirmId === r.id ? (
                <span className="inline-flex gap-2">
                  <button
                    onClick={() => afskra(r.id)}
                    disabled={busyId === r.id}
                    className="rounded-lg bg-danger px-3 py-1.5 text-[13px] font-semibold text-white disabled:opacity-60"
                  >
                    {busyId === r.id ? "…" : "Staðfesta afskráningu"}
                  </button>
                  <button onClick={() => setConfirmId(null)} className="btn-secondary rounded-lg px-3 py-1.5 text-[13px]">
                    Hætta
                  </button>
                </span>
              ) : (
                <button
                  onClick={() => setConfirmId(r.id)}
                  className="btn-secondary-danger rounded-lg px-3 py-1.5 text-[13px]"
                >
                  Afskrá
                </button>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="rounded-xl border border-border bg-surface px-3 py-8 text-center text-sm text-muted">
            Enginn gestur passar við síuna.
          </p>
        )}
      </div>

      {/* Tafla á tölvuskjá */}
      <div className="hidden overflow-hidden rounded-2xl border border-border shadow-card lg:block">
        <div className="max-h-[68vh] overflow-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-surface text-[13px]">
              <tr className="border-b border-border">
                <SortHead k="name">Nafn</SortHead>
                {cols.company && <SortHead k="company" className="hidden sm:table-cell">Fyrirtæki</SortHead>}
                {cols.unit && <SortHead k="unit" className="hidden md:table-cell">Rekstrareining</SortHead>}
                {cols.location && <SortHead k="location" className="hidden md:table-cell">Staðsetning</SortHead>}
                {cols.dietary && <th className="hidden whitespace-nowrap px-3 py-2.5 text-left font-medium text-muted lg:table-cell">Fæðuóþol</th>}
                {cols.spouse && <th className="hidden whitespace-nowrap px-3 py-2.5 text-left font-medium text-muted lg:table-cell">Maki</th>}
                {customCols.map((c) => (
                  <th key={c.id} className="hidden whitespace-nowrap px-3 py-2.5 text-left font-medium text-muted lg:table-cell">
                    {c.label}
                  </th>
                ))}
                {showDrinks && <SortHead k="drinks" className="whitespace-nowrap">Drykkir</SortHead>}
                <SortHead k="status" className="text-right">Staða</SortHead>
                <th className="sticky right-0 z-20 border-l border-border bg-surface px-3 py-2.5 text-right text-muted">Aðgerð</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={r.id} className={`border-b border-border transition hover:bg-elevated ${i % 2 ? "bg-[var(--row-alt)]" : ""} ${r.cancelled ? "opacity-55" : ""}`}>
                  <td className="px-3 py-2.5">
                    <span className="font-medium text-text">{r.name}</span>
                    {(cols.company || cols.unit) && (
                      <span className="block text-[12px] text-muted sm:hidden">
                        {[cols.company ? r.company : null, cols.unit ? r.unit : null].filter(Boolean).join(" · ")}
                      </span>
                    )}
                  </td>
                  {cols.company && <td className="hidden px-3 py-2.5 text-muted sm:table-cell">{r.company ?? "—"}</td>}
                  {cols.unit && <td className="hidden px-3 py-2.5 text-muted md:table-cell">{r.unit ?? "—"}</td>}
                  {cols.location && <td className="hidden px-3 py-2.5 text-muted md:table-cell">{r.location ?? "—"}</td>}
                  {cols.dietary && (
                    <td className="hidden px-3 py-2.5 lg:table-cell">
                      {r.dietary ? <span className="text-accent">{r.dietary}</span> : <span className="text-muted">—</span>}
                    </td>
                  )}
                  {cols.spouse && (
                    <td className="hidden px-3 py-2.5 text-muted lg:table-cell">
                      {r.hasSpouse ? (
                        <span>
                          {r.spouseName || "+1"}{" "}
                          <span className={r.spouseAttended ? "text-success" : "text-muted"}>· {r.spouseAttended ? "mætt" : "ómætt"}</span>
                          {showDrinks && r.spouseDrinks && <span className="block text-[12px] text-muted">{r.spouseDrinks.used}/{r.spouseDrinks.allowance} drykkir</span>}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  )}
                  {customCols.map((c) => (
                    <td key={c.id} className="hidden px-3 py-2.5 text-muted lg:table-cell">
                      {r.custom?.[c.id] ? <span className="text-text">{r.custom[c.id]}</span> : "—"}
                    </td>
                  ))}
                  {showDrinks && (
                    <td className="whitespace-nowrap px-3 py-2.5">
                      {r.drinks ? (
                        <>
                          <span className="text-text">{r.drinks.used}/{r.drinks.allowance}</span>
                          <span className={`block text-[12px] ${r.drinks.remaining > 0 ? "text-accent" : "text-muted"}`}>{r.drinks.remaining} eftir</span>
                        </>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                  )}
                  <td className="whitespace-nowrap px-3 py-2.5 text-right">
                    {r.cancelled ? (
                      <span className="text-danger">⛔ Afskráð</span>
                    ) : r.attended ? (
                      <span className="text-success">✓ Mætt{r.checkedInAt ? ` · ${timeOf(r.checkedInAt)}` : ""}</span>
                    ) : (
                      <span className="text-muted">Ómætt</span>
                    )}
                  </td>
                  <td className="sticky right-0 z-[1] whitespace-nowrap border-l border-border bg-surface px-3 py-2.5 text-right">
                    {r.cancelled ? (
                      <button
                        onClick={() => reactivate(r.id)}
                        disabled={busyId === r.id}
                        className="rounded-lg border border-success px-2.5 py-1 text-[12px] font-semibold text-success transition hover:bg-[rgba(95,178,138,0.08)] disabled:opacity-60"
                      >
                        {busyId === r.id ? "…" : "Endurskrá"}
                      </button>
                    ) : confirmId === r.id ? (
                      <span className="inline-flex gap-2">
                        <button
                          onClick={() => afskra(r.id)}
                          disabled={busyId === r.id}
                          className="rounded-lg bg-danger px-2.5 py-1 text-[12px] font-semibold text-white disabled:opacity-60"
                        >
                          {busyId === r.id ? "…" : "Staðfesta"}
                        </button>
                        <button onClick={() => setConfirmId(null)} className="btn-secondary rounded-lg px-2.5 py-1 text-[12px]">
                          Hætta
                        </button>
                      </span>
                    ) : (
                      <button
                        onClick={() => setConfirmId(r.id)}
                        className="btn-secondary-danger rounded-lg px-2.5 py-1 text-[12px]"
                      >
                        Afskrá
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={colCount} className="px-3 py-10 text-center text-sm text-muted">
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
