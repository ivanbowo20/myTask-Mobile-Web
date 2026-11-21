import { NextResponse } from "next/server";
import { pollOrConsumePopupFlow } from "@/lib/auth-popup-handoff";

export const dynamic = "force-dynamic";

function isSameOriginRequest(request) {
  const origin = request.headers.get("origin");
  const xRequestedWith = request.headers.get("x-requested-with");

  const allowedHosts = new Set();
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = request.headers.get("host");
  if (forwardedHost) allowedHosts.add(forwardedHost.split(",")[0].trim());
  if (host) allowedHosts.add(host.split(",")[0].trim());
  if (process.env.APP_URL) {
    try {
      allowedHosts.add(new URL(process.env.APP_URL.trim()).host);
    } catch {
      // Ignore malformed APP_URL
    }
  }

  if (origin) {
    try {
      return allowedHosts.has(new URL(origin).host);
    } catch {
      return false;
    }
  }

  return xRequestedWith === "XMLHttpRequest";
}

export async function POST(request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Forbidden origin" }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const flowId = body?.flowId;
  const result = await pollOrConsumePopupFlow(flowId);

  if (result.status === "pending") {
    return NextResponse.json(
      { status: "pending" },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  }

  if (result.status === "error") {
    return NextResponse.json(
      { status: "error", error: result.error || "auth_callback_failed" },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  }

  if (result.status !== "completed" || !result.cookieName || !result.cookieValue) {
    return NextResponse.json(
      {
        status: "expired",
        error: "Sesi autentikasi Google sudah kadaluarsa atau tidak valid.",
      },
      {
        status: 410,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  }

  const isHttps =
    result.cookieName.startsWith("__Secure-") ||
    request.url.startsWith("https://") ||
    request.headers.get("x-forwarded-proto") === "https" ||
    Boolean(process.env.APP_URL?.startsWith("https://"));

  const response = NextResponse.json(
    { ok: true, status: "completed" },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );

  response.cookies.set(result.cookieName, result.cookieValue, {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? "none" : "lax",
    ...(isHttps ? { partitioned: true } : {}),
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
