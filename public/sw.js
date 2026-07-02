// App-shell caching so the app opens instantly on flaky towpath signal.
// Pages and static assets: cache-first with background refresh.
// API calls: network-first, falling back to the last cached response.
const CACHE = 'adamcon-v4';

// Precached so every page navigation (plain MPA links) is served instantly
// from cache, with a background refresh keeping it current.
const PRECACHE = ['/', '/login/', '/people/', '/schedule/', '/profile/', '/manifest.json', '/icon.svg'];

self.addEventListener('install', (event) => {
	event.waitUntil((async () => {
		const cache = await caches.open(CACHE);
		await cache.addAll(PRECACHE);
		await self.skipWaiting();
	})());
});

self.addEventListener('activate', (event) => {
	event.waitUntil((async () => {
		const keys = await caches.keys();
		await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
		await self.clients.claim();
	})());
});

self.addEventListener('fetch', (event) => {
	const url = new URL(event.request.url);
	if (event.request.method !== 'GET' || url.origin !== self.location.origin) {
		return;
	}

	// Auth flows (and the legacy /verify/ redirect) must never be cached.
	if (url.pathname.startsWith('/api/auth/') || url.pathname.startsWith('/verify/')) {
		return;
	}

	if (url.pathname.startsWith('/api/')) {
		// Network-first: live data when we can get it, last-known data when not.
		event.respondWith((async () => {
			const cache = await caches.open(CACHE);
			try {
				const fresh = await fetch(event.request);
				if (fresh.ok) {
					await cache.put(event.request, fresh.clone());
				}

				return fresh;
			} catch (error) {
				const cached = await cache.match(event.request);
				if (cached) {
					return cached;
				}

				throw error;
			}
		})());
		return;
	}

	// App shell: cache-first, refresh in the background.
	event.respondWith((async () => {
		const cache = await caches.open(CACHE);
		const cached = await cache.match(event.request);
		const refresh = fetch(event.request).then(async (fresh) => {
			if (fresh.ok) {
				await cache.put(event.request, fresh.clone());
			}

			return fresh;
		}).catch(() => cached);
		return cached ?? refresh;
	})());
});
