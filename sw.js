// Incrementar a versão a cada deploy que altere index.html ou assets —
// é o que descarta o cache antigo nos aparelhos dos usuários.
const VERSION = 'v4';
const CACHE = `nptl-${VERSION}`;
const FONT_CACHE = 'nptl-fonts';

const PRECACHE = ['./', 'index.html', 'manifest.json', 'app_192.png', 'app_512.png'];
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE && k !== FONT_CACHE).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;

  // Navegação: rede primeiro (pega a versão nova do jogo), cache como fallback offline.
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('index.html', copy));
          return res;
        })
        .catch(() => caches.match('index.html'))
    );
    return;
  }

  // Google Fonts: cache primeiro — são imutáveis e necessárias offline.
  if (FONT_HOSTS.includes(url.hostname)) {
    e.respondWith(
      caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
        const copy = res.clone();
        caches.open(FONT_CACHE).then((c) => c.put(e.request, copy));
        return res;
      }))
    );
    return;
  }

  // Demais assets do próprio site: cache primeiro.
  if (url.origin === self.location.origin) {
    e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request)));
  }
  // APIs do Google (Sheets, OAuth) passam direto, sem interceptação.
});
