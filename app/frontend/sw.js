// Service Worker — cache du "shell" pour un fonctionnement hors-ligne — v1.1.0 canevas avec/sans extrait
const CACHE = 'inscriptions-v3';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/logo.png',
  './js/config.js',
  './js/firebase.js',
  './js/store.js',
  './js/seed.js',
  './js/charts.js',
  './js/excel.js',
  './js/app.js',
  './js/vendor/firebase-app-compat.js',
  './js/vendor/firebase-auth-compat.js',
  './js/vendor/firebase-firestore-compat.js',
  './js/vendor/xlsx.full.min.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Réseau d'abord pour les APIs, cache d'abord pour le shell statique
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;

  // Les appels Firebase/API passent par le réseau (gérés par le SDK + persistance)
  if (url.pathname.startsWith('/api/') || url.hostname.includes('firebase') || url.hostname.includes('googleapis')) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then(cached => {
      const fetched = fetch(e.request).then(res => {
        if (res && res.status === 200 && url.origin === location.origin) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => cached);
      return cached || fetched;
    })
  );
});
