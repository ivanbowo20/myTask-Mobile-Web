import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { query } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";

const MAX_CAT_NAMA_LENGTH = 50;
const MAX_CAT_WARNA_LENGTH = 25;
const MAX_CAT_ICON_LENGTH = 50;

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
    return NextResponse.json(
      { categories },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("GET /api/categories error:", error);
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

    // Perlindungan rate limiting untuk penambahan kategori
    const rl = checkRateLimit(`cat_post_${session.user.id}`, 30, 60000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Terlalu banyak permintaan. Silakan tunggu beberapa saat." },
        { status: 429 }
      );
    }

    // Batasi kuota maksimal 50 kategori per akun
    const countRes = await query(
      `SELECT COUNT(*)::int as count FROM public.categories WHERE user_id = $1;`,
      [session.user.id]
    );
    if (countRes.rows[0]?.count >= 50) {
      return NextResponse.json(
        { error: "Batas maksimal 50 kategori per akun telah tercapai." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { nama, warna = "#38BDF8", icon = "Briefcase" } = body;

    if (!nama || typeof nama !== "string" || !nama.trim()) {
      return NextResponse.json({ error: "Nama kategori wajib diisi" }, { status: 400 });
    }
    const cleanNama = nama.trim();
    if (cleanNama.length > MAX_CAT_NAMA_LENGTH) {
      return NextResponse.json(
        { error: `Nama kategori maksimal ${MAX_CAT_NAMA_LENGTH} karakter` },
        { status: 400 }
      );
    }

    // Cek duplikasi nama kategori (case-insensitive)
    const duplicateCheck = await query(
      `SELECT id FROM public.categories WHERE user_id = $1 AND LOWER(nama) = LOWER($2);`,
      [session.user.id, cleanNama]
    );
    if (duplicateCheck.rows.length > 0) {
      return NextResponse.json(
        { error: `Kategori dengan nama "${cleanNama}" sudah ada.` },
        { status: 400 }
      );
    }

    const cleanWarna = typeof warna === "string" ? warna.trim().slice(0, MAX_CAT_WARNA_LENGTH) : "#38BDF8";
    const cleanIcon = typeof icon === "string" ? icon.trim().slice(0, MAX_CAT_ICON_LENGTH) : "Briefcase";

    const result = await query(
      `INSERT INTO public.categories (user_id, nama, warna, icon)
       VALUES ($1, $2, $3, $4)
       RETURNING *;`,
      [session.user.id, cleanNama, cleanWarna, cleanIcon]
    );

    const category = mapRowToCategory(result.rows[0]);
    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    console.error("POST /api/categories error:", error);
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

    // Perlindungan rate limiting untuk update kategori
    const rl = checkRateLimit(`cat_put_${session.user.id}`, 60, 60000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Terlalu banyak permintaan. Silakan tunggu beberapa saat." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { id, nama, warna, icon } = body;

    const parsedId = Number(id);
    if (!id || !Number.isFinite(parsedId)) {
      return NextResponse.json({ error: "Category ID valid diperlukan" }, { status: 400 });
    }

    if (!nama || typeof nama !== "string" || !nama.trim()) {
      return NextResponse.json({ error: "Nama kategori wajib diisi" }, { status: 400 });
    }
    const cleanNama = nama.trim();
    if (cleanNama.length > MAX_CAT_NAMA_LENGTH) {
      return NextResponse.json(
        { error: `Nama kategori maksimal ${MAX_CAT_NAMA_LENGTH} karakter` },
        { status: 400 }
      );
    }

    // Cek duplikasi nama kategori jika diubah (case-insensitive)
    const duplicateCheck = await query(
      `SELECT id FROM public.categories WHERE user_id = $1 AND LOWER(nama) = LOWER($2) AND id != $3;`,
      [session.user.id, cleanNama, parsedId]
    );
    if (duplicateCheck.rows.length > 0) {
      return NextResponse.json(
        { error: `Kategori dengan nama "${cleanNama}" sudah ada.` },
        { status: 400 }
      );
    }

    const cleanWarna = typeof warna === "string" ? warna.trim().slice(0, MAX_CAT_WARNA_LENGTH) : "#38BDF8";
    const cleanIcon = typeof icon === "string" ? icon.trim().slice(0, MAX_CAT_ICON_LENGTH) : "Briefcase";

    const result = await query(
      `UPDATE public.categories
       SET nama = $1, warna = $2, icon = $3
       WHERE id = $4 AND user_id = $5
       RETURNING *;`,
      [cleanNama, cleanWarna, cleanIcon, parsedId, session.user.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Kategori tidak ditemukan" }, { status: 404 });
    }

    const category = mapRowToCategory(result.rows[0]);
    return NextResponse.json({ category });
  } catch (error) {
    console.error("PUT /api/categories error:", error);
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

    // Perlindungan rate limiting untuk hapus kategori
    const rl = checkRateLimit(`cat_del_${session.user.id}`, 60, 60000);
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
      return NextResponse.json({ error: "Category ID valid diperlukan" }, { status: 400 });
    }

    await query(
      `DELETE FROM public.categories WHERE id = $1 AND user_id = $2;`,
      [parsedId, session.user.id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/categories error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server. Silakan coba lagi nanti." },
      { status: 500 }
    );
  }
}
