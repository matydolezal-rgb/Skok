/* Offline režim. Po prvním načtení hra běží bez signálu i bez wifi.
   Při každé změně hry zvyš VERZI — jinak si telefon nechá starou verzi.
   (Měnit ji Editem, ne PowerShellem, jinak se rozbije diakritika.) */

const VERZE = 'skok-v14';

const SOUBORY = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/config.js',
  './js/sit.js',
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
  /* volání žebříčku nikdy neukládáme — musí být vždy čerstvé */
  if (e.request.url.indexOf('/rest/v1/') > -1) return;
  e.respondWith(
    caches.match(e.request).then((hit) => {
      if (hit) return hit;
      return fetch(e.request).then((res) => {
        /* co se povede stáhnout, rovnou schováme na příště */
        if (res && res.ok && res.type === 'basic'){
          const kopie = res.clone();
          caches.open(VERZE).then((c) => c.put(e.request, kopie));
        }
        return res;
      }).catch(() => hit);
    })
  );
});
