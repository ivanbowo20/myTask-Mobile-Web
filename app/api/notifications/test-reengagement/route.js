import { NextResponse } from "next/server";
import webpush from "web-push";
import { auth } from "@/lib/auth";
import { query } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  REENGAGEMENT_MESSAGES,
  getReengagementMessage,
} from "@/lib/notifications/reengagement";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting: maksimal 5 tes notifikasi ajakan per menit per user
    const rl = checkRateLimit(`notif_test_reengage_${session.user.id}`, 5, 60000);
    if (!rl.allowed) {
      const retryAfterSec = Math.max(1, Math.ceil((rl.resetTime - Date.now()) / 1000));
      return NextResponse.json(
        { error: "Terlalu banyak permintaan tes notifikasi ajakan. Silakan tunggu beberapa saat." },
        { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
      );
    }

    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;

    if (!publicKey || !privateKey || publicKey.startsWith("YOUR_") || privateKey.startsWith("YOUR_")) {
      return NextResponse.json(
        { error: "Kunci VAPID belum dikonfigurasi di server." },
        { status: 500 }
      );
    }

    // Ambil subscription aktif pengguna
    const result = await query(
      `SELECT id, endpoint, p256dh, auth 
       FROM public.push_subscriptions 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 1;`,
      [session.user.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          error:
            "Perangkat belum terdaftar untuk menerima notifikasi. Silakan klik 'Aktifkan Notifikasi' terlebih dahulu.",
        },
        { status: 404 }
      );
    }

    // Parse opsi body jika ingin menguji variasi indeks tertentu (1..6)
    let requestedIndex = null;
    try {
      const body = await request.json().catch(() => ({}));
      if (body && typeof body.index === "number" && body.index >= 1 && body.index <= 6) {
        requestedIndex = body.index;
      }
    } catch {
      // Abaikan jika body kosong
    }

    const selectedMessage = requestedIndex
      ? REENGAGEMENT_MESSAGES[requestedIndex - 1]
      : getReengagementMessage(new Date());

    const subRow = result.rows[0];
    const pushSubscription = {
      endpoint: subRow.endpoint,
      keys: {
        p256dh: subRow.p256dh,
        auth: subRow.auth,
      },
    };

    const subject = "mailto:admin@mytask.local";
    webpush.setVapidDetails(subject, publicKey, privateKey);

    const payload = JSON.stringify({
      title: selectedMessage.title,
      body: selectedMessage.body,
      url: "/dashboard",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: `reengagement-test-${selectedMessage.id}`,
    });

    try {
      await webpush.sendNotification(pushSubscription, payload);
    } catch (pushErr) {
      console.error("[WEB-PUSH] Error saat mengirim tes ajakan:", pushErr);

      if (pushErr.statusCode === 404 || pushErr.statusCode === 410) {
        await query(
          `DELETE FROM public.push_subscriptions WHERE id = $1;`,
          [subRow.id]
        ).catch(() => {});

        return NextResponse.json(
          {
            error:
              "Izin perangkat telah kadaluarsa atau direset. Silakan aktifkan ulang notifikasi di browser.",
          },
          { status: 410 }
        );
      }

      return NextResponse.json(
        { error: "Gagal mengirim notifikasi ke perangkat Anda." },
        { status: 500 }
      );
    }

    // Simpan ke log notifications in-app
    try {
      await query(
        `INSERT INTO public.notifications (user_id, task_id, tipe, judul, pesan, dibuat_pada)
         VALUES ($1, NULL, 'reengagement', $2, $3, NOW());`,
        [session.user.id, selectedMessage.title, selectedMessage.body]
      );
    } catch (dbErr) {
      console.warn("[TEST-REENGAGEMENT] Gagal insert log notifications:", dbErr.message);
    }

    return NextResponse.json({
      success: true,
      message: `Notifikasi ajakan (#${selectedMessage.id}: ${selectedMessage.title}) berhasil dikirim ke perangkat!`,
      item: selectedMessage,
    });
  } catch (error) {
    console.error("POST /api/notifications/test-reengagement error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server saat memproses tes notifikasi ajakan." },
      { status: 500 }
    );
  }
}
