// Service Worker untuk PWA, Offline App Shell & Web Push Notification TaskFlow v2
// Versi: v2.7-network-first-nav (Safe Network-First Chunks, Zero Route Hijack, Clean Install)

const CACHE_VERSION = "v2.7-network-first-nav";
const SHELL_CACHE = `taskflow-shell-${CACHE_VERSION}`;
const STATIC_CACHE = `taskflow-static-${CACHE_VERSION}`;
const FALLBACK_CSS_KEY = "/taskflow-fallback.css";

// Aset statis esensial yang selalu 200 OK dan wajib tersedia offline
const ESSENTIAL_STATIC_ASSETS = [
  "/offline.html",
  "/manifest.json",
  "/manifest.json?v=2",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon.svg",
  "/icon.svg",
  "/favicon.ico",
];

// Rute dinamis app shell yang dicache progresif dan dipanen asetnya (CSS & JS Chunks)
const OPTIONAL_APP_ROUTES = [
  "/",
  "/dashboard",
  "/tugas",
  "/kategori",
  "/notebook",
  "/pengaturan",
  "/login",
];

// Helper untuk memberitahu tab aktif agar menjalankan sinkronisasi
async function notifyClientsSyncRequest() {
  try {
    const windowClients = await clients.matchAll({
      type: "window",
      includeUncontrolled: true,
    });
    for (const client of windowClients) {
      client.postMessage({
        type: "MYTASK_SYNC_REQUEST",
        timestamp: Date.now(),
      });
    }
  } catch (err) {
    console.warn("[sw] Gagal mengirim pesan sync ke client:", err);
  }
}

// Helper untuk memanen (harvest) stylesheet CSS dan script JS dari HTML dokumen
async function harvestAssetsFromHtml(htmlText, staticCache, shellCache, route) {
  try {
    // 1. Ekstrak stylesheet links: <link rel="stylesheet" href="..."> atau href="...css..."
    const cssRegex = /<link[^>]+(?:href=["']([^"']+\.css[^"']*)["']|rel=["']stylesheet["'][^>]+href=["']([^"']+)["'])/gi;
    let match;
    while ((match = cssRegex.exec(htmlText)) !== null) {
      const cssUrl = match[1] || match[2];
      if (
        cssUrl &&
        !cssUrl.startsWith("data:") &&
        !cssUrl.startsWith("http://") &&
        !cssUrl.startsWith("https://")
      ) {
        try {
          const cssRes = await fetch(cssUrl);
          if (cssRes && cssRes.status === 200) {
            await staticCache.put(cssUrl, cssRes.clone());
            // Simpan juga sebagai fallback universal stylesheet
            await staticCache.put(FALLBACK_CSS_KEY, cssRes.clone());
          }
        } catch (_) {}
      }
    }

    // 2. Ekstrak JavaScript chunk scripts: <script src="/_next/static/...">
    const jsRegex = /<script[^>]+src=["'](\/_next\/static\/[^"']+\.js[^"']*)["']/gi;
    while ((match = jsRegex.exec(htmlText)) !== null) {
      const jsUrl = match[1];
      if (jsUrl) {
        try {
          const jsRes = await fetch(jsUrl);
          if (jsRes && jsRes.status === 200) {
            await staticCache.put(jsUrl, jsRes);
          }
        } catch (_) {}
      }
    }

    // 3. Panen RSC payload untuk rute agar transisi navigasi SPA offline mulus
    if (route) {
      try {
        const rscRes = await fetch(route, {
          headers: { RSC: "1" },
        });
        if (rscRes && rscRes.status === 200) {
          await shellCache.put(new Request(route + "?_rsc=canonical"), rscRes);
        }
      } catch (_) {}
    }
  } catch (err) {
    console.warn("[sw] Gagal memanen aset dari HTML:", err);
  }
}

