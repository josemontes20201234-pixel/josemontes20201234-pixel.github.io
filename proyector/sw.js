// Proyector: guarda la app y las Biblias para que abran rápido y sin señal.
const CACHE = "proyector-v16";
const SHELL = ["./", "./index.html", "./visor.html", "./app.js", "./visor.js", "./shared.js", "./manifest.json", "./icon-192.png", "../config.js", "./biblia/rv1909.json"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x.startsWith("proyector-") && x !== CACHE).map(x => caches.delete(x)))).then(() => self.clients.claim())); });
const guardar = (req, res) => { if (res && res.ok) { const c = res.clone(); caches.open(CACHE).then(x => x.put(req, c)); } return res; };
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const u = new URL(e.request.url);
  if (u.hostname.endsWith("fonts.googleapis.com") || u.hostname.endsWith("fonts.gstatic.com") || u.pathname.includes("/biblia/") || u.hostname === "www.gstatic.com") {
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => guardar(e.request, res))));
    return;
  }
  if (u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(res => guardar(e.request, res)).catch(() => caches.match(e.request).then(r => r || caches.match("./index.html"))));
});
