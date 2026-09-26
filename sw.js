// تخزين مؤقّت: المصحف من الذاكرة أولًا (لا يتغيّر)، وملفات البرنامج من الشبكة أولًا (لتصل التحديثات فورًا)
const CACHE = 'halaqa-v30';
const CORE = ['./', 'index.html', 'app.css?v=30', 'js/quran.js?v=30', 'js/engine.js?v=30', 'js/store.js?v=30', 'js/stats.js?v=30', 'js/cloud.js?v=30', 'js/app.js?v=30', 'data/quran.json?v=1', 'privacy.html', 'data/mutashabihat.json?v=1'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  if (url.pathname.endsWith('/data/quran.json')){
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => {
      const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return res;
    })));
    return;
  }
  e.respondWith(fetch(e.request, {cache: 'no-cache'}).then(res => {
    if (res.ok){ const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
    return res;
  }).catch(() => caches.match(e.request)));
});
