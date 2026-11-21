import { NextResponse } from "next/server";
import webpush from "web-push";
import { auth } from "@/lib/auth";
import { query } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting: maksimal 5 tes notifikasi per menit per user
    const rl = checkRateLimit(`notif_test_${session.user.id}`, 5, 60000);
    if (!rl.allowed) {
      const retryAfterSec = Math.max(1, Math.ceil((rl.resetTime - Date.now()) / 1000));
      return NextResponse.json(
        { error: "Terlalu banyak permintaan tes notifikasi. Silakan tunggu beberapa saat." },
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

    // Ambil subscription aktif pengguna dari database Supabase
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
        { error: "Perangkat belum terdaftar. Silakan klik 'Aktifkan Notifikasi' terlebih dahulu." },
        { status: 404 }
      );
    }

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
      title: "Notifikasi MyTask Aktif!",
      body: "Pengingat tenggat waktu tugas Anda sekarang berhasil tersambung ke perangkat ini.",
      url: "/dashboard",
      icon: "/favicon.ico",
    });

    try {
      await webpush.sendNotification(pushSubscription, payload);
    } catch (pushErr) {
      console.error("[WEB-PUSH] Error saat mengirim tes notifikasi:", pushErr);

      // Jika subscription sudah expired / uninstalled di browser (status 404 atau 410)
      if (pushErr.statusCode === 404 || pushErr.statusCode === 410) {
        await query(
          `DELETE FROM public.push_subscriptions WHERE id = $1;`,
          [subRow.id]
        );
        return NextResponse.json(
          { error: "Izin perangkat telah kadaluarsa atau direset. Silakan aktifkan ulang notifikasi." },
          { status: 410 }
        );
      }

      return NextResponse.json(
        { error: "Gagal mengirim notifikasi ke perangkat Anda." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Notifikasi tes berhasil dikirim ke perangkat Anda!",
    });
  } catch (error) {
    console.error("POST /api/notifications/test error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server saat memproses tes notifikasi." },
      { status: 500 }
    );
  }
}
