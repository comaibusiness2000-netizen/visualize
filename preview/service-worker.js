const CACHE_NAME = "visualize-preview-v55";
const APP_VERSION = "55";
const APP_SHELL = [
  "./privacy.html",
  "./support.html",
  "./manifest.webmanifest",
  "./icon.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(APP_SHELL.map((url) => new Request(url, { cache: "reload" })))
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
      await self.clients.claim();
      const clientList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      await Promise.all(
        clientList.map((client) => {
          if (!("navigate" in client)) return undefined;
          const url = new URL(client.url);
          if (!url.pathname.endsWith("/") && !url.pathname.endsWith("/index.html")) return undefined;
          if (url.searchParams.get("v") === APP_VERSION) return undefined;
          url.searchParams.set("v", APP_VERSION);
          return client.navigate(url.href);
        })
      );
    })()
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow("./");
      return undefined;
    })
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request, { cache: "reload" }).catch(
        () =>
          new Response("<!doctype html><title>Visualize</title><body>Visualize is offline. Reopen when you are online.</body>", {
            headers: { "Content-Type": "text/html; charset=utf-8" }
          })
      )
    );
    return;
  }

  event.respondWith(
    fetch(event.request, { cache: "no-store" })
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match("./index.html")))
  );
});
