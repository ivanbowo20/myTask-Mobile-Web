import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  completePopupFlow,
  failPopupFlow,
  isValidPopupFlowId,
} from "@/lib/auth-popup-handoff";

export const dynamic = "force-dynamic";

function renderPopupHtml({ payload, isPopupFlow, fallbackRedirect }) {
  const serializedPayload = JSON.stringify(payload).replace(/</g, "\\u003c");
  const serializedFallback = JSON.stringify(fallbackRedirect).replace(/</g, "\\u003c");
  const serializedIsPopup = isPopupFlow ? "true" : "false";
  const isSuccess = payload?.type === "OAUTH_AUTH_SUCCESS";

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Autentikasi Google — MyTask</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #121110;
      color: #f9f8f6;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      text-align: center;
      padding: 24px;
    }
    .card {
      width: 100%;
      max-width: 360px;
      padding: 28px 24px;
      border-radius: 16px;
      background: #1b1917;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    h1 {
      margin: 0 0 8px;
      font-size: 18px;
      font-weight: 700;
      color: #fafafa;
    }
    p {
      margin: 0;
      color: #a1a1aa;
      font-size: 14px;
      line-height: 1.5;
    }
    button {
      margin-top: 20px;
      width: 100%;
      min-height: 44px;
      padding: 10px 16px;
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.14);
      background: ${isSuccess ? "#fafafa" : "rgba(255, 255, 255, 0.08)"};
      color: ${isSuccess ? "#0a0a0a" : "#fafafa"};
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
    }
    button:hover {
      opacity: 0.92;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1 id="title">${isSuccess ? "Berhasil Masuk" : "Autentikasi Google"}</h1>
    <p id="status">${
      isSuccess
        ? "Sesi Google telah disinkronkan ke halaman utama MyTask. Jendela ini akan tertutup otomatis."
        : "Proses masuk dengan Google dibatalkan atau gagal. Jendela ini akan tertutup otomatis."
    }</p>
    <button id="close-btn" type="button" onclick="window.close()">Tutup Jendela</button>
  </div>
  <script>
    (function () {
      var payload = ${serializedPayload};
      var fallbackUrl = ${serializedFallback};
      var isPopupFlow = ${serializedIsPopup};

      try {
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage(payload, window.location.origin);
        }
      } catch (e) {}

      try {
        if (typeof BroadcastChannel !== "undefined") {
          var ch = new BroadcastChannel("mytask-oauth-channel");
          ch.postMessage(payload);
          ch.close();
        }
      } catch (e) {}

      // When launched from the preview iframe (isPopupFlow=true), NEVER load /dashboard inside
      // this popup even if Google's COOP header severed window.opener to null.
      if (isPopupFlow || window.opener) {
        setTimeout(function () {
          window.close();
        }, 120);
        setTimeout(function () {
          window.close();
        }, 500);
      } else {
        window.location.replace(fallbackUrl);
      }
    })();
  </script>
</body>
</html>`;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const queryError = searchParams.get("error");
  const rawFlow = searchParams.get("flow");
  const hasFlow = isValidPopupFlowId(rawFlow);

  if (queryError) {
    const safeError =
      String(queryError)
        .replace(/[^a-zA-Z0-9_-]/g, "")
        .slice(0, 64) || "auth_callback_failed";

    if (hasFlow) {
      await failPopupFlow(rawFlow, safeError);
    }

    const html = renderPopupHtml({
      payload: { type: "OAUTH_AUTH_ERROR", flowId: hasFlow ? rawFlow : null, error: safeError },
      isPopupFlow: hasFlow,
      fallbackRedirect: `/login?error=${encodeURIComponent(safeError)}`,
    });
    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  }

  let session = null;
  try {
    session = await auth.api.getSession({
      headers: request.headers,
    });
  } catch (err) {
    console.error("[AUTH-POPUP] getSession error:", err);
  }

  const secureCookie = request.cookies.get("__Secure-better-auth.session_token");
  const plainCookie = request.cookies.get("better-auth.session_token");
  const activeCookie = secureCookie || plainCookie;

  if (!session?.user || !activeCookie?.value) {
    if (hasFlow) {
      await failPopupFlow(rawFlow, "session_not_found");
    }

    const html = renderPopupHtml({
      payload: {
        type: "OAUTH_AUTH_ERROR",
        flowId: hasFlow ? rawFlow : null,
        error: "session_not_found",
      },
      isPopupFlow: hasFlow,
      fallbackRedirect: "/login?error=auth_callback_failed",
    });
    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  }

  if (hasFlow) {
    await completePopupFlow(rawFlow, {
      cookieName: activeCookie.name,
      cookieValue: activeCookie.value,
    });
  }

  const html = renderPopupHtml({
    payload: { type: "OAUTH_AUTH_SUCCESS", flowId: hasFlow ? rawFlow : null },
    isPopupFlow: hasFlow,
    fallbackRedirect: "/dashboard",
  });

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
