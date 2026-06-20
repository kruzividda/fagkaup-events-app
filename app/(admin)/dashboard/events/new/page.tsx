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
import { createEvent, setCover, type NewEventInput } from "./actions";
import { createClient as createBrowserClient } from "@/lib/supabase/client";

function CoverInput({
  label,
  hint,
  file,
  onPick,
}: {
  label: string;
  hint: string;
  file: File | null;
  onPick: (f: File | null) => void;
}) {
  const preview = file ? URL.createObjectURL(file) : null;
  return (
    <div className="space-y-2">
      <p className="text-sm text-text">{label}</p>
      <p className="text-[12px] text-muted">{hint}</p>
      {preview ? (
        <div className="space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="" className="max-h-40 w-full rounded-xl border border-border object-cover" />
          <button onClick={() => onPick(null)} className="text-[12px] text-muted underline-offset-2 hover:text-danger hover:underline">
            Fjarlægja mynd
          </button>
        </div>
      ) : (
        <label className="flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-border px-4 py-6 text-sm text-muted transition hover:border-accent hover:text-text">
          Veldu mynd
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onPick(e.target.files?.[0] ?? null)}
          />
        </label>
      )}
    </div>
  );
}

export default function NewEventPage() {
  const router = useRouter();
  const supa = createBrowserClient();
  const [desktopFile, setDesktopFile] = useState<File | null>(null);
  const [mobileFile, setMobileFile] = useState<File | null>(null);
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
    registration_opens_at: "",
    registration_closes_at: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof NewEventInput>(k: K, v: NewEventInput[K]) {
    setF((prev) => ({ ...prev, [k]: v }));
  }

  async function uploadCover(eventId: string, slot: "desktop" | "mobile", file: File) {
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `covers/${eventId}-${slot}-${Date.now()}.${ext}`;
      const { error: upErr } = await supa.storage
        .from("event-media")
        .upload(path, file, { upsert: true, cacheControl: "3600", contentType: file.type });
      if (upErr) return;
      await setCover(eventId, slot, path);
    } catch {
      /* mynd má hlaða upp síðar undir „Breyta viðburði“ */
    }
  }

  async function submit() {
    setSaving(true);
    setError(null);
    const res = await createEvent(f);
    if (!res.ok || !res.eventId) {
      setSaving(false);
      setError(res.error ?? "Eitthvað fór úrskeiðis.");
      return;
    }
    if (desktopFile) await uploadCover(res.eventId, "desktop", desktopFile);
    if (mobileFile) await uploadCover(res.eventId, "mobile", mobileFile);
    setSaving(false);
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
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Skráning opnar (valfrjálst)">
            <TextInput type="datetime-local" value={f.registration_opens_at} onChange={(v) => set("registration_opens_at", v)} />
            <p className="mt-1.5 text-[12px] text-muted">Fram að þessum tíma er niðurtalning og „Skrá mig“ óvirkt. Autt = opnar strax.</p>
          </Field>
          <Field label="Skráning lokar (valfrjálst)">
            <TextInput type="datetime-local" value={f.registration_closes_at} onChange={(v) => set("registration_closes_at", v)} />
            <p className="mt-1.5 text-[12px] text-muted">Eftir þennan tíma lokast fyrir nýjar skráningar. Autt = engin lokun.</p>
          </Field>
        </div>
      </Card>

      <Card className="space-y-4">
        <div>
          <p className="text-sm font-medium text-text">Hero myndir (valfrjálst)</p>
          <p className="text-[12px] text-muted">Þú getur líka bætt þeim við síðar undir „Breyta viðburði“.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <CoverInput
            label="Tölva (16:9)"
            hint="Breið mynd fyrir tölvuskjá."
            file={desktopFile}
            onPick={setDesktopFile}
          />
          <CoverInput
            label="Sími (9:16)"
            hint="Há mynd fyrir síma. Ef sleppt er tölvumyndin notuð."
            file={mobileFile}
            onPick={setMobileFile}
          />
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