// 1. Install Lifecycle: Precache hanya aset statis esensial (zero massal route/RSC prefetch)
self.addEventListener("install", function (event) {
  event.waitUntil(
    (async function () {
      const staticCache = await caches.open(STATIC_CACHE);

      try {
        await staticCache.addAll(ESSENTIAL_STATIC_ASSETS);
      } catch (err) {
        console.warn("[sw] Precache aset statis esensial gagal:", err);
      }

      return self.skipWaiting();
    })()
  );
});

// 2. Activate Lifecycle: Bersihkan Cache Versi Lama & Klaim Client
self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches
      .keys()
      .then(function (keys) {
        return Promise.all(
          keys.map(function (key) {
            if (key !== SHELL_CACHE && key !== STATIC_CACHE) {
              return caches.delete(key);
            }
          })
        );
      })
      .then(function () {
        return self.clients.claim();
      })
  );
});

// 3. Fetch Lifecycle: Caching Strategis Anti-Slop & Anti-CSS-Loss
self.addEventListener("fetch", function (event) {
  const request = event.request;
  const url = new URL(request.url);

  // Anti-Cache Guard: Jangan pernah cegat method non-GET
  if (request.method !== "GET") {
    return;
  }

  // Khusus Better Auth Session: Izinkan GET /api/auth/get-session untuk kesinambungan login offline
  if (url.pathname === "/api/auth/get-session") {
    event.respondWith(
      (async function () {
        try {
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            const shellCache = await caches.open(SHELL_CACHE);
            await shellCache.put("/api/auth/get-session", clone);
          }
          return networkResponse;
        } catch (fetchErr) {
          // Saat offline: Kembalikan sesi pengguna tersimpan agar useSession() tidak melempar ERR_INTERNET_DISCONNECTED
          const cached = await caches.match("/api/auth/get-session");
          if (cached) return cached;

          return new Response(JSON.stringify({ user: null, session: null }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
      })()
    );
    return;
  }

  // Lewatkan seluruh endpoint /api/ lainnya langsung ke jaringan (network)
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  // A. Khusus Next.js RSC (React Server Component) Navigation Request (_rsc query atau header RSC: 1)
  const isRscRequest = url.searchParams.has("_rsc") || request.headers.get("RSC") === "1";
  if (isRscRequest) {
    event.respondWith(
      (async function () {
        try {
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.status === 200 && !networkResponse.redirected) {
            const shellCache = await caches.open(SHELL_CACHE);
            await shellCache.put(request, networkResponse.clone());
            await shellCache.put(
              new Request(url.pathname + "?_rsc=canonical"),
              networkResponse.clone()
            );
          }
          return networkResponse;
        } catch (fetchErr) {
          // Hanya gunakan cache RSC saat benar-benar offline; jangan pernah kembalikan 204 palsu
          const exactMatch = await caches.match(request);
          if (exactMatch) return exactMatch;

          const canonicalMatch = await caches.match(url.pathname + "?_rsc=canonical");
          if (canonicalMatch) return canonicalMatch;

          return Response.error();
        }
      })()
    );
    return;
  }

  // B. Khusus Permintaan Navigasi Dokumen HTML (Full Page Reload / Direct URL / Android WebAPK Intent)
  const acceptHeader = request.headers.get("accept") || "";
  const isHtmlNavigation =
    request.mode === "navigate" ||
    request.destination === "document" ||
    acceptHeader.includes("text/html");

  if (isHtmlNavigation) {
    event.respondWith(
      (async function () {
        try {
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.status === 200 && !networkResponse.redirected) {
            const clone = networkResponse.clone();
            const shellCache = await caches.open(SHELL_CACHE);
            await shellCache.put(request, clone);
            await shellCache.put(url.pathname, clone.clone());
          }
          return networkResponse;
        } catch (err) {
          const shellCache = await caches.open(SHELL_CACHE);

          async function sanitizeResponse(res) {
            if (!res) return null;
            if (res.redirected || res.status === 307 || res.status === 308 || res.status === 301 || res.status === 302) {
              try {
                const blob = await res.blob();
                return new Response(blob, {
                  status: 200,
                  statusText: "OK",
                  headers: { "Content-Type": "text/html; charset=utf-8" },
                });
              } catch (_) {
                return res;
              }
            }
            return res;
          }

          // 1. Cocokkan rute spesifik yang diminta (tanpa membajak ke /dashboard saat rute lain dicari)
          const cached =
            (await shellCache.match(url.pathname)) ||
            (await caches.match(request)) ||
            (await caches.match(request, { ignoreSearch: true }));
          if (cached) {
            return await sanitizeResponse(cached);
          }

          // 2. Fallback offline khusus root ("/") ke /dashboard jika tersedia di cache
          if (url.pathname === "/") {
            const dashboardShell = await shellCache.match("/dashboard");
            if (dashboardShell) {
              return await sanitizeResponse(dashboardShell);
            }
          }

          // 3. Opsi darurat offline jika rute belum pernah dicache
          const offlinePage = await caches.match("/offline.html");
          if (offlinePage) {
            return await sanitizeResponse(offlinePage);
          }

          return new Response(
            "<!DOCTYPE html><html lang='id' class='dark'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width, initial-scale=1, viewport-fit=cover'><title>MyTask — Offline</title><style>body{background:#0C0A09;color:#FAFAFA;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;font-family:sans-serif;}</style></head><body><p>Koneksi terputus. Silakan periksa jaringan Anda lalu muat ulang halaman.</p></body></html>",
            {
              status: 503,
              headers: { "Content-Type": "text/html; charset=utf-8" },
            }
          );
        }
      })()
    );
    return;
  }

  // C. Khusus Stylesheet CSS (Network-First agar styling selalu sinkron, fallback cache saat offline)
  const isCssRequest =
    request.destination === "style" ||
    url.pathname.endsWith(".css") ||
    url.pathname.includes("/_next/static/css/");

  if (isCssRequest) {
    event.respondWith(
      (async function () {
        try {
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.status === 200) {
            const staticCache = await caches.open(STATIC_CACHE);
            await staticCache.put(request, networkResponse.clone());
            await staticCache.put(FALLBACK_CSS_KEY, networkResponse.clone());
          }
          return networkResponse;
        } catch (fetchErr) {
          const cached =
            (await caches.match(request)) ||
            (await caches.match(request, { ignoreSearch: true })) ||
            (await caches.match(FALLBACK_CSS_KEY));
          if (cached) return cached;

          return Response.error();
        }
      })()
    );
    return;
  }

  // D. Khusus JavaScript Chunks (Network-First agar chunk Next.js tidak pernah usang/korup)
  const isJsChunk =
    url.pathname.startsWith("/_next/static/chunks/") ||
    (url.pathname.startsWith("/_next/static/") && url.pathname.endsWith(".js"));

  if (isJsChunk) {
    event.respondWith(
      (async function () {
        try {
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.status === 200) {
            const staticCache = await caches.open(STATIC_CACHE);
            await staticCache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch (fetchErr) {
          const cached =
            (await caches.match(request)) ||
            (await caches.match(request, { ignoreSearch: true }));
          if (cached) return cached;

          return Response.error();
        }
      })()
    );
    return;
  }

  // E. Aset Statis Lainnya (Manifest, Gambar, Icon, Favicon, Fonts)
  if (
    url.pathname === "/manifest.json" ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".ico") ||
    url.pathname.endsWith(".woff2") ||
    url.pathname.endsWith(".woff")
  ) {
    event.respondWith(
      caches.match(request, { ignoreSearch: true }).then(function (cached) {
        if (cached) {
          fetch(request)
            .then(function (networkResponse) {
              if (networkResponse && networkResponse.status === 200) {
                const responseClone = networkResponse.clone();
                caches.open(STATIC_CACHE).then(function (cache) {
                  cache.put(request, responseClone);
                });
              }
            })
            .catch(function () {});
          return cached;
        }

        return fetch(request)
          .then(function (networkResponse) {
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(STATIC_CACHE).then(function (cache) {
                cache.put(request, responseClone);
              });
            }
            return networkResponse;
          })
          .catch(async function () {
            // Fallback khusus icon.svg
            if (url.pathname.endsWith("icon.svg")) {
              const iconCached =
                (await caches.match("/icons/icon.svg")) ||
                (await caches.match("/icon.svg"));
              if (iconCached) return iconCached;
            }
            // Fallback khusus manifest.json
            if (url.pathname === "/manifest.json") {
              const manifestCached =
                (await caches.match("/manifest.json")) ||
                (await caches.match("/manifest.json?v=2"));
              if (manifestCached) return manifestCached;
            }
            return new Response("", { status: 404, statusText: "Offline Not Found" });
          });
      })
    );
  }
});

