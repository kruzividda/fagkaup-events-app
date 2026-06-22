"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui";
import { Field, TextInput, Select, PrimaryButton } from "@/components/form";
import { createAccess, toggleAccess, removeAccess } from "./access-actions";

type AccessRow = {
  id: string;
  role: string;
  label: string;
  token: string;
  access_starts_at: string | null;
  access_ends_at: string | null;
  active: boolean;
  created_at: string;
};

const ROLE_LABEL: Record<string, string> = {
  door: "Dyravörður",
  bar: "Barþjónn",
  organizer: "Viðburðarstjóri",
};

function randomPin() {
  return String(Math.floor(1000 + Math.random() * 9000)); // 4 stafir
}

function fmt(dt: string | null) {
  if (!dt) return null;
  const d = new Date(dt);
  const p = (n: number) => String(n).padStart(2, "0");
  // Ísland er UTC+0 -> notum UTC-hluta svo server og client gefi nákvæmlega sama streng
  return `${d.getUTCDate()}.${d.getUTCMonth() + 1}.${d.getUTCFullYear()}, ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

export function AccessManager({ eventId, initial }: { eventId: string; initial: AccessRow[] }) {
  const router = useRouter();
  const [list, setList] = useState<AccessRow[]>(initial);
  const [role, setRole] = useState("door");
  const [label, setLabel] = useState("");
  const [pin, setPin] = useState("");
  const [starts, setStarts] = useState("");
  const [ends, setEnds] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [created, setCreated] = useState<{ token: string; pin: string; label: string; role: string } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // Búa til PIN eftir mount (ekki í render -> engin hydration-ósamræmi)
  useEffect(() => {
    setPin(randomPin());
  }, []);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const linkFor = (token: string) => `${origin}/s/${token}`;

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  async function refresh() {
    router.refresh();
  }

  async function add() {
    setErr(null);
    if (!/^[0-9]{4,8}$/.test(pin)) return setErr("PIN þarf að vera 4–8 tölustafir.");
    setBusy(true);
    const res = await createAccess(eventId, role, label.trim(), pin, starts, ends);
    setBusy(false);
    if (!res.ok) {
      const map: Record<string, string> = {
        forbidden: "Þú hefur ekki réttindi.",
        bad_pin: "PIN þarf að vera 4–8 tölustafir.",
        bad_role: "Ógilt hlutverk.",
      };
      return setErr(map[res.reason ?? ""] ?? `Tókst ekki að stofna aðgang.${res.reason ? ` (${res.reason})` : ""}`);
    }
    setCreated({ token: res.token!, pin: res.pin!, label: label.trim() || ROLE_LABEL[role], role });
    setLabel("");
    setPin(randomPin());
    setStarts("");
    setEnds("");
    await refresh();
  }

  async function toggle(row: AccessRow) {
    setList((l) => l.map((x) => (x.id === row.id ? { ...x, active: !x.active } : x)));
    await toggleAccess(row.id, !row.active, eventId);
    await refresh();
  }

  async function del(row: AccessRow) {
    if (!confirm(`Eyða aðgangi „${row.label || ROLE_LABEL[row.role]}“?`)) return;
    setList((l) => l.filter((x) => x.id !== row.id));
    await removeAccess(row.id, eventId);
    await refresh();
  }

  return (
    <Card className="space-y-5">
      <div>
        <p className="font-display text-base text-text">Aðgangur að viðburði</p>
        <p className="mt-0.5 text-[13px] text-muted">
          Stofnaðu aðgang fyrir dyraverði og barþjóna. Þeir fá hlekk á skannann og opna hann með PIN. Þú getur sett tímamörk á aðganginn.
        </p>
      </div>

      {/* Nýstofnaður aðgangur — sýnir PIN og hlekk einu sinni */}
      {created && (
        <div className="space-y-3 rounded-xl border border-success bg-[rgba(95,178,138,0.08)] p-4">
          <p className="text-sm font-semibold text-success">
            Aðgangur stofnaður: {created.label} ({ROLE_LABEL[created.role]})
          </p>
          <div className="space-y-2 text-sm">
            <div>
              <p className="text-[12px] uppercase tracking-wide text-muted">Hlekkur</p>
              <div className="mt-1 flex gap-2">
                <input readOnly value={linkFor(created.token)} className="flex-1 rounded-lg border border-border bg-elevated px-3 py-2 text-xs text-text" />
                <button onClick={() => copy(linkFor(created.token), "link")} className="btn-secondary rounded-lg px-3 py-2 text-xs">
                  {copied === "link" ? "Afritað!" : "Afrita"}
                </button>
              </div>
            </div>
            <div>
              <p className="text-[12px] uppercase tracking-wide text-muted">PIN (sést ekki aftur)</p>
              <p className="mt-1 font-display text-2xl tracking-[0.3em] text-text">{created.pin}</p>
            </div>
          </div>
          <p className="text-[12px] text-muted">Sendu hlekkinn og PIN-ið á viðkomandi. Geymdu PIN-ið — það er ekki hægt að sjá það aftur (aðeins endurstilla).</p>
          <button onClick={() => setCreated(null)} className="text-[13px] text-muted underline">Loka</button>
        </div>
      )}

      {/* Listi yfir aðganga */}
      {list.length > 0 && (
        <div className="space-y-2">
          {list.map((row) => {
            const win = [fmt(row.access_starts_at), fmt(row.access_ends_at)].filter(Boolean);
            return (
              <div key={row.id} className={`rounded-xl border border-border bg-surface p-3 ${row.active ? "" : "opacity-60"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-text">
                      <span className="font-medium">{row.label || ROLE_LABEL[row.role]}</span>{" "}
                      <span className="rounded-full border border-accent px-2 py-0.5 text-[11px] text-accent">{ROLE_LABEL[row.role]}</span>
                      {!row.active && <span className="ml-1 text-[12px] text-danger">· óvirkur</span>}
                    </p>
                    {win.length > 0 && (
                      <p className="mt-0.5 text-[12px] text-muted">
                        {win.length === 2 ? `${win[0]} – ${win[1]}` : `frá ${win[0] ?? win[1]}`}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button onClick={() => copy(linkFor(row.token), row.id)} className="btn-secondary rounded-lg px-2.5 py-1 text-xs">
                      {copied === row.id ? "Afritað!" : "Afrita hlekk"}
                    </button>
                    <button onClick={() => toggle(row)} className="btn-secondary rounded-lg px-2.5 py-1 text-xs">
                      {row.active ? "Slökkva" : "Kveikja"}
                    </button>
                    <button onClick={() => del(row)} className="btn-secondary-danger rounded-lg px-2.5 py-1 text-xs">
                      Eyða
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Stofna nýjan aðgang */}
      <div className="space-y-3 border-t border-border pt-4">
        <p className="text-[13px] font-medium text-text">Nýr aðgangur</p>
        {err && <p className="rounded-lg border border-danger bg-[rgba(229,103,91,0.08)] px-3 py-2 text-sm text-danger">{err}</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Hlutverk">
            <Select
              value={role}
              onChange={setRole}
              options={[
                { value: "door", label: "Dyravörður (innritun)" },
                { value: "bar", label: "Barþjónn (drykkir)" },
                { value: "organizer", label: "Viðburðarstjóri (bakendi)" },
              ]}
            />
          </Field>
          <Field label="Nafn / lýsing">
            <TextInput value={label} onChange={setLabel} placeholder="t.d. Jón – dyravörður" />
          </Field>
          <Field label="PIN (4–8 tölustafir)">
            <div className="flex gap-2">
              <TextInput value={pin} onChange={setPin} placeholder="t.d. 4821" />
              <button onClick={() => setPin(randomPin())} className="btn-secondary shrink-0 rounded-xl px-3 text-sm">
                Nýtt
              </button>
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Aðgangur frá (valfrjálst)">
              <TextInput type="datetime-local" value={starts} onChange={setStarts} />
            </Field>
            <Field label="Aðgangur til (valfrjálst)">
              <TextInput type="datetime-local" value={ends} onChange={setEnds} />
            </Field>
          </div>
        </div>
        <PrimaryButton onClick={add} disabled={busy}>
          {busy ? "Stofna…" : "Stofna aðgang"}
        </PrimaryButton>
      </div>
    </Card>
  );
}
