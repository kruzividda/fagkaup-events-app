"use client";

import { useState } from "react";
import { Card } from "@/components/ui";
import { TextInput } from "@/components/form";
import { searchRegistrations, anonymizeRegistration, deleteRegistration, type FoundReg } from "./actions";

export function PersonuverndManager() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<FoundReg[]>([]);
  const [searched, setSearched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [confirm, setConfirm] = useState<{ id: string; mode: "anon" | "del"; name: string } | null>(null);

  async function run() {
    setBusy(true);
    setMsg(null);
    const res = await searchRegistrations(q);
    setBusy(false);
    setSearched(true);
    if (!res.ok) {
      setMsg({ kind: "err", text: res.reason === "forbidden" ? "Þú hefur ekki aðgang að þessari aðgerð." : "Villa kom upp við leit." });
      setRows([]);
      return;
    }
    setRows(res.rows ?? []);
  }

  async function doAction() {
    if (!confirm) return;
    const { id, mode } = confirm;
    setBusy(true);
    setMsg(null);
    const res = mode === "anon" ? await anonymizeRegistration(id) : await deleteRegistration(id);
    setBusy(false);
    setConfirm(null);
    if (!res.ok) {
      setMsg({ kind: "err", text: "Aðgerð mistókst." + (res.reason ? ` (${res.reason})` : "") });
      return;
    }
    if (mode === "del") {
      setRows((rs) => rs.filter((r) => r.id !== id));
      setMsg({ kind: "ok", text: "Skráningu var eytt að fullu." });
    } else {
      setRows((rs) =>
        rs.map((r) =>
          r.id === id ? { ...r, full_name: "Nafnlaust", email: null, kennitala: null, anonymized_at: new Date().toISOString() } : r
        )
      );
      setMsg({ kind: "ok", text: "Persónuupplýsingar voru fjarlægðar (nafnleynd)." });
    }
  }

  return (
    <Card className="space-y-4">
      <div>
        <p className="text-sm font-medium text-text">Finna skráningu</p>
        <p className="mt-0.5 text-xs text-muted">Leitaðu eftir nafni, netfangi eða kennitölu til að meðhöndla beiðni um eyðingu eða nafnleynd.</p>
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <TextInput value={q} onChange={(v) => setQ(v)} placeholder="Nafn, netfang eða kennitala…" />
        </div>
        <button
          onClick={run}
          disabled={busy || q.trim().length < 2}
          className="shrink-0 rounded-xl bg-accent px-5 py-3 text-sm font-medium text-white transition hover:brightness-105 disabled:opacity-50"
        >
          {busy ? "Leita…" : "Leita"}
        </button>
      </div>

      {msg && (
        <p
          className={`rounded-lg border px-3 py-2 text-sm ${
            msg.kind === "ok" ? "border-border bg-surface text-text" : "border-danger bg-surface text-danger"
          }`}
        >
          {msg.text}
        </p>
      )}

      {searched && rows.length === 0 && !busy && <p className="text-sm text-muted">Engin skráning fannst.</p>}

      {rows.length > 0 && (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-text">
                  {r.full_name || "—"}
                  {r.anonymized_at && (
                    <span className="ml-2 rounded-full border border-border px-2 py-0.5 text-[11px] text-muted">Nafnlaust</span>
                  )}
                  {r.status === "cancelled" && (
                    <span className="ml-2 rounded-full border border-border px-2 py-0.5 text-[11px] text-muted">Afskráð</span>
                  )}
                </p>
                <p className="truncate text-xs text-muted">
                  {[r.email, r.kennitala, r.event_name].filter(Boolean).join(" · ") || "Engar nánari upplýsingar"}
                </p>
              </div>
              {!r.anonymized_at && (
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => setConfirm({ id: r.id, mode: "anon", name: r.full_name || "skráningu" })}
                    disabled={busy}
                    className="rounded-lg border border-border bg-surface px-3 py-1.5 text-[13px] text-text transition hover:border-accent disabled:opacity-50"
                  >
                    Nafnleynd
                  </button>
                  <button
                    onClick={() => setConfirm({ id: r.id, mode: "del", name: r.full_name || "skráningu" })}
                    disabled={busy}
                    className="rounded-lg border border-danger bg-surface px-3 py-1.5 text-[13px] text-danger transition hover:bg-[rgba(229,103,91,0.08)] disabled:opacity-50"
                  >
                    Eyða
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setConfirm(null)}>
          <div className="w-full max-w-md space-y-4 rounded-2xl border border-border bg-elevated p-5" onClick={(e) => e.stopPropagation()}>
            <p className="text-base font-semibold text-text">
              {confirm.mode === "del" ? "Eyða skráningu að fullu?" : "Setja nafnleynd á skráningu?"}
            </p>
            <p className="text-sm text-muted">
              {confirm.mode === "del" ? (
                <>
                  Þetta eyðir <strong>{confirm.name}</strong> varanlega — skráningu, miðum, drykkjainneign og öllum svörum. Tölfræði
                  fyrir þennan gest hverfur líka. Ekki hægt að afturkalla.
                </>
              ) : (
                <>
                  Þetta fjarlægir persónuupplýsingar (nafn, netfang, síma, kennitölu, fæðuóþol, athugasemdir) af{" "}
                  <strong>{confirm.name}</strong>, en heldur tölfræði (mæting, drykkir, fyrirtæki/eining/staðsetning). Ekki hægt að
                  afturkalla.
                </>
              )}
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirm(null)} className="btn-secondary rounded-lg px-4 py-2 text-sm">
                Hætta við
              </button>
              <button
                onClick={doAction}
                disabled={busy}
                className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
                  confirm.mode === "del" ? "bg-danger" : "bg-accent"
                }`}
              >
                {busy ? "Vinn…" : confirm.mode === "del" ? "Eyða að fullu" : "Setja nafnleynd"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
