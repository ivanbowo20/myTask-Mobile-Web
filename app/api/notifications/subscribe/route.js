import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";

const MAX_ENDPOINT_LENGTH = 2048;
const MAX_KEY_LENGTH = 512;
const MAX_SUBSCRIPTIONS_PER_USER = 10;

function isPrivateOrLocalIpv4(host) {
  const parts = host.split(".");
  if (parts.length !== 4) return false;
  const nums = parts.map((p) => (/^\d+$/.test(p) ? Number(p) : NaN));
  if (nums.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return false;

  const [a, b] = nums;
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 127) return true; // 127.0.0.0/8 (loopback)
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 (link-local / cloud metadata)
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  return false;
}

function isSafePushEndpointUrl(rawEndpoint) {
  if (typeof rawEndpoint !== "string") return false;
  const trimmed = rawEndpoint.trim();
  if (!trimmed || trimmed.length > MAX_ENDPOINT_LENGTH) return false;

  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return false;
  }

  if (parsed.protocol !== "https:") {
    return false;
  }

  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!hostname) return false;

  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname === "::1" ||
    hostname === "::" ||
    hostname.startsWith("fe80:") ||
    hostname.startsWith("fc") ||
    hostname.startsWith("fd") ||
    hostname.startsWith("::ffff:")
  ) {
    return false;
  }

  if (isPrivateOrLocalIpv4(hostname)) {
    return false;
  }

  // Tolak IP literal IPv6 mentah yang tidak memiliki hostname publik
  if (hostname.includes(":")) {
    return false;
  }

  return true;
}

export async function POST(request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting: 20 permintaan per menit per user
    const rl = checkRateLimit(`notif_sub_post_${session.user.id}`, 20, 60000);
    if (!rl.allowed) {
      const retryAfterSec = Math.max(1, Math.ceil((rl.resetTime - Date.now()) / 1000));
      return NextResponse.json(
        { error: "Terlalu banyak permintaan pendaftaran notifikasi. Silakan tunggu beberapa saat." },
        { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
      );
    }

    const body = await request.json();
    const endpoint = typeof body?.endpoint === "string" ? body.endpoint.trim() : "";
    const p256dh = typeof body?.keys?.p256dh === "string" ? body.keys.p256dh.trim() : "";
    const authKey = typeof body?.keys?.auth === "string" ? body.keys.auth.trim() : "";

    if (!endpoint || !p256dh || !authKey) {
      return NextResponse.json(
        { error: "Payload subscription tidak lengkap (endpoint, keys.p256dh, dan keys.auth diperlukan)." },
        { status: 400 }
      );
    }

    if (p256dh.length > MAX_KEY_LENGTH || authKey.length > MAX_KEY_LENGTH) {
      return NextResponse.json(
        { error: "Kunci subscription tidak valid." },
        { status: 400 }
      );
    }

    if (!isSafePushEndpointUrl(endpoint)) {
      return NextResponse.json(
        { error: "Endpoint push tidak valid. Wajib menggunakan URL HTTPS publik yang sah." },
        { status: 400 }
      );
    }

    // Batasi maksimal 10 subscription aktif per akun (pangkas yang paling lama jika penuh)
    const existingRes = await query(
      `SELECT id, endpoint, created_at FROM public.push_subscriptions WHERE user_id = $1;`,
      [session.user.id]
    );
    const existingSubs = existingRes.rows || [];
    const alreadyExists = existingSubs.some((sub) => sub.endpoint === endpoint);

    if (!alreadyExists && existingSubs.length >= MAX_SUBSCRIPTIONS_PER_USER) {
      const sortedOldestFirst = [...existingSubs].sort(
        (a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
      );
      const excessCount = existingSubs.length - (MAX_SUBSCRIPTIONS_PER_USER - 1);
      const toRemove = sortedOldestFirst.slice(0, excessCount);
      for (const oldSub of toRemove) {
        await query(
          `DELETE FROM public.push_subscriptions WHERE user_id = $1 AND endpoint = $2;`,
          [session.user.id, oldSub.endpoint]
        );
      }
    }

    // Lakukan UPSERT ke tabel push_subscriptions di Supabase
    const result = await query(
      `INSERT INTO public.push_subscriptions (user_id, endpoint, p256dh, auth, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (endpoint)
       DO UPDATE SET
         user_id = EXCLUDED.user_id,
         p256dh = EXCLUDED.p256dh,
         auth = EXCLUDED.auth,
         created_at = NOW()
       RETURNING id, endpoint, created_at;`,
      [session.user.id, endpoint, p256dh, authKey]
    );

    const saved = result.rows[0];
    return NextResponse.json(
      {
        success: true,
        subscription: saved
          ? { id: saved.id, endpoint: saved.endpoint, created_at: saved.created_at }
          : null,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/notifications/subscribe error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server saat menyimpan subscription." },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting: 20 permintaan per menit per user
    const rl = checkRateLimit(`notif_sub_del_${session.user.id}`, 20, 60000);
    if (!rl.allowed) {
      const retryAfterSec = Math.max(1, Math.ceil((rl.resetTime - Date.now()) / 1000));
      return NextResponse.json(
        { error: "Terlalu banyak permintaan penghapusan notifikasi. Silakan tunggu beberapa saat." },
        { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
      );
    }

    const body = await request.json();
    const endpoint = typeof body?.endpoint === "string" ? body.endpoint.trim() : "";

    if (!endpoint) {
      return NextResponse.json({ error: "Endpoint diperlukan" }, { status: 400 });
    }

    await query(
      `DELETE FROM public.push_subscriptions WHERE user_id = $1 AND endpoint = $2;`,
      [session.user.id, endpoint]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/notifications/subscribe error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server saat menghapus subscription." },
      { status: 500 }
    );
  }
}
