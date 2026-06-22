"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Overview = {
  event: {
    name: string;
    starts_at: string;
    location: string | null;
    status: string;
    cancelled: boolean;
    max_guests: number | null;
    drinks_enabled: boolean;
    drinks_per_person: number;
    spouse_gets_drinks: boolean;
    drinks_per_spouse: number;
  };
  stats: { registered: number; guests: number; checked_in: number; drinks_allowed: number; drinks_used: number };
};

type Reg = {
  id: string;
  full_name: string;
  company: string | null;
  business_unit: string | null;
  email: string | null;
  phone: string | null;
  dietary: string | null;
  has_plus_one: boolean;
  spouse_name: string | null;
  status: string;
  primary_checked_in: boolean;
  spouse_checked_in: boolean;
};

type Access = {
  id: string;
  role: string;
  label: string;
  token: string;
  access_starts_at: string | null;
  access_ends_at: string | null;
  active: boolean;
};

const ROLE_LABEL: Record<string, string> = { door: "Dyravörður", bar: "Barþjónn" };
const pad = (n: number) => String(n).padStart(2, "0");
function fmtDateTime(iso: string) {
  const d = new Date(iso);
  return `${d.getUTCDate()}.${d.getUTCMonth() + 1}.${d.getUTCFullYear()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}
function fmtWindow(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  return `${d.getUTCDate()}.${d.getUTCMonth() + 1}. ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}
function randomPin() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

const TABS: { id: string; label: string }[] = [
  { id: "yfirlit", label: "Yfirlit" },
  { id: "gestir", label: "Gestir" },
  { id: "starfsfolk", label: "Starfsfólk" },
  { id: "drykkir", label: "Drykkir" },
];

