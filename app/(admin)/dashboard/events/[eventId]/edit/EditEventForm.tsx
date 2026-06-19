"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui";
import { Field, TextInput, TextArea, NumberInput, Select, Checkbox, PrimaryButton, EVENT_TYPE_OPTIONS } from "@/components/form";
import { updateEvent, setEventCover } from "./actions";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
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

export function EditEventForm({
  eventId,
  initial,
  initialCoverPath,
}: {
  eventId: string;
  initial: Initial;
  initialCoverPath: string | null;
}) {
  const router = useRouter();
  const supa = useMemo(() => createBrowserClient(), []);
  const publicUrl = (p: string) => supa.storage.from("event-media").getPublicUrl(p).data.publicUrl;
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

  // --- Hero mynd ---
  const fileRef = useRef<HTMLInputElement>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(initialCoverPath ? publicUrl(initialCoverPath) : null);
  const [coverBusy, setCoverBusy] = useState(false);
  const [coverMsg, setCoverMsg] = useState<string | null>(null);

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = ""; // leyfa að velja sömu skrá aftur
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setCoverMsg("Veldu myndaskrá (jpg, png, webp).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setCoverMsg("Myndin má mest vera 5MB.");
      return;
    }
    setCoverBusy(true);
    setCoverMsg(null);
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `covers/${eventId}-${Date.now()}.${ext}`;
    const { error: upErr } = await supa.storage
      .from("event-media")
      .upload(path, file, { upsert: true, cacheControl: "3600", contentType: file.type });
    if (upErr) {
      setCoverBusy(false);
      setCoverMsg(`Upphleðsla mistókst: ${upErr.message}`);
      return;
    }
    const res = await setEventCover(eventId, path);
    setCoverBusy(false);
    if (!res.ok) {
      setCoverMsg(res.error ?? "Vistun mistókst.");
      return;
    }
    setCoverUrl(`${publicUrl(path)}?v=${Date.now()}`);
    setCoverMsg("Mynd vistuð.");
    router.refresh();
  }

  async function removeCover() {
    setCoverBusy(true);
    setCoverMsg(null);
    const res = await setEventCover(eventId, null);
    setCoverBusy(false);
    if (!res.ok) {
      setCoverMsg(res.error ?? "Tókst ekki að fjarlægja.");
      return;
    }
    setCoverUrl(null);
    setCoverMsg("Mynd fjarlægð.");
    router.refresh();
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

      <Card className="space-y-3">
        <div>
          <p className="text-sm font-medium text-text">Hero mynd (16:9)</p>
          <p className="text-[13px] text-muted">
            Birtist efst á skráningarsíðunni. Best 1600×900 px (16:9), mest 5MB. Myndin er klippt í 16:9 ef hlutföll passa ekki.
          </p>
        </div>

        {coverUrl ? (
          <div className="overflow-hidden rounded-xl border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coverUrl} alt="" className="aspect-[16/9] w-full object-cover" />
          </div>
        ) : (
          <div className="flex aspect-[16/9] w-full items-center justify-center rounded-xl border border-dashed border-border bg-elevated text-sm text-muted">
            Engin mynd
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <label
            className={`cursor-pointer rounded-xl border border-accent px-4 py-2 text-sm font-semibold text-accent transition hover:bg-[rgba(200,164,92,0.08)] ${
              coverBusy ? "pointer-events-none opacity-60" : ""
            }`}
          >
            {coverUrl ? "Skipta um mynd" : "Hlaða upp mynd"}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickFile} disabled={coverBusy} />
          </label>
          {coverUrl && (
            <button
              type="button"
              onClick={removeCover}
              disabled={coverBusy}
              className="rounded-xl border border-border px-4 py-2 text-sm text-muted transition hover:border-danger hover:text-danger disabled:opacity-60"
            >
              Fjarlægja
            </button>
          )}
          {coverBusy && <span className="text-sm text-muted">Hleð upp…</span>}
        </div>
        {coverMsg && <p className="text-sm text-muted">{coverMsg}</p>}
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
