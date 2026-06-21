"use client";

import { useEffect } from "react";

/**
 * Skráir service worker (aðeins í production-byggingu og þar sem hann er studdur).
 * Þetta gerir skannann skotheldan: skel appsins geymist svo /door virki
 * líka eftir endurhleðslu án nets.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* þögul villa — appið virkar áfram án service worker */
      });
    };
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return null;
}