export function OrganizerBackend({ sessionToken, eventName }: { sessionToken: string; eventName: string }) {
  const supabase = createClient();
  const [tab, setTab] = useState("yfirlit");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loadingOv, setLoadingOv] = useState(true);

  const loadOverview = useCallback(async () => {
    setLoadingOv(true);
    const { data } = await supabase.rpc("org_overview", { p_session_token: sessionToken });
    const r = data as ({ ok: boolean } & Overview) | null;
    if (r?.ok) setOverview({ event: r.event, stats: r.stats });
    setLoadingOv(false);
  }, [supabase, sessionToken]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  return (
    <div className="space-y-5">
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-elevated p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`shrink-0 rounded-lg px-3.5 py-1.5 text-sm transition ${
              tab === t.id ? "bg-accent text-accent-ink font-semibold" : "text-muted hover:text-text"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "yfirlit" && <OverviewPanel overview={overview} loading={loadingOv} />}
      {tab === "gestir" && <GuestsPanel sessionToken={sessionToken} />}
      {tab === "starfsfolk" && <StaffPanel sessionToken={sessionToken} />}
      {tab === "drykkir" && <DrinksPanel sessionToken={sessionToken} overview={overview} onChange={loadOverview} />}
    </div>
  );
}

/* ---------------- Yfirlit ---------------- */
function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-[11px] uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl text-text">{value}</p>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </div>
  );
}
function OverviewPanel({ overview, loading }: { overview: Overview | null; loading: boolean }) {
  if (loading) return <p className="text-center text-sm text-muted">Sæki yfirlit…</p>;
  if (!overview) return <p className="text-center text-sm text-muted">Næ ekki yfirliti.</p>;
  const { event: e, stats: s } = overview;
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="font-display text-lg text-text">{e.name}</p>
        <p className="mt-0.5 text-sm text-muted">
          {fmtDateTime(e.starts_at)}
          {e.location ? ` · ${e.location}` : ""}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Skráðir" value={s.registered} sub={e.max_guests ? `af ${e.max_guests}` : undefined} />
        <Stat label="Gestir (m. maka)" value={s.guests} />
        <Stat label="Mættir" value={s.checked_in} />
        {e.drinks_enabled ? (
          <Stat label="Drykkir nýttir" value={`${s.drinks_used} / ${s.drinks_allowed}`} />
        ) : (
          <Stat label="Drykkir" value="—" sub="ekki virkir" />
        )}
      </div>
    </div>
  );
}

/* ---------------- Gestir ---------------- */
function GuestsPanel({ sessionToken }: { sessionToken: string }) {
  const supabase = createClient();
  const [regs, setRegs] = useState<Reg[] | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    let active = true;
    supabase.rpc("org_registrations", { p_session_token: sessionToken }).then(({ data }) => {
      const r = data as { ok: boolean; registrations?: Reg[] } | null;
      if (active) setRegs(r?.ok ? r.registrations ?? [] : []);
    });
    return () => {
      active = false;
    };
  }, [supabase, sessionToken]);

  if (regs === null) return <p className="text-center text-sm text-muted">Sæki gestalista…</p>;

  const needle = q.trim().toLowerCase();
  const filtered = needle
    ? regs.filter((r) =>
        [r.full_name, r.company, r.business_unit, r.email].filter(Boolean).join(" ").toLowerCase().includes(needle)
      )
    : regs;

  return (
    <div className="space-y-3">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Leita að gesti…"
        className="w-full rounded-xl border border-border bg-elevated px-3 py-2 text-sm text-text outline-none focus:border-accent"
      />
      {filtered.length === 0 ? (
        <p className="text-center text-sm text-muted">Engir gestir.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => {
            const cancelled = r.status === "cancelled";
            return (
              <div
                key={r.id}
                className={`rounded-xl border border-border bg-surface p-3 ${cancelled ? "opacity-50" : ""}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text">
                      {r.full_name}
                      {cancelled && <span className="ml-1 text-xs text-danger">· afskráð</span>}
                    </p>
                    {(r.company || r.business_unit) && (
                      <p className="text-xs text-muted">{[r.company, r.business_unit].filter(Boolean).join(" · ")}</p>
                    )}
                    {(r.email || r.phone) && (
                      <p className="text-xs text-muted">{[r.email, r.phone].filter(Boolean).join(" · ")}</p>
                    )}
                    {r.has_plus_one && <p className="text-xs text-text">+1: {r.spouse_name || "maki"}</p>}
                    {r.dietary && <p className="mt-1 text-xs text-accent">⚠ Fæðuóþol: {r.dietary}</p>}
                  </div>
                  <div className="shrink-0 text-right">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] ${
                        r.primary_checked_in ? "border border-success text-success" : "border border-border text-muted"
                      }`}
                    >
                      {r.primary_checked_in ? "Mætt" : "Ómætt"}
                    </span>
                    {r.has_plus_one && (
                      <span
                        className={`mt-1 block rounded-full px-2 py-0.5 text-[11px] ${
                          r.spouse_checked_in ? "border border-success text-success" : "border border-border text-muted"
                        }`}
                      >
                        +1 {r.spouse_checked_in ? "mætt" : "ómætt"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------------- Starfsfólk (dyra/bar) ---------------- */
function StaffPanel({ sessionToken }: { sessionToken: string }) {
  const supabase = createClient();
  const [list, setList] = useState<Access[] | null>(null);
  const [role, setRole] = useState("door");
  const [label, setLabel] = useState("");
  const [pin, setPin] = useState("");
  const [starts, setStarts] = useState("");
  const [ends, setEnds] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [created, setCreated] = useState<{ token: string; pin: string; label: string; role: string } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const linkFor = (t: string) => `${origin}/s/${t}`;

  useEffect(() => {
    setPin(randomPin());
  }, []);

  const load = useCallback(async () => {
    const { data } = await supabase.rpc("org_list_access", { p_session_token: sessionToken });
    const r = data as { ok: boolean; access?: Access[] } | null;
    setList(r?.ok ? r.access ?? [] : []);
  }, [supabase, sessionToken]);

  useEffect(() => {
    load();
  }, [load]);

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  async function add() {
    setErr(null);
    if (!/^[0-9]{4,8}$/.test(pin)) return setErr("PIN þarf að vera 4–8 tölustafir.");
    setBusy(true);
    const { data, error } = await supabase.rpc("org_create_access", {
      p_session_token: sessionToken,
      p_role: role,
      p_label: label.trim(),
      p_pin: pin,
      p_starts: starts ? new Date(starts).toISOString() : null,
      p_ends: ends ? new Date(ends).toISOString() : null,
    });
    setBusy(false);
    const r = data as { ok: boolean; token?: string; reason?: string } | null;
    if (error || !r?.ok) return setErr("Tókst ekki að stofna aðgang.");
    setCreated({ token: r.token!, pin, label: label.trim() || ROLE_LABEL[role], role });
    setLabel("");
    setPin(randomPin());
    setStarts("");
    setEnds("");
    load();
  }

  async function toggle(row: Access) {
    setList((l) => (l ? l.map((x) => (x.id === row.id ? { ...x, active: !x.active } : x)) : l));
    await supabase.rpc("org_set_access_active", { p_session_token: sessionToken, p_access_id: row.id, p_active: !row.active });
    load();
  }
  async function del(row: Access) {
    if (!confirm(`Eyða aðgangi „${row.label || ROLE_LABEL[row.role]}“?`)) return;
    setList((l) => (l ? l.filter((x) => x.id !== row.id) : l));
    await supabase.rpc("org_delete_access", { p_session_token: sessionToken, p_access_id: row.id });
    load();
  }

  return (
    <div className="space-y-4">
      <p className="text-[13px] text-muted">Stofnaðu dyraverði og barþjóna fyrir þennan viðburð. Þeir fá hlekk + PIN.</p>

      {created && (
        <div className="space-y-2 rounded-xl border border-success bg-[rgba(95,178,138,0.08)] p-4">
          <p className="text-sm font-semibold text-success">
            {created.label} ({ROLE_LABEL[created.role]}) stofnaður
          </p>
          <div className="flex gap-2">
            <input readOnly value={linkFor(created.token)} className="flex-1 rounded-lg border border-border bg-elevated px-2 py-1.5 text-xs text-text" />
            <button onClick={() => copy(linkFor(created.token), "new")} className="btn-secondary rounded-lg px-3 py-1.5 text-xs">
              {copied === "new" ? "Afritað!" : "Afrita"}
            </button>
          </div>
          <p className="text-sm text-text">
            PIN: <span className="font-display text-xl tracking-[0.3em]">{created.pin}</span>
          </p>
          <p className="text-[12px] text-muted">PIN sést ekki aftur — sendu hlekk og PIN á viðkomandi.</p>
          <button onClick={() => setCreated(null)} className="text-[13px] text-muted underline">Loka</button>
        </div>
      )}

      {list && list.length > 0 && (
        <div className="space-y-2">
          {list.map((row) => {
            const win = [fmtWindow(row.access_starts_at), fmtWindow(row.access_ends_at)].filter(Boolean);
            return (
              <div key={row.id} className={`rounded-xl border border-border bg-surface p-3 ${row.active ? "" : "opacity-60"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm text-text">
                      <span className="font-medium">{row.label || ROLE_LABEL[row.role]}</span>{" "}
                      <span className="rounded-full border border-accent px-2 py-0.5 text-[11px] text-accent">{ROLE_LABEL[row.role]}</span>
                      {!row.active && <span className="ml-1 text-[12px] text-danger">· óvirkur</span>}
                    </p>
                    {win.length > 0 && <p className="mt-0.5 text-[12px] text-muted">{win.join(" – ")}</p>}
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <button onClick={() => copy(linkFor(row.token), row.id)} className="btn-secondary rounded-lg px-2 py-1 text-xs">
                      {copied === row.id ? "Afritað!" : "Hlekkur"}
                    </button>
                    <button onClick={() => toggle(row)} className="btn-secondary rounded-lg px-2 py-1 text-xs">
                      {row.active ? "Slökkva" : "Kveikja"}
                    </button>
                    <button onClick={() => del(row)} className="btn-secondary-danger rounded-lg px-2 py-1 text-xs">
                      Eyða
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="space-y-3 rounded-xl border border-border bg-surface p-4">
        <p className="text-[13px] font-medium text-text">Nýr aðgangur</p>
        {err && <p className="rounded-lg border border-danger bg-[rgba(229,103,91,0.08)] px-3 py-2 text-sm text-danger">{err}</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm text-muted">
            Hlutverk
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-elevated px-3 py-2 text-sm text-text outline-none focus:border-accent"
            >
              <option value="door">Dyravörður (innritun)</option>
              <option value="bar">Barþjónn (drykkir)</option>
            </select>
          </label>
          <label className="block text-sm text-muted">
            Nafn / lýsing
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="t.d. Jón – dyravörður"
              className="mt-1 w-full rounded-xl border border-border bg-elevated px-3 py-2 text-sm text-text outline-none focus:border-accent"
            />
          </label>
          <label className="block text-sm text-muted">
            PIN (4–8 tölustafir)
            <div className="mt-1 flex gap-2">
              <input
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
                inputMode="numeric"
                className="w-full rounded-xl border border-border bg-elevated px-3 py-2 text-sm text-text outline-none focus:border-accent"
              />
              <button onClick={() => setPin(randomPin())} className="btn-secondary shrink-0 rounded-xl px-3 text-sm">
                Nýtt
              </button>
            </div>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-sm text-muted">
              Frá
              <input
                type="datetime-local"
                value={starts}
                onChange={(e) => setStarts(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-elevated px-2 py-2 text-sm text-text outline-none focus:border-accent"
              />
            </label>
            <label className="block text-sm text-muted">
              Til
              <input
                type="datetime-local"
                value={ends}
                onChange={(e) => setEnds(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-elevated px-2 py-2 text-sm text-text outline-none focus:border-accent"
              />
            </label>
          </div>
        </div>
        <button
          onClick={add}
          disabled={busy}
          className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink transition hover:brightness-110 disabled:opacity-50"
        >
          {busy ? "Stofna…" : "Stofna aðgang"}
        </button>
      </div>
    </div>
  );
}

/* ---------------- Drykkir ---------------- */
function DrinksPanel({
  sessionToken,
  overview,
  onChange,
}: {
  sessionToken: string;
  overview: Overview | null;
  onChange: () => void;
}) {
  const supabase = createClient();
  const e = overview?.event;
  const [pp, setPp] = useState<number | "">(e?.drinks_per_person || 2);
  const [spouseOn, setSpouseOn] = useState(e?.spouse_gets_drinks ?? false);
  const [ps, setPs] = useState<number | "">(e?.drinks_per_spouse || 1);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function run(fn: () => Promise<boolean>, okMsg: string) {
    setMsg(null);
    setBusy(true);
    const ok = await fn();
    setBusy(false);
    setMsg(ok ? okMsg : "Mistókst.");
    if (ok) onChange();
  }

  async function apply() {
    await run(async () => {
      const { data, error } = await supabase.rpc("org_apply_drinks", {
        p_session_token: sessionToken,
        p_per_person: Number(pp || 0),
        p_per_spouse: spouseOn ? Number(ps || 0) : 0,
      });
      const r = data as { ok: boolean } | null;
      return !error && !!r?.ok;
    }, "Drykkjum beitt á alla gesti ✓");
  }
  async function adjust(delta: number) {
    await run(async () => {
      const { data, error } = await supabase.rpc("org_adjust_drinks", { p_session_token: sessionToken, p_delta: delta });
      const r = data as { ok: boolean } | null;
      return !error && !!r?.ok;
    }, delta > 0 ? "Bætt við 1 hjá öllum ✓" : "Fækkað um 1 hjá öllum ✓");
  }

  const numCls = "w-20 rounded-xl border border-border bg-elevated px-3 py-2 text-sm text-text outline-none focus:border-accent";

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="font-display text-base text-text">Drykkjastýring</p>
        <p className="mt-0.5 text-sm text-muted">
          {e?.drinks_enabled
            ? `Núna: ${e.drinks_per_person} á mann${e.spouse_gets_drinks ? `, ${e.drinks_per_spouse} á maka` : ""}.`
            : "Drykkir eru ekki virkir á þessum viðburði enn."}
        </p>
      </div>

      <div className="space-y-3 rounded-xl border border-border bg-surface p-4">
        <p className="text-[13px] font-medium text-text">Stilla og beita á alla skráða</p>
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
          <label className="flex items-center gap-2">
            Á mann
            <input type="number" min={0} value={pp} onChange={(ev) => setPp(ev.target.value === "" ? "" : Number(ev.target.value))} className={numCls} />
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={spouseOn} onChange={(ev) => setSpouseOn(ev.target.checked)} className="accent-[var(--accent)]" />
            Maki fær drykki
          </label>
          {spouseOn && (
            <label className="flex items-center gap-2">
              Á maka
              <input type="number" min={0} value={ps} onChange={(ev) => setPs(ev.target.value === "" ? "" : Number(ev.target.value))} className={numCls} />
            </label>
          )}
        </div>
        <button
          onClick={apply}
          disabled={busy}
          className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink transition hover:brightness-110 disabled:opacity-50"
        >
          Beita á alla gesti
        </button>
        <p className="text-xs text-muted">Setur inneign hjá öllum skráðum. Notuð drykki er haldið.</p>
      </div>

      <div className="space-y-3 rounded-xl border border-border bg-surface p-4">
        <p className="text-[13px] font-medium text-text">Lifandi um kvöldið</p>
        <div className="flex items-center gap-3">
          <button onClick={() => adjust(-1)} disabled={busy} className="btn-secondary rounded-xl px-4 py-2.5 text-sm">
            − 1 á alla
          </button>
          <button onClick={() => adjust(1)} disabled={busy} className="btn-secondary rounded-xl px-4 py-2.5 text-sm">
            + 1 á alla
          </button>
        </div>
        <p className="text-xs text-muted">Bætir við eða fækkar einum drykk hjá öllum. Inneign fer aldrei undir 0.</p>
      </div>

      {msg && <p className="text-sm text-muted">{msg}</p>}
    </div>
  );
}
