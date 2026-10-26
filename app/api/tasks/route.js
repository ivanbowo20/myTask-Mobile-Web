import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { query } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { sendImportantTaskCreatedEmail } from "@/lib/email";
import { handleDispatch } from "@/app/api/notifications/dispatch/route";

function getReminderOffsetMs(reminder) {
  switch (reminder) {
    case "30m":
      return 30 * 60 * 1000;
    case "1h":
      return 60 * 60 * 1000;
    case "3h":
      return 3 * 60 * 60 * 1000;
    case "6h":
      return 6 * 60 * 60 * 1000;
    case "1d":
      return 24 * 60 * 60 * 1000;
    case "15m":
    default:
      return 15 * 60 * 1000;
  }
}

const MAX_JUDUL_LENGTH = 255;
const MAX_DESKRIPSI_LENGTH = 2000;
const MAX_REMINDER_LENGTH = 100;

function parseSafeIsoDate(val) {
  if (val === null || val === undefined || val === "") {
    return { valid: true, value: null };
  }
  const d = new Date(val);
  if (isNaN(d.getTime())) {
    return { valid: false, value: null };
  }
  return { valid: true, value: d.toISOString() };
}

function mapRowToTask(row) {
  const parseDbDate = (d) => {
    if (!d) return null;
    const dateObj = new Date(d);
    return isNaN(dateObj.getTime()) ? null : dateObj.toISOString();
  };

  return {
    id: Number(row.id),
    userId: row.user_id,
    kategoriId: row.kategori_id ? Number(row.kategori_id) : null,
    judul: row.judul,
    deskripsi: row.deskripsi || "",
    deadline: parseDbDate(row.deadline),
    prioritas: Boolean(row.prioritas),
    selesai: Boolean(row.selesai),
    reminder: row.reminder || null,
    dibuatPada: parseDbDate(row.dibuat_pada) || new Date().toISOString(),
    selesaiPada: parseDbDate(row.selesai_pada),
  };
}

