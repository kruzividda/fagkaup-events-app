"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DoorScanScreen } from "@/app/(scan)/DoorScanScreen";
import { ScanScreen } from "@/app/(scan)/ScanScreen";

type Session = {
  session_token: string;
  role: string;
  event_id: string;
  event_name: string;
  label: string;
  expires_at: string;
};

const sessKey = (token: string) => `fk-scan-session-${token}`;

const REASON: Record<string, string> = {
  invalid: "Þessi hlekkur er ógildur eða óvirkur.",
  not_scanner: "Þessi aðgangur er ekki fyrir skanna.",
  not_started: "Aðgangur er ekki hafinn ennþá.",
  expired: "Aðgangur er útrunninn.",
  wrong_pin: "Rangt PIN. Reyndu aftur.",
};

export function ScannerGate({ token }: { token: string }) {
  const supabase = createClient();
  const [phase, setPhase] = useState<"loading" | "pin" | "scanner">("loading");
  const [session, setSession] = useState<Session | null>(null);
  const [pin, setPin] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Geyma skel þessarar síðu svo endurhleðsla án nets virki
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    if (!navigator.onLine) return;
    navigator.serviceWorker.ready
      .then((reg) => reg.active?.postMessage({ type: "cache-doc", url: window.location.href }))
      .catch(() => {});
  }, []);

  // Athuga geymda lotu
  useEffect(() => {
    let stored: Session | null = null;
    try {
      const raw = window.localStorage.getItem(sessKey(token));
      stored = raw ? (JSON.parse(raw) as Session) : null;
    } catch {
      stored = null;
    }
    const valid = stored && new Date(stored.expires_at).getTime() > Date.now();
    if (valid) {
      setSession(stored);
      setPhase("scanner");
      // Endurstaðfesta í bakgrunni ef nettengt (grípur afturköllun)
      if (navigator.onLine) {
        supabase.rpc("scanner_session", { p_session_token: stored!.session_token }).then(({ data }) => {
          const r = data as { ok: boolean } | null;
          if (r && !r.ok) {
            window.localStorage.removeItem(sessKey(token));
            setSession(null);
            setPhase("pin");
          }
        });
      }
    } else {
      setPhase("pin");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function submitPin() {
    setErr(null);
    if (!/^[0-9]{4,8}$/.test(pin)) return setErr("Sláðu inn PIN (4–8 tölustafir).");
    setBusy(true);
    const { data, error } = await supabase.rpc("open_scanner", { p_token: token, p_pin: pin });
    setBusy(false);
    if (error) return setErr("Næ ekki sambandi. Athugaðu nettengingu.");
    const r = data as ({ ok: boolean; reason?: string } & Partial<Session>) | null;
    if (!r?.ok) return setErr(REASON[r?.reason ?? ""] ?? "Tókst ekki að opna skannann.");
    const s: Session = {
      session_token: r.session_token!,
      role: r.role!,
      event_id: r.event_id!,
      event_name: r.event_name!,
      label: r.label ?? "",
      expires_at: r.expires_at!,
    };
    try {
      window.localStorage.setItem(sessKey(token), JSON.stringify(s));
    } catch {
      /* ignore */
    }
    setSession(s);
    setPin("");
    setPhase("scanner");
  }

  function signOut() {
    try {
      window.localStorage.removeItem(sessKey(token));
    } catch {
      /* ignore */
    }
    setSession(null);
    setPhase("pin");
  }

  return (
    <div className="min-h-[100dvh]">
      <header className="flex items-center justify-between border-b border-border px-5 py-3">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Fagkaup</span>
        {session && (
          <button onClick={signOut} className="text-xs text-muted transition hover:text-text">
            Loka
          </button>
        )}
      </header>

      <main className="mx-auto max-w-md p-5">
        {phase === "loading" && <p className="mt-10 text-center text-sm text-muted">Augnablik…</p>}

        {phase === "pin" && (
          <div className="mt-8 space-y-5">
            <div className="text-center">
              <p className="font-display text-2xl text-text">Skanni</p>
              <p className="mt-1 text-sm text-muted">Sláðu inn PIN til að opna skannann.</p>
            </div>

            {err && (
              <p className="rounded-xl border border-danger bg-[rgba(229,103,91,0.08)] px-4 py-3 text-center text-sm text-danger">
                {err}
              </p>
            )}

            <input
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
              onKeyDown={(e) => e.key === "Enter" && submitPin()}
              inputMode="numeric"
              autoFocus
              placeholder="••••"
              className="w-full rounded-2xl border border-border bg-elevated px-4 py-4 text-center font-display text-3xl tracking-[0.4em] text-text outline-none focus:border-accent"
            />
            <button
              onClick={submitPin}
              disabled={busy}
              className="w-full rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-accent-ink transition hover:brightness-110 disabled:opacity-50"
            >
              {busy ? "Opna…" : "Opna skanna"}
            </button>
          </div>
        )}

        {phase === "scanner" && session && (
          <div className="mt-2">
            <div className="mb-4">
              <p className="font-display text-xl text-text">{session.event_name}</p>
              <p className="text-xs text-muted">
                {session.role === "door" ? "Innritun við dyr" : "Bar"}
                {session.label ? ` · ${session.label}` : ""}
              </p>
            </div>

            {session.role === "door" ? (
              <DoorScanScreen
                sessionToken={session.session_token}
                storageId={token}
                eventName={session.event_name}
              />
            ) : (
              <ScanScreen mode="bar" sessionToken={session.session_token} eventName={session.event_name} />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
