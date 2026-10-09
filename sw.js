/* 4ブロック大会ボード — オフライン用 Service Worker
   アプリ本体は install 時にキャッシュし、以後はキャッシュ優先で配信する。
   アプリを更新したら CACHE の数字を上げること（古いキャッシュは自動で削除される）。
   index.html の APP_VERSION と同じ番号にしておくと、画面左上の表記で確認できる。 */

const CACHE = "block4-board-v12";

/* アプリ本体。ここが揃っていればオフラインで起動できる。 */
const SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png",
  "./logo.jpg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  /* ページ遷移（アイコンからの起動を含む）は必ずキャッシュした index.html を返す。
     これがないとオフライン起動時にエラーページになる。 */
  if (req.mode === "navigate") {
    event.respondWith(
      caches.match("./index.html").then((hit) => hit || fetch(req))
    );
    return;
  }

  /* それ以外はキャッシュ優先。取得できたものは次回のために保存する
     （Google Fonts のような別ドメインのファイルもここで蓄積される）。 */
  event.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        if (res && (res.ok || res.type === "opaque")) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => hit);
    })
  );
});
