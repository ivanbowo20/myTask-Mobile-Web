import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";

const MAX_CAT_NAMA_LENGTH = 50;
const MAX_CAT_WARNA_LENGTH = 30;
const MAX_CAT_ICON_LENGTH = 50;

function mapRowToCategory(row) {
  return {
    id: Number(row.id),
    userId: row.user_id,
    nama: row.nama,
    warna: row.warna || "#0284C7",
    icon: row.icon || "FolderSimple",
    count: Number(row.count || 0),
    dibuatPada: row.dibuat_pada ? new Date(row.dibuat_pada).toISOString() : new Date().toISOString(),
  };
}

export async function GET(request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sql = `
      SELECT 
        c.id,
        c.user_id,
        c.nama,
        c.warna,
        c.icon,
        c.dibuat_pada,
        COUNT(n.id)::int as count
      FROM public.notebook_categories c
      LEFT JOIN public.notebooks n 
        ON n.user_id = c.user_id 
        AND (n.kategori_id = c.id OR (n.kategori IS NOT NULL AND LOWER(TRIM(n.kategori)) = LOWER(TRIM(c.nama))))
      WHERE c.user_id = $1
      GROUP BY c.id, c.user_id, c.nama, c.warna, c.icon, c.dibuat_pada
      ORDER BY c.dibuat_pada ASC;
    `;

    const result = await query(sql, [session.user.id]);
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
    console.error("GET /api/notebook-categories error:", error);
    return NextResponse.json(
      { error: "Gagal memuat kategori materi." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting: 45 req / min
    const rl = checkRateLimit(`nb_cat_post_${session.user.id}`, 45, 60000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Terlalu banyak permintaan. Silakan tunggu beberapa saat." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { nama, warna = "#0284C7", icon = "FolderSimple", noteIds = [] } = body || {};

    if (!nama || typeof nama !== "string" || !nama.trim()) {
      return NextResponse.json(
        { error: "Nama kategori materi wajib diisi." },
        { status: 400 }
      );
    }

    const cleanNama = nama.trim().slice(0, MAX_CAT_NAMA_LENGTH);
    const cleanWarna = typeof warna === "string" ? warna.trim().slice(0, MAX_CAT_WARNA_LENGTH) : "#0284C7";
    const cleanIcon = typeof icon === "string" ? icon.trim().slice(0, MAX_CAT_ICON_LENGTH) : "FolderSimple";

    // 1. Simpan kategori ke database
    const insertSql = `
      INSERT INTO public.notebook_categories (
        user_id,
        nama,
        warna,
        icon,
        dibuat_pada
      ) VALUES ($1, $2, $3, $4, timezone('utc'::text, now()))
      ON CONFLICT (user_id, nama) DO UPDATE 
        SET warna = EXCLUDED.warna, icon = EXCLUDED.icon
      RETURNING *;
    `;

    const catRes = await query(insertSql, [session.user.id, cleanNama, cleanWarna, cleanIcon]);
    const createdCat = catRes.rows[0];

    // 2. Deteksi & update catatan terpilih (atomic batch assignment)
    let assignedCount = 0;
    if (Array.isArray(noteIds) && noteIds.length > 0) {
      const validIds = noteIds.map(Number).filter((n) => !isNaN(n));
      if (validIds.length > 0) {
        const updateNotesSql = `
          UPDATE public.notebooks
          SET 
            kategori = $1,
            kategori_id = $2,
            diperbarui_pada = timezone('utc'::text, now())
          WHERE id = ANY($3::bigint[]) AND user_id = $4
          RETURNING id;
        `;
        const updateRes = await query(updateNotesSql, [cleanNama, createdCat.id, validIds, session.user.id]);
        assignedCount = updateRes.rows.length;
      }
    }

    const categoryObj = mapRowToCategory({
      ...createdCat,
      count: assignedCount,
    });

    return NextResponse.json(
      { category: categoryObj, assignedCount },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/notebook-categories error:", error);
    return NextResponse.json(
      { error: "Gagal membuat kategori materi baru." },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, nama, warna, icon } = body || {};

    if (!id || isNaN(Number(id))) {
      return NextResponse.json({ error: "ID kategori tidak valid." }, { status: 400 });
    }

    // IDOR Check
    const checkRes = await query(
      `SELECT * FROM public.notebook_categories WHERE id = $1 AND user_id = $2;`,
      [Number(id), session.user.id]
    );

    if (checkRes.rows.length === 0) {
      return NextResponse.json(
        { error: "Kategori tidak ditemukan." },
        { status: 404 }
      );
    }

    const existing = checkRes.rows[0];
    const newNama = (nama && typeof nama === "string" ? nama.trim().slice(0, MAX_CAT_NAMA_LENGTH) : existing.nama);
    const newWarna = (warna && typeof warna === "string" ? warna.trim().slice(0, MAX_CAT_WARNA_LENGTH) : existing.warna);
    const newIcon = (icon && typeof icon === "string" ? icon.trim().slice(0, MAX_CAT_ICON_LENGTH) : existing.icon);

    const updateRes = await query(
      `
      UPDATE public.notebook_categories
      SET nama = $1, warna = $2, icon = $3
      WHERE id = $4 AND user_id = $5
      RETURNING *;
      `,
      [newNama, newWarna, newIcon, Number(id), session.user.id]
    );

    // Sinkronkan nama kategori di catatan yang terhubung
    await query(
      `
      UPDATE public.notebooks
      SET kategori = $1, diperbarui_pada = timezone('utc'::text, now())
      WHERE (kategori_id = $2 OR (kategori IS NOT NULL AND LOWER(TRIM(kategori)) = LOWER(TRIM($3)))) AND user_id = $4;
      `,
      [newNama, Number(id), existing.nama, session.user.id]
    );

    return NextResponse.json({ category: mapRowToCategory(updateRes.rows[0]) });
  } catch (error) {
    console.error("PUT /api/notebook-categories error:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui kategori materi." },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id || isNaN(Number(id))) {
      return NextResponse.json({ error: "ID kategori tidak valid." }, { status: 400 });
    }

    // Ambil data kategori untuk unassign
    const checkRes = await query(
      `SELECT * FROM public.notebook_categories WHERE id = $1 AND user_id = $2;`,
      [Number(id), session.user.id]
    );

    if (checkRes.rows.length === 0) {
      return NextResponse.json({ error: "Kategori tidak ditemukan." }, { status: 404 });
    }

    const cat = checkRes.rows[0];

    // Lepas kategori dari semua catatan yang terkait
    await query(
      `
      UPDATE public.notebooks
      SET kategori = '', kategori_id = NULL, diperbarui_pada = timezone('utc'::text, now())
      WHERE (kategori_id = $1 OR (kategori IS NOT NULL AND LOWER(TRIM(kategori)) = LOWER(TRIM($2)))) AND user_id = $3;
      `,
      [Number(id), cat.nama, session.user.id]
    );

    // Hapus kategori
    await query(
      `DELETE FROM public.notebook_categories WHERE id = $1 AND user_id = $2;`,
      [Number(id), session.user.id]
    );

    return NextResponse.json({ success: true, deletedId: Number(id) });
  } catch (error) {
    console.error("DELETE /api/notebook-categories error:", error);
    return NextResponse.json(
      { error: "Gagal menghapus kategori materi." },
      { status: 500 }
    );
  }
}

// PATCH: Cepat pindahkan catatan ke suatu kategori
export async function PATCH(request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { noteId, noteIds, targetCategoryName } = body || {};

    const cleanCategory = typeof targetCategoryName === "string" ? targetCategoryName.trim().slice(0, MAX_CAT_NAMA_LENGTH) : "";

    // Kumpulkan target IDs
    let ids = [];
    if (noteId && !isNaN(Number(noteId))) {
      ids.push(Number(noteId));
    } else if (Array.isArray(noteIds)) {
      ids = noteIds.map(Number).filter((n) => !isNaN(n));
    }

    if (ids.length === 0) {
      return NextResponse.json({ error: "Tidak ada catatan yang dipilih." }, { status: 400 });
    }

    // Cari kategori_id jika ada
    let targetCatId = null;
    if (cleanCategory) {
      const catSearch = await query(
        `SELECT id FROM public.notebook_categories WHERE user_id = $1 AND LOWER(TRIM(nama)) = LOWER(TRIM($2)) LIMIT 1;`,
        [session.user.id, cleanCategory]
      );
      if (catSearch.rows.length > 0) {
        targetCatId = catSearch.rows[0].id;
      }
    }

    const updateSql = `
      UPDATE public.notebooks
      SET 
        kategori = $1,
        kategori_id = $2,
        diperbarui_pada = timezone('utc'::text, now())
      WHERE id = ANY($3::bigint[]) AND user_id = $4
      RETURNING id, kategori, kategori_id;
    `;

    const updateRes = await query(updateSql, [cleanCategory, targetCatId, ids, session.user.id]);

    return NextResponse.json({
      success: true,
      updatedNotes: updateRes.rows,
      targetCategoryName: cleanCategory,
    });
  } catch (error) {
    console.error("PATCH /api/notebook-categories error:", error);
    return NextResponse.json(
      { error: "Gagal memindahkan catatan ke kategori." },
      { status: 500 }
    );
  }
}
