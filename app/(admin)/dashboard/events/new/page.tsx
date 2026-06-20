"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eyebrow, PageTitle, Card } from "@/components/ui";
import {
  Field,
  TextInput,
  TextArea,
  NumberInput,
  Select,
  Checkbox,
  PrimaryButton,
  EVENT_TYPE_OPTIONS,
} from "@/components/form";
import { createEvent, type NewEventInput } from "./actions";

export default function NewEventPage() {
  const router = useRouter();
  const [f, setF] = useState<NewEventInput>({
    name: "",
    description: "",
    event_type: "arshatid",
    starts_at: "",
    location: "",
    max_guests: "",
    drinks_enabled: false,
    drinks_per_person: "",
    spouse_gets_drinks: false,
    drinks_per_spouse: "",
    drinks_alcoholic: true,
    uses_seating: false,
    theme: "glamour",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof NewEventInput>(k: K, v: NewEventInput[K]) {
    setF((prev) => ({ ...prev, [k]: v }));
  }

  async function submit() {
    setSaving(true);
    setError(null);
    const res = await createEvent(f);
    setSaving(false);
    if (!res.ok) {
      setError(res.error ?? "Eitthvað fór úrskeiðis.");
      return;
    }
    router.push(`/dashboard/events/${res.eventId}/form`);
    router.refresh();
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Eyebrow>Viðburðir</Eyebrow>
        <PageTitle>Nýr viðburður</PageTitle>
      </div>

      <Card className="space-y-4">
        <Field label="Heiti" required>
          <TextInput value={f.name} onChange={(v) => set("name", v)} placeholder="Árshátíð 2026" />
        </Field>

        <Field label="Lýsing">
          <TextArea value={f.description} onChange={(v) => set("description", v)} />
        </Field>

        <Field label="Þema skráningarsíðu">
          <Select
            value={f.theme}
            onChange={(v) => set("theme", v)}
            options={[
              { value: "glamour", label: "Glamúr (dökkt, gyllt) — fyrir árshátíðir og skemmtanir" },
              { value: "fagkaup", label: "Fagkaup ljóst (hvítt, rautt) — fyrir golfmót og fleira" },
            ]}
          />
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
            <TextInput value={f.location} onChange={(v) => set("location", v)} placeholder="Harpa, Reykjavík" />
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
            <Checkbox
              checked={f.spouse_gets_drinks}
              onChange={(v) => set("spouse_gets_drinks", v)}
              label="Maki fær líka drykkjamiða"
            />
            {f.spouse_gets_drinks && (
              <Field label="Drykkir fyrir maka">
                <NumberInput value={f.drinks_per_spouse} onChange={(v) => set("drinks_per_spouse", v)} />
              </Field>
            )}
            <Checkbox
              checked={f.drinks_alcoholic}
              onChange={(v) => set("drinks_alcoholic", v)}
              label="Drykkir innihalda áfengi (20 ára aldurstakmark á barnum)"
            />
          </div>
        )}
      </Card>

      <Card>
        <Checkbox checked={f.uses_seating} onChange={(v) => set("uses_seating", v)} label="Nota borðaskipan" />
      </Card>

      {error && (
        <p className="rounded-lg border border-danger bg-surface px-3 py-2 text-sm text-danger">{error}</p>
      )}

      <div className="max-w-xs">
        <PrimaryButton onClick={submit} disabled={saving}>
          {saving ? "Vista…" : "Stofna viðburð"}
        </PrimaryButton>
      </div>
    </div>
  );
}
