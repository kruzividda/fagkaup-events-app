"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { duplicateEvent } from "./actions";

export function EventActions({
  eventId,
  status,
  publicPath,
}: {
  eventId: string;
  status: string;
  publicPath: string;
}) {
  const [copied, setCopied] = useState(false);
  const [dupBusy, setDupBusy] = useState(false);
  const router = useRouter();

  function copyLink() {
    const url = `${window.location.origin}${publicPath}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  async function duplicate() {
    if (!confirm("Afrita þennan viðburð? Nýtt afrit verður búið til sem drög (án skráninga) og þú getur breytt dagsetningu o.fl.")) return;
    setDupBusy(true);
    const res = await duplicateEvent(eventId);
    setDupBusy(false);
    if (res.ok && res.newId) {
      router.push(`/dashboard/events/${res.newId}/edit`);
    } else {
      alert(res.error ?? "Afritun mistókst.");
    }
  }

  return (
    <>
      <Link href={publicPath} target="_blank" className="btn-secondary rounded-xl px-4 py-2 text-sm">
        Skoða skráningarsíðu
      </Link>
      {status === "published" && (
        <button onClick={copyLink} className="btn-secondary rounded-xl px-4 py-2 text-sm">
          {copied ? "Afritað!" : "Afrita hlekk"}
        </button>
      )}
      <button onClick={duplicate} disabled={dupBusy} className="btn-secondary rounded-xl px-4 py-2 text-sm disabled:opacity-50">
        {dupBusy ? "Afrita…" : "Afrita viðburð"}
      </button>
    </>
  );
}
