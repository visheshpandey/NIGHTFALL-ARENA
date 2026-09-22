const CACHE = "nightfall-arena-v2";
const ASSETS = [
    "./",
    "./index.html",
    "./manifest.json",
    "./vendor/three.module.js",
    "./vendor/three.core.js",
    "./vendor/peerjs.min.js",
    "./vendor/jsm/loaders/GLTFLoader.js",
    "./vendor/jsm/utils/SkeletonUtils.js",
    "./vendor/jsm/utils/BufferGeometryUtils.js",
    "./models/Soldier.glb",
    "./icons/icon-192.png",
    "./icons/icon-512.png"
];

self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE)
            .then(cache => cache.addAll(ASSETS))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys.filter(key => key !== CACHE).map(key => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", event => {
    const request = event.request;
    if (request.method !== "GET") return;

    // Never cache the PeerJS signaling traffic that online matches depend on.
    if (new URL(request.url).origin !== self.location.origin) return;

    event.respondWith(
        caches.match(request).then(cached => {
            const network = fetch(request).then(response => {
                if (response.ok) {
                    const copy = response.clone();
                    caches.open(CACHE).then(cache => cache.put(request, copy));
                }
                return response;
            }).catch(() => cached);
            return cached || network;
        })
    );
});
