"use client";

import Link from "next/link";
import { useState } from "react";

export function EventActions({
  status,
  publicPath,
}: {
  status: string;
  publicPath: string;
}) {
  const [copied, setCopied] = useState(false);

  function copyLink() {
    const url = `${window.location.origin}${publicPath}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
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
    </>
  );
}
