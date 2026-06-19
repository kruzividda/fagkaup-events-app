"use client";

import { useRef, useState } from "react";
import { QrScanner } from "./QrScanner";
import { scanCheckin, scanDrink, type ScanResult } from "./actions";
import { Card } from "@/components/ui";

export function ScanScreen({
  mode,
  eventId,
  eventName,
}: {
  mode: "door" | "bar";
  eventId: string;
  eventName: string;
}) {
  const [paused, setPaused] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [manual, setManual] = useState("");
  const busyRef = useRef(false);

  async function handleScan(token: string) {
    const t = token.trim();
    if (!t || busyRef.current) return;
    busyRef.current = true;
    setPaused(true);
    setLoading(true);
    const res = mode === "door" ? await scanCheckin(eventId, t) : await scanDrink(eventId, t);
    setResult(res);
    setLoading(false);
  }

  function next() {
    setResult(null);
    setManual("");
    setPaused(false);
    busyRef.current = false;
  }

  return (
    <div className="space-y-5">
      {!result && (
        <>
          <QrScanner onScan={handleScan} paused={paused} />

          <div className="space-y-2">
            <p className="text-center text-xs text-muted">Eða límdu token handvirkt (til prófunar):</p>
            <div className="flex gap-2">
              <input
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                placeholder="token úr miðaslóð"
                className="flex-1 rounded-lg border border-border bg-elevated px-3 py-2 text-sm text-text outline-none focus:border-accent"
              />
              <button
                onClick={() => handleScan(manual)}
                disabled={!manual.trim()}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-[#0B121C] disabled:opacity-50"
              >
                Skanna
              </button>
            </div>
          </div>
        </>
      )}

      {loading && (
        <Card className="text-center">
          <p className="text-sm text-muted">Vinn úr…</p>
        </Card>
      )}

      {result && !loading && (
        <>
          {mode === "door" ? <DoorResult r={result} /> : <BarResult r={result} />}
          <button
            onClick={next}
            className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-[#0B121C] transition hover:brightness-110"
          >
            {mode === "door" ? "Næsti gestur" : "Næsti drykkur"}
          </button>
        </>
      )}

      <p className="text-center text-[11px] text-muted">{eventName}</p>
    </div>
  );
}

function Banner({ tone, title }: { tone: "ok" | "warn" | "bad"; title: string }) {
  const cls =
    tone === "ok"
      ? "border border-success bg-surface text-success"
      : tone === "warn"
      ? "border border-accent bg-surface text-accent"
      : "border-2 border-danger bg-danger text-[#0B121C] shadow-lg";
  return (
    <div className={`rounded-xl px-4 py-4 text-center font-display text-xl font-semibold ${cls}`}>
      {title}
    </div>
  );
}

function guestOf(r: ScanResult): Record<string, unknown> {
  return (r.guest as Record<string, unknown>) ?? {};
}

function DoorResult({ r }: { r: ScanResult }) {
  if (r.reason === "invalid") return <Banner tone="bad" title="Ógildur miði" />;
  if (r.reason === "wrong_event")
    return (
      <div className="space-y-3">
        <Banner tone="bad" title="⚠ Rangur viðburður" />
        <Card className="text-center text-sm text-muted">
          Þessi miði er á annan viðburð og gildir ekki hér.
        </Card>
      </div>
    );

  const g = guestOf(r);
  const name = (g.full_name as string) ?? "—";
  const company = g.company as string | null;
  const unit = g.business_unit as string | null;
  const plus = g.has_plus_one === true;
  const spouse = g.spouse_name as string | null;
  const dietary = g.dietary as string | null;
  const isGuest = g.holder_type === "guest";

  return (
    <div className="space-y-3">
      {r.ok ? (
        <Banner tone="ok" title="✓ Mætt skráð" />
      ) : (
        <Banner tone="bad" title="⚠ Miði þegar notaður" />
      )}
      <Card className="space-y-1">
        <p className="font-display text-xl text-text">
          {name} {isGuest && <span className="text-sm text-accent">· maki</span>}
        </p>
        {(company || unit) && (
          <p className="text-sm text-muted">{[company, unit].filter(Boolean).join(" · ")}</p>
        )}
        {!isGuest && plus && <p className="text-sm text-text">Maki: {spouse || "+1"}</p>}
        {dietary && (
          <p className="mt-1 rounded-lg border border-accent bg-surface px-2 py-1 text-sm text-accent">
            ⚠ Fæðuóþol: {dietary}
          </p>
        )}
        {!r.ok && r.checked_in_at != null && (
          <p className="mt-1 text-xs text-muted">
            Innritað áður: {new Date(String(r.checked_in_at)).toLocaleTimeString("is-IS", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Atlantic/Reykjavik" })}
          </p>
        )}
      </Card>
    </div>
  );
}

function BarResult({ r }: { r: ScanResult }) {
  if (r.reason === "invalid") return <Banner tone="bad" title="Ógildur miði" />;
  if (r.reason === "wrong_event")
    return (
      <div className="space-y-3">
        <Banner tone="bad" title="⚠ Rangur viðburður" />
        <Card className="text-center text-sm text-muted">
          Þessi miði er á annan viðburð og gildir ekki hér.
        </Card>
      </div>
    );
  if (r.reason === "not_checked_in") {
    const name = (guestOf(r).full_name as string) ?? "Gesturinn";
    return (
      <div className="space-y-3">
        <Banner tone="bad" title="⛔ Ekki innritaður" />
        <Card className="space-y-1 text-center">
          <p className="font-display text-lg text-text">{name}</p>
          <p className="text-sm text-muted">
            Hefur ekki skráð sig inn við dyr. Vísaðu gestinum á dyravörð til innritunar áður en hægt er að afgreiða drykk.
          </p>
        </Card>
      </div>
    );
  }
  if (r.reason === "no_credit")
    return (
      <div className="space-y-3">
        <Banner tone="bad" title="Engin inneign eftir" />
        <Card className="text-center text-sm text-muted">Gesturinn hefur nýtt alla sína drykki.</Card>
      </div>
    );

  const remaining = Number(r.remaining ?? 0);
  const allowance = Number(r.allowance ?? 0);
  return (
    <div className="space-y-3">
      <Banner tone="ok" title="✓ Drykkur skráður" />
      <Card className="text-center">
        <p className="text-xs text-muted">Drykkir eftir</p>
        <p className="mt-1 font-display text-3xl text-accent">
          {remaining} af {allowance}
        </p>
      </Card>
    </div>
  );
}
