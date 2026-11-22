// 앱 껍데기만 저장해서 인터넷이 불안정해도 화면이 열리게 합니다. (가족 데이터는 Firestore가 따로 오프라인 저장)
// - 화면(HTML): 항상 인터넷에서 먼저 받고, 안 되면 마지막으로 받은 것을 씁니다 → 새 버전이 바로 반영됩니다.
// - /assets/ 의 파일: 이름에 고유 번호가 붙어 있어서 저장해 두고 재사용합니다.
const CACHE = 'board-shell-v1';
const SHELL = self.registration.scope + '__shell';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(SHELL, copy));
          return res;
        })
        .catch(async () => (await caches.match(SHELL)) || Response.error()),
    );
    return;
  }

  if (url.pathname.includes('/assets/')) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
            return res;
          }),
      ),
    );
  }
});
