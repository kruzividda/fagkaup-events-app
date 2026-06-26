"use client";

import { useRef, useState } from "react";
import { QrScanner } from "./QrScanner";
import { scanCheckin, scanDrink, syncWalletDrinks, type ScanResult } from "./actions";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui";

const DRINK_TYPES = ["Bjór", "Léttvín", "Gosbjór", "Gos"] as const;

export function ScanScreen({
  mode,
  eventId,
  eventName,
  sessionToken,
}: {
  mode: "door" | "bar";
  eventId?: string;
  eventName: string;
  sessionToken?: string;
}) {
  const [paused, setPaused] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [manual, setManual] = useState("");
  const [drinkType, setDrinkType] = useState<string>(DRINK_TYPES[0]);
  const busyRef = useRef(false);

  async function handleScan(token: string) {
    const t = token.trim();
    if (!t || busyRef.current) return;
    busyRef.current = true;
    setPaused(true);
    setLoading(true);
    let res: ScanResult;
    if (sessionToken) {
      // Opinn PIN-hlekkur: session-vottuð úttekt (krefst nettengingar)
      try {
        const supabase = createClient();
        const { data, error } = await supabase.rpc("redeem_drink_s", {
          p_session_token: sessionToken,
          p_token: t,
          p_quantity: 1,
          p_drink_type: mode === "bar" ? drinkType : null,
        });
        if (error) throw error;
        res = (data as ScanResult) ?? { ok: false, reason: "no_data" };
      } catch {
        res = { ok: false, reason: "network" };
      }
    } else {
      res = mode === "door" ? await scanCheckin(eventId!, t) : await scanDrink(eventId!, t, 1, drinkType);
    }
    setResult(res);
    setLoading(false);

    // Uppfæra drykkjateljara á Google Wallet miða (best-effort, blokkar ekki)
    if (res?.ok && mode === "bar") {
      void syncWalletDrinks(t).catch(() => {});
    }
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
          {mode === "bar" && (
            <div className="space-y-2">
              <p className="text-center text-xs text-muted">Tegund drykkjar</p>
              <div className="grid grid-cols-4 gap-2">
                {DRINK_TYPES.map((dt) => (
                  <button
                    key={dt}
                    onClick={() => setDrinkType(dt)}
                    className={`rounded-xl px-2 py-2.5 text-sm font-semibold transition ${
                      drinkType === dt
                        ? "bg-accent text-[#0B121C]"
                        : "border border-border bg-elevated text-muted hover:text-text"
                    }`}
                  >
                    {dt}
                  </button>
                ))}
              </div>
            </div>
          )}

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
  if (r.reason === "cancelled") {
    const name = (guestOf(r).full_name as string) ?? "Gesturinn";
    return (
      <div className="space-y-3">
        <Banner tone="bad" title="⛔ Afbókað" />
        <Card className="space-y-1 text-center">
          <p className="font-display text-lg text-text">{name}</p>
          <p className="text-sm text-muted">Þessi skráning hefur verið afboðuð og miðinn gildir ekki.</p>
        </Card>
      </div>
    );
  }

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
  if (r.reason === "network" || r.reason === "no_data")
    return (
      <div className="space-y-3">
        <Banner tone="bad" title="⚠ Næ ekki sambandi" />
        <Card className="text-center text-sm text-muted">
          Barinn þarf nettengingu til að draga frá inneign. Athugaðu netið og reyndu aftur.
        </Card>
      </div>
    );
  if (r.reason === "unauthorized")
    return (
      <div className="space-y-3">
        <Banner tone="bad" title="⚠ Aðgangur útrunninn" />
        <Card className="text-center text-sm text-muted">
          Opnaðu hlekkinn aftur og sláðu inn PIN til að halda áfram.
        </Card>
      </div>
    );
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
  if (r.reason === "cancelled") {
    const name = (guestOf(r).full_name as string) ?? "Gesturinn";
    return (
      <div className="space-y-3">
        <Banner tone="bad" title="⛔ Afbókað" />
        <Card className="space-y-1 text-center">
          <p className="font-display text-lg text-text">{name}</p>
          <p className="text-sm text-muted">Þessi skráning hefur verið afboðuð.</p>
        </Card>
      </div>
    );
  }
  if (r.reason === "underage") {
    const name = (guestOf(r).full_name as string) ?? "Gesturinn";
    return (
      <div className="space-y-3">
        <Banner tone="bad" title="🔞 Undir aldri" />
        <Card className="space-y-1 text-center">
          <p className="font-display text-lg text-text">{name}</p>
          <p className="text-sm text-muted">
            Má ekki fá áfengi — undir 20 ára. Engin áfeng inneign afgreidd.
          </p>
        </Card>
      </div>
    );
  }
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
  const dtype = (r.drink_type as string | null) ?? null;
  return (
    <div className="space-y-3">
      <Banner tone="ok" title="✓ Drykkur skráður" />
      <Card className="text-center">
        {dtype && <p className="font-display text-lg text-text">{dtype}</p>}
        <p className="mt-1 text-xs text-muted">Drykkir eftir</p>
        <p className="mt-1 font-display text-3xl text-accent">
          {remaining} af {allowance}
        </p>
      </Card>
    </div>
  );
}
