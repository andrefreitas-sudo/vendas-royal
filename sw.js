const CACHE = 'vendasroyal-v6';

const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];

const CDN_PERMITIDO = [
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS.concat(CDN_PERMITIDO)))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const mesmaOrigem = url.origin === self.location.origin;

  /* API do banco e outros endereços externos: sempre rede, nunca cache */
  if (!mesmaOrigem && CDN_PERMITIDO.indexOf(url.href) < 0) return;

  const ehPagina = req.mode === 'navigate' ||
                   url.pathname.endsWith('/') ||
                   url.pathname.endsWith('.html');

  if (mesmaOrigem && ehPagina) {
    /* Rede primeiro E ignorando o cache do navegador,
       para a versão publicada chegar sempre. */
    e.respondWith(
      fetch(url.href, { cache: 'no-store' })
        .then(resp => {
          if (resp && resp.ok) {
            const copia = resp.clone();
            caches.open(CACHE).then(c => c.put(req, copia));
          }
          return resp;
        })
        .catch(() => caches.match(req).then(hit => hit || caches.match('./index.html')))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(resp => {
      if (resp && resp.ok) {
        const copia = resp.clone();
        caches.open(CACHE).then(c => c.put(req, copia));
      }
      return resp;
    }))
  );
});
