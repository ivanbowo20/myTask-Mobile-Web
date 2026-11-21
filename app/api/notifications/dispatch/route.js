import { NextResponse } from "next/server";
import crypto from "crypto";
import webpush from "web-push";
import { query } from "@/lib/db";
import { formatTanggal } from "@/lib/utils";
import { auth } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  isReengagementScheduleWindow,
  getReengagementMessage,
} from "@/lib/notifications/reengagement";

export const dynamic = "force-dynamic";

async function dispatchReengagementNotifications({ force = false } = {}) {
  const shouldRun = force || isReengagementScheduleWindow(new Date());
  if (!shouldRun) {
    return { triggered: false, sent: 0, message: null };
  }

  const msg = getReengagementMessage(new Date());

  // Idempotency check: hanya kirim ke pengguna yang belum menerima ajakan hari ini (WIB)
  const eligibleUsersSql = `
    SELECT DISTINCT ps.user_id 
    FROM public.push_subscriptions ps
    WHERE NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.user_id = ps.user_id
        AND n.tipe = 'reengagement'
        AND n.dibuat_pada >= (date_trunc('day', NOW() AT TIME ZONE 'Asia/Jakarta') AT TIME ZONE 'Asia/Jakarta')
    );
  `;

  const eligibleResult = await query(eligibleUsersSql);
  const eligibleUsers = eligibleResult.rows;

  let totalReengageSent = 0;

  const payload = JSON.stringify({
    title: msg.title,
    body: msg.body,
    url: "/dashboard",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: `reengagement-${msg.id}`,
  });

  await Promise.allSettled(
    eligibleUsers.map(async (row) => {
      try {
        const subsResult = await query(
          `SELECT id, endpoint, p256dh, auth 
           FROM public.push_subscriptions 
           WHERE user_id = $1;`,
          [row.user_id]
        );

        await Promise.allSettled(
          subsResult.rows.map(async (sub) => {
            const pushSubscription = {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            };

            try {
              await webpush.sendNotification(pushSubscription, payload);
              totalReengageSent++;
            } catch (pushErr) {
              console.error(`[DISPATCH-REENGAGE] Gagal kirim ke sub ${sub.id}:`, pushErr.message);
              if (pushErr.statusCode === 404 || pushErr.statusCode === 410) {
                await query(`DELETE FROM public.push_subscriptions WHERE id = $1;`, [sub.id]).catch(() => {});
              }
            }
          })
        );

        // Catat riwayat ke in-app notification center
        try {
          await query(
            `INSERT INTO public.notifications (user_id, task_id, tipe, judul, pesan, dibuat_pada)
             VALUES ($1, NULL, 'reengagement', $2, $3, NOW());`,
            [row.user_id, msg.title, msg.body]
          );
        } catch (notifErr) {
          console.warn(`[DISPATCH-REENGAGE] Gagal insert log notifications:`, notifErr.message);
        }
      } catch (userErr) {
        console.error(`[DISPATCH-REENGAGE] Error saat memproses user ${row.user_id}:`, userErr);
      }
    })
  );

  return {
    triggered: true,
    sent: totalReengageSent,
    messageId: msg.id,
    title: msg.title,
    eligibleUsers: eligibleUsers.length,
  };
}

