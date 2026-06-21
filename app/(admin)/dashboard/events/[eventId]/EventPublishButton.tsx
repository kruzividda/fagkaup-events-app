"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setEventStatus } from "../actions";

export function EventPublishButton({ eventId, status }: { eventId: string; status: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const published = status === "published";

  function go(next: string) {
    startTransition(async () => {
      await setEventStatus(eventId, next);
      setConfirm(false);
      router.refresh();
    });
  }

  if (!published) {
    return (
      <button
        onClick={() => go("published")}
        disabled={pending}
        className="rounded-xl border border-accent px-4 py-2 text-sm font-semibold text-accent transition hover:bg-accent-soft disabled:opacity-50"
      >
        {pending ? "…" : "Birta viðburð"}
      </button>
    );
  }

  if (confirm) {
    return (
      <span className="inline-flex items-center gap-2">
        <span className="text-sm text-muted">Afbirta viðburðinn?</span>
        <button
          onClick={() => go("draft")}
          disabled={pending}
          className="rounded-xl bg-danger px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
        >
          {pending ? "…" : "Já, afbirta"}
        </button>
        <button onClick={() => setConfirm(false)} className="btn-secondary rounded-xl px-4 py-2 text-sm">
          Hætta við
        </button>
      </span>
    );
  }

  return (
    <button onClick={() => setConfirm(true)} className="btn-secondary-danger rounded-xl px-4 py-2 text-sm">
      Afbirta
    </button>
  );
}
