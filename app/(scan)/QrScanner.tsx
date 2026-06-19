"use client";

import { useEffect, useRef, useState } from "react";

export function QrScanner({
  onScan,
  paused,
}: {
  onScan: (text: string) => void;
  paused: boolean;
}) {
  const instanceRef = useRef<{ stop: () => Promise<void>; clear: () => void; pause: (b: boolean) => void; resume: () => void } | null>(null);
  const startedRef = useRef(false);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled) return;
        const html5 = new Html5Qrcode("qr-reader", { verbose: false } as never);
        instanceRef.current = html5 as never;
        await html5.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decodedText: string) => onScanRef.current(decodedText),
          () => {}
        );
        startedRef.current = true;
      } catch {
        setError("Náði ekki að opna myndavél. Notaðu handvirka reitinn að neðan.");
      }
    })();

    return () => {
      cancelled = true;
      const inst = instanceRef.current;
      if (inst && startedRef.current) {
        inst
          .stop()
          .then(() => inst.clear())
          .catch(() => {});
        startedRef.current = false;
      }
    };
  }, []);

  useEffect(() => {
    const inst = instanceRef.current;
    if (!inst || !startedRef.current) return;
    try {
      if (paused) inst.pause(true);
      else inst.resume();
    } catch {
      // ignore
    }
  }, [paused]);

  return (
    <div>
      <div id="qr-reader" className="mx-auto w-full max-w-xs overflow-hidden rounded-xl border border-border" />
      {error && <p className="mt-2 text-center text-xs text-muted">{error}</p>}
    </div>
  );
}
