/* Offline reĹľim. Po prvnĂ­m naÄŤtenĂ­ hra bÄ›ĹľĂ­ bez signĂˇlu i bez wifi.
   PĹ™i kaĹľdĂ© zmÄ›nÄ› hry zvyĹˇ VERZI â€” jinak si telefon nechĂˇ starou verzi. */

const VERZE = 'skok-v6';

const SOUBORY = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/audio.js',
  './js/rng.js',
  './js/world.js',
  './js/game.js',
  './js/render.js',
  './js/main.js',
  './icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERZE)
      .then((c) => c.addAll(SOUBORY))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((klice) => Promise.all(klice.filter((k) => k !== VERZE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((hit) => {
      if (hit) return hit;
      return fetch(e.request).then((res) => {
        /* co se povede stĂˇhnout, rovnou schovĂˇme na pĹ™Ă­ĹˇtÄ› */
        if (res && res.ok && res.type === 'basic'){
          const kopie = res.clone();
          caches.open(VERZE).then((c) => c.put(e.request, kopie));
        }
        return res;
      }).catch(() => hit);
    })
  );
});
