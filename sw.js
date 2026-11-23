// sw.js : service worker versionné, écrit à la main. Changer VERSION à chaque publication.
const VERSION = '0.1.6';
// Préfixe distinct pour ne jamais toucher au cache de l'app principale (/entite-mallette/) sur le même origine.
const CACHE = `entite-mallette-v016-${VERSION}`;
const MEDIA = ['./audio/tension.mp3', './fonts/chakra-petch-latin-500-normal.woff2', './fonts/chakra-petch-latin-700-normal.woff2', './fonts/jetbrains-mono-latin-500-normal.woff2'];
const ASSETS = [
  './', './index.html', './manifest.webmanifest',
  './css/app.css?v=0.1.6', './js/app.js?v=0.1.6', './voix/voix.json',
  './js/eye.js', './js/eye-config.js', './js/panel-config.js', './js/audio.js', './js/voix.js', './js/preload.js', './js/puzzles.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png',
];

self.addEventListener('install', (e) => {
  // code : forcé depuis le réseau ; médias : cache HTTP accepté (déjà téléchargés par l'écran de chargement, pas de 2e téléchargement)
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all([
    c.addAll(ASSETS.map((u) => new Request(u, { cache: 'reload' }))),
    c.addAll(MEDIA),
  ])));
});
self.addEventListener('message', (e) => { if (e.data === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('entite-mallette-v016-') && k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (new URL(req.url).pathname.endsWith('/voix/voix.json')) {
    // liste des voix : réseau d'abord, pour voir arriver les nouveaux fichiers
    e.respondWith(fetch(req).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res; }).catch(() => caches.match(req)));
    return;
  }
  if (req.mode === 'navigate') {
    // page : réseau d'abord (nouvelle version visible), cache si hors ligne
    e.respondWith(fetch(req).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put('./index.html', copy)); return res; })
      .catch(() => caches.match('./index.html')));
    return;
  }
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
    return res;
  })));
});
