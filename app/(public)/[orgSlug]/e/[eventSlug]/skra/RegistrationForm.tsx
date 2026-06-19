"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, TextInput, TextArea, Checkbox, Select, PrimaryButton } from "@/components/form";
import { registerGuest } from "./actions";

export type FormField = {
  id: string;
  field_key: string;
  label: string;
  field_type: "text" | "email" | "phone" | "textarea" | "select" | "multiselect" | "boolean" | "consent";
  requirement: "required" | "optional" | "hidden";
  is_custom: boolean;
  visible_if: { field: string; equals: unknown } | null;
  options: { value: string; label: string }[];
};

export type OrgUnit = { name: string; locations: string[] };

const REASON_TEXT: Record<string, string> = {
  not_open: "Skráning er ekki opin.",
  not_open_yet: "Skráning er ekki hafin.",
  closed: "Skráningu er lokið.",
  full: "Viðburðurinn er fullbókaður.",
  event_not_found: "Viðburður fannst ekki.",
};

export function RegistrationForm({
  eventId,
  fields,
  orgUnits,
}: {
  eventId: string;
  orgSlug: string;
  eventSlug: string;
  fields: FormField[];
  orgUnits: OrgUnit[];
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function setVal(key: string, v: unknown) {
    setValues((prev) => ({ ...prev, [key]: v }));
  }

  function isVisible(f: FormField): boolean {
    if (!f.visible_if) return true;
    return values[f.visible_if.field] === f.visible_if.equals;
  }

  function validate(): string | null {
    for (const f of fields) {
      if (!isVisible(f) || f.requirement !== "required") continue;
      const v = values[f.field_key];
      if (f.field_type === "consent" || f.field_type === "boolean") {
        if (v !== true) return `Vinsamlegast fylltu út: ${f.label}`;
      } else if (f.field_type === "multiselect") {
        if (!Array.isArray(v) || v.length === 0) return `Vinsamlegast fylltu út: ${f.label}`;
      } else if (!v || String(v).trim() === "") {
        return `Vinsamlegast fylltu út: ${f.label}`;
      }
    }
    return null;
  }

  async function submit() {
    const v = validate();
    if (v) return setError(v);
    setSaving(true);
    setError(null);

    const core: Record<string, unknown> = {};
    const answers: { field_id: string; value: unknown }[] = [];
    for (const f of fields) {
      if (!isVisible(f)) continue;
      const val = values[f.field_key];
      if (val === undefined) continue;
      if (f.is_custom) answers.push({ field_id: f.id, value: val });
      else core[f.field_key] = val;
    }

    const res = await registerGuest({ eventId, core, answers });
    setSaving(false);
    if (!res.ok || !res.token) {
      return setError(REASON_TEXT[res.reason ?? ""] ?? "Skráning mistókst. Reyndu aftur.");
    }
    router.push(`/t/${res.token}`);
  }

  // Útibú ráðast af valinni deild
  const selectedUnit = orgUnits.find((u) => u.name === values["business_unit"]);

  return (
    <div className="space-y-4">
      {fields.map((f) => {
        if (!isVisible(f)) return null;
        const conditional = f.visible_if != null;

        const onChange =
          f.field_key === "business_unit"
            ? (v: unknown) => {
                setVal("business_unit", v);
                setVal("location", ""); // endurstilla útibú þegar deild breytist
              }
            : (v: unknown) => setVal(f.field_key, v);

        const node = renderField(f, values[f.field_key], onChange, orgUnits, selectedUnit);

        return (
          <div key={f.id}>
            {conditional ? (
              <div className="rounded-xl border border-dashed border-border bg-surface/50 p-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
                  Skilyrt undirspurning
                </p>
                {node}
              </div>
            ) : (
              node
            )}
          </div>
        );
      })}

      {error && <p className="rounded-lg border border-danger bg-surface px-3 py-2 text-sm text-danger">{error}</p>}

      <PrimaryButton onClick={submit} disabled={saving}>
        {saving ? "Sendi…" : "Senda skráningu"}
      </PrimaryButton>
    </div>
  );
}

function renderField(
  f: FormField,
  value: unknown,
  onChange: (v: unknown) => void,
  orgUnits: OrgUnit[],
  selectedUnit?: OrgUnit
) {
  const req = f.requirement === "required";

  // Smellanleg deild
  if (f.field_key === "business_unit" && orgUnits.length > 0) {
    return <PillField label={f.label} required={req} options={orgUnits.map((u) => u.name)} value={(value as string) ?? ""} onChange={onChange} allowOther />;
  }
  // Smellanleg útibú (ráðast af deild)
  if (f.field_key === "location" && selectedUnit && selectedUnit.locations.length > 0) {
    return <PillField label={f.label} required={req} options={selectedUnit.locations} value={(value as string) ?? ""} onChange={onChange} allowOther />;
  }

  switch (f.field_type) {
    case "boolean":
    case "consent":
      return <Checkbox checked={value === true} onChange={(v) => onChange(v)} label={f.label + (req ? " *" : "")} />;
    case "email":
      return <Field label={f.label} required={req}><TextInput type="email" value={(value as string) ?? ""} onChange={onChange} /></Field>;
    case "phone":
      return <Field label={f.label} required={req}><TextInput type="tel" value={(value as string) ?? ""} onChange={onChange} /></Field>;
    case "textarea":
      return <Field label={f.label} required={req}><TextArea value={(value as string) ?? ""} onChange={onChange} /></Field>;
    case "select":
      return (
        <PillField
          label={f.label}
          required={req}
          options={f.options.map((o) => o.value || o.label)}
          labels={Object.fromEntries(f.options.map((o) => [o.value || o.label, o.label]))}
          value={(value as string) ?? ""}
          onChange={onChange}
        />
      );
    case "multiselect": {
      const arr = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted">{f.label} {req && <span className="text-accent">*</span>}</p>
          <div className="flex flex-wrap gap-2">
            {f.options.map((o) => {
              const ov = o.value || o.label;
              const on = arr.includes(ov);
              return (
                <button
                  key={ov}
                  type="button"
                  onClick={() => onChange(on ? arr.filter((x) => x !== ov) : [...arr, ov])}
                  className={`rounded-full border px-3 py-1.5 text-sm transition ${on ? "border-accent bg-accent text-[#0B121C]" : "border-border text-text hover:border-accent"}`}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        </div>
      );
    }
    default:
      return <Field label={f.label} required={req}><TextInput value={(value as string) ?? ""} onChange={onChange} /></Field>;
  }
}

function PillField({
  label,
  required,
  options,
  value,
  onChange,
  allowOther,
  labels,
}: {
  label: string;
  required?: boolean;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  allowOther?: boolean;
  labels?: Record<string, string>;
}) {
  const known = options.includes(value);
  const [other, setOther] = useState(!!value && !known);

  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-muted">
        {label} {required && <span className="text-accent">*</span>}
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const on = !other && value === opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => {
                setOther(false);
                onChange(opt);
              }}
              className={`rounded-full border px-3.5 py-1.5 text-sm transition ${on ? "border-accent bg-accent text-[#0B121C]" : "border-border text-text hover:border-accent"}`}
            >
              {labels?.[opt] ?? opt}
            </button>
          );
        })}
        {allowOther && (
          <button
            type="button"
            onClick={() => {
              setOther(true);
              onChange("");
            }}
            className={`rounded-full border px-3.5 py-1.5 text-sm transition ${other ? "border-accent bg-accent text-[#0B121C]" : "border-border text-text hover:border-accent"}`}
          >
            Annað
          </button>
        )}
      </div>
      {other && (
        <input
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Skrifaðu hér…"
          className="mt-2 w-full rounded-lg border border-border bg-elevated px-3 py-2.5 text-sm text-text outline-none focus:border-accent"
        />
      )}
    </div>
  );
}
