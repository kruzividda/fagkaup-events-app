"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui";
import { downloadXlsx, type CellValue } from "@/lib/xlsx";
import { slugify } from "@/lib/slug";
import { importInvitations, deleteInvitation, clearUnregisteredInvitations, type ImportRow } from "./actions";

export type InviteRow = {
  id: string;
  full_name: string | null;
  email: string;
  company: string | null;
  business_unit: string | null;
  status: "invited" | "registered" | "attended" | "declined";
};

const STATUS_LABEL: Record<InviteRow["status"], string> = {
  invited: "Boðaður",
  registered: "Skráður",
  attended: "Mættur",
  declined: "Afþakkað",
};

// ---- CSV greining ----
function detectDelimiter(line: string): string {
  const counts: Record<string, number> = { ";": 0, ",": 0, "\t": 0 };
  let inQ = false;
  for (const ch of line) {
    if (ch === '"') inQ = !inQ;
    else if (!inQ && ch in counts) counts[ch]++;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function parseCsv(text: string): string[][] {
  let s = text.replace(/^\uFEFF/, ""); // BOM
  const delim = detectDelimiter(s.split(/\r?\n/)[0] ?? "");
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQ = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inQ) {
      if (ch === '"') {
        if (s[i + 1] === '"') { field += '"'; i++; }
        else inQ = false;
      } else field += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === delim) { row.push(field); field = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && s[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else field += ch;
  }
  if (field !== "" || row.length) { row.push(field); if (row.some((c) => c.trim() !== "")) rows.push(row); }
  return rows;
}

function matchCol(header: string): keyof ImportRow | null {
  const h = header.toLowerCase().trim();
  if (/net.?fang|e-?mail|email|p[oó]stfang|p[oó]stur/.test(h)) return "email";
  if (/nafn|name/.test(h)) return "full_name";
  if (/fyrirt|company|f[eé]lag/.test(h)) return "company";
  if (/rekstrar|deild|unit|sv[ií]ð|sv[ií]d/.test(h)) return "business_unit";
  if (/sta[ðd]setn|location|[uú]tib[uú]/.test(h)) return "location";
  return null;
}

function rowsFromCsv(text: string): { rows: ImportRow[]; error?: string } {
  const grid = parseCsv(text);
  if (grid.length < 2) return { rows: [], error: "Skráin virðist tóm eða án gagna." };
  const header = grid[0];
  const map = header.map(matchCol);
  const emailIdx = map.indexOf("email");
  if (emailIdx === -1) {
    return { rows: [], error: "Fann ekki dálk fyrir netfang. Hafðu dálk sem heitir t.d. „Netfang” eða „Email”." };
  }
  const out: ImportRow[] = [];
  for (let i = 1; i < grid.length; i++) {
    const cells = grid[i];
    const rec: ImportRow = { email: (cells[emailIdx] ?? "").trim() };
    map.forEach((key, idx) => {
      if (!key || key === "email") return;
      const v = (cells[idx] ?? "").trim();
      if (v) (rec as Record<string, string>)[key] = v;
    });
    if (rec.email) out.push(rec);
  }
  return { rows: out };
}

export function BodslistiManager({
  eventId,
  eventName,
  initial,
  counts,
}: {
  eventId: string;
  eventName: string;
  initial: InviteRow[];
  counts: { total: number; registered: number; attended: number; rate: number };
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    setErr(null);
    setMsg(null);
    const text = await file.text();
    const { rows, error } = rowsFromCsv(text);
    if (error) return setErr(error);
    if (rows.length === 0) return setErr("Engar línur með netfangi fundust.");
    setBusy(true);
    const res = await importInvitations(eventId, rows, file.name);
    setBusy(false);
    if (!res.ok) return setErr(res.error ?? "Innflutningur mistókst.");
    setMsg(`Flutti inn ${res.imported} boð${res.skipped ? ` · ${res.skipped} sleppt (vantaði/tvítekið netfang)` : ""}.`);
    router.refresh();
  }

  async function remove(id: string) {
    setBusy(true);
    await deleteInvitation(eventId, id);
    setBusy(false);
    router.refresh();
  }

  async function clearAll() {
    setBusy(true);
    await clearUnregisteredInvitations(eventId);
    setBusy(false);
    setConfirmClear(false);
    router.refresh();
  }

  function exportList() {
    const headers = ["Nafn", "Netfang", "Fyrirtæki", "Rekstrareining", "Staða"];
    const data: CellValue[][] = initial.map((r) => [
      r.full_name ?? "",
      r.email,
      r.company ?? "",
      r.business_unit ?? "",
      STATUS_LABEL[r.status],
    ]);
    downloadXlsx(`bodslisti-${slugify(eventName) || "vidburdur"}.xlsx`, headers, data, "Boðslisti");
  }

  const q = filter.trim().toLowerCase();
  const shown = q
    ? initial.filter((r) => [r.full_name, r.email, r.company].some((v) => (v ?? "").toLowerCase().includes(q)))
    : initial;

  return (
    <div className="space-y-5">
      {/* Talningar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Boðaðir" value={counts.total} />
        <Stat label="Skráðir" value={counts.registered} />
        <Stat label="Mættir" value={counts.attended} />
        <Stat label="Mæting" value={`${counts.rate}%`} />
      </div>

      {/* Innflutningur */}
      <Card className="space-y-3">
        <div>
          <p className="font-display text-base text-text">Flytja inn boðslista</p>
          <p className="text-[13px] text-muted">
            CSV-skrá með dálki fyrir netfang (og eftir atvikum nafn, fyrirtæki, rekstrareiningu). Úr Excel: veldu
            „Vista sem" → CSV. Netföng sem eru þegar á listanum uppfærast frekar en að tvítaka.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={onFile} className="hidden" />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink transition hover:brightness-110 disabled:opacity-60"
          >
            {busy ? "Vinn…" : "Velja CSV skrá"}
          </button>
          {initial.length > 0 && (
            <button onClick={exportList} className="btn-secondary rounded-xl px-4 py-2.5 text-sm">
              Flytja út (Excel)
            </button>
          )}
        </div>
        {msg && <p className="rounded-xl border border-success bg-[rgba(106,168,107,0.08)] px-4 py-2.5 text-sm text-success">{msg}</p>}
        {err && <p className="rounded-xl border border-danger bg-[rgba(229,103,91,0.08)] px-4 py-2.5 text-sm text-danger">{err}</p>}
      </Card>

      {/* Listi */}
      {initial.length === 0 ? (
        <Card className="text-center text-sm text-muted">Enginn boðslisti enn. Flyttu inn CSV til að byrja.</Card>
      ) : (
        <Card className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Leita…"
              className="rounded-lg border border-border bg-elevated px-3 py-2 text-sm text-text outline-none focus:border-accent"
            />
            {confirmClear ? (
              <span className="inline-flex items-center gap-2 text-sm">
                <span className="text-muted">Eyða öllum óskráðum?</span>
                <button onClick={clearAll} disabled={busy} className="rounded-lg bg-danger px-3 py-1.5 font-semibold text-white">Já</button>
                <button onClick={() => setConfirmClear(false)} className="rounded-lg border border-border px-3 py-1.5 text-muted">Nei</button>
              </span>
            ) : (
              <button onClick={() => setConfirmClear(true)} className="btn-secondary-danger rounded-lg px-3 py-1.5 text-sm">
                Hreinsa óskráða
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[12px] uppercase tracking-wide text-muted">
                  <th className="py-2 pr-3">Nafn</th>
                  <th className="py-2 pr-3">Netfang</th>
                  <th className="py-2 pr-3">Fyrirtæki</th>
                  <th className="py-2 pr-3">Staða</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.id} className="border-b border-border/50">
                    <td className="py-2 pr-3 text-text">{r.full_name || "—"}</td>
                    <td className="py-2 pr-3 text-muted">{r.email}</td>
                    <td className="py-2 pr-3 text-muted">{r.company || "—"}</td>
                    <td className="py-2 pr-3"><StatusBadge status={r.status} /></td>
                    <td className="py-2 text-right">
                      <button
                        onClick={() => remove(r.id)}
                        disabled={busy}
                        className="text-[12px] text-muted transition hover:text-danger"
                        title="Fjarlægja af boðslista"
                      >
                        Fjarlægja
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {shown.length === 0 && <p className="py-4 text-center text-sm text-muted">Ekkert fannst.</p>}
          </div>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <Card className="text-center">
      <p className="text-[12px] uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl text-text">{value}</p>
    </Card>
  );
}

function StatusBadge({ status }: { status: InviteRow["status"] }) {
  const cls =
    status === "attended"
      ? "border-success text-success"
      : status === "registered"
      ? "border-accent text-accent"
      : status === "declined"
      ? "border-border text-muted"
      : "border-border text-muted";
  return <span className={`rounded-full border px-2.5 py-0.5 text-[12px] ${cls}`}>{STATUS_LABEL[status]}</span>;
}
