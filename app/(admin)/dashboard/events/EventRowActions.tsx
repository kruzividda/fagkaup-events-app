"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setEventStatus } from "./actions";

export function EventRowActions({
  eventId,
  status,
  publicPath,
}: {
  eventId: string;
  status: string;
  publicPath: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  function toggle() {
    const next = status === "published" ? "draft" : "published";
    startTransition(async () => {
      await setEventStatus(eventId, next);
      router.refresh();
    });
  }

  function copyLink() {
    const url = `${window.location.origin}${publicPath}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href={`/dashboard/events/${eventId}/stats`}
        className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted transition hover:text-text"
      >
        Tölfræði
      </Link>
      <Link
        href={publicPath}
        target="_blank"
        className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted transition hover:text-text"
      >
        Skoða skráningarsíðu
      </Link>
      {status === "published" && (
        <button
          onClick={copyLink}
          className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted transition hover:text-text"
        >
          {copied ? "Afritað!" : "Afrita hlekk"}
        </button>
      )}
      <button
        onClick={toggle}
        disabled={pending}
        className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-[#0B121C] transition hover:brightness-110 disabled:opacity-50"
      >
        {status === "published" ? "Afbirta" : "Birta"}
      </button>
    </div>
  );
}
