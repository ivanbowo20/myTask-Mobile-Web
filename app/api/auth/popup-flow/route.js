import { NextResponse } from "next/server";
import { createPopupFlow } from "@/lib/auth-popup-handoff";

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

  const flowId = await createPopupFlow();
  return NextResponse.json(
    { flowId },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}
