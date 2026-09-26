/* Fuel & Lift service worker: the app opens offline after the first visit.
   Bump VERSION when shipping changes. */
const VERSION = 'fuel-lift-v1';
const SHELL = ['./', 'index.html', 'config.js', 'calc.js', 'foods.js', 'backend.js', 'app.js', 'manifest.json', 'icon-192.png', 'icon-180.png', 'icon-512.png',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET') return;
  // Never cache the database, sign-in or Claude.
  if (/supabase\.co$/.test(url.hostname) || url.pathname.includes('/functions/')) return;
  const own = url.origin === self.location.origin;
  const cdn = /^(cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)$/.test(url.hostname);
  if (!own && !cdn) return;
  // Stale-while-revalidate: instant from cache, refreshed in the background.
  e.respondWith(caches.open(VERSION).then(cache => cache.match(req, { ignoreSearch: own }).then(hit => {
    const net = fetch(req).then(res => { if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  })));
});
