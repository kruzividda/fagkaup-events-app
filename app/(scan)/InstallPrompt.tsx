"use client";

import { useEffect, useState } from "react";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};

const DISMISS_KEY = "fk-install-dismissed";

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [show, setShow] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    // Þegar þegar uppsett (keyrir sem app) -> ekkert
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) return;
    if (localStorage.getItem(DISMISS_KEY) === "1") return;

    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onBIP);

    // iOS Safari styður ekki beforeinstallprompt -> sýnum leiðbeiningu
    const ua = window.navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    const isSafari = isIOS && /Safari/.test(ua) && !/CriOS|FxiOS/.test(ua);
    if (isIOS && isSafari) {
      setIosHint(true);
      setShow(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", onBIP);
  }, []);

  function dismiss() {
    setShow(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="mx-auto max-w-md px-5 pt-3">
      <div className="flex items-center justify-between gap-3 rounded-xl border border-accent bg-surface px-3 py-2.5 text-xs">
        {iosHint ? (
          <span className="text-muted">
            Settu á heimaskjá: <span className="text-text">Deila</span> →{" "}
            <span className="text-text">Bæta á heimaskjá</span>
          </span>
        ) : (
          <span className="text-muted">Settu upp appið fyrir hraðari og öruggari skönnun.</span>
        )}
        <span className="flex shrink-0 items-center gap-2">
          {!iosHint && deferred && (
            <button onClick={install} className="rounded-lg bg-accent px-3 py-1 font-semibold text-[#0B121C]">
              Setja upp
            </button>
          )}
          <button onClick={dismiss} className="text-muted transition hover:text-text" aria-label="Loka">
            ✕
          </button>
        </span>
      </div>
    </div>
  );
}
