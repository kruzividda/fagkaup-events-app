"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui";
import { Field, TextInput, NumberInput, Select, Checkbox, PrimaryButton, EVENT_TYPE_OPTIONS } from "@/components/form";
import { RichTextField } from "@/components/RichTextField";
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
  drinks_alcoholic: boolean;
  uses_seating: boolean;
  qr_enabled: boolean;
  sender_name: string | null;
  sender_email: string | null;
  theme: string;
  registration_opens_at: string | null;
  registration_closes_at: string | null;
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
  initialCoverPathMobile,
}: {
  eventId: string;
  initial: Initial;
  initialCoverPath: string | null;
  initialCoverPathMobile: string | null;
}) {
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
    drinks_alcoholic: initial.drinks_alcoholic,
    uses_seating: initial.uses_seating,
    qr_enabled: initial.qr_enabled ?? true,
    sender_name: initial.sender_name ?? "",
    sender_email: initial.sender_email ?? "",
    theme: initial.theme ?? "glamour",
    registration_opens_at: toLocalInput(initial.registration_opens_at ?? undefined),
    registration_closes_at: toLocalInput(initial.registration_closes_at ?? undefined),
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
          <RichTextField value={f.description} onChange={(v) => set("description", v)} />
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
            <TextInput value={f.location} onChange={(v) => set("location", v)} />
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
          <p className="text-sm font-medium text-text">Hero myndir</p>
          <p className="text-[13px] text-muted">
            Birtast efst á skráningarsíðunni. Tvær myndir: ein breið fyrir tölvuskjá og ein há fyrir síma.
            Ef aðeins önnur er sett er hún notuð fyrir báðar gerðir skjáa. Mest 5MB hvor.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <CoverUploader
            eventId={eventId}
            slot="desktop"
            initialPath={initialCoverPath}
            label="Tölvuskjár — 16:9"
            hint="Best 1600×900 px"
            aspectClass="aspect-[16/9]"
          />
          <CoverUploader
            eventId={eventId}
            slot="mobile"
            initialPath={initialCoverPathMobile}
            label="Sími — 9:16"
            hint="Best 1080×1920 px"
            aspectClass="aspect-[9/16] max-h-72 mx-auto"
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
            <Checkbox checked={f.spouse_gets_drinks} onChange={(v) => set("spouse_gets_drinks", v)} label="Maki fær líka drykkjamiða" />
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

      <Card className="space-y-1.5">
        <Checkbox checked={f.qr_enabled} onChange={(v) => set("qr_enabled", v)} label="Senda QR kóða á gesti" />
        <p className="text-xs text-muted">Slökktu á þessu fyrir smærri viðburði án dyravarðar eða drykkjamiða — þá fá gestir staðfestingu án QR-kóða. (QR þarf fyrir innritun við dyr og drykkjamiða.)</p>
      </Card>

      <Card className="space-y-4">
        <div>
          <p className="text-sm font-medium text-text">Sendandi staðfestingarpósts</p>
          <p className="mt-0.5 text-xs text-muted">
            Veldu netfang sem pósturinn kemur frá (t.d. ronning@ronning.is fyrir Johan Rönning). Lénið verður að vera staðfest í
            Resend. Ef tómt er notað almenna netfang kerfisins.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Sendandanafn">
            <TextInput value={f.sender_name} onChange={(v) => set("sender_name", v)} placeholder="Johan Rönning" />
          </Field>
          <Field label="Sendanda netfang">
            <TextInput type="email" value={f.sender_email} onChange={(v) => set("sender_email", v)} placeholder="ronning@ronning.is" />
          </Field>
        </div>
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

function CoverUploader({
  eventId,
  slot,
  initialPath,
  label,
  hint,
  aspectClass,
}: {
  eventId: string;
  slot: "desktop" | "mobile";
  initialPath: string | null;
  label: string;
  hint: string;
  aspectClass: string;
}) {
  const supa = useMemo(() => createBrowserClient(), []);
  const publicUrl = (p: string) => supa.storage.from("event-media").getPublicUrl(p).data.publicUrl;
  const fileRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState<string | null>(initialPath ? publicUrl(initialPath) : null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return setMsg("Veldu myndaskrá (jpg, png, webp).");
    if (file.size > 5 * 1024 * 1024) return setMsg("Myndin má mest vera 5MB.");
    setBusy(true);
    setMsg(null);
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `covers/${eventId}-${slot}-${Date.now()}.${ext}`;
    const { error: upErr } = await supa.storage
      .from("event-media")
      .upload(path, file, { upsert: true, cacheControl: "3600", contentType: file.type });
    if (upErr) {
      setBusy(false);
      return setMsg(`Upphleðsla mistókst: ${upErr.message}`);
    }
    const res = await setEventCover(eventId, slot, path);
    setBusy(false);
    if (!res.ok) return setMsg(res.error ?? "Vistun mistókst.");
    setUrl(`${publicUrl(path)}?v=${Date.now()}`);
    setMsg("Mynd vistuð.");
  }

  async function remove() {
    setBusy(true);
    setMsg(null);
    const res = await setEventCover(eventId, slot, null);
    setBusy(false);
    if (!res.ok) return setMsg(res.error ?? "Tókst ekki að fjarlægja.");
    setUrl(null);
    setMsg("Mynd fjarlægð.");
  }

  return (
    <div className="space-y-2">
      <p className="text-[13px] font-medium text-text">{label}</p>
      {url ? (
        <div className="overflow-hidden rounded-xl border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="" className={`w-full object-cover ${aspectClass}`} />
        </div>
      ) : (
        <div className={`flex w-full items-center justify-center rounded-xl border border-dashed border-border bg-elevated text-[13px] text-muted ${aspectClass}`}>
          {hint}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <label
          className={`cursor-pointer rounded-lg border border-accent px-3 py-1.5 text-[13px] font-semibold text-accent transition hover:bg-accent-soft ${
            busy ? "pointer-events-none opacity-60" : ""
          }`}
        >
          {url ? "Skipta um" : "Hlaða upp"}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPick} disabled={busy} />
        </label>
        {url && (
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="btn-secondary-danger rounded-lg px-3 py-1.5 text-[13px]"
          >
            Fjarlægja
          </button>
        )}
        {busy && <span className="text-[13px] text-muted">Hleð upp…</span>}
      </div>
      {msg && <p className="text-[12px] text-muted">{msg}</p>}
    </div>
  );
}
