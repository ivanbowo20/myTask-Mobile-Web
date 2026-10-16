import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { query } from "@/lib/db";

function mapRowToCategory(row) {
  return {
    id: Number(row.id),
    userId: row.user_id,
    nama: row.nama,
    warna: row.warna,
    icon: row.icon,
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
      `SELECT * FROM public.categories WHERE user_id = $1 ORDER BY id ASC;`,
      [session.user.id]
    );

    const categories = result.rows.map(mapRowToCategory);
    return NextResponse.json({ categories });
  } catch (error) {
    console.error("GET /api/categories error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
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
    const { nama, warna = "#38BDF8", icon = "Briefcase" } = body;

    if (!nama || !nama.trim()) {
      return NextResponse.json({ error: "Nama kategori wajib diisi" }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO public.categories (user_id, nama, warna, icon)
       VALUES ($1, $2, $3, $4)
       RETURNING *;`,
      [session.user.id, nama.trim(), warna, icon]
    );

    const category = mapRowToCategory(result.rows[0]);
    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    console.error("POST /api/categories error:", error);
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
    const { id, nama, warna, icon } = body;

    if (!id || !nama || !nama.trim()) {
      return NextResponse.json({ error: "Data kategori tidak lengkap" }, { status: 400 });
    }

    const result = await query(
      `UPDATE public.categories
       SET nama = $1, warna = $2, icon = $3
       WHERE id = $4 AND user_id = $5
       RETURNING *;`,
      [nama.trim(), warna, icon, Number(id), session.user.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Kategori tidak ditemukan" }, { status: 404 });
    }

    const category = mapRowToCategory(result.rows[0]);
    return NextResponse.json({ category });
  } catch (error) {
    console.error("PUT /api/categories error:", error);
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
      return NextResponse.json({ error: "Category ID diperlukan" }, { status: 400 });
    }

    // Lepas relasi tugas yang memiliki kategori ini
    await query(
      `UPDATE public.tasks SET kategori_id = NULL WHERE kategori_id = $1 AND user_id = $2;`,
      [Number(id), session.user.id]
    );

    await query(
      `DELETE FROM public.categories WHERE id = $1 AND user_id = $2;`,
      [Number(id), session.user.id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/categories error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

