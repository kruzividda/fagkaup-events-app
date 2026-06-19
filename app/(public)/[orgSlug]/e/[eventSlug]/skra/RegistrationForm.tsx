"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, TextInput, Checkbox, PrimaryButton } from "@/components/form";
import { registerGuest } from "./actions";

export type FormField = {
  id: string;
  field_key: string;
  label: string;
  field_type: "text" | "email" | "phone" | "textarea" | "select" | "multiselect" | "boolean" | "consent";
  requirement: "required" | "optional" | "hidden";
  is_custom: boolean;
  visible_if: { field: string; equals: unknown } | null;
};

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
}: {
  eventId: string;
  orgSlug: string;
  eventSlug: string;
  fields: FormField[];
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
      } else if (!v || String(v).trim() === "") {
        return `Vinsamlegast fylltu út: ${f.label}`;
      }
    }
    return null;
  }

  async function submit() {
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
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
      setError(REASON_TEXT[res.reason ?? ""] ?? "Skráning mistókst. Reyndu aftur.");
      return;
    }
    router.push(`/t/${res.token}`);
  }

  return (
    <div className="space-y-4">
      {fields.map((f) =>
        isVisible(f) ? (
          <div key={f.id}>{renderField(f, values[f.field_key], (v) => setVal(f.field_key, v))}</div>
        ) : null
      )}

      {error && (
        <p className="rounded-lg border border-danger bg-surface px-3 py-2 text-sm text-danger">{error}</p>
      )}

      <PrimaryButton onClick={submit} disabled={saving}>
        {saving ? "Sendi…" : "Senda skráningu"}
      </PrimaryButton>
    </div>
  );
}

function renderField(f: FormField, value: unknown, onChange: (v: unknown) => void) {
  const req = f.requirement === "required";
  switch (f.field_type) {
    case "boolean":
    case "consent":
      return (
        <Checkbox checked={value === true} onChange={(v) => onChange(v)} label={f.label + (req ? " *" : "")} />
      );
    case "email":
      return (
        <Field label={f.label} required={req}>
          <TextInput type="email" value={(value as string) ?? ""} onChange={onChange} />
        </Field>
      );
    case "phone":
      return (
        <Field label={f.label} required={req}>
          <TextInput type="tel" value={(value as string) ?? ""} onChange={onChange} />
        </Field>
      );
    default:
      return (
        <Field label={f.label} required={req}>
          <TextInput value={(value as string) ?? ""} onChange={onChange} />
        </Field>
      );
  }
}
