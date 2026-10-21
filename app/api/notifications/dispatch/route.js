import { NextResponse } from "next/server";
import crypto from "crypto";
import webpush from "web-push";
import { query } from "@/lib/db";
import { formatTanggal } from "@/lib/utils";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function handleDispatch() {
  try {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;

    if (!publicKey || !privateKey) {
      return NextResponse.json(
        { error: "Kunci VAPID belum dikonfigurasi di server." },
        { status: 500 }
      );
    }

    const subject = "mailto:admin@mytask.local";
    webpush.setVapidDetails(subject, publicKey, privateKey);

    // 1. Cari tugas aktif yang belum dikirimi reminder dan waktu deadline-nya telah memenuhi syarat reminder
    const findTasksSql = `
      SELECT 
        t.id, 
        t.user_id, 
        t.judul, 
        t.deskripsi, 
        t.deadline, 
        t.reminder
      FROM public.tasks t
      WHERE t.selesai = false
        AND t.reminder_sent = false
        AND t.deadline IS NOT NULL
        AND (
          CASE t.reminder
            WHEN '15m' THEN t.deadline - INTERVAL '15 minutes'
            WHEN '30m' THEN t.deadline - INTERVAL '30 minutes'
            WHEN '1h'  THEN t.deadline - INTERVAL '1 hour'
            WHEN '3h'  THEN t.deadline - INTERVAL '3 hours'
            WHEN '6h'  THEN t.deadline - INTERVAL '6 hours'
            WHEN '1d'  THEN t.deadline - INTERVAL '1 day'
            ELSE t.deadline - INTERVAL '15 minutes'
          END
        ) <= NOW()
        AND t.deadline >= NOW() - INTERVAL '3 days'
      ORDER BY t.deadline ASC
      LIMIT 50;
    `;

    const tasksResult = await query(findTasksSql);
    const tasks = tasksResult.rows;

    let totalSent = 0;
    const processedTaskIds = [];

    // 2. Loop setiap tugas yang perlu dikirimi pengingat
    for (const task of tasks) {
      // Ambil seluruh push subscriptions aktif milik user pemilik tugas
      const subsResult = await query(
        `SELECT id, endpoint, p256dh, auth 
         FROM public.push_subscriptions 
         WHERE user_id = $1;`,
        [task.user_id]
      );

      const formattedDeadline = formatTanggal(task.deadline);
      const payload = JSON.stringify({
        title: `⏰ Pengingat: ${task.judul}`,
        body: `Tenggat waktu: ${formattedDeadline}. Jangan lupa selesaikan tugas Anda!`,
        url: "/dashboard",
        icon: "/favicon.ico",
        tag: `task-reminder-${task.id}`,
      });

      // Kirim web-push ke seluruh perangkat terdaftar
      for (const sub of subsResult.rows) {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        try {
          await webpush.sendNotification(pushSubscription, payload);
          totalSent++;
        } catch (pushErr) {
          console.error(`[DISPATCH] Gagal kirim web-push ke sub ${sub.id}:`, pushErr.message);

          // Bersihkan subscription jika perangkat sudah kadaluarsa atau direset di browser (404 / 410)
          if (pushErr.statusCode === 404 || pushErr.statusCode === 410) {
            await query(`DELETE FROM public.push_subscriptions WHERE id = $1;`, [sub.id]).catch(() => {});
          }
        }
      }

      // Catat juga entri ke tabel public.notifications agar tersinkronisasi di in-app notification center
      try {
        await query(
          `INSERT INTO public.notifications (user_id, task_id, tipe, judul, pesan, dibuat_pada)
           VALUES ($1, $2, 'reminder', $3, $4, NOW());`,
          [
            task.user_id,
            task.id,
            `Pengingat: ${task.judul}`,
            `Tenggat waktu tugas pada ${formattedDeadline}`,
          ]
        );
      } catch (notifErr) {
        console.warn(`[DISPATCH] Gagal insert log notifications:`, notifErr.message);
      }

      // 3. Update status tugas menjadi reminder_sent = true agar tidak dikirim berulang kali
      await query(
        `UPDATE public.tasks SET reminder_sent = true WHERE id = $1;`,
        [task.id]
      );

      processedTaskIds.push(task.id);
    }

    return NextResponse.json({
      success: true,
      sent: totalSent,
      processed: processedTaskIds.length,
    });
  } catch (error) {
    console.error("[DISPATCH] Terjadi kesalahan pada dispatcher notifikasi:", error);
    return NextResponse.json(
      { error: "Gagal memproses dispatch notifikasi." },
      { status: 500 }
    );
  }
}

function validateCronAuth(request) {
  try {
    if (!process.env.CRON_SECRET) {
      return false;
    }

    const authHeader = request.headers.get("authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return false;
    }

    const expectedSecret = `Bearer ${process.env.CRON_SECRET}`;
    const providedSecret = authHeader;

    // Pastikan panjang string sama sebelum compare (wajib untuk timingSafeEqual)
    const isLengthMatch = expectedSecret.length === providedSecret.length;

    return (
      isLengthMatch &&
      crypto.timingSafeEqual(
        Buffer.from(expectedSecret),
        Buffer.from(providedSecret)
      )
    );
  } catch (err) {
    return false;
  }
}

export async function POST(request) {
  const isCron = validateCronAuth(request);
  if (!isCron) {
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    if (!session?.user) {
      return new Response("Unauthorized", { status: 401 });
    }
  }
  return handleDispatch();
}

export async function GET(request) {
  const isCron = validateCronAuth(request);
  if (!isCron) {
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    if (!session?.user) {
      return new Response("Unauthorized", { status: 401 });
    }
  }
  return handleDispatch();
}
