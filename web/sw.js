// Service worker template. vite.config.js fills in VERSION and PRECACHE at build time.
// Static files: cache first, versioned per build. data/latest.json: network first, last copy as fallback, so the page
// still opens offline and its own stale/expired logic decides what to show.
const VERSION = '__VERSION__';
const PRECACHE = __PRECACHE__;
const SHELL_CACHE = `bng-shell-${VERSION}`;
const DATA_CACHE = 'bng-data';
const DATA_URL = new URL('data/latest.json', self.registration.scope).href;
const INDEX_URL = new URL('index.html', self.registration.scope).href;
const NETWORK_WAIT_MS = 4000;

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const shell = await caches.open(SHELL_CACHE);
    await shell.addAll(PRECACHE.map(path => new URL(path, self.registration.scope).href));
    // Seed the data cache so the very first offline visit has something to show.
    try {
      const res = await fetch(DATA_URL, { cache: 'reload' });
      if (res.ok) await (await caches.open(DATA_CACHE)).put(DATA_URL, res);
    } catch { /* offline install: the page will fetch the data itself later */ }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) {
      if (name.startsWith('bng-') && name !== SHELL_CACHE && name !== DATA_CACHE) await caches.delete(name);
    }
    await self.clients.claim();
  })());
});

async function networkFirst(request, event) {
  const cache = await caches.open(DATA_CACHE);
  const cached = await cache.match(DATA_URL, { ignoreVary: true });
  const fromNetwork = fetch(request).then(async res => {
    if (res.ok) await cache.put(DATA_URL, res.clone());
    return res;
  });
  if (!cached) return fromNetwork;
  event.waitUntil(fromNetwork.catch(() => {}));
  // On a slow link the cached copy answers after a short wait; the network result still refreshes the cache.
  const timeout = new Promise(resolve => setTimeout(() => resolve(cached), NETWORK_WAIT_MS));
  return Promise.race([fromNetwork.catch(() => cached), timeout]);
}

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.href === DATA_URL) {
    event.respondWith(networkFirst(request, event));
    return;
  }
  event.respondWith((async () => {
    const hit = await caches.match(request.mode === 'navigate' ? INDEX_URL : request, { ignoreSearch: request.mode === 'navigate', ignoreVary: true });
    return hit ?? fetch(request);
  })());
});
