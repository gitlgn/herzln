// Herzln Offline – Service Worker
// App-Seiten (index.html, rechner.html): Netzwerk zuerst, damit Updates sofort beim ersten Öffnen da sind;
// offline aus dem Cache. Übrige Dateien (Icons, Manifest): sofort aus dem Cache, im Hintergrund aktualisieren.
// Bei Änderungen an der App CACHE-Version erhöhen.
const CACHE = 'herzln-v9';
const ASSETS = ['./', './index.html', './rechner.html', './manifest.webmanifest', './logo.svg', './icon-192.png', './icon-512.png', './icon-maskable-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async cache => {
    const network = fetch(req, { cache: 'no-cache' })
      .then(res => { if (res.ok) cache.put(req, res.clone()); return res; })
      .catch(() => null);
    if (req.mode === 'navigate') {
      // Netzwerk zuerst, aber nicht ewig warten (schlechter Empfang) → nach 3 s Cache
      const timeout = new Promise(r => setTimeout(() => r(null), 3000));
      const res = await Promise.race([network, timeout]);
      if (res) return res;
      return (await cache.match(req, { ignoreSearch: true })) || (await cache.match('./index.html')) || (await network) || Response.error();
    }
    const cached = await cache.match(req, { ignoreSearch: true });
    if (cached) { e.waitUntil(network); return cached; }
    return (await network) || Response.error();
  }));
});
