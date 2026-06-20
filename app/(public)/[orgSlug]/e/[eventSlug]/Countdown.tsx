"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function Box({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex min-w-[64px] flex-col items-center rounded-xl border border-border bg-elevated px-3 py-2">
      <span className="font-display text-2xl font-semibold tabular-nums text-text">{value}</span>
      <span className="text-[11px] uppercase tracking-wider text-muted">{label}</span>
    </div>
  );
}

export function Countdown({ target }: { target: string }) {
  const router = useRouter();
  const targetMs = new Date(target).getTime();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (n >= targetMs) {
        clearInterval(t);
        router.refresh();
      }
    }, 1000);
    return () => clearInterval(t);
  }, [targetMs, router]);

  let d = "–", h = "–", m = "–", s = "–";
  if (now !== null) {
    const diff = Math.max(0, targetMs - now);
    const sec = Math.floor(diff / 1000);
    d = String(Math.floor(sec / 86400));
    h = pad(Math.floor((sec % 86400) / 3600));
    m = pad(Math.floor((sec % 3600) / 60));
    s = pad(sec % 60);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Box value={d} label="Dagar" />
      <Box value={h} label="Klst" />
      <Box value={m} label="Mín" />
      <Box value={s} label="Sek" />
    </div>
  );
}
