const CACHE = 'sommer2027-v21';
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
            .filter((key) => key.startsWith('sommer2027-') && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  ),
);
self.addEventListener('fetch', (event) => {
  const request = event.request,
    url = new URL(request.url);
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
