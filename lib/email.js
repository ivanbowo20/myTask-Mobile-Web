import nodemailer from "nodemailer";

let cachedTransporter = null;

function getTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    return null;
  }

  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user,
        pass,
      },
      pool: true,
      maxConnections: 3,
      maxMessages: 100,
    });
  }

  return cachedTransporter;
}

function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

function isPublicUrl(url) {
  return typeof url === "string" && url.startsWith("https://") && !url.includes("localhost");
}

function formatDisplayDate(dateString) {
  if (!dateString) return "Tidak ada tenggat waktu khusus";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat("id-ID", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: "Asia/Jakarta",
    }).format(date);
  } catch {
    return dateString;
  }
}

/**
 * Mengirim Welcome Email ke pengguna baru via Gmail SMTP (Clean Minimal Anti-Spam Template)
 */
export async function sendWelcomeEmail({ to, name = "Pengguna" }) {
  try {
    const transporter = getTransporter();
    if (!transporter) {
      console.warn("[MAIL] Kredensial GMAIL_USER atau GMAIL_APP_PASSWORD belum dikonfigurasi di .env.local.");
      return { success: false, error: "Kredensial Gmail SMTP belum dikonfigurasi." };
    }

    const appUrl = getAppUrl();
    const displayName = typeof name === "string" && name.trim() ? name.trim() : "Pengguna";
    const sender = process.env.GMAIL_USER;
    const hasPublicLink = isPublicUrl(appUrl);
    const dashboardUrl = hasPublicLink ? `${appUrl}/dashboard` : null;

    const textContent = `Halo ${displayName},

Terima kasih telah mendaftar di MyTask.

Akun Anda sudah aktif dan siap digunakan untuk merencanakan dan mengelola tugas harian Anda secara terstruktur.

Aplikasi ini dirancang fokus tanpa distraksi agar Anda dapat menuntaskan tugas prioritas satu per satu dengan tenang.

${hasPublicLink ? `Buka ruang kerja Anda: ${dashboardUrl}\n` : "Silakan buka aplikasi MyTask di peramban Anda untuk mulai mengelola tugas.\n"}
Salam hangat,
Tim MyTask
---
Email resmi dari sistem MyTask. Jika Anda merasa tidak pernah mendaftar, silakan abaikan pesan ini.`;

    const ctaHtml = hasPublicLink
      ? `<div style="margin-bottom: 28px;">
          <a href="${dashboardUrl}" style="display: inline-block; background-color: #0F172A; color: #FFFFFF; font-size: 14px; font-weight: 500; text-decoration: none; padding: 10px 20px; border-radius: 6px;">
            Buka Dashboard Tugas &rarr;
          </a>
        </div>`
      : `<div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px 16px; margin-bottom: 24px; font-size: 13px; color: #475569;">
          Silakan buka aplikasi <strong>MyTask</strong> di peramban Anda untuk mulai mengelola tugas hari ini.
        </div>`;

    const htmlContent = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Selamat Datang di MyTask</title>
</head>
<body style="margin: 0; padding: 24px 16px; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E293B; line-height: 1.6;">
  <div style="max-width: 520px; margin: 0 auto; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 32px 28px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
    
    <div style="margin-bottom: 20px;">
      <span style="font-size: 18px; font-weight: 700; color: #0F172A; letter-spacing: -0.3px;">MyTask</span>
    </div>

    <h1 style="font-size: 20px; font-weight: 600; color: #0F172A; margin: 0 0 16px 0; line-height: 1.4;">
      Selamat Datang, ${displayName}.
    </h1>

    <p style="font-size: 15px; color: #334155; margin: 0 0 16px 0;">
      Terima kasih telah mendaftar. Ruang kerja personal Anda telah aktif dan siap digunakan untuk merencanakan target harian Anda.
    </p>

    <p style="font-size: 15px; color: #334155; margin: 0 0 24px 0;">
      Aplikasi ini dirancang fokus tanpa distraksi agar Anda dapat menuntaskan tugas prioritas satu per satu dengan tenang.
    </p>

    ${ctaHtml}

    <p style="font-size: 14px; color: #64748B; margin: 0 0 4px 0;">
      Salam hangat,
    </p>
    <p style="font-size: 14px; font-weight: 500; color: #334155; margin: 0 0 24px 0;">
      Tim MyTask
    </p>

    <div style="border-top: 1px solid #F1F5F9; padding-top: 16px;">
      <p style="font-size: 12px; color: #94A3B8; margin: 0; line-height: 1.5;">
        Email ini dikirimkan otomatis karena akun Anda terdaftar di MyTask.<br>
        Jika Anda tidak merasa mendaftar, silakan abaikan pesan ini.
      </p>
    </div>

  </div>
</body>
</html>`;

    const info = await transporter.sendMail({
      from: `"MyTask" <${sender}>`,
      to: to,
      replyTo: sender,
      subject: `Selamat Datang di MyTask, ${displayName}`,
      text: textContent,
      html: htmlContent,
      headers: {
        "X-Entity-Ref-ID": `welcome-${Date.now()}`,
      },
    });

    console.log(`[MAIL] Welcome email berhasil terkirim via Gmail SMTP ke ${to} (MessageId: ${info?.messageId})`);
    return { success: true, messageId: info?.messageId };
  } catch (error) {
    console.error("[MAIL] Gagal mengirim Welcome email via Gmail SMTP:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Mengirim Notifikasi Email saat Tugas Bertanda Penting dibuat (Clean Minimal Anti-Spam Template)
 */
export async function sendImportantTaskCreatedEmail({ to, taskTitle, deadline, deskripsi }) {
  try {
    const transporter = getTransporter();
    if (!transporter) {
      console.warn("[MAIL] Kredensial GMAIL_USER atau GMAIL_APP_PASSWORD belum dikonfigurasi di .env.local.");
      return { success: false, error: "Kredensial Gmail SMTP belum dikonfigurasi." };
    }

    const appUrl = getAppUrl();
    const formattedDeadline = formatDisplayDate(deadline);
    const safeTitle = typeof taskTitle === "string" ? taskTitle : "Tugas Tanpa Judul";
    const safeDeskripsi =
      typeof deskripsi === "string" && deskripsi.trim()
        ? deskripsi.trim()
        : "Tidak ada catatan tambahan.";
    const sender = process.env.GMAIL_USER;
    const hasPublicLink = isPublicUrl(appUrl);
    const dashboardUrl = hasPublicLink ? `${appUrl}/tugas/penting` : null;

    const textContent = `Pengingat Tugas Prioritas: ${safeTitle}

Tenggat Waktu: ${formattedDeadline}
Catatan: ${safeDeskripsi}

Tugas ini ditandai sebagai prioritas penting dan telah tercatat di MyTask.

${hasPublicLink ? `Buka daftar tugas: ${dashboardUrl}\n` : "Silakan buka aplikasi MyTask di peramban Anda untuk melihat detail tugas.\n"}
Salam,
Tim MyTask`;

    const ctaHtml = hasPublicLink
      ? `<div style="margin-bottom: 24px;">
          <a href="${dashboardUrl}" style="display: inline-block; background-color: #0F172A; color: #FFFFFF; font-size: 13px; font-weight: 500; text-decoration: none; padding: 10px 18px; border-radius: 6px;">
            Lihat Tugas di Dashboard &rarr;
          </a>
        </div>`
      : `<div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; font-size: 13px; color: #475569;">
          Silakan buka aplikasi <strong>MyTask</strong> di peramban Anda untuk melihat daftar tugas.
        </div>`;

    const htmlContent = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tugas Penting Baru</title>
</head>
<body style="margin: 0; padding: 24px 16px; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E293B; line-height: 1.6;">
  <div style="max-width: 520px; margin: 0 auto; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 32px 28px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
    
    <div style="margin-bottom: 16px;">
      <span style="display: inline-block; background-color: #FEF2F2; color: #DC2626; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; padding: 4px 8px; border-radius: 4px; border: 1px solid #FEE2E2;">
        Tugas Prioritas Tinggi
      </span>
    </div>

    <h1 style="font-size: 19px; font-weight: 600; color: #0F172A; margin: 0 0 16px 0; line-height: 1.4;">
      ${safeTitle}
    </h1>

    <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
      <div style="font-size: 12px; font-weight: 600; color: #64748B; text-transform: uppercase; margin-bottom: 4px;">
        Tenggat Waktu
      </div>
      <div style="font-size: 14px; font-weight: 600; color: #D97706; margin-bottom: 12px;">
        ${formattedDeadline}
      </div>
      <div style="font-size: 12px; font-weight: 600; color: #64748B; text-transform: uppercase; margin-bottom: 4px;">
        Catatan
      </div>
      <div style="font-size: 13px; color: #334155; line-height: 1.5;">
        ${safeDeskripsi}
      </div>
    </div>

    <p style="font-size: 14px; color: #475569; margin: 0 0 20px 0;">
      Tugas ini telah tercatat di akun MyTask Anda dan siap untuk ditindaklanjuti.
    </p>

    ${ctaHtml}

    <div style="border-top: 1px solid #F1F5F9; padding-top: 16px;">
      <p style="font-size: 12px; color: #94A3B8; margin: 0;">
        Pemberitahuan otomatis dari sistem MyTask.
      </p>
    </div>

  </div>
</body>
</html>`;

    const info = await transporter.sendMail({
      from: `"MyTask" <${sender}>`,
      to: to,
      replyTo: sender,
      subject: `Tugas Prioritas: ${safeTitle}`,
      text: textContent,
      html: htmlContent,
      headers: {
        "X-Entity-Ref-ID": `task-${Date.now()}`,
      },
    });

    console.log(`[MAIL] Email tugas penting berhasil terkirim via Gmail SMTP ke ${to} (MessageId: ${info?.messageId})`);
    return { success: true, messageId: info?.messageId };
  } catch (error) {
    console.error("[MAIL] Gagal mengirim email tugas penting via Gmail SMTP:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Mengirim Email Evaluasi Paruh Bulan (Clean Minimal Anti-Spam Template)
 */
export async function sendMidMonthReminderEmail({ to, name = "Pengguna", pendingCount = 1, sampleTasks = [] }) {
  try {
    const transporter = getTransporter();
    if (!transporter) {
      console.warn("[MAIL] Kredensial GMAIL_USER atau GMAIL_APP_PASSWORD belum dikonfigurasi di .env.local.");
      return { success: false, error: "Kredensial Gmail SMTP belum dikonfigurasi." };
    }

    if (!pendingCount || pendingCount <= 0) {
      console.log(`[MAIL] Pengguna ${to} tidak memiliki tugas tertunda. Melewati pengiriman email.`);
      return { success: true, skipped: true };
    }

    const appUrl = getAppUrl();
    const displayName = typeof name === "string" && name.trim() ? name.trim() : "Pengguna";
    const sender = process.env.GMAIL_USER;
    const hasPublicLink = isPublicUrl(appUrl);
    const dashboardUrl = hasPublicLink ? `${appUrl}/dashboard` : null;

    let tasksListText = "";
    let tasksListHtml = "";
    if (Array.isArray(sampleTasks) && sampleTasks.length > 0) {
      tasksListText = sampleTasks.slice(0, 3).map((t) => `- ${t.judul || "Tugas"}: ${t.deadline ? formatDisplayDate(t.deadline) : "Tanpa tenggat waktu"}`).join("\n");
      
      const rows = sampleTasks.slice(0, 3).map((t) => `
        <li style="margin-bottom: 8px;">
          <strong>${t.judul || "Tugas"}</strong> — <span style="color: #D97706;">${t.deadline ? formatDisplayDate(t.deadline) : "Tanpa tenggat waktu"}</span>
        </li>
      `).join("");

      tasksListHtml = `<ul style="font-size: 14px; color: #334155; padding-left: 20px; margin: 12px 0 20px 0;">${rows}</ul>`;
    }

    const textContent = `Evaluasi Paruh Bulan MyTask

Halo ${displayName}, bulan ini sudah berjalan separuh.
Saat ini ada ${pendingCount} tugas aktif yang masih menanti di akun MyTask Anda:

${tasksListText}

${hasPublicLink ? `Tinjau tugas Anda: ${dashboardUrl}\n` : "Silakan buka aplikasi MyTask di peramban Anda untuk meninjau tugas.\n"}
Salam hangat,
Tim MyTask`;

    const ctaHtml = hasPublicLink
      ? `<div style="margin-bottom: 24px;">
          <a href="${dashboardUrl}" style="display: inline-block; background-color: #0F172A; color: #FFFFFF; font-size: 13px; font-weight: 500; text-decoration: none; padding: 10px 18px; border-radius: 6px;">
            Buka Dashboard &rarr;
          </a>
        </div>`
      : `<div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; font-size: 13px; color: #475569;">
          Silakan buka aplikasi <strong>MyTask</strong> di peramban Anda untuk meninjau tugas.
        </div>`;

    const htmlContent = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Evaluasi Paruh Bulan</title>
</head>
<body style="margin: 0; padding: 24px 16px; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E293B; line-height: 1.6;">
  <div style="max-width: 520px; margin: 0 auto; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 32px 28px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
    
    <div style="margin-bottom: 20px;">
      <span style="font-size: 18px; font-weight: 700; color: #0F172A; letter-spacing: -0.3px;">MyTask</span>
    </div>

    <h1 style="font-size: 19px; font-weight: 600; color: #0F172A; margin: 0 0 16px 0; line-height: 1.4;">
      Evaluasi Paruh Bulan
    </h1>

    <p style="font-size: 15px; color: #334155; margin: 0 0 16px 0;">
      Halo ${displayName}, bulan ini sudah berjalan separuh. Ada <strong>${pendingCount} tugas aktif</strong> yang masih menanti Anda:
    </p>

    ${tasksListHtml}

    <p style="font-size: 14px; color: #475569; margin: 0 0 20px 0;">
      Luangkan waktu 5 menit untuk meninjau kembali daftar prioritas Anda di dashboard.
    </p>

    ${ctaHtml}

    <div style="border-top: 1px solid #F1F5F9; padding-top: 16px;">
      <p style="font-size: 12px; color: #94A3B8; margin: 0;">
        Pemberitahuan otomatis dari sistem MyTask.
      </p>
    </div>

  </div>
</body>
</html>`;

    const info = await transporter.sendMail({
      from: `"MyTask" <${sender}>`,
      to: to,
      replyTo: sender,
      subject: `Evaluasi Paruh Bulan: ${pendingCount} Tugas Menanti Anda`,
      text: textContent,
      html: htmlContent,
      headers: {
        "X-Entity-Ref-ID": `midmonth-${Date.now()}`,
      },
    });

    console.log(`[MAIL] Mid-month email berhasil terkirim via Gmail SMTP ke ${to} (MessageId: ${info?.messageId})`);
    return { success: true, messageId: info?.messageId };
  } catch (error) {
    console.error("[MAIL] Gagal mengirim Mid-month email via Gmail SMTP:", error);
    return { success: false, error: error.message };
  }
}
