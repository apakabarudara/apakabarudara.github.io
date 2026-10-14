// Service worker template. vite.config.js fills in VERSION and PRECACHE at build time.
// Page load: network first (short wait), so an online visitor always gets the current index.html and its current assets; the cached copy is the
// offline fallback. Hashed assets: cache first. data/latest.json: network first, last copy as fallback, so the page still opens offline and its
// own stale/expired logic decides what to show.
const VERSION = '__VERSION__';
const PRECACHE = __PRECACHE__;
const SHELL_CACHE = `bng-shell-${VERSION}`;
const DATA_CACHE = 'bng-data';
const META_CACHE = 'bng-meta';
const DATA_URL = new URL('data/latest.json', self.registration.scope).href;
const INDEX_URL = new URL('index.html', self.registration.scope).href;
const META_URL = new URL('bng-meta.json', self.registration.scope).href;
const NETWORK_WAIT_MS = 4000;
const PAGE_WAIT_MS = 3000;

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
    // bng-meta holds { previous, current } shell names: the previous shell stays so a page still on the old index can load its old assets.
    const meta = await caches.open(META_CACHE);
    const known = await (await meta.match(META_URL))?.json() ?? {};
    const previous = known.current === SHELL_CACHE ? known.previous : known.current;
    await meta.put(META_URL, new Response(JSON.stringify({ previous, current: SHELL_CACHE })));
    const keep = new Set([SHELL_CACHE, previous, DATA_CACHE, META_CACHE]);
    for (const name of await caches.keys()) {
      if (name.startsWith('bng-') && !keep.has(name)) await caches.delete(name);
    }
    await self.clients.claim();
  })());
});

// The current shell first (its public files are the newest), then every cache, so the previous shell still answers.
async function fromShell(request) {
  const options = { ignoreVary: true };
  return (await (await caches.open(SHELL_CACHE)).match(request, options)) ?? caches.match(request, options);
}

async function pageLoad(request) {
  try {
    // no-cache: revalidate, so the browser's HTTP cache cannot hand back an index.html that points at assets of an older build.
    const res = await fetch(request, { cache: 'no-cache', signal: AbortSignal.timeout(PAGE_WAIT_MS) });
    if (res.ok) await (await caches.open(SHELL_CACHE)).put(INDEX_URL, res.clone());
    return res;
  } catch {
    return (await fromShell(INDEX_URL)) ?? fetch(request);
  }
}

async function assetFirst(request) {
  const hit = await fromShell(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) await (await caches.open(SHELL_CACHE)).put(request, res.clone());
  return res;
}

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
  event.respondWith(request.mode === 'navigate' ? pageLoad(request) : assetFirst(request));
});