export async function GET(request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");
    const offsetParam = searchParams.get("offset");

    let querySql = `SELECT * FROM public.tasks WHERE user_id = $1 ORDER BY dibuat_pada DESC`;
    const queryParams = [session.user.id];

    if (limitParam !== null) {
      const parsedLimit = Math.min(Math.max(1, parseInt(limitParam, 10) || 50), 300);
      queryParams.push(parsedLimit);
      querySql += ` LIMIT $${queryParams.length}`;

      if (offsetParam !== null) {
        const parsedOffset = Math.max(0, parseInt(offsetParam, 10) || 0);
        queryParams.push(parsedOffset);
        querySql += ` OFFSET $${queryParams.length}`;
      }
    } else {
      // Safe default cap to prevent memory exhaustion on massive historical data
      queryParams.push(300);
      querySql += ` LIMIT $${queryParams.length}`;
    }

    const result = await query(querySql, queryParams);

    const tasks = result.rows.map(mapRowToTask);
    return NextResponse.json({ tasks });
  } catch (error) {
    console.error("GET /api/tasks error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server. Silakan coba lagi nanti." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Perlindungan rate limiting untuk mutasi tambah tugas
    const rl = checkRateLimit(`task_post_${session.user.id}`, 60, 60000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Terlalu banyak permintaan. Silakan tunggu beberapa saat." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const {
      judul,
      deskripsi = "",
      deadline = null,
      reminder = null,
      kategoriId = null,
      prioritas = false,
      selesai = false,
    } = body;

    // Validasi judul wajib & batas karakter
    if (!judul || typeof judul !== "string" || !judul.trim()) {
      return NextResponse.json({ error: "Judul tugas wajib diisi" }, { status: 400 });
    }
    const cleanJudul = judul.trim();
    if (cleanJudul.length > MAX_JUDUL_LENGTH) {
      return NextResponse.json(
        { error: `Judul tugas maksimal ${MAX_JUDUL_LENGTH} karakter` },
        { status: 400 }
      );
    }

    // Validasi batas panjang deskripsi
    const cleanDeskripsi = typeof deskripsi === "string" ? deskripsi.trim() : "";
    if (cleanDeskripsi.length > MAX_DESKRIPSI_LENGTH) {
      return NextResponse.json(
        { error: `Deskripsi tugas maksimal ${MAX_DESKRIPSI_LENGTH} karakter` },
        { status: 400 }
      );
    }

    // Validasi format tanggal deadline
    const parsedDeadline = parseSafeIsoDate(deadline);
    if (!parsedDeadline.valid) {
      return NextResponse.json(
        { error: "Format tanggal tenggat waktu tidak valid" },
        { status: 400 }
      );
    }

    // Validasi tenggat waktu tidak boleh berada di masa lalu (buffer 2 menit toleransi latency)
    if (parsedDeadline.value) {
      const deadlineTimestamp = new Date(parsedDeadline.value).getTime();
      const minimumAllowedTime = Date.now() - 120000;
      if (deadlineTimestamp < minimumAllowedTime) {
        return NextResponse.json(
          { error: "Tenggat waktu tidak boleh berada di masa lalu" },
          { status: 400 }
        );
      }
    }

    // Validasi reminder
    let cleanReminder = null;
    if (reminder) {
      cleanReminder = String(reminder).trim().slice(0, MAX_REMINDER_LENGTH);
    }

    // Validasi format kategoriId
    let cleanKategoriId = null;
    if (kategoriId !== null && kategoriId !== undefined && kategoriId !== "") {
      const parsedCatId = Number(kategoriId);
      if (!Number.isFinite(parsedCatId)) {
        return NextResponse.json(
          { error: "Kategori ID tidak valid" },
          { status: 400 }
        );
      }
      cleanKategoriId = parsedCatId;
    }

    // Eksekusi pemeriksaan kuota tugas dan proteksi IDOR kategori secara paralel
    const countPromise = query(
      `SELECT COUNT(*)::int as count FROM public.tasks WHERE user_id = $1;`,
      [session.user.id]
    );
    const catPromise =
      cleanKategoriId !== null
        ? query(
            `SELECT id FROM public.categories WHERE id = $1 AND user_id = $2;`,
            [cleanKategoriId, session.user.id]
          )
        : Promise.resolve(null);

    const [countRes, catCheck] = await Promise.all([countPromise, catPromise]);

    // Batasi kuota maksimal 1.000 tugas per akun untuk perlindungan resource database
    if (countRes.rows[0]?.count >= 1000) {
      return NextResponse.json(
        { error: "Batas maksimal 1.000 tugas per akun telah tercapai." },
        { status: 400 }
      );
    }

    // Validasi hasil kepemilikan kategori
    if (cleanKategoriId !== null && (!catCheck || catCheck.rows.length === 0)) {
      return NextResponse.json(
        { error: "Kategori tidak ditemukan atau Anda tidak memiliki akses" },
        { status: 400 }
      );
    }

    const result = await query(
      `INSERT INTO public.tasks (user_id, kategori_id, judul, deskripsi, deadline, reminder, prioritas, selesai, dibuat_pada)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       RETURNING *;`,
      [
        session.user.id,
        cleanKategoriId,
        cleanJudul,
        cleanDeskripsi,
        parsedDeadline.value,
        cleanReminder,
        Boolean(prioritas),
        Boolean(selesai),
      ]
    );

    const task = mapRowToTask(result.rows[0]);

    // Kirim notifikasi email untuk tugas penting secara asynchronous (non-blocking)
    if (Boolean(prioritas) && session.user.email) {
      sendImportantTaskCreatedEmail({
        to: session.user.email,
        taskTitle: cleanJudul,
        deadline: parsedDeadline.value,
        deskripsi: cleanDeskripsi,
      }).catch((err) => {
        console.error("[MAIL] Gagal mengirim email tugas penting:", err);
      });
    }

    // Instant Dispatch jika deadline <= threshold reminder saat tugas dibuat ATAU deadline <= sekarang
    if (parsedDeadline.value && !Boolean(selesai)) {
      const deadlineTime = new Date(parsedDeadline.value).getTime();
      const reminderOffset = getReminderOffsetMs(cleanReminder);
      if (deadlineTime - reminderOffset <= Date.now() || deadlineTime <= Date.now()) {
        handleDispatch().catch((err) => {
          console.error("[TASK_POST] Instant dispatch error:", err);
        });
      }
    }

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    console.error("POST /api/tasks error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server. Silakan coba lagi nanti." },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Perlindungan rate limiting untuk mutasi update tugas
    const rl = checkRateLimit(`task_put_${session.user.id}`, 120, 60000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Terlalu banyak permintaan. Silakan tunggu beberapa saat." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const {
      id,
      judul,
      deskripsi = "",
      deadline = null,
      reminder = null,
      kategoriId = null,
      prioritas = false,
      selesai = false,
      selesaiPada = null,
    } = body;

    // Validasi Task ID
    const parsedId = Number(id);
    if (!id || !Number.isFinite(parsedId)) {
      return NextResponse.json({ error: "Task ID valid diperlukan" }, { status: 400 });
    }

    // Validasi judul wajib & batas karakter
    if (!judul || typeof judul !== "string" || !judul.trim()) {
      return NextResponse.json({ error: "Judul tugas wajib diisi" }, { status: 400 });
    }
    const cleanJudul = judul.trim();
    if (cleanJudul.length > MAX_JUDUL_LENGTH) {
      return NextResponse.json(
        { error: `Judul tugas maksimal ${MAX_JUDUL_LENGTH} karakter` },
        { status: 400 }
      );
    }

    // Validasi batas panjang deskripsi
    const cleanDeskripsi = typeof deskripsi === "string" ? deskripsi.trim() : "";
    if (cleanDeskripsi.length > MAX_DESKRIPSI_LENGTH) {
      return NextResponse.json(
        { error: `Deskripsi tugas maksimal ${MAX_DESKRIPSI_LENGTH} karakter` },
        { status: 400 }
      );
    }

    // Validasi tanggal deadline
    const parsedDeadline = parseSafeIsoDate(deadline);
    if (!parsedDeadline.valid) {
      return NextResponse.json(
        { error: "Format tanggal tenggat waktu tidak valid" },
        { status: 400 }
      );
    }

    // Validasi perubahan tenggat waktu: tolak jika deadline BERUBAH dan berada di masa lalu
    if (parsedDeadline.value) {
      const currentTaskRes = await query(
        `SELECT deadline FROM public.tasks WHERE id = $1 AND user_id = $2;`,
        [parsedId, session.user.id]
      );
      if (currentTaskRes.rows.length > 0) {
        const existingDeadlineIso = currentTaskRes.rows[0].deadline
          ? new Date(currentTaskRes.rows[0].deadline).toISOString()
          : null;
        if (parsedDeadline.value !== existingDeadlineIso) {
          const deadlineTimestamp = new Date(parsedDeadline.value).getTime();
          const minimumAllowedTime = Date.now() - 120000;
          if (deadlineTimestamp < minimumAllowedTime) {
            return NextResponse.json(
              { error: "Perubahan tenggat waktu tidak boleh berada di masa lalu" },
              { status: 400 }
            );
          }
        }
      }
    }

    // Validasi reminder
    let cleanReminder = null;
    if (reminder) {
      cleanReminder = String(reminder).trim().slice(0, MAX_REMINDER_LENGTH);
    }

    // Validasi kategoriId & Proteksi IDOR (Memastikan kategori benar-benar milik user aktif)
    let cleanKategoriId = null;
    if (kategoriId !== null && kategoriId !== undefined && kategoriId !== "") {
      const parsedCatId = Number(kategoriId);
      if (!Number.isFinite(parsedCatId)) {
        return NextResponse.json(
          { error: "Kategori ID tidak valid" },
          { status: 400 }
        );
      }
      const catCheck = await query(
        `SELECT id FROM public.categories WHERE id = $1 AND user_id = $2;`,
        [parsedCatId, session.user.id]
      );
      if (catCheck.rows.length === 0) {
        return NextResponse.json(
          { error: "Kategori tidak ditemukan atau Anda tidak memiliki akses" },
          { status: 400 }
        );
      }
      cleanKategoriId = parsedCatId;
    }

    // Validasi tanggal selesai
    let parsedSelesaiPada = null;
    if (selesai) {
      if (selesaiPada) {
        const parsed = parseSafeIsoDate(selesaiPada);
        parsedSelesaiPada = parsed.valid && parsed.value ? parsed.value : new Date().toISOString();
      } else {
        parsedSelesaiPada = new Date().toISOString();
      }
    }

    const result = await query(
      `UPDATE public.tasks
       SET judul = $1,
           deskripsi = $2,
           deadline = $3,
           reminder = $4,
           kategori_id = $5,
           prioritas = $6,
           selesai = $7,
           selesai_pada = $8,
           reminder_sent = CASE 
             WHEN (deadline IS DISTINCT FROM $3) OR (reminder IS DISTINCT FROM $4) THEN false 
             ELSE reminder_sent 
           END,
           deadline_sent = CASE 
             WHEN (deadline IS DISTINCT FROM $3) THEN false 
             ELSE deadline_sent 
           END
       WHERE id = $9 AND user_id = $10
       RETURNING *;`,
      [
        cleanJudul,
        cleanDeskripsi,
        parsedDeadline.value,
        cleanReminder,
        cleanKategoriId,
        Boolean(prioritas),
        Boolean(selesai),
        parsedSelesaiPada,
        parsedId,
        session.user.id,
      ]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Tugas tidak ditemukan" }, { status: 404 });
    }

    const task = mapRowToTask(result.rows[0]);

    // Instant Dispatch jika deadline <= threshold reminder saat tugas di-update ATAU deadline <= sekarang
    if (parsedDeadline.value && !Boolean(selesai)) {
      const deadlineTime = new Date(parsedDeadline.value).getTime();
      const reminderOffset = getReminderOffsetMs(cleanReminder);
      if (deadlineTime - reminderOffset <= Date.now() || deadlineTime <= Date.now()) {
        handleDispatch().catch((err) => {
          console.error("[TASK_PUT] Instant dispatch error:", err);
        });
      }
    }

    return NextResponse.json({ task });
  } catch (error) {
    console.error("PUT /api/tasks error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server. Silakan coba lagi nanti." },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Perlindungan rate limiting untuk mutasi hapus tugas
    const rl = checkRateLimit(`task_del_${session.user.id}`, 120, 60000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Terlalu banyak permintaan. Silakan tunggu beberapa saat." },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const parsedId = Number(id);

    if (!id || !Number.isFinite(parsedId)) {
      return NextResponse.json({ error: "Task ID valid diperlukan" }, { status: 400 });
    }

    await query(
      `DELETE FROM public.tasks WHERE id = $1 AND user_id = $2;`,
      [parsedId, session.user.id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/tasks error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server. Silakan coba lagi nanti." },
      { status: 500 }
    );
  }
}
