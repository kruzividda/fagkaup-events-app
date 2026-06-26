"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { QrScanner } from "./QrScanner";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui";

type Guest = {
  full_name?: string | null;
  company?: string | null;
  business_unit?: string | null;
  has_plus_one?: boolean;
  spouse_name?: string | null;
  dietary?: string | null;
  holder_type?: string;
};

type Ticket = Guest & {
  token: string;
  cancelled: boolean;
  checked_in: boolean;
  checked_in_at?: string | null;
};

type Result = {
  ok: boolean;
  reason?: string;
  guest?: Guest;
  checked_in_at?: string | null;
  offline?: boolean;
};

type QueueItem = { token: string; scanned_at: string };

const snapKey = (e: string) => `fk-door-snap-${e}`;
const queueKey = (e: string) => `fk-door-queue-${e}`;
const snapAtKey = (e: string) => `fk-door-snapat-${e}`;
// Offline-afrit (persónugögn) rennur út og hreinsast sjálfkrafa eftir þennan tíma.
const SNAP_TTL_MS = 18 * 60 * 60 * 1000; // 18 klst

function loadJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function saveJSON(key: string, val: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(val));
  } catch {
    /* localStorage fullt eða óaðgengilegt */
  }
}

export function DoorScanScreen({
  eventId,
  eventName,
  sessionToken,
  storageId,
}: {
  eventId?: string;
  eventName: string;
  sessionToken?: string;
  storageId?: string;
}) {
  const supabase = createClient();
  const useSession = !!sessionToken;
  const keyId = storageId ?? eventId ?? sessionToken ?? "scan";

  // token -> Ticket (í minni; speglað í localStorage)
  const snapRef = useRef<Map<string, Ticket>>(new Map());
  const queueRef = useRef<QueueItem[]>([]);

  const [snapCount, setSnapCount] = useState(0);
  const [queueCount, setQueueCount] = useState(0);
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [snapLoaded, setSnapLoaded] = useState(false);

  const [paused, setPaused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [manual, setManual] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const busyRef = useRef(false);

  const persistSnap = useCallback(() => {
    const obj: Record<string, Ticket> = {};
    snapRef.current.forEach((v, k) => (obj[k] = v));
    saveJSON(snapKey(keyId), obj);
    saveJSON(snapAtKey(keyId), Date.now());
    setSnapCount(snapRef.current.size);
  }, [keyId]);

  const persistQueue = useCallback(() => {
    saveJSON(queueKey(keyId), queueRef.current);
    setQueueCount(queueRef.current.length);
  }, [keyId]);

  // Hreinsar öll staðbundin gögn (afrit + biðröð) úr þessu tæki.
  const clearDeviceData = useCallback(() => {
    try {
      window.localStorage.removeItem(snapKey(keyId));
      window.localStorage.removeItem(queueKey(keyId));
      window.localStorage.removeItem(snapAtKey(keyId));
    } catch {
      /* óaðgengilegt */
    }
    snapRef.current = new Map();
    queueRef.current = [];
    setSnapCount(0);
    setQueueCount(0);
  }, [keyId]);

  // Sækir ferskt afrit af þjóninum (þegar nettengt)
  const fetchSnapshot = useCallback(async () => {
    try {
      const { data, error } = useSession
        ? await supabase.rpc("door_snapshot_s", { p_session_token: sessionToken })
        : await supabase.rpc("door_snapshot", { p_event_id: eventId });
      if (error) throw error;
      const res = data as { ok: boolean; tickets?: Ticket[] };
      if (!res?.ok || !res.tickets) return false;
      const map = new Map<string, Ticket>();
      for (const t of res.tickets) map.set(t.token, t);
      // Haldið staðbundnum óstilltum innritunum
      for (const q of queueRef.current) {
        const t = map.get(q.token);
        if (t) {
          t.checked_in = true;
          t.checked_in_at = t.checked_in_at ?? q.scanned_at;
        }
      }
      snapRef.current = map;
      persistSnap();
      setLastSync(new Date().toISOString());
      return true;
    } catch {
      return false;
    }
  }, [eventId, sessionToken, useSession, supabase, persistSnap]);

  // Sendir biðröðina í Supabase
  const flushQueue = useCallback(async () => {
    if (!navigator.onLine || queueRef.current.length === 0 || syncing) return;
    setSyncing(true);
    const remaining: QueueItem[] = [];
    for (const item of queueRef.current) {
      try {
        const { data, error } = useSession
          ? await supabase.rpc("sync_checkin_s", {
              p_session_token: sessionToken,
              p_token: item.token,
              p_scanned_at: item.scanned_at,
            })
          : await supabase.rpc("sync_checkin", {
              p_event_id: eventId,
              p_token: item.token,
              p_scanned_at: item.scanned_at,
            });
        const r = data as Result | null;
        // Geymum áfram ef netvilla EÐA aðgangur útrunninn (svo innritun tapist ekki).
        // ok/duplicate => komið til skila. invalid/wrong_event/cancelled => sleppum.
        const keep = !!error || (r?.reason === "unauthorized");
        if (keep) remaining.push(item);
      } catch {
        remaining.push(item); // netvilla -> reyna aftur síðar
      }
    }
    queueRef.current = remaining;
    persistQueue();
    setLastSync(new Date().toISOString());
    setSyncing(false);
  }, [eventId, sessionToken, useSession, supabase, syncing, persistQueue]);

  // Frumstilling
  useEffect(() => {
    setOnline(navigator.onLine);
    // Sjálfvirk hreinsun: ef offline-afritið er útrunnið, fjarlægjum við
    // persónugögnin úr tækinu (biðröð óstilltra innritana er varðveitt).
    const savedAt = loadJSON<number>(snapAtKey(keyId), 0);
    if (savedAt && Date.now() - savedAt > SNAP_TTL_MS) {
      try {
        window.localStorage.removeItem(snapKey(keyId));
        window.localStorage.removeItem(snapAtKey(keyId));
      } catch {
        /* óaðgengilegt */
      }
    }
    // hlaða úr localStorage
    const snapObj = loadJSON<Record<string, Ticket>>(snapKey(keyId), {});
    snapRef.current = new Map(Object.entries(snapObj));
    queueRef.current = loadJSON<QueueItem[]>(queueKey(keyId), []);
    setSnapCount(snapRef.current.size);
    setQueueCount(queueRef.current.length);

    (async () => {
      if (navigator.onLine) {
        await fetchSnapshot();
        await flushQueue();
      }
      setSnapLoaded(true);
    })();

    const goOnline = () => {
      setOnline(true);
      flushQueue();
    };
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    const iv = setInterval(() => {
      setOnline(navigator.onLine);
      if (navigator.onLine) flushQueue();
    }, 20000);

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      clearInterval(iv);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyId]);

  // Tryggja að dyrasíðan sjálf sé geymd í skel (svo endurhleðsla án nets virki)
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    if (!navigator.onLine) return;
    navigator.serviceWorker.ready
      .then((reg) => reg.active?.postMessage({ type: "cache-doc", url: window.location.href }))
      .catch(() => {});
  }, []);

  function localScan(token: string): Result {
    const t = snapRef.current.get(token);
    if (!t) return { ok: false, reason: "unknown_offline" };
    if (t.cancelled) return { ok: false, reason: "cancelled", guest: t, offline: true };
    if (t.checked_in)
      return { ok: false, reason: "duplicate", checked_in_at: t.checked_in_at ?? null, guest: t, offline: true };
    const now = new Date().toISOString();
    t.checked_in = true;
    t.checked_in_at = now;
    snapRef.current.set(token, t);
    persistSnap();
    queueRef.current.push({ token, scanned_at: now });
    persistQueue();
    return { ok: true, guest: t, offline: true };
  }

  async function handleScan(raw: string) {
    const token = raw.trim();
    if (!token || busyRef.current) return;
    busyRef.current = true;
    setPaused(true);
    setLoading(true);

    let res: Result;
    if (navigator.onLine) {
      try {
        const { data, error } = useSession
          ? await supabase.rpc("sync_checkin_s", {
              p_session_token: sessionToken,
              p_token: token,
              p_scanned_at: new Date().toISOString(),
            })
          : await supabase.rpc("sync_checkin", {
              p_event_id: eventId,
              p_token: token,
              p_scanned_at: new Date().toISOString(),
            });
        if (error) throw error;
        res = (data as Result) ?? { ok: false, reason: "no_data" };
        // Ef aðgangur útrunninn -> meðhöndla eins og offline (geyma í biðröð)
        if (res.reason === "unauthorized") {
          res = localScan(token);
        } else {
          const t = snapRef.current.get(token);
          if (t) {
            if (res.ok || res.reason === "duplicate") {
              t.checked_in = true;
              t.checked_in_at = t.checked_in_at ?? new Date().toISOString();
            }
            if (res.reason === "cancelled") t.cancelled = true;
            persistSnap();
          }
        }
      } catch {
        res = localScan(token); // netvilla -> staðbundið + biðröð
      }
    } else {
      res = localScan(token);
    }

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
      {/* Tengingar- og samstillingarvísir */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-3 py-2 text-xs">
        <span className="inline-flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${online ? "bg-success" : "bg-danger"}`} />
          <span className={online ? "text-success" : "text-danger"}>{online ? "Nettengt" : "Ónettengt"}</span>
          <span className="text-muted">· afrit: {snapCount}</span>
          {queueCount > 0 && <span className="text-accent">· {queueCount} í biðröð</span>}
        </span>
        <button
          onClick={() => {
            fetchSnapshot();
            flushQueue();
          }}
          disabled={!online || syncing}
          className="rounded-lg border border-border px-2.5 py-1 text-muted transition hover:text-text disabled:opacity-50"
        >
          {syncing ? "Samstilli…" : "Samstilla"}
        </button>
      </div>

      {!snapLoaded && (
        <Card className="text-center">
          <p className="text-sm text-muted">Sæki afrit af gestalista…</p>
        </Card>
      )}

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
          <DoorResult r={result} />
          <button
            onClick={next}
            className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-[#0B121C] transition hover:brightness-110"
          >
            Næsti gestur
          </button>
        </>
      )}


      {/* Persónuvernd: hreinsa staðbundin gögn úr þessu tæki (neðst) */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs">
        <span className="text-muted">Afritið geymist tímabundið í tækinu og hreinsast sjálfkrafa eftir viðburð.</span>
        {confirmClear ? (
          <span className="inline-flex items-center gap-2">
            {queueCount > 0 && <span className="text-danger">{queueCount} óstillt — tapast!</span>}
            <button
              onClick={() => {
                clearDeviceData();
                setConfirmClear(false);
                setResult(null);
              }}
              className="rounded-lg bg-danger px-2.5 py-1 font-semibold text-white"
            >
              Hreinsa núna
            </button>
            <button onClick={() => setConfirmClear(false)} className="rounded-lg border border-border px-2.5 py-1 text-muted">
              Hætta við
            </button>
          </span>
        ) : (
          <button
            onClick={() => setConfirmClear(true)}
            className="rounded-lg border border-border px-2.5 py-1 text-muted transition hover:text-danger"
          >
            Hreinsa gögn úr þessu tæki
          </button>
        )}
      </div>

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
  return <div className={`rounded-xl px-4 py-4 text-center font-display text-xl font-semibold ${cls}`}>{title}</div>;
}

function DoorResult({ r }: { r: Result }) {
  if (r.reason === "invalid") return <Banner tone="bad" title="Ógildur miði" />;
  if (r.reason === "unknown_offline")
    return (
      <div className="space-y-3">
        <Banner tone="bad" title="Óþekktur miði" />
        <Card className="text-center text-sm text-muted">
          Miðinn er ekki í staðbundnu afriti. Samstilltu (eða bíddu eftir neti) og reyndu aftur.
        </Card>
      </div>
    );
  if (r.reason === "wrong_event")
    return (
      <div className="space-y-3">
        <Banner tone="bad" title="⚠ Rangur viðburður" />
        <Card className="text-center text-sm text-muted">Þessi miði er á annan viðburð og gildir ekki hér.</Card>
      </div>
    );
  if (r.reason === "cancelled") {
    const name = r.guest?.full_name ?? "Gesturinn";
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

  const g = r.guest ?? {};
  const name = g.full_name ?? "—";
  const isGuest = g.holder_type === "guest";

  return (
    <div className="space-y-3">
      {r.ok ? (
        <Banner tone="ok" title={r.offline ? "✓ Mætt skráð (ónettengt)" : "✓ Mætt skráð"} />
      ) : (
        <Banner tone="bad" title="⚠ Miði þegar notaður" />
      )}
      <Card className="space-y-1">
        <p className="font-display text-xl text-text">
          {name} {isGuest && <span className="text-sm text-accent">· maki</span>}
        </p>
        {(g.company || g.business_unit) && (
          <p className="text-sm text-muted">{[g.company, g.business_unit].filter(Boolean).join(" · ")}</p>
        )}
        {!isGuest && g.has_plus_one && <p className="text-sm text-text">Maki: {g.spouse_name || "+1"}</p>}
        {g.dietary && (
          <p className="mt-1 rounded-lg border border-accent bg-surface px-2 py-1 text-sm text-accent">
            ⚠ Fæðuóþol: {g.dietary}
          </p>
        )}
        {!r.ok && r.checked_in_at != null && (
          <p className="mt-1 text-xs text-muted">
            Innritað áður:{" "}
            {new Date(String(r.checked_in_at)).toLocaleTimeString("is-IS", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
              timeZone: "Atlantic/Reykjavik",
            })}
          </p>
        )}
        {r.offline && r.ok && (
          <p className="mt-1 text-xs text-muted">Geymt í tæki — sendist þegar net kemur aftur.</p>
        )}
      </Card>
    </div>
  );
}
