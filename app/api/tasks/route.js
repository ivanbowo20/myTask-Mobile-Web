import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { query } from "@/lib/db";

function mapRowToTask(row) {
  return {
    id: Number(row.id),
    userId: row.user_id,
    kategoriId: row.kategori_id ? Number(row.kategori_id) : null,
    judul: row.judul,
    deskripsi: row.deskripsi || "",
    deadline: row.deadline ? new Date(row.deadline).toISOString() : null,
    prioritas: Boolean(row.prioritas),
    selesai: Boolean(row.selesai),
    reminder: row.reminder || null,
    dibuatPada: row.dibuat_pada ? new Date(row.dibuat_pada).toISOString() : new Date().toISOString(),
    selesaiPada: row.selesai_pada ? new Date(row.selesai_pada).toISOString() : null,
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

    const result = await query(
      `SELECT * FROM public.tasks WHERE user_id = $1 ORDER BY dibuat_pada DESC;`,
      [session.user.id]
    );

    const tasks = result.rows.map(mapRowToTask);
    return NextResponse.json({ tasks });
  } catch (error) {
    console.error("GET /api/tasks error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
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

    if (!judul || !judul.trim()) {
      return NextResponse.json({ error: "Judul tugas wajib diisi" }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO public.tasks (user_id, kategori_id, judul, deskripsi, deadline, reminder, prioritas, selesai, dibuat_pada)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       RETURNING *;`,
      [
        session.user.id,
        kategoriId ? Number(kategoriId) : null,
        judul.trim(),
        deskripsi ? deskripsi.trim() : "",
        deadline ? new Date(deadline).toISOString() : null,
        reminder || null,
        Boolean(prioritas),
        Boolean(selesai),
      ]
    );

    const task = mapRowToTask(result.rows[0]);
    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    console.error("POST /api/tasks error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
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

    if (!id) {
      return NextResponse.json({ error: "Task ID diperlukan" }, { status: 400 });
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
        judul ? judul.trim() : "",
        deskripsi ? deskripsi.trim() : "",
        deadline ? new Date(deadline).toISOString() : null,
        reminder || null,
        kategoriId ? Number(kategoriId) : null,
        Boolean(prioritas),
        Boolean(selesai),
        selesai && selesaiPada ? new Date(selesaiPada).toISOString() : selesai ? new Date().toISOString() : null,
        Number(id),
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
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
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

    if (!id) {
      return NextResponse.json({ error: "Task ID diperlukan" }, { status: 400 });
    }

    await query(
      `DELETE FROM public.tasks WHERE id = $1 AND user_id = $2;`,
      [Number(id), session.user.id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/tasks error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