export async function handleDispatch(request, options = {}) {
  const { scopedUserId = null, allowReengagement = true } = options || {};

  try {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;

    if (!publicKey || !privateKey || publicKey.startsWith("YOUR_") || privateKey.startsWith("YOUR_")) {
      return NextResponse.json(
        { error: "Kunci VAPID belum dikonfigurasi di server." },
        { status: 500 }
      );
    }

    const subject = "mailto:admin@mytask.local";
    webpush.setVapidDetails(subject, publicKey, privateKey);

    // Parse parameter query hanya jika pemanggil berhak menjalankan re-engagement (cron)
    let forceReengage = false;
    if (allowReengagement && request?.url) {
      try {
        const parsedUrl = new URL(request.url);
        forceReengage = parsedUrl.searchParams.get("force_reengage") === "true";
      } catch {
        // Abaikan jika URL tidak valid
      }
    }

    const userFilterClause = scopedUserId ? "AND t.user_id = $1" : "";
    const queryParams = scopedUserId ? [scopedUserId] : [];

    // 1. Kunci dan tandai tugas secara atomik (Two-Phase Notification: Reminder & Deadline Habis)
    const reserveTasksSql = `
      WITH eligible_tasks AS (
        SELECT 
          t.id,
          t.user_id,
          t.judul,
          t.deskripsi,
          t.deadline,
          t.reminder,
          CASE 
            WHEN t.deadline <= NOW() AND t.deadline_sent = false THEN 'deadline'
            WHEN t.deadline > NOW() AND t.reminder_sent = false THEN 'reminder'
            ELSE NULL
          END AS notif_type
        FROM public.tasks t
        WHERE t.selesai = false
          AND t.deleted_at IS NULL
          ${userFilterClause}
          AND t.deadline IS NOT NULL
          AND t.deadline >= NOW() - INTERVAL '3 days'
          AND (
            -- Kondisi 1: Deadline Habis belum dikirim
            (t.deadline_sent = false AND t.deadline <= NOW())
            OR
            -- Kondisi 2: Reminder Pra-Tenggat belum dikirim
            (
              t.reminder_sent = false
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
              AND t.deadline > NOW()
            )
          )
        ORDER BY t.deadline ASC
        LIMIT 50
        FOR UPDATE SKIP LOCKED
      )
      UPDATE public.tasks t
      SET 
        reminder_sent = CASE 
          WHEN et.notif_type = 'reminder' THEN true 
          WHEN et.notif_type = 'deadline' THEN true 
          ELSE t.reminder_sent 
        END,
        deadline_sent = CASE 
          WHEN et.notif_type = 'deadline' THEN true 
          ELSE t.deadline_sent 
        END
      FROM eligible_tasks et
      WHERE t.id = et.id
      RETURNING t.id, t.user_id, t.judul, t.deskripsi, t.deadline, t.reminder, et.notif_type;
    `;

    const tasksResult = await query(reserveTasksSql, queryParams);
    const tasks = tasksResult.rows;

    let totalSent = 0;
    const processedTaskIds = [];

    // 2. Kirim notifikasi secara paralel (High-Concurrency Promise.allSettled)
    await Promise.allSettled(
      tasks.map(async (task) => {
        try {
          // Ambil seluruh push subscriptions aktif milik user pemilik tugas
          const subsResult = await query(
            `SELECT id, endpoint, p256dh, auth 
             FROM public.push_subscriptions 
             WHERE user_id = $1;`,
            [task.user_id]
          );

          const formattedDeadline = formatTanggal(task.deadline);
          const isDeadline = task.notif_type === "deadline";

          const title = isDeadline
            ? `Waktu Habis: ${task.judul}`
            : `Pengingat: ${task.judul}`;

          const body = isDeadline
            ? `Tenggat waktu (${formattedDeadline}) telah tiba sekarang! Segera kerjakan dan selesaikan tugas ini.`
            : `Tenggat waktu: ${formattedDeadline}. Jangan lupa selesaikan tugas Anda!`;

          const tag = isDeadline
            ? `task-deadline-${task.id}`
            : `task-reminder-${task.id}`;

          const payload = JSON.stringify({
            title,
            body,
            url: "/dashboard",
            icon: "/favicon.ico",
            tag,
          });

          // Kirim web-push serentak ke seluruh perangkat terdaftar milik user
          await Promise.allSettled(
            subsResult.rows.map(async (sub) => {
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
            })
          );

          // Catat juga entri ke tabel public.notifications agar tersinkronisasi di in-app notification center
          try {
            await query(
              `INSERT INTO public.notifications (user_id, task_id, tipe, judul, pesan, dibuat_pada)
               VALUES ($1, $2, $3, $4, $5, NOW());`,
              [
                task.user_id,
                task.id,
                isDeadline ? "deadline" : "reminder",
                title,
                body,
              ]
            );
          } catch (notifErr) {
            console.warn(`[DISPATCH] Gagal insert log notifications:`, notifErr.message);
          }

          processedTaskIds.push(task.id);
        } catch (taskErr) {
          console.error(`[DISPATCH] Error saat memproses task ${task?.id}:`, taskErr);
        }
      })
    );

    // Jalankan sub-rutin notifikasi ajakan berkala hanya untuk pemanggilan cron/internal (bukan sesi user tunggal)
    let reengageResult = { triggered: false, sent: 0 };
    if (allowReengagement && !scopedUserId) {
      try {
        reengageResult = await dispatchReengagementNotifications({ force: forceReengage });
      } catch (reengageErr) {
        console.error("[DISPATCH] Gagal memproses re-engagement notifications:", reengageErr);
      }
    }

    return NextResponse.json({
      success: true,
      sent: totalSent + (reengageResult.sent || 0),
      processed: processedTaskIds.length,
      reengagement: reengageResult,
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
    const rawSecret = process.env.CRON_SECRET;
    if (typeof rawSecret !== "string") {
      return false;
    }

    const cronSecret = rawSecret.trim();
    if (!cronSecret || /^YOUR_[A-Z0-9_]+_HERE$/i.test(cronSecret)) {
      return false;
    }

    // Fail-closed: hanya izinkan header Authorization: Bearer <CRON_SECRET>
    const authHeader = request.headers.get("authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return false;
    }

    const expectedBuf = Buffer.from(`Bearer ${cronSecret}`);
    const providedBuf = Buffer.from(authHeader);
    if (expectedBuf.length !== providedBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuf, providedBuf);
  } catch {
    return false;
  }
}

async function authorizeAndDispatch(request) {
  try {
    if (validateCronAuth(request)) {
      return handleDispatch(request, {
        scopedUserId: null,
        allowReengagement: true,
      });
    }

    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Tolak parameter force_reengage untuk pemanggil non-cron guna mencegah broadcast lintas-akun
    if (request?.url) {
      try {
        const parsedUrl = new URL(request.url);
        if (parsedUrl.searchParams.has("force_reengage")) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      } catch {
        return NextResponse.json({ error: "Bad Request" }, { status: 400 });
      }
    }

    // Rate limiting per akun untuk passive dispatch dari klien
    const rl = checkRateLimit(`notif_dispatch_${session.user.id}`, 12, 60000);
    if (!rl.allowed) {
      const retryAfterSec = Math.max(1, Math.ceil((rl.resetTime - Date.now()) / 1000));
      return NextResponse.json(
        { error: "Terlalu banyak permintaan pemeriksaan notifikasi. Silakan tunggu beberapa saat." },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfterSec),
          },
        }
      );
    }

    // Kunci ketat hanya untuk tugas milik user aktif & nonaktifkan broadcast re-engagement
    return handleDispatch(request, {
      scopedUserId: session.user.id,
      allowReengagement: false,
    });
  } catch (error) {
    console.error("[DISPATCH] Gagal memverifikasi akses dispatch:", error);
    return NextResponse.json(
      { error: "Gagal memproses dispatch notifikasi." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  return authorizeAndDispatch(request);
}

export async function GET(request) {
  return authorizeAndDispatch(request);
}
