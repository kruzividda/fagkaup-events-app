"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui";
import { Field, TextInput, Select, PrimaryButton, EVENT_TYPE_OPTIONS } from "@/components/form";
import { createFormTemplate, renameFormTemplate, deleteFormTemplate, type FormTemplate } from "./actions";

export function TemplatesManager({ initial }: { initial: FormTemplate[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // add
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newType, setNewType] = useState("sersnidinn");

  // rename / delete
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  async function add() {
    setErr(null);
    if (!newLabel.trim()) return setErr("Sláðu inn heiti.");
    setBusy(true);
    const res = await createFormTemplate(newLabel, newType);
    setBusy(false);
    if (!res.ok) return setErr(res.error ?? "Tókst ekki að bæta við.");
    setNewLabel("");
    setNewType("sersnidinn");
    setAdding(false);
    router.refresh();
  }

  async function rename(id: string) {
    setErr(null);
    if (!renameVal.trim()) return setErr("Sláðu inn heiti.");
    setBusy(true);
    const res = await renameFormTemplate(id, renameVal);
    setBusy(false);
    if (!res.ok) return setErr(res.error ?? "Tókst ekki að endurnefna.");
    setRenameId(null);
    router.refresh();
  }

  async function remove(id: string) {
    setErr(null);
    setBusy(true);
    const res = await deleteFormTemplate(id);
    setBusy(false);
    setConfirmDel(null);
    if (!res.ok) return setErr(res.error ?? "Tókst ekki að eyða.");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {err && <p className="rounded-xl border border-danger bg-[rgba(229,103,91,0.08)] px-4 py-3 text-sm text-danger">{err}</p>}

      <div className="space-y-2">
        {initial.map((t) => (
          <Card key={t.id} className="space-y-3">
            {renameId === t.id ? (
              <div className="space-y-2">
                <Field label="Nýtt heiti">
                  <TextInput value={renameVal} onChange={setRenameVal} />
                </Field>
                <div className="flex gap-2">
                  <PrimaryButton onClick={() => rename(t.id)} disabled={busy}>
                    Vista
                  </PrimaryButton>
                  <button onClick={() => setRenameId(null)} className="btn-secondary rounded-xl px-4 py-2.5 text-sm">
                    Hætta við
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-display text-base text-text">{t.label}</p>
                  <p className="text-[13px] text-muted">
                    {t.fieldCount === null ? "Sjálfgefið form" : `${t.fieldCount} reitir`}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/dashboard/form-templates/${t.id}`}
                    className="rounded-lg border border-accent px-3 py-1.5 text-sm font-semibold text-accent transition hover:bg-accent-soft"
                  >
                    Breyta formi
                  </Link>
                  <button
                    onClick={() => {
                      setRenameId(t.id);
                      setRenameVal(t.label);
                      setErr(null);
                    }}
                    className="btn-secondary rounded-lg px-3 py-1.5 text-sm"
                  >
                    Endurnefna
                  </button>
                  {confirmDel === t.id ? (
                    <span className="inline-flex items-center gap-2">
                      <button
                        onClick={() => remove(t.id)}
                        disabled={busy}
                        className="rounded-lg bg-danger px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
                      >
                        Eyða
                      </button>
                      <button onClick={() => setConfirmDel(null)} className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted">
                        Hætta við
                      </button>
                    </span>
                  ) : (
                    <button
                      onClick={() => {
                        setConfirmDel(t.id);
                        setErr(null);
                      }}
                      className="btn-secondary-danger rounded-lg px-3 py-1.5 text-sm"
                    >
                      Eyða
                    </button>
                  )}
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>

      {adding ? (
        <Card accent className="space-y-3">
          <p className="font-display text-base text-text">Nýtt form</p>
          <Field label="Heiti" required>
            <TextInput value={newLabel} onChange={setNewLabel} placeholder="t.d. Sumarferð" />
          </Field>
          <Field label="Byggt á (sjálfgefnir reitir + flokkur)">
            <Select value={newType} onChange={setNewType} options={EVENT_TYPE_OPTIONS} />
          </Field>
          <div className="flex gap-2">
            <PrimaryButton onClick={add} disabled={busy}>
              Bæta við
            </PrimaryButton>
            <button onClick={() => setAdding(false)} className="btn-secondary rounded-xl px-4 py-2.5 text-sm">
              Hætta við
            </button>
          </div>
        </Card>
      ) : (
        <button
          onClick={() => {
            setAdding(true);
            setErr(null);
          }}
          className="w-full rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted transition hover:border-accent hover:text-text"
        >
          + Bæta við formi
        </button>
      )}
    </div>
  );
}
