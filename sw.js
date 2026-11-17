/* =========================================================================
   sw.js — 논결(NONGYEOL) 하이브리드 앱 서비스 워커
   - 정적 코어 에셋 프리캐시로 오프라인·도서관 열람실 환경에서도 즉시 실행
   - 동일 출처(same-origin) GET 요청은 Network-First with Cache Fallback 전략 사용
   - Firebase, Google APIs, EXAONE API 등 외부 통신 및 /api/exaone은 바이패스
   ========================================================================= */
const CACHE_NAME = 'nongyeol-app-v2';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css?v=7d2e9f30',
  './css/exaone-widget.css?v=1',
  './css/app-devices.css?v=2',
  './js/exaone-widget.js?v=4',
  './js/app.bundle.js?v=f4c8d912',
  './js/app-native.js?v=1',
  './js/firebase-config.js',
  './js/drive-config.js',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/icon-maskable-512.png',
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return Promise.all(
        CORE_ASSETS.map(function (url) {
          return cache.add(new Request(url, { cache: 'reload' })).catch(function () { return null; });
        })
      );
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.map(function (k) {
          if (k !== CACHE_NAME) return caches.delete(k);
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('message', function (event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', function (event) {
  const req = event.request;
  if (!req || req.method !== 'GET') return;

  let url;
  try {
    url = new URL(req.url);
  } catch (e) {
    return;
  }

  // 다른 도메인(Firebase, Google OAuth, EXAONE API, 폰트 등) 및 로컬 프록시는 바이패스
  if (url.origin !== self.location.origin) return;
  if (url.pathname.indexOf('/api/') >= 0) return;

  event.respondWith(
    fetch(req).then(function (networkRes) {
      if (networkRes && networkRes.ok && (networkRes.type === 'basic' || networkRes.type === 'cors')) {
        const clone = networkRes.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(req, clone).catch(function () {});
        });
      }
      return networkRes;
    }).catch(function () {
      return caches.match(req, { ignoreSearch: false }).then(function (hit) {
        if (hit) return hit;
        // 쿼리스트링 차이 fallback 또는 페이지 네비게이션 fallback
        if (req.mode === 'navigate') {
          return caches.match('./index.html');
        }
        return caches.match(req, { ignoreSearch: true });
      });
    })
  );
});
