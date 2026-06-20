"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setEventCancelled } from "./actions";

export function EventCancelButton({ eventId, cancelled }: { eventId: string; cancelled: boolean }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  async function run(next: boolean) {
    setBusy(true);
    const res = await setEventCancelled(eventId, next);
    setBusy(false);
    setConfirm(false);
    if (res.ok) router.refresh();
  }

  if (cancelled) {
    return (
      <button
        onClick={() => run(false)}
        disabled={busy}
        className="rounded-xl border border-success px-4 py-2 text-sm font-semibold text-success transition hover:bg-[rgba(95,178,138,0.08)] disabled:opacity-60"
      >
        {busy ? "…" : "Virkja viðburð aftur"}
      </button>
    );
  }

  if (confirm) {
    return (
      <span className="inline-flex gap-2">
        <button
          onClick={() => run(true)}
          disabled={busy}
          className="rounded-xl bg-danger px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
        >
          {busy ? "…" : "Já, fella niður"}
        </button>
        <button onClick={() => setConfirm(false)} className="rounded-xl border border-border px-4 py-2 text-sm text-muted">
          Hætta við
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      className="rounded-xl border border-border px-4 py-2 text-sm text-muted transition hover:border-danger hover:text-danger"
    >
      Fella niður viðburð
    </button>
  );
}
