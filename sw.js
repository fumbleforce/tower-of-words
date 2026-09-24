// Offline-first: serve from cache, refresh the cache in the background when online.
const VERSION = 'tower-v1';
const FILES = ['./', 'index.html', 'style.css', 'app.js', 'manifest.json', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png',
  ...Array.from({ length: 12 }, (_, i) => `data/floor${String(i + 1).padStart(2, '0')}.js`)];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.open(VERSION).then(async cache => {
    const hit = await cache.match(e.request, { ignoreSearch: true });
    const net = fetch(e.request).then(res => { if (res.ok) cache.put(e.request, res.clone()); return res; }).catch(() => null);
    return hit || (await net) || cache.match('index.html');
  }));
});
