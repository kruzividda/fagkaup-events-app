"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui";
import { Field, TextInput, Select, PrimaryButton } from "@/components/form";
import { inviteUser, changeRole, removeUser } from "./actions";

export type OrgUser = {
  id: string;
  full_name: string;
  email: string;
  role: "owner" | "admin" | "staff" | "door" | "bartender";
  is_self: boolean;
  confirmed: boolean;
  created_at: string;
};

const ROLE_LABEL: Record<string, string> = {
  owner: "Eigandi",
  admin: "Stjórnandi",
  staff: "Notandi",
  door: "Dyravörður",
  bartender: "Barþjónn",
};

export function UsersManager({ initial, selfId }: { initial: OrgUser[]; selfId: string }) {
  const router = useRouter();
  const [users] = useState<OrgUser[]>(initial);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"admin" | "staff">("staff");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [invited, setInvited] = useState<{ email: string; link: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function invite() {
    setErr(null);
    setBusy(true);
    const res = await inviteUser(email, name, role);
    setBusy(false);
    if (!res.ok) {
      const map: Record<string, string> = {
        forbidden: "Þú hefur ekki réttindi.",
        bad_email: "Ógilt netfang.",
        email_exists: "Netfang er þegar í notkun.",
      };
      return setErr(map[res.reason ?? ""] ?? "Tókst ekki að senda boð.");
    }
    setInvited({ email: email.trim(), link: res.link ?? "" });
    setEmail("");
    setName("");
    setRole("staff");
    router.refresh();
  }

  async function setRoleFor(u: OrgUser, next: "admin" | "staff") {
    setPendingId(u.id);
    await changeRole(u.id, next);
    setPendingId(null);
    router.refresh();
  }

  async function remove(u: OrgUser) {
    if (!confirm(`Fjarlægja ${u.full_name || u.email}? Aðgangur þeirra verður afturkallaður.`)) return;
    setPendingId(u.id);
    await removeUser(u.id);
    setPendingId(null);
    router.refresh();
  }

  function copyLink() {
    if (!invited?.link) return;
    navigator.clipboard.writeText(invited.link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="space-y-5">
      {/* Boð sent — sýna hlekk til að deila */}
      {invited && (
        <div className="space-y-3 rounded-2xl border border-success bg-[rgba(95,178,138,0.08)] p-5">
          <p className="text-sm font-semibold text-success">Boð tilbúið fyrir {invited.email}</p>
          <p className="text-[13px] text-muted">
            Sendu þennan hlekk á viðkomandi — hann setur sitt eigið lykilorð og fær þá aðgang. Hlekkurinn gildir í
            takmarkaðan tíma.
          </p>
          {invited.link && (
            <div className="flex gap-2">
              <input readOnly value={invited.link} className="flex-1 rounded-lg border border-border bg-elevated px-3 py-2 text-xs text-text" />
              <button onClick={copyLink} className="btn-secondary rounded-lg px-3 py-2 text-xs">
                {copied ? "Afritað!" : "Afrita"}
              </button>
            </div>
          )}
          <button onClick={() => setInvited(null)} className="text-[13px] text-muted underline">
            Loka
          </button>
        </div>
      )}

      {/* Listi notenda */}
      <Card className="space-y-2">
        <p className="mb-1 text-[13px] font-medium text-text">Notendur ({users.length})</p>
        {users.map((u) => {
          const editable = !u.is_self && u.role !== "owner";
          return (
            <div key={u.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-text">
                  {u.full_name || u.email}
                  {u.is_self && <span className="ml-1 text-[12px] text-muted">(þú)</span>}
                </p>
                <p className="truncate text-xs text-muted">
                  {u.email}
                  {!u.confirmed && <span className="ml-1 text-accent">· boð sent, ekki virkjað</span>}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {editable ? (
                  <select
                    value={u.role === "admin" ? "admin" : "staff"}
                    disabled={pendingId === u.id}
                    onChange={(e) => setRoleFor(u, e.target.value as "admin" | "staff")}
                    className="rounded-lg border border-border bg-elevated px-2 py-1 text-xs text-text outline-none focus:border-accent"
                  >
                    <option value="admin">Stjórnandi</option>
                    <option value="staff">Notandi</option>
                  </select>
                ) : (
                  <span className="rounded-full border border-accent px-2 py-0.5 text-[11px] text-accent">{ROLE_LABEL[u.role]}</span>
                )}
                {editable && (
                  <button
                    onClick={() => remove(u)}
                    disabled={pendingId === u.id}
                    className="btn-secondary-danger rounded-lg px-2.5 py-1 text-xs"
                  >
                    Fjarlægja
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </Card>

      {/* Bjóða inn */}
      <Card className="space-y-3">
        <p className="text-[13px] font-medium text-text">Bjóða inn notanda</p>
        {err && <p className="rounded-lg border border-danger bg-[rgba(229,103,91,0.08)] px-3 py-2 text-sm text-danger">{err}</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Netfang" required>
            <TextInput value={email} onChange={setEmail} type="email" placeholder="nafn@fagkaup.is" />
          </Field>
          <Field label="Nafn">
            <TextInput value={name} onChange={setName} placeholder="Fullt nafn" />
          </Field>
          <Field label="Hlutverk">
            <Select
              value={role}
              onChange={(v) => setRole(v as "admin" | "staff")}
              options={[
                { value: "staff", label: "Notandi (rekstur, ekki notendastjórnun)" },
                { value: "admin", label: "Stjórnandi (fullur aðgangur)" },
              ]}
            />
          </Field>
        </div>
        <PrimaryButton onClick={invite} disabled={busy}>
          {busy ? "Bý til boð…" : "Búa til boð"}
        </PrimaryButton>
      </Card>
    </div>
  );
}
