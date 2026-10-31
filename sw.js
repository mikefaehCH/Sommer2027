const CACHE = 'sommer2027-v25';
// Fotos von Unsplash/Wikimedia: beim Ansehen gespeichert, bleiben über Updates erhalten (max. PHOTO_MAX).
const PHOTOS = 'sommer2027-fotos';
const PHOTO_MAX = 120;
const PHOTO_HOSTS = ['images.unsplash.com', 'thumb.wikimedia.org', 'upload.wikimedia.org'];
const CORE = [
  './',
  './index.html',
  './style.css',
  './data.js',
  './app.js',
  './manifest.webmanifest',
  './ile-de-re-guide.html',
  './ile-de-re-restaurants.html',
  './ai.html',
  './ai.css',
  './ai.js',
  './familien-login.html',
  './ACTIVITY_PHOTOS.json',
  './assets/activity-photos/saint-martin.jpg',
  './assets/activity-photos/glace.jpg',
  './assets/activity-photos/rochelle.jpg',
  './assets/activity-photos/conche.jpg',
  './assets/activity-photos/aquarium.jpg',
  './assets/activity-photos/ars.jpg',
  './assets/activity-photos/chenonceau.jpg',
  './assets/activity-photos/14juillet.jpg',
  './assets/activity-photos/bois-plage.jpg',
  './index-page.css',
  './index-inline-1.js',
  './index-inline-2.js',
  './ile-de-re-guide-page.css',
  './ile-de-re-restaurants-page.css',
  './ile-de-re-restaurants-inline-1.js',
  './familien-login-page.css',
  './familien-login-inline-1.js',
  './gemeinsamer-plan.html',
  './gemeinsamer-plan-page.css',
  './gemeinsamer-plan-inline-1.js',
  './assets/icons/icon.svg',
  './assets/icons/apple-touch-icon.png',
  './assets/icons/icon-192.png',
];
self.addEventListener('install', (event) =>
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(CORE.map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  ),
);
self.addEventListener('activate', (event) =>
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('sommer2027-') && key !== CACHE && key !== PHOTOS)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  ),
);
async function trimPhotos(cache) {
  const keys = await cache.keys();
  for (const key of keys.slice(0, Math.max(0, keys.length - PHOTO_MAX))) await cache.delete(key);
}
self.addEventListener('fetch', (event) => {
  const request = event.request,
    url = new URL(request.url);
  // Externe Fotos: zuerst Cache, sonst Netz – damit Bilder auch offline erscheinen.
  if (request.method === 'GET' && PHOTO_HOSTS.includes(url.hostname)) {
    event.respondWith(
      caches.open(PHOTOS).then((cache) =>
        cache.match(request).then(
          (hit) =>
            hit ||
            fetch(request).then((response) => {
              if (response.ok || response.type === 'opaque') {
                event.waitUntil(cache.put(request, response.clone()).then(() => trimPhotos(cache)));
              }
              return response;
            }),
        ),
      ),
    );
    return;
  }
  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    url.pathname.includes('/supabase/') ||
    request.headers.has('authorization')
  )
    return;
  const isPage = request.mode === 'navigate';
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && response.type === 'basic' && isPage) {
          const copy = response.clone();
          event.waitUntil(caches.open(CACHE).then((cache) => cache.put(request, copy)));
        }
        return response;
      })
      .catch(() =>
        caches
          .match(request, { ignoreSearch: true })
          .then(
            (cached) =>
              cached || (isPage ? caches.match('./index.html') : undefined) || Response.error(),
          ),
      ),
  );
});