// 4. Background Sync Listener (Trigger-Only)
self.addEventListener("sync", function (event) {
  if (event.tag === "mytask-sync" || event.tag === "taskflow-sync") {
    event.waitUntil(notifyClientsSyncRequest());
  }
});

// 5. Message Event Listener: Kontrol Cache & Sinkronisasi dari Client Tab
self.addEventListener("message", function (event) {
  if (!event.data) return;

  const type = event.data.type;

  // Logout Guard: Bersihkan seluruh cache saat pengguna keluar
  if (type === "MYTASK_PURGE_CACHES") {
    event.waitUntil(
      caches
        .keys()
        .then(function (keys) {
          return Promise.all(
            keys.map(function (key) {
              return caches.delete(key);
            })
          );
        })
        .then(function () {
          if (event.source && typeof event.source.postMessage === "function") {
            event.source.postMessage({ type: "MYTASK_CACHES_PURGED", success: true });
          }
        })
    );
  }

  // Trigger sinkronisasi manual atau terjadwal
  if (type === "MYTASK_TRIGGER_SYNC") {
    event.waitUntil(notifyClientsSyncRequest());
  }

  if (type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// 6. Push Notification Lifecycle
self.addEventListener("push", function (event) {
  if (!event.data) return;

  let data = {};
  try {
    data = event.data.json();
  } catch (e) {
    data = { title: "TaskFlow", body: event.data.text() };
  }

  const title = data.title || "TaskFlow Pengingat";
  const options = {
    body: data.body || "Anda memiliki pemberitahuan tugas baru.",
    icon: data.icon || "/icons/icon-192.png",
    badge: data.badge || "/icons/icon-192.png",
    data: {
      url: data.url || "/dashboard",
    },
    vibrate: [200, 100, 200],
    tag: data.tag || "taskflow-reminder",
    renotify: true,
  };

  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    (self.navigator && self.navigator.userAgent) || ""
  );

  if (isMobile) {
    event.waitUntil(self.registration.showNotification(title, options));
    return;
  }

  event.waitUntil(
    (async () => {
      try {
        const windowClients = await clients.matchAll({
          type: "window",
          includeUncontrolled: true,
        });

        const isDesktopAppFocused = windowClients.some(
          (c) => c.focused && (c.visibilityState === "visible" || c.visibilityState === undefined)
        );

        if (isDesktopAppFocused) {
          windowClients.forEach((client) => {
            try {
              client.postMessage({
                type: "TASKFLOW_PUSH_ACTIVE_SILENT",
                payload: data,
              });
            } catch (_) {}
          });
          return;
        }

        return await self.registration.showNotification(title, options);
      } catch (err) {
        return await self.registration.showNotification(title, options);
      }
    })()
  );
});

// 7. Notification Click Lifecycle
self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/dashboard";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
      for (const client of clientList) {
        if (client.url && client.url.includes("/dashboard") && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
