import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { query } from "@/lib/db";
import { isTaskExpired } from "@/lib/utils";

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

    // Zero-Cost Free Tier Optimization: purge completed tasks > 14 days old for this user
    await query(
      `DELETE FROM public.tasks
       WHERE user_id = $1
         AND selesai = true
         AND selesai_pada IS NOT NULL
         AND selesai_pada < NOW() - INTERVAL '14 days';`,
      [session.user.id]
    );

    const result = await query(
      `SELECT * FROM public.tasks WHERE user_id = $1 ORDER BY dibuat_pada DESC;`,
      [session.user.id]
    );

    const tasks = result.rows
      .map(mapRowToTask)
      .filter((t) => !isTaskExpired(t));
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

    // Validasi reminder
    let cleanReminder = null;
    if (reminder) {
      cleanReminder = String(reminder).trim().slice(0, MAX_REMINDER_LENGTH);
    }

    // Validasi kategoriId
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

    // Validasi reminder
    let cleanReminder = null;
    if (reminder) {
      cleanReminder = String(reminder).trim().slice(0, MAX_REMINDER_LENGTH);
    }

    // Validasi kategoriId
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
           selesai_pada = $8
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
