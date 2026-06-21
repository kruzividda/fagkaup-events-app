/* Fagkaup Events — service worker
   Gerir skannann skotheldan: geymir "skel" appsins (HTML + JS/CSS) svo
   dyraskanninn virki líka eftir endurhleðslu án nets.
   - Static eignir (_next/static, leturgerðir, myndir): cache-first (óbreytanlegar, hash-aðar)
   - Flakk undir /door og /bar: network-first, geymt afrit til vara
   - Supabase-köll (annar origin) og POST: aldrei geymd — fara beint á netið
*/
const CACHE = "fk-shell-v1";
const STATIC_RE = /\.(?:js|css|woff2?|ttf|png|jpe?g|svg|gif|webp|ico|webmanifest)$/i;

const OFFLINE_HTML = `<!doctype html><html lang="is"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Ónettengt</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0B121C;color:#E8ECF1;font-family:system-ui,sans-serif;text-align:center;padding:24px}
.box{max-width:340px}h1{font-size:20px;margin:0 0 8px}p{color:#9AA7B4;font-size:14px;line-height:1.5}button{margin-top:16px;border:1px solid #2a3a4d;background:#14202E;color:#E8ECF1;border-radius:10px;padding:10px 16px;font-size:14px}</style></head>
<body><div class="box"><h1>Ónettengt</h1>
<p>Þessi síða var ekki geymd í tækinu. Tengstu neti einu sinni til að sækja hana — eftir það virkar hún ónettengt.</p>
<button onclick="location.reload()">Reyna aftur</button></div></body></html>`;

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return; // POST/RPC -> beint á netið

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Supabase o.fl. -> beint á netið

  // 1) Static eignir: cache-first + uppfæra í bakgrunni
  if (url.pathname.startsWith("/_next/static/") || STATIC_RE.test(url.pathname)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        const hit = await cache.match(req);
        const fetchAndPut = fetch(req)
          .then((res) => {
            if (res && res.ok) cache.put(req, res.clone());
            return res;
          })
          .catch(() => hit);
        return hit || fetchAndPut;
      })()
    );
    return;
  }

  // 2) Flakk (endurhleðsla / opnun síðu)
  if (req.mode === "navigate") {
    const cacheable = url.pathname.startsWith("/door") || url.pathname.startsWith("/bar");
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          if (cacheable && res && res.ok) {
            const cache = await caches.open(CACHE);
            cache.put(req, res.clone());
          }
          return res;
        } catch {
          const cache = await caches.open(CACHE);
          const hit = await cache.match(req);
          return (
            hit ||
            new Response(OFFLINE_HTML, { headers: { "Content-Type": "text/html; charset=utf-8" } })
          );
        }
      })()
    );
    return;
  }

  // 3) Annað same-origin GET: network-first, afrit til vara
  event.respondWith(
    (async () => {
      try {
        return await fetch(req);
      } catch {
        const cache = await caches.open(CACHE);
        const hit = await cache.match(req);
        return hit || Response.error();
      }
    })()
  );
});
