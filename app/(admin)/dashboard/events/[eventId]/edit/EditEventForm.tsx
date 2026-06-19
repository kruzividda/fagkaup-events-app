"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui";
import { Field, TextInput, TextArea, NumberInput, Select, Checkbox, PrimaryButton, EVENT_TYPE_OPTIONS } from "@/components/form";
import { updateEvent } from "./actions";
import type { NewEventInput } from "../../new/actions";

type Initial = {
  name: string;
  description: string | null;
  event_type: string;
  starts_at: string;
  location: string | null;
  max_guests: number | null;
  drinks_enabled: boolean;
  drinks_per_person: number;
  spouse_gets_drinks: boolean;
  drinks_per_spouse: number;
  uses_seating: boolean;
};

function toLocalInput(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function EditEventForm({ eventId, initial }: { eventId: string; initial: Initial }) {
  const router = useRouter();
  const [f, setF] = useState<NewEventInput>({
    name: initial.name,
    description: initial.description ?? "",
    event_type: initial.event_type,
    starts_at: toLocalInput(initial.starts_at),
    location: initial.location ?? "",
    max_guests: initial.max_guests ?? "",
    drinks_enabled: initial.drinks_enabled,
    drinks_per_person: initial.drinks_per_person || "",
    spouse_gets_drinks: initial.spouse_gets_drinks,
    drinks_per_spouse: initial.drinks_per_spouse || "",
    uses_seating: initial.uses_seating,
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof NewEventInput>(k: K, v: NewEventInput[K]) {
    setF((prev) => ({ ...prev, [k]: v }));
  }

  async function submit() {
    setSaving(true);
    setError(null);
    const res = await updateEvent(eventId, f);
    setSaving(false);
    if (!res.ok) return setError(res.error ?? "Eitthvað fór úrskeiðis.");
    router.push(`/dashboard/events/${eventId}`);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <Field label="Heiti" required>
          <TextInput value={f.name} onChange={(v) => set("name", v)} />
        </Field>
        <Field label="Lýsing">
          <TextArea value={f.description} onChange={(v) => set("description", v)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tegund">
            <Select value={f.event_type} onChange={(v) => set("event_type", v)} options={EVENT_TYPE_OPTIONS} />
          </Field>
          <Field label="Dagsetning og tími" required>
            <TextInput type="datetime-local" value={f.starts_at} onChange={(v) => set("starts_at", v)} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Staðsetning">
            <TextInput value={f.location} onChange={(v) => set("location", v)} />
          </Field>
          <Field label="Hámarksfjöldi gesta">
            <NumberInput value={f.max_guests} onChange={(v) => set("max_guests", v)} min={1} />
          </Field>
        </div>
      </Card>

      <Card className="space-y-4">
        <Checkbox checked={f.drinks_enabled} onChange={(v) => set("drinks_enabled", v)} label="Drykkjamiðar í boði" />
        {f.drinks_enabled && (
          <div className="space-y-4 border-l border-border pl-4">
            <Field label="Drykkir á mann">
              <NumberInput value={f.drinks_per_person} onChange={(v) => set("drinks_per_person", v)} />
            </Field>
            <Checkbox checked={f.spouse_gets_drinks} onChange={(v) => set("spouse_gets_drinks", v)} label="Maki fær líka drykkjamiða" />
            {f.spouse_gets_drinks && (
              <Field label="Drykkir fyrir maka">
                <NumberInput value={f.drinks_per_spouse} onChange={(v) => set("drinks_per_spouse", v)} />
              </Field>
            )}
            <p className="text-xs text-muted">
              Þetta gildir fyrir <em>nýjar</em> skráningar. Til að beita á gesti sem eru þegar skráðir,
              notaðu „Drykkjastjórnun“ á viðburðasíðunni.
            </p>
          </div>
        )}
      </Card>

      <Card>
        <Checkbox checked={f.uses_seating} onChange={(v) => set("uses_seating", v)} label="Nota borðaskipan" />
      </Card>

      {error && <p className="rounded-xl border border-danger bg-[rgba(229,103,91,0.08)] px-4 py-3 text-sm text-danger">{error}</p>}

      <div className="flex items-center gap-3">
        <div className="max-w-xs flex-1">
          <PrimaryButton onClick={submit} disabled={saving}>
            {saving ? "Vista…" : "Vista breytingar"}
          </PrimaryButton>
        </div>
        <Link href={`/dashboard/events/${eventId}`} className="text-sm text-muted transition hover:text-text">
          Hætta við
        </Link>
      </div>
    </div>
  );
}
