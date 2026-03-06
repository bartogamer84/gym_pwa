const CACHE_NAME = 'gym-v1';
const assets = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './manifest.json'
];

self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(assets);
        })
    );
});

self.addEventListener('fetch', e => {
    // No cachear requests a /api/ para evitar problemas con pagos
    if (e.request.url.includes('/api/')) {
        return fetch(e.request);
    }
    e.respondWith(
        caches.match(e.request).then(res => {
            return res || fetch(e.request);
        })
    );
});