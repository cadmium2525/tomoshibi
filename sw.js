// Service worker: offline play. Bump VERSION whenever you publish an update.
const VERSION = 'lumina-v14';
const APP = [
  './', 'index.html', 'manifest.webmanifest',
  'src/assets_gen.js', 'src/core.js', 'src/chapters.js', 'src/stage1.js', 'src/stage2.js', 'src/stage3.js', 'src/world.js',
  'src/actors.js', 'src/props.js', 'src/touch.js', 'src/cutscene.js', 'src/game.js',
  'icons/icon-32.png', 'icons/icon-192.png', 'icons/icon-512.png',
  'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png', 'assets/story/title.webp',
];
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];
const FONT_CACHE = 'lumina-fonts';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(APP)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== FONT_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    // stale-while-revalidate: instant start from cache, refresh in the background
    e.respondWith(caches.open(VERSION).then(async (cache) => {
      const hit = await cache.match(req, { ignoreSearch: true });
      const net = fetch(req).then((res) => {
        if (res.ok) cache.put(req, res.clone());
        return res;
      }).catch(() => hit);
      return hit || net;
    }));
  } else if (FONT_HOSTS.includes(url.hostname)) {
    // web font: cache first
    e.respondWith(caches.open(FONT_CACHE).then(async (cache) => {
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
      return res;
    }));
  }
});
