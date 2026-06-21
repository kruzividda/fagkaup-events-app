"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setEventStatus } from "../actions";

export function EventActions({
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
    <>
      <button
        onClick={toggle}
        disabled={pending}
        className="rounded-xl border border-accent px-4 py-2 text-sm font-semibold text-accent transition hover:bg-accent-soft disabled:opacity-50"
      >
        {status === "published" ? "Afbirta" : "Birta"}
      </button>
      <Link href={publicPath} target="_blank" className="btn-secondary rounded-xl px-4 py-2 text-sm">
        Skoða skráningarsíðu
      </Link>
      {status === "published" && (
        <button onClick={copyLink} className="btn-secondary rounded-xl px-4 py-2 text-sm">
          {copied ? "Afritað!" : "Afrita hlekk"}
        </button>
      )}
    </>
  );
}
