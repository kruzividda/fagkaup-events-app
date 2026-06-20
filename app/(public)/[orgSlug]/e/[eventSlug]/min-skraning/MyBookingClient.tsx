"use client";

import { useState } from "react";
import { Card } from "@/components/ui";
import { Field, TextInput, PrimaryButton } from "@/components/form";
import {
  lookupMyBooking,
  updateMyBooking,
  cancelMyBooking,
  reactivateMyBooking,
  cancelMySpouse,
  addMySpouse,
  resendMyBooking,
  type MyBooking,
} from "./actions";

export function MyBookingClient({ eventId, eventName }: { eventId: string; eventName: string }) {
  const [kt, setKt] = useState("");
  const [booking, setBooking] = useState<MyBooking | null>(null);
  const [phase, setPhase] = useState<"lookup" | "view" | "cancelled">("lookup");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // form-reitir
  const [phone, setPhone] = useState("");
  const [dietary, setDietary] = useState("");
  const [spouseName, setSpouseName] = useState("");
  const [spouseEmail, setSpouseEmail] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  async function refresh() {
    const res = await lookupMyBooking(eventId, kt);
    if (res.found && res.booking) {
      setBooking(res.booking);
      setPhone(res.booking.phone ?? "");
      setDietary(res.booking.dietary ?? "");
    }
  }

  async function doLookup() {
    setErr(null);
    setNote(null);
    if (kt.replace(/\D/g, "").length !== 10) return setErr("Sláðu inn 10 stafa kennitölu.");
    setBusy(true);
    const res = await lookupMyBooking(eventId, kt);
    setBusy(false);
    if (!res.found || !res.booking) return setErr("Engin virk skráning fannst með þessari kennitölu.");
    setBooking(res.booking);
    setPhone(res.booking.phone ?? "");
    setDietary(res.booking.dietary ?? "");
    setPhase("view");
  }

  async function saveInfo() {
    setBusy(true);
    setNote(null);
    const res = await updateMyBooking(eventId, kt, phone, dietary);
    setBusy(false);
    if (!res.ok) return setErr("Tókst ekki að vista. Reyndu aftur.");
    setNote("Upplýsingar vistaðar.");
    await refresh();
  }

  async function addSpouse() {
    setNote(null);
    if (!spouseName.trim()) return setErr("Sláðu inn nafn maka.");
    setBusy(true);
    const res = await addMySpouse(eventId, kt, spouseName, spouseEmail);
    setBusy(false);
    if (!res.ok) return setErr(res.reason === "already_has_spouse" ? "Maki er þegar skráður." : "Tókst ekki að bæta við maka.");
    setSpouseName("");
    setSpouseEmail("");
    setNote("Maka bætt við. Miði sendur ef netfang var gefið.");
    await refresh();
  }

  async function removeSpouse() {
    setBusy(true);
    setNote(null);
    const res = await cancelMySpouse(eventId, kt);
    setBusy(false);
    if (!res.ok) return setErr("Tókst ekki að afboða maka.");
    setNote("Maki afboðaður.");
    await refresh();
  }

  async function resend() {
    setBusy(true);
    setNote(null);
    const res = await resendMyBooking(eventId, kt);
    setBusy(false);
    if (!res.ok) return setErr("Tókst ekki að endursenda.");
    setNote(res.sent ? "Staðfesting og QR send á netfangið þitt." : "Tókst ekki að senda póst (netfang eða póstþjónusta ekki stillt).");
  }

  async function cancelAll() {
    setBusy(true);
    setNote(null);
    const res = await cancelMyBooking(eventId, kt);
    setBusy(false);
    setConfirmCancel(false);
    if (!res.ok) return setErr("Tókst ekki að afboða.");
    await refresh(); // skráning verður afbókuð — sýnir endurskráningarvalkost
  }

  async function reactivate() {
    setBusy(true);
    setNote(null);
    setErr(null);
    const res = await reactivateMyBooking(eventId, kt);
    setBusy(false);
    if (!res.ok) {
      const map: Record<string, string> = {
        cancelled: "Þessum viðburði hefur verið aflýst.",
        not_open: "Skráning er ekki opin.",
        not_open_yet: "Skráning er ekki hafin.",
        closed: "Skráningu er lokið.",
        full: "Viðburðurinn er fullbókaður.",
        already_registered: "Þú ert þegar með virka skráningu.",
      };
      return setErr(map[res.reason ?? ""] ?? "Tókst ekki að endurskrá.");
    }
    setNote("Þú ert skráð(ur) aftur.");
    await refresh();
  }

  if (phase === "lookup") {
    return (
      <Card accent className="space-y-4">
        <div>
          <p className="font-display text-lg text-text">Mín skráning</p>
          <p className="text-sm text-muted">Sláðu inn kennitöluna þína til að breyta eða afboða skráninguna þína.</p>
        </div>
        <Field label="Kennitala" required>
          <TextInput
            value={kt}
            onChange={(v) => setKt(v.replace(/\D/g, "").slice(0, 10))}
            inputMode="numeric"
            placeholder="10 tölustafir"
          />
        </Field>
        {err && <p className="text-sm text-danger">{err}</p>}
        <PrimaryButton onClick={doLookup} disabled={busy}>
          {busy ? "Leita…" : "Finna skráningu"}
        </PrimaryButton>
      </Card>
    );
  }

  // phase === "view"
  return (
    <div className="space-y-5">
      <Card className="space-y-1">
        <p className="text-[13px] uppercase tracking-wider text-muted">Skráning</p>
        <p className="font-display text-xl text-text">{booking?.fullName}</p>
        {booking?.primaryCheckedIn && <p className="text-sm text-success">✓ Þú ert innrituð/aður á viðburðinn</p>}
      </Card>

      {note && <p className="rounded-xl border border-success bg-[rgba(106,168,107,0.08)] px-4 py-3 text-sm text-success">{note}</p>}
      {err && <p className="rounded-xl border border-danger bg-[rgba(229,103,91,0.08)] px-4 py-3 text-sm text-danger">{err}</p>}

      {booking?.cancelled ? (
        <Card accent className="space-y-3">
          <p className="font-display text-base text-text">Þú afbókaðir þig</p>
          <p className="text-sm text-muted">
            Skráning þín á {eventName} er afbókuð. Þú getur skráð þig aftur og uppfært upplýsingar á eftir (t.d. fjarlægt maka ef hann kemur ekki).
          </p>
          <PrimaryButton onClick={reactivate} disabled={busy}>
            {busy ? "…" : "Endurskrá mig"}
          </PrimaryButton>
        </Card>
      ) : (
        <>
          <Card className="space-y-4">
            <p className="font-display text-base text-text">Mínar upplýsingar</p>
        <Field label="Símanúmer">
          <TextInput value={phone} onChange={setPhone} type="tel" />
        </Field>
        <Field label="Fæðuóþol / ofnæmi">
          <TextInput value={dietary} onChange={setDietary} />
        </Field>
        <PrimaryButton onClick={saveInfo} disabled={busy}>
          Vista breytingar
        </PrimaryButton>
      </Card>

      <Card className="space-y-4">
        <p className="font-display text-base text-text">Maki / +1</p>
        {booking?.hasSpouse ? (
          <>
            <p className="text-sm text-muted">
              Skráður maki: <span className="text-text">{booking.spouseName || "+1"}</span>
              {booking.spouseCheckedIn && <span className="text-success"> · innritaður</span>}
            </p>
            <button
              onClick={removeSpouse}
              disabled={busy}
              className="rounded-xl border border-border px-4 py-2.5 text-sm text-muted transition hover:border-danger hover:text-danger disabled:opacity-60"
            >
              Afboða maka
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-muted">Bættu við maka eða +1. Hann fær sinn eigin miða og QR.</p>
            <Field label="Nafn maka">
              <TextInput value={spouseName} onChange={setSpouseName} />
            </Field>
            <Field label="Tölvupóstur maka (fyrir hans miða)">
              <TextInput value={spouseEmail} onChange={setSpouseEmail} type="email" />
            </Field>
            <PrimaryButton onClick={addSpouse} disabled={busy}>
              Bæta við maka
            </PrimaryButton>
          </>
        )}
      </Card>

      <Card className="space-y-3">
        <p className="font-display text-base text-text">Miðinn minn</p>
        <button
          onClick={resend}
          disabled={busy}
          className="rounded-xl border border-accent px-4 py-2.5 text-sm font-semibold text-accent transition hover:bg-[rgba(200,164,92,0.08)] disabled:opacity-60"
        >
          Endursenda staðfestingu og QR
        </button>
      </Card>

      <Card className="space-y-3">
        <p className="font-display text-base text-text">Afboða</p>
        <p className="text-sm text-muted">Get ekki mætt? Þú getur afboðað þig. Ef þú ert með maka afbókast hann líka.</p>
        {confirmCancel ? (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={cancelAll}
              disabled={busy}
              className="rounded-xl bg-danger px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
            >
              Já, afboða mig
            </button>
            <button onClick={() => setConfirmCancel(false)} className="rounded-xl border border-border px-4 py-2.5 text-sm text-muted">
              Hætta við
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmCancel(true)}
            className="rounded-xl border border-border px-4 py-2.5 text-sm text-muted transition hover:border-danger hover:text-danger"
          >
            Afboða skráninguna mína
          </button>
        )}
      </Card>
        </>
      )}
    </div>
  );
}
