// Service worker mínimo: solo existe para que el navegador permita "Instalar app"
// y para que el dashboard abra aunque no haya internet (mostrando la última
// versión guardada — los datos en vivo de KoboToolbox seguirán necesitando
// conexión, pero el propio dashboard sí abrirá sin problema).

const CACHE_NAME = 'clima-atitlan-v1';
const APP_SHELL = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Estrategia: red primero (para tener datos frescos), y si no hay red,
// responde con lo que haya en caché — PERO nunca para los datos en vivo de
// KoboToolbox/Apps Script. Esos siempre van directo a la red y sin caché,
// para no arriesgarnos a mostrar lluvia vieja como si fuera actual.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = event.request.url;
  const isLiveData = url.includes('script.google.com') || url.includes('/exec');
  if (isLiveData) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
