import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";

const MAX_JUDUL_LENGTH = 255;
const MAX_KONTEN_LENGTH = 100000;
const MAX_WARNA_LENGTH = 30;

function mapRowToNotebook(row) {
  const parseDbDate = (d) => {
    if (!d) return null;
    const dateObj = new Date(d);
    return isNaN(dateObj.getTime()) ? null : dateObj.toISOString();
  };

  return {
    id: Number(row.id),
    userId: row.user_id,
    judul: row.judul,
    konten: row.konten || "",
    penting: Boolean(row.penting),
    warna: row.warna || "#D97706",
    dibuatPada: parseDbDate(row.dibuat_pada) || new Date().toISOString(),
    diperbaruiPada: parseDbDate(row.diperbarui_pada) || new Date().toISOString(),
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

    const { searchParams } = new URL(request.url);
    const cari = searchParams.get("cari")?.trim() || "";
    const limitParam = searchParams.get("limit");

    let sql = `
      SELECT * FROM public.notebooks
      WHERE user_id = $1
    `;
    const params = [session.user.id];

    if (cari) {
      params.push(`%${cari}%`);
      sql += ` AND (judul ILIKE $2 OR konten ILIKE $2)`;
    }

    sql += ` ORDER BY penting DESC, diperbarui_pada DESC, dibuat_pada DESC`;

    // Safe cap (default 150, max 300) untuk mencegah memory bloat & payload transfer berlebih di HP
    const safeLimit = limitParam !== null ? Math.min(Math.max(1, parseInt(limitParam, 10) || 50), 300) : 150;
    params.push(safeLimit);
    sql += ` LIMIT $${params.length};`;

    const result = await query(sql, params);
    const notebooks = result.rows.map(mapRowToNotebook);

    return NextResponse.json(
      { notebooks },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("GET /api/notebooks error:", error);
    return NextResponse.json(
      { error: "Gagal memuat catatan materi. Silakan coba lagi nanti." },
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

    // Rate limiting: 60 requests per minute
    const rl = checkRateLimit(`notebook_post_${session.user.id}`, 60, 60000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Terlalu banyak permintaan. Silakan tunggu beberapa saat." },
        { status: 429 }
      );
    }

    // Quota guard: max 300 notebooks per user
    const countRes = await query(
      `SELECT COUNT(*)::int as count FROM public.notebooks WHERE user_id = $1;`,
      [session.user.id]
    );
    if ((countRes.rows[0]?.count || 0) >= 300) {
      return NextResponse.json(
        { error: "Batas maksimal 300 notebook per akun telah tercapai." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      judul,
      konten = "",
      penting = false,
      warna = "#D97706",
    } = body || {};

    if (!judul || typeof judul !== "string" || !judul.trim()) {
      return NextResponse.json(
        { error: "Judul notebook wajib diisi." },
        { status: 400 }
      );
    }

    const cleanJudul = judul.trim();
    if (cleanJudul.length > MAX_JUDUL_LENGTH) {
      return NextResponse.json(
        { error: `Judul maksimal ${MAX_JUDUL_LENGTH} karakter.` },
        { status: 400 }
      );
    }

    const cleanKonten = typeof konten === "string" ? konten : "";
    if (cleanKonten.length > MAX_KONTEN_LENGTH) {
      return NextResponse.json(
        { error: `Isi materi maksimal ${MAX_KONTEN_LENGTH} karakter.` },
        { status: 400 }
      );
    }

    const cleanWarna = typeof warna === "string" && warna.trim() ? warna.trim().slice(0, MAX_WARNA_LENGTH) : "#D97706";

    const insertResult = await query(
      `
      INSERT INTO public.notebooks (
        user_id,
        judul,
        konten,
        penting,
        warna,
        dibuat_pada,
        diperbarui_pada
      ) VALUES ($1, $2, $3, $4, $5, timezone('utc'::text, now()), timezone('utc'::text, now()))
      RETURNING *;
      `,
      [
        session.user.id,
        cleanJudul,
        cleanKonten,
        Boolean(penting),
        cleanWarna,
      ]
    );

    const newNotebook = mapRowToNotebook(insertResult.rows[0]);
    return NextResponse.json({ notebook: newNotebook }, { status: 201 });
  } catch (error) {
    console.error("POST /api/notebooks error:", error);
    return NextResponse.json(
      { error: "Gagal membuat notebook baru." },
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

    // Rate limiting: 120 requests per minute (allows debounced auto-save)
    const rl = checkRateLimit(`notebook_put_${session.user.id}`, 120, 60000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Terlalu banyak permintaan pembaruan. Silakan tunggu beberapa saat." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { id, judul, konten, penting, warna } = body || {};

    if (!id || isNaN(Number(id))) {
      return NextResponse.json({ error: "ID notebook tidak valid." }, { status: 400 });
    }

    // IDOR Check: Ensure notebook belongs to logged in user
    const checkRes = await query(
      `SELECT * FROM public.notebooks WHERE id = $1 AND user_id = $2;`,
      [Number(id), session.user.id]
    );

    if (checkRes.rows.length === 0) {
      return NextResponse.json(
        { error: "Notebook tidak ditemukan atau Anda tidak memiliki akses." },
        { status: 404 }
      );
    }

    const existing = checkRes.rows[0];

    let newJudul = existing.judul;
    if (judul !== undefined) {
      if (typeof judul !== "string" || !judul.trim()) {
        return NextResponse.json({ error: "Judul tidak boleh kosong." }, { status: 400 });
      }
      newJudul = judul.trim();
      if (newJudul.length > MAX_JUDUL_LENGTH) {
        return NextResponse.json(
          { error: `Judul maksimal ${MAX_JUDUL_LENGTH} karakter.` },
          { status: 400 }
        );
      }
    }

    let newKonten = existing.konten || "";
    if (konten !== undefined) {
      newKonten = typeof konten === "string" ? konten : "";
      if (newKonten.length > MAX_KONTEN_LENGTH) {
        return NextResponse.json(
          { error: `Isi materi maksimal ${MAX_KONTEN_LENGTH} karakter.` },
          { status: 400 }
        );
      }
    }

    const newPenting = penting !== undefined ? Boolean(penting) : Boolean(existing.penting);
    const newWarna = warna !== undefined && typeof warna === "string" && warna.trim()
      ? warna.trim().slice(0, MAX_WARNA_LENGTH)
      : existing.warna;

    const updateRes = await query(
      `
      UPDATE public.notebooks
      SET
        judul = $1,
        konten = $2,
        penting = $3,
        warna = $4,
        diperbarui_pada = timezone('utc'::text, now())
      WHERE id = $5 AND user_id = $6
      RETURNING *;
      `,
      [newJudul, newKonten, newPenting, newWarna, Number(id), session.user.id]
    );

    const updated = mapRowToNotebook(updateRes.rows[0]);
    return NextResponse.json({ notebook: updated });
  } catch (error) {
    console.error("PUT /api/notebooks error:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui catatan notebook." },
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

    // Rate limiting: 30 requests per minute
    const rl = checkRateLimit(`notebook_del_${session.user.id}`, 30, 60000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Terlalu banyak permintaan penghapusan. Silakan tunggu beberapa saat." },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    let id = searchParams.get("id");

    if (!id) {
      try {
        const body = await request.json();
        id = body?.id;
      } catch {
        // No body
      }
    }

    if (!id || isNaN(Number(id))) {
      return NextResponse.json({ error: "ID notebook tidak valid." }, { status: 400 });
    }

    // IDOR Protected Delete
    const deleteRes = await query(
      `DELETE FROM public.notebooks WHERE id = $1 AND user_id = $2 RETURNING id;`,
      [Number(id), session.user.id]
    );

    if (deleteRes.rows.length === 0) {
      return NextResponse.json(
        { error: "Notebook tidak ditemukan atau Anda tidak memiliki akses." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, deletedId: Number(id) });
  } catch (error) {
    console.error("DELETE /api/notebooks error:", error);
    return NextResponse.json(
      { error: "Gagal menghapus notebook." },
      { status: 500 }
    );
  }
}
