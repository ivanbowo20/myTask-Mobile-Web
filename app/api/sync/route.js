import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { SYNC_MAX_BODY_BYTES } from "@/lib/sync/contract";
import { runSync } from "@/lib/modules/sync/sync.service";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting: 30 requests per menit per user
    const rl = checkRateLimit(`sync_${session.user.id}`, 30, 60000);
    if (!rl.allowed) {
      const retryAfterSec = Math.max(1, Math.ceil((rl.resetTime - Date.now()) / 1000));
      return NextResponse.json(
        { error: "Terlalu banyak permintaan sinkronisasi. Silakan tunggu beberapa saat." },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfterSec),
          },
        }
      );
    }

    // Proteksi ukuran payload (maksimal 2 MB)
    const contentLength = request.headers.get("content-length");
    if (contentLength && Number(contentLength) > SYNC_MAX_BODY_BYTES) {
      return NextResponse.json(
        { error: "Ukuran payload melebihi batas maksimal 2 MB." },
        { status: 413 }
      );
    }

    const rawBody = await request.text();
    if (rawBody.length > SYNC_MAX_BODY_BYTES) {
      return NextResponse.json(
        { error: "Ukuran payload melebihi batas maksimal 2 MB." },
        { status: 413 }
      );
    }

    let payload = {};
    if (rawBody.trim().length > 0) {
      try {
        payload = JSON.parse(rawBody);
      } catch {
        return NextResponse.json(
          { error: "Format payload JSON tidak valid." },
          { status: 400 }
        );
      }
    }

    const result = await runSync(session.user.id, payload);
    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status || 400 }
      );
    }

    return NextResponse.json(result, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    console.error("POST /api/sync error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server saat sinkronisasi." },
      { status: 500 }
    );
  }
}
