"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { slugify } from "@/lib/slug";
import { Card } from "@/components/ui";
import { saveFormFields, type BuilderFieldInput } from "./actions";

export type BuilderField = {
  id: string | null;
  field_key: string;
  label: string;
  field_type: string;
  requirement: "required" | "optional" | "hidden";
  is_custom: boolean;
  options: { value: string; label: string }[];
  visible_if: { field: string; equals: string | boolean } | null;
};

const TYPE_LABELS: Record<string, string> = {
  text: "Texti",
  email: "Tölvupóstur",
  phone: "Sími",
  textarea: "Langur texti",
  select: "Val (eitt)",
  multiselect: "Fjölval",
  boolean: "Já / Nei",
  consent: "Samþykki",
};

const CUSTOM_TYPES = ["text", "textarea", "select", "multiselect", "boolean"];

const CORE_FIELDS: { key: string; label: string; type: string }[] = [
  { key: "full_name", label: "Nafn", type: "text" },
  { key: "kennitala", label: "Kennitala", type: "text" },
  { key: "email", label: "Tölvupóstur", type: "email" },
  { key: "phone", label: "Símanúmer", type: "phone" },
  { key: "company", label: "Fyrirtæki", type: "text" },
  { key: "business_unit", label: "Rekstrareining", type: "text" },
  { key: "location", label: "Staðsetning", type: "text" },
  { key: "job_title", label: "Starfsheiti", type: "text" },
  { key: "has_plus_one", label: "Maki / +1", type: "boolean" },
  { key: "spouse_name", label: "Nafn maka", type: "text" },
  { key: "spouse_email", label: "Tölvupóstur maka", type: "email" },
  { key: "dietary", label: "Fæðuóþol", type: "text" },
  { key: "notes", label: "Athugasemdir", type: "textarea" },
  { key: "consent", label: "Samþykki persónuverndar", type: "consent" },
];

const inputCls =
  "rounded-lg border border-border bg-elevated px-2.5 py-1.5 text-sm text-text outline-none focus:border-accent";

