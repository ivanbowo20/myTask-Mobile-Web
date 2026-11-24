import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";

const MAX_JUDUL_LENGTH = 255;
const MAX_KONTEN_LENGTH = 100000;
const MAX_WARNA_LENGTH = 30;
const MAX_KATEGORI_LENGTH = 50;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuidString(val) {
  return typeof val === "string" && UUID_RE.test(val.trim());
}

function isMissingColumnError(err) {
  return (
    err?.code === "42703" ||
    /column .* does not exist/i.test(err?.message || "")
  );
}

function mapRowToNotebook(row) {
  const parseDbDate = (d) => {
    if (!d) return null;
    const dateObj = new Date(d);
    return isNaN(dateObj.getTime()) ? null : dateObj.toISOString();
  };

  return {
    id: Number(row.id),
    serverId: Number(row.id),
    userId: row.user_id,
    judul: row.judul,
    konten: row.konten || "",
    penting: Boolean(row.penting),
    warna: row.warna || "#D97706",
    kategori: row.kategori || "",
    kategoriId: row.kategori_id ? Number(row.kategori_id) : null,
    dibuatPada: parseDbDate(row.dibuat_pada) || new Date().toISOString(),
    diperbaruiPada: parseDbDate(row.diperbarui_pada) || new Date().toISOString(),
    clientUuid: row.client_uuid || null,
    updatedAt: parseDbDate(row.updated_at || row.diperbarui_pada),
    deletedAt: parseDbDate(row.deleted_at),
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
    const safeLimit = limitParam !== null ? Math.min(Math.max(1, parseInt(limitParam, 10) || 50), 300) : 150;

    const buildSelectQuery = (withDeletedAtFilter) => {
      let sql = `
        SELECT * FROM public.notebooks
        WHERE user_id = $1${withDeletedAtFilter ? " AND deleted_at IS NULL" : ""}
      `;
      const params = [session.user.id];

      if (cari) {
        params.push(`%${cari}%`);
        sql += ` AND (judul ILIKE $2 OR konten ILIKE $2)`;
      }

      sql += ` ORDER BY penting DESC, diperbarui_pada DESC, dibuat_pada DESC`;
      params.push(safeLimit);
      sql += ` LIMIT $${params.length};`;
      return { sql, params };
    };

    let result;
    try {
      const q = buildSelectQuery(true);
      result = await query(q.sql, q.params);
    } catch (err) {
      if (isMissingColumnError(err)) {
        const q = buildSelectQuery(false);
        result = await query(q.sql, q.params);
      } else {
        throw err;
      }
    }

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
    let countRes;
    try {
      countRes = await query(
        `SELECT COUNT(*)::int as count FROM public.notebooks WHERE user_id = $1 AND deleted_at IS NULL;`,
        [session.user.id]
      );
    } catch (err) {
      if (isMissingColumnError(err)) {
        countRes = await query(
          `SELECT COUNT(*)::int as count FROM public.notebooks WHERE user_id = $1;`,
          [session.user.id]
        );
      } else {
        throw err;
      }
    }

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
      kategori = "",
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
    const cleanKategori = typeof kategori === "string" ? kategori.trim().slice(0, MAX_KATEGORI_LENGTH) : "";

    const insertResult = await query(
      `
      INSERT INTO public.notebooks (
        user_id,
        judul,
        konten,
        penting,
        warna,
        kategori,
        dibuat_pada,
        diperbarui_pada
      ) VALUES ($1, $2, $3, $4, $5, $6, timezone('utc'::text, now()), timezone('utc'::text, now()))
      RETURNING *;
      `,
      [
        session.user.id,
        cleanJudul,
        cleanKonten,
        Boolean(penting),
        cleanWarna,
        cleanKategori,
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
    const { id, clientUuid, judul, konten, penting, warna, kategori } = body || {};

    const rawId = id ?? clientUuid;
    const numericId = Number(rawId);
    const hasNumericId = rawId !== null && rawId !== undefined && rawId !== "" && !isNaN(numericId) && Number.isFinite(numericId);
    const validUuid = isUuidString(clientUuid) ? clientUuid.trim() : (isUuidString(rawId) ? String(rawId).trim() : null);

    if (!hasNumericId && !validUuid) {
      return NextResponse.json({ error: "ID notebook tidak valid." }, { status: 400 });
    }

    // IDOR Check: Ensure notebook belongs to logged in user (supports numeric id or client_uuid)
    let checkRes;
    try {
      if (hasNumericId) {
        checkRes = await query(
          `SELECT * FROM public.notebooks WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL;`,
          [numericId, session.user.id]
        );
      } else {
        checkRes = await query(
          `SELECT * FROM public.notebooks WHERE user_id = $1 AND client_uuid = $2 AND deleted_at IS NULL;`,
          [session.user.id, validUuid]
        );
      }
    } catch (err) {
      if (isMissingColumnError(err)) {
        if (!hasNumericId) {
          return NextResponse.json({ error: "ID notebook tidak ditemukan." }, { status: 404 });
        }
        checkRes = await query(
          `SELECT * FROM public.notebooks WHERE id = $1 AND user_id = $2;`,
          [numericId, session.user.id]
        );
      } else {
        throw err;
      }
    }

    if (!checkRes || checkRes.rows.length === 0) {
      return NextResponse.json(
        { error: "Notebook tidak ditemukan atau Anda tidak memiliki akses." },
        { status: 404 }
      );
    }

    const existing = checkRes.rows[0];
    const targetDbId = Number(existing.id);

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
    const newKategori = kategori !== undefined && typeof kategori === "string"
      ? kategori.trim().slice(0, MAX_KATEGORI_LENGTH)
      : (existing.kategori || "");

    let updateRes;
    try {
      updateRes = await query(
        `
        UPDATE public.notebooks
        SET
          judul = $1,
          konten = $2,
          penting = $3,
          warna = $4,
          kategori = $5,
          diperbarui_pada = timezone('utc'::text, now())
        WHERE id = $6 AND user_id = $7 AND deleted_at IS NULL
        RETURNING *;
        `,
        [newJudul, newKonten, newPenting, newWarna, newKategori, targetDbId, session.user.id]
      );
    } catch (err) {
      if (isMissingColumnError(err)) {
        updateRes = await query(
          `
          UPDATE public.notebooks
          SET
            judul = $1,
            konten = $2,
            penting = $3,
            warna = $4,
            kategori = $5,
            diperbarui_pada = timezone('utc'::text, now())
          WHERE id = $6 AND user_id = $7
          RETURNING *;
          `,
          [newJudul, newKonten, newPenting, newWarna, newKategori, targetDbId, session.user.id]
        );
      } else {
        throw err;
      }
    }

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
    let clientUuidParam = searchParams.get("clientUuid");

    if (!id && !clientUuidParam) {
      try {
        const body = await request.json();
        id = body?.id ?? body?.serverId;
        clientUuidParam = body?.clientUuid;
      } catch {
        // No body
      }
    }

    const rawId = id ?? clientUuidParam;
    const numericId = Number(rawId);
    const hasNumericId = rawId !== null && rawId !== undefined && rawId !== "" && !isNaN(numericId) && Number.isFinite(numericId);
    const validUuid = isUuidString(clientUuidParam)
      ? clientUuidParam.trim()
      : (isUuidString(rawId) ? String(rawId).trim() : null);

    if (!hasNumericId && !validUuid) {
      return NextResponse.json({ error: "ID notebook tidak valid." }, { status: 400 });
    }

    // IDOR Protected Delete (soft delete with automatic hard-delete fallback if deleted_at column is not migrated yet)
    let deleteRes;
    try {
      if (hasNumericId) {
        deleteRes = await query(
          `UPDATE public.notebooks SET deleted_at = timezone('utc'::text, now()) WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL RETURNING id;`,
          [numericId, session.user.id]
        );
      } else {
        deleteRes = await query(
          `UPDATE public.notebooks SET deleted_at = timezone('utc'::text, now()) WHERE user_id = $1 AND client_uuid = $2 AND deleted_at IS NULL RETURNING id;`,
          [session.user.id, validUuid]
        );
      }
    } catch (err) {
      if (isMissingColumnError(err)) {
        if (!hasNumericId) {
          return NextResponse.json({ error: "Notebook tidak ditemukan." }, { status: 404 });
        }
        deleteRes = await query(
          `DELETE FROM public.notebooks WHERE id = $1 AND user_id = $2 RETURNING id;`,
          [numericId, session.user.id]
        );
      } else {
        throw err;
      }
    }

    if (!deleteRes || deleteRes.rows.length === 0) {
      return NextResponse.json(
        { error: "Notebook tidak ditemukan atau Anda tidak memiliki akses." },
        { status: 404 }
      );
    }

    const deletedId = Number(deleteRes.rows[0].id);
    return NextResponse.json({ success: true, deletedId });
  } catch (error) {
    console.error("DELETE /api/notebooks error:", error);
    return NextResponse.json(
      { error: "Gagal menghapus notebook." },
      { status: 500 }
    );
  }
}
