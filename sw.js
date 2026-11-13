/* sw.js v1.0.0 (Last Rev: 2026-11-12) */
/* sw.js - offline support. Precaches every file the page needs, then serves same-origin GET
   requests stale-while-revalidate: instant from cache, refreshed in the background. DNS lookups
   (other origins) and HEAD requests (the footer build time) always go to the network.
   The cache name follows Calc.VERSION, so bumping the version replaces the cache.
   tests/sw.test.js fails if a file the page loads is missing from ASSETS. */
self.window = self;
importScripts("js/version.js");

const CACHE = `itcalc-${self.Calc.VERSION}`;
const ASSETS = [
  "./", // the page itself; index.html redirects here on Cloudflare, and a redirect fails the install
  "manifest.webmanifest",
  "favicon.svg",
  "css/style.css",
  "assets/img/ilhs-mark.svg",
  "assets/img/icon-192.png",
  "assets/img/icon-512.png",
  "assets/fonts/familjen-grotesk-500.woff2",
  "assets/fonts/familjen-grotesk-700.woff2",
  "assets/fonts/source-sans-3-var.woff2",
  "assets/fonts/jetbrains-mono-var.woff2",
  "js/version.js",
  "js/units.js",
  "js/ipv4.js",
  "js/ipv6.js",
  "js/net.js",
  "js/mac.js",
  "js/ipv6plan.js",
  "js/ports.js",
  "js/raid.js",
  "js/storage.js",
  "js/capacity.js",
  "js/resolution.js",
  "js/timefmt.js",
  "js/cron.js",
  "js/bits.js",
  "js/vendor/eff-wordlist.js",
  "js/password.js",
  "js/encode.js",
  "js/vendor/qrcode.js",
  "js/dns.js",
  "js/emailauth.js",
  "js/mailheaders.js",
  "js/ui/core.js",
  "js/ui/network.js",
  "js/ui/dnsmail.js",
  "js/ui/capacity.js",
  "js/ui/display.js",
  "js/ui/utilities.js",
  "js/app.js",
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith("itcalc-") && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()));
});

self.addEventListener("fetch", event => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  event.respondWith(caches.open(CACHE).then(async cache => {
    const key = url.pathname.endsWith("/") ? "./" : req;
    const cached = await cache.match(key, { ignoreSearch: true });
    const fresh = fetch(req).then(res => {
      if (res.ok && res.type === "basic") cache.put(key, res.clone());
      return res;
    }).catch(() => cached);
    return cached || fresh;
  }));
});