export function FormBuilder({ eventId, initialFields }: { eventId: string; initialFields: BuilderField[] }) {
  const router = useRouter();
  const [fields, setFields] = useState<BuilderField[]>(initialFields);
  const [saving, startSaving] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [newType, setNewType] = useState("text");
  const [newLabel, setNewLabel] = useState("");

  const usedCoreKeys = useMemo(() => new Set(fields.filter((f) => !f.is_custom).map((f) => f.field_key)), [fields]);
  const availableCore = CORE_FIELDS.filter((c) => !usedCoreKeys.has(c.key));

  function update(i: number, patch: Partial<BuilderField>) {
    setFields((prev) => prev.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  }
  function move(i: number, dir: -1 | 1) {
    setFields((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }
  function remove(i: number) {
    setFields((prev) => prev.filter((_, idx) => idx !== i));
  }
  function addCore(key: string) {
    const c = CORE_FIELDS.find((x) => x.key === key);
    if (!c) return;
    setFields((prev) => [
      ...prev,
      { id: null, field_key: c.key, label: c.label, field_type: c.type, requirement: "optional", is_custom: false, options: [], visible_if: null },
    ]);
  }
  function addCustom() {
    const label = newLabel.trim();
    if (!label) return;
    let key = "q_" + slugify(label);
    const keys = new Set(fields.map((f) => f.field_key));
    let n = 2;
    let unique = key;
    while (keys.has(unique)) unique = `${key}_${n++}`;
    setFields((prev) => [
      ...prev,
      {
        id: null,
        field_key: unique,
        label,
        field_type: newType,
        requirement: "optional",
        is_custom: true,
        options: newType === "select" || newType === "multiselect" ? [{ value: "", label: "Valkostur 1" }] : [],
        visible_if: null,
      },
    ]);
    setNewLabel("");
  }

  function save() {
    setMsg(null);
    const payload: BuilderFieldInput[] = fields.map((f) => ({
      id: f.id,
      field_key: f.field_key,
      label: f.label,
      field_type: f.field_type,
      requirement: f.requirement,
      is_custom: f.is_custom,
      options: f.options,
      visible_if: f.visible_if,
    }));
    startSaving(async () => {
      const res = await saveFormFields(eventId, payload);
      if (!res.ok) setMsg(res.error ?? "Vistun mistókst.");
      else {
        setMsg("Vistað ✓");
        // Muna réttu auðkennin svo næsta vistun uppfæri (en tvöfaldi ekki) reitina
        if (res.saved) {
          const byKey = new Map(res.saved.map((s) => [s.field_key, s.id]));
          setFields((prev) => prev.map((f) => ({ ...f, id: byKey.get(f.field_key) ?? f.id })));
        }
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      {fields.map((f, i) => (
        <Card key={f.id ?? `new-${i}`} className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <input value={f.label} onChange={(e) => update(i, { label: e.target.value })} className={`${inputCls} flex-1 min-w-[160px]`} />
            <span className="rounded-md border border-border px-2 py-1 text-[11px] text-muted">
              {TYPE_LABELS[f.field_type] ?? f.field_type}
              {!f.is_custom && " · grunnur"}
            </span>
            <select
              value={f.requirement}
              onChange={(e) => update(i, { requirement: e.target.value as BuilderField["requirement"] })}
              className={inputCls}
            >
              <option value="required">Skylda</option>
              <option value="optional">Valfrjálst</option>
              <option value="hidden">Falinn</option>
            </select>
            <div className="flex gap-1">
              <button onClick={() => move(i, -1)} className="rounded-md border border-border px-2 py-1 text-xs text-muted hover:text-text">↑</button>
              <button onClick={() => move(i, 1)} className="rounded-md border border-border px-2 py-1 text-xs text-muted hover:text-text">↓</button>
              <button onClick={() => remove(i)} className="rounded-md border border-danger px-2 py-1 text-xs text-danger">Eyða</button>
            </div>
          </div>

          {(f.field_type === "select" || f.field_type === "multiselect") && (
            <OptionsEditor field={f} onChange={(options) => update(i, { options })} />
          )}

          <CondEditor field={f} index={i} allFields={fields} onChange={(visible_if) => update(i, { visible_if })} />
        </Card>
      ))}

      {/* Bæta við */}
      <Card className="space-y-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Bæta við grunnreit</p>
          {availableCore.length === 0 ? (
            <p className="text-sm text-muted">Allir grunnreitir eru þegar í forminu.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {availableCore.map((c) => (
                <button key={c.key} onClick={() => addCore(c.key)} className="rounded-lg border border-border px-3 py-1.5 text-sm text-text hover:border-accent">
                  + {c.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Búa til spurningu</p>
          <div className="flex flex-wrap items-center gap-2">
            <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Spurning, t.d. „Mætir þú í golf?“" className={`${inputCls} flex-1 min-w-[200px]`} />
            <select value={newType} onChange={(e) => setNewType(e.target.value)} className={inputCls}>
              {CUSTOM_TYPES.map((t) => (
                <option key={t} value={t}>{TYPE_LABELS[t]}</option>
              ))}
            </select>
            <button onClick={addCustom} disabled={!newLabel.trim()} className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-[#0B121C] disabled:opacity-50">
              Bæta við
            </button>
          </div>
        </div>
      </Card>

      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving} className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-[#0B121C] hover:brightness-110 disabled:opacity-50">
          {saving ? "Vista…" : "Vista form"}
        </button>
        {msg && <span className="text-sm text-muted">{msg}</span>}
      </div>
    </div>
  );
}

function OptionsEditor({ field, onChange }: { field: BuilderField; onChange: (o: { value: string; label: string }[]) => void }) {
  const opts = field.options;
  return (
    <div className="space-y-2 border-l border-border pl-3">
      <p className="text-xs text-muted">Valkostir</p>
      {opts.map((o, oi) => (
        <div key={oi} className="flex gap-2">
          <input
            value={o.label}
            onChange={(e) => onChange(opts.map((x, idx) => (idx === oi ? { value: x.value, label: e.target.value } : x)))}
            className={`${inputCls} flex-1`}
          />
          <button onClick={() => onChange(opts.filter((_, idx) => idx !== oi))} className="rounded-md border border-border px-2 text-xs text-muted hover:text-danger">×</button>
        </div>
      ))}
      <button onClick={() => onChange([...opts, { value: "", label: `Valkostur ${opts.length + 1}` }])} className="text-xs text-accent">+ Bæta við valkosti</button>
    </div>
  );
}

function CondEditor({
  field,
  index,
  allFields,
  onChange,
}: {
  field: BuilderField;
  index: number;
  allFields: BuilderField[];
  onChange: (v: BuilderField["visible_if"]) => void;
}) {
  // Reitir á undan þessum sem geta stýrt birtingu (boolean eða select)
  const controllers = allFields.slice(0, index).filter((f) => f.field_type === "boolean" || f.field_type === "select");
  const enabled = field.visible_if != null;
  const controller = field.visible_if ? allFields.find((f) => f.field_key === field.visible_if!.field) : undefined;

  if (controllers.length === 0) return null;

  return (
    <div className="border-l border-border pl-3 text-sm">
      <label className="flex cursor-pointer items-center gap-2 text-xs text-muted">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onChange(e.target.checked ? { field: controllers[0].field_key, equals: controllers[0].field_type === "boolean" ? true : "" } : null)}
        />
        Sýna aðeins við ákveðið skilyrði
      </label>

      {enabled && field.visible_if && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted">Sýna ef</span>
          <select
            value={field.visible_if.field}
            onChange={(e) => {
              const c = allFields.find((f) => f.field_key === e.target.value);
              onChange({ field: e.target.value, equals: c?.field_type === "boolean" ? true : "" });
            }}
            className={inputCls}
          >
            {controllers.map((c) => (
              <option key={c.field_key} value={c.field_key}>{c.label}</option>
            ))}
          </select>
          <span className="text-xs text-muted">=</span>
          {controller?.field_type === "boolean" ? (
            <select
              value={String(field.visible_if.equals)}
              onChange={(e) => onChange({ field: field.visible_if!.field, equals: e.target.value === "true" })}
              className={inputCls}
            >
              <option value="true">Já</option>
              <option value="false">Nei</option>
            </select>
          ) : (
            <select
              value={String(field.visible_if.equals)}
              onChange={(e) => onChange({ field: field.visible_if!.field, equals: e.target.value })}
              className={inputCls}
            >
              <option value="">— veldu —</option>
              {(controller?.options ?? []).map((o) => (
                <option key={o.label} value={o.value || o.label}>{o.label}</option>
              ))}
            </select>
          )}
        </div>
      )}
    </div>
  );
}
