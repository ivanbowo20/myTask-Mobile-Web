/**
 * Sync Data Access Layer (Repository)
 * lib/modules/sync/sync.repository.js
 * 
 * Menangani rekonsiliasi atomik, idempotent upsert by client_uuid,
 * LWW conflict check, subtasks merge, remap relasi kategori,
 * soft delete (tombstones), dan keyset cursor pagination untuk pull.
 */

import { ITEM_STATUS, PULL_PAGE_SIZE, isUuid } from "../../sync/contract.js";
import { mergeSubtasks, normalizeSubtasks } from "../../sync/subtasks.js";

/**
 * Mengonversi tanggal ke ISO string secara aman tanpa melempar exception
 * jika nilainya sudah berupa string atau objek Date.
 * 
 * @param {Date | string | number | null} d 
 * @returns {string | null}
 */
function toIsoStringSafe(d) {
  if (!d) return null;
  if (typeof d === "string") {
    const parsed = new Date(d);
    return isNaN(parsed.getTime()) ? d : parsed.toISOString();
  }
  if (d instanceof Date) {
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
  const dateObj = new Date(d);
  return isNaN(dateObj.getTime()) ? null : dateObj.toISOString();
}

/**
 * Meresolusi client_uuid kategori tugas menjadi ID server PostgreSQL asli.
 * Menggunakan cache in-memory lokal jika disediakan.
 * 
 * @param {import("pg").PoolClient} client 
 * @param {string} userId 
 * @param {string} kategoriClientUuid 
 * @param {Map<string, number>} [categoryCache] 
 * @returns {Promise<number | null>}
 */
export async function resolveCategoryId(client, userId, kategoriClientUuid, categoryCache = null) {
  if (!kategoriClientUuid || !isUuid(kategoriClientUuid)) return null;
  if (categoryCache && categoryCache.has(kategoriClientUuid)) {
    return categoryCache.get(kategoriClientUuid);
  }
  const res = await client.query(
    `SELECT id FROM public.categories WHERE user_id = $1 AND client_uuid = $2 AND deleted_at IS NULL LIMIT 1;`,
    [userId, kategoriClientUuid]
  );
  const id = res.rows[0]?.id ? Number(res.rows[0].id) : null;
  if (categoryCache && id) {
    categoryCache.set(kategoriClientUuid, id);
  }
  return id;
}

/**
 * Meresolusi client_uuid kategori materi (notebooks) menjadi info { id, nama }.
 * 
 * @param {import("pg").PoolClient} client 
 * @param {string} userId 
 * @param {string} kategoriClientUuid 
 * @param {Map<string, { id: number, nama: string }>} [notebookCategoryCache] 
 * @returns {Promise<{ id: number, nama: string } | null>}
 */
export async function resolveNotebookCategoryId(client, userId, kategoriClientUuid, notebookCategoryCache = null) {
  if (!kategoriClientUuid || !isUuid(kategoriClientUuid)) return null;
  if (notebookCategoryCache && notebookCategoryCache.has(kategoriClientUuid)) {
    return notebookCategoryCache.get(kategoriClientUuid);
  }
  const res = await client.query(
    `SELECT id, nama FROM public.notebook_categories WHERE user_id = $1 AND client_uuid = $2 AND deleted_at IS NULL LIMIT 1;`,
    [userId, kategoriClientUuid]
  );
  const info = res.rows[0] ? { id: Number(res.rows[0].id), nama: res.rows[0].nama } : null;
  if (notebookCategoryCache && info) {
    notebookCategoryCache.set(kategoriClientUuid, info);
  }
  return info;
}

/**
 * Upsert idempotent untuk kategori tugas berdasarkan client_uuid.
 * 
 * @param {import("pg").PoolClient} client 
 * @param {string} userId 
 * @param {Object} item 
 * @returns {Promise<Object>}
 */
export async function upsertCategory(client, userId, item) {
  if (!item || !isUuid(item.clientUuid)) {
    return {
      clientUuid: item?.clientUuid || null,
      status: ITEM_STATUS.REJECTED,
      error: "clientUuid valid diperlukan",
    };
  }

  const clientUuid = item.clientUuid;
  const isDeleted = Boolean(item.deleted || item.deletedAt);

  const existingRes = await client.query(
    `SELECT id, user_id, nama, warna, icon, client_uuid, updated_at, deleted_at 
     FROM public.categories 
     WHERE user_id = $1 AND client_uuid = $2
     FOR UPDATE;`,
    [userId, clientUuid]
  );
  const existing = existingRes.rows[0];

  if (isDeleted) {
    if (!existing) {
      return { clientUuid, status: ITEM_STATUS.NOOP };
    }
    if (existing.deleted_at) {
      return {
        clientUuid,
        serverId: Number(existing.id),
        status: ITEM_STATUS.NOOP,
        updatedAt: toIsoStringSafe(existing.updated_at),
      };
    }
    const delRes = await client.query(
      `UPDATE public.categories 
       SET deleted_at = timezone('utc', now()) 
       WHERE id = $1 AND user_id = $2 
       RETURNING id, updated_at, deleted_at;`,
      [existing.id, userId]
    );
    await client.query(
      `UPDATE public.tasks 
       SET kategori_id = NULL 
       WHERE kategori_id = $1 AND user_id = $2 AND deleted_at IS NULL;`,
      [existing.id, userId]
    );
    const updatedRow = delRes.rows[0] || existing;
    const updatedAt = toIsoStringSafe(updatedRow?.updated_at) || new Date().toISOString();
    return {
      clientUuid,
      serverId: Number(existing.id),
      status: ITEM_STATUS.DELETED,
      updatedAt,
    };
  }

  const rawNama = typeof item.nama === "string" ? item.nama.trim() : "";
  if (!rawNama && !existing) {
    return {
      clientUuid,
      status: ITEM_STATUS.REJECTED,
      error: "Nama kategori wajib diisi",
    };
  }

  const cleanNama = rawNama ? rawNama.slice(0, 50) : (existing ? existing.nama : "");
  const cleanWarna = typeof item.warna === "string" && item.warna.trim() ? item.warna.trim().slice(0, 25) : (existing?.warna || "#38BDF8");
  const cleanIcon = typeof item.icon === "string" && item.icon.trim() ? item.icon.trim().slice(0, 50) : (existing?.icon || "Briefcase");

  const dupRes = await client.query(
    `SELECT id, client_uuid FROM public.categories 
     WHERE user_id = $1 AND LOWER(nama) = LOWER($2) AND deleted_at IS NULL AND (client_uuid IS NULL OR client_uuid != $3);`,
    [userId, cleanNama, clientUuid]
  );
  if (dupRes.rows.length > 0) {
    return {
      clientUuid,
      status: ITEM_STATUS.DUPLICATE_NAME,
      error: `Kategori dengan nama "${cleanNama}" sudah ada`,
    };
  }

  if (existing) {
    if (existing.deleted_at) {
      return {
        clientUuid,
        serverId: Number(existing.id),
        status: ITEM_STATUS.CONFLICT,
        serverItem: {
          serverId: Number(existing.id),
          clientUuid: existing.client_uuid,
          nama: existing.nama,
          warna: existing.warna,
          icon: existing.icon,
          updatedAt: toIsoStringSafe(existing.updated_at),
          deletedAt: toIsoStringSafe(existing.deleted_at),
        },
      };
    }

    if (item.updatedAt && existing.updated_at) {
      const clientTime = new Date(item.updatedAt).getTime();
      const serverTime = new Date(existing.updated_at).getTime();
      if (!isNaN(clientTime) && !isNaN(serverTime) && clientTime < serverTime) {
        return {
          clientUuid,
          serverId: Number(existing.id),
          status: ITEM_STATUS.CONFLICT,
          serverItem: {
            serverId: Number(existing.id),
            clientUuid: existing.client_uuid,
            nama: existing.nama,
            warna: existing.warna,
            icon: existing.icon,
            updatedAt: toIsoStringSafe(existing.updated_at),
            deletedAt: null,
          },
        };
      }
    }

    const updateRes = await client.query(
      `UPDATE public.categories 
       SET nama = $1, warna = $2, icon = $3 
       WHERE id = $4 AND user_id = $5 
       RETURNING id, updated_at;`,
      [cleanNama, cleanWarna, cleanIcon, existing.id, userId]
    );
    const row = updateRes.rows[0];
    return {
      clientUuid,
      serverId: Number(row.id),
      status: ITEM_STATUS.UPDATED,
      updatedAt: toIsoStringSafe(row.updated_at),
    };
  }

  // Validasi kuota maksimal 50 kategori per user sebelum insert
  const countRes = await client.query(
    `SELECT COUNT(*)::int as count FROM public.categories WHERE user_id = $1 AND deleted_at IS NULL;`,
    [userId]
  );
  if ((countRes.rows[0]?.count || 0) >= 50) {
    return {
      clientUuid,
      status: ITEM_STATUS.REJECTED,
      error: "Batas maksimal 50 kategori per akun telah tercapai",
    };
  }

  const insertRes = await client.query(
    `INSERT INTO public.categories (user_id, nama, warna, icon, client_uuid)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id, client_uuid) DO UPDATE
     SET nama = EXCLUDED.nama, warna = EXCLUDED.warna, icon = EXCLUDED.icon, deleted_at = NULL
     RETURNING id, updated_at;`,
    [userId, cleanNama, cleanWarna, cleanIcon, clientUuid]
  );
  const row = insertRes.rows[0] || { id: 0, updated_at: new Date() };
  return {
    clientUuid,
    serverId: Number(row.id),
    status: ITEM_STATUS.CREATED,
    updatedAt: toIsoStringSafe(row.updated_at),
  };
}

/**
 * Upsert idempotent untuk kategori catatan materi (notebooks).
 * 
 * @param {import("pg").PoolClient} client 
 * @param {string} userId 
 * @param {Object} item 
 * @returns {Promise<Object>}
 */
export async function upsertNotebookCategory(client, userId, item) {
  if (!item || !isUuid(item.clientUuid)) {
    return {
      clientUuid: item?.clientUuid || null,
      status: ITEM_STATUS.REJECTED,
      error: "clientUuid valid diperlukan",
    };
  }

  const clientUuid = item.clientUuid;
  const isDeleted = Boolean(item.deleted || item.deletedAt);

  const existingRes = await client.query(
    `SELECT id, user_id, nama, warna, icon, client_uuid, updated_at, deleted_at 
     FROM public.notebook_categories 
     WHERE user_id = $1 AND client_uuid = $2
     FOR UPDATE;`,
    [userId, clientUuid]
  );
  const existing = existingRes.rows[0];

  if (isDeleted) {
    if (!existing) {
      return { clientUuid, status: ITEM_STATUS.NOOP };
    }
    if (existing.deleted_at) {
      return {
        clientUuid,
        serverId: Number(existing.id),
        status: ITEM_STATUS.NOOP,
        updatedAt: toIsoStringSafe(existing.updated_at),
      };
    }
    const delRes = await client.query(
      `UPDATE public.notebook_categories 
       SET deleted_at = timezone('utc', now()) 
       WHERE id = $1 AND user_id = $2 
       RETURNING id, updated_at, deleted_at;`,
      [existing.id, userId]
    );
    await client.query(
      `UPDATE public.notebooks 
       SET kategori = '', kategori_id = NULL, diperbarui_pada = timezone('utc', now()) 
       WHERE (kategori_id = $1 OR (kategori IS NOT NULL AND LOWER(TRIM(kategori)) = LOWER(TRIM($2)))) AND user_id = $3 AND deleted_at IS NULL;`,
      [existing.id, existing.nama, userId]
    );
    const updatedRow = delRes.rows[0] || existing;
    const updatedAt = toIsoStringSafe(updatedRow?.updated_at) || new Date().toISOString();
    return {
      clientUuid,
      serverId: Number(existing.id),
      status: ITEM_STATUS.DELETED,
      updatedAt,
    };
  }

  const rawNama = typeof item.nama === "string" ? item.nama.trim() : "";
  if (!rawNama && !existing) {
    return {
      clientUuid,
      status: ITEM_STATUS.REJECTED,
      error: "Nama kategori materi wajib diisi",
    };
  }

  const cleanNama = rawNama ? rawNama.slice(0, 50) : (existing ? existing.nama : "");
  const cleanWarna = typeof item.warna === "string" && item.warna.trim() ? item.warna.trim().slice(0, 30) : (existing?.warna || "#0284C7");
  const cleanIcon = typeof item.icon === "string" && item.icon.trim() ? item.icon.trim().slice(0, 50) : (existing?.icon || "FolderSimple");

  const dupRes = await client.query(
    `SELECT id, client_uuid FROM public.notebook_categories 
     WHERE user_id = $1 AND LOWER(TRIM(nama)) = LOWER(TRIM($2)) AND deleted_at IS NULL AND (client_uuid IS NULL OR client_uuid != $3);`,
    [userId, cleanNama, clientUuid]
  );
  if (dupRes.rows.length > 0) {
    return {
      clientUuid,
      status: ITEM_STATUS.DUPLICATE_NAME,
      error: `Kategori materi dengan nama "${cleanNama}" sudah ada`,
    };
  }

  if (existing) {
    if (existing.deleted_at) {
      return {
        clientUuid,
        serverId: Number(existing.id),
        status: ITEM_STATUS.CONFLICT,
        serverItem: {
          serverId: Number(existing.id),
          clientUuid: existing.client_uuid,
          nama: existing.nama,
          warna: existing.warna,
          icon: existing.icon,
          updatedAt: toIsoStringSafe(existing.updated_at),
          deletedAt: toIsoStringSafe(existing.deleted_at),
        },
      };
    }

    if (item.updatedAt && existing.updated_at) {
      const clientTime = new Date(item.updatedAt).getTime();
      const serverTime = new Date(existing.updated_at).getTime();
      if (!isNaN(clientTime) && !isNaN(serverTime) && clientTime < serverTime) {
        return {
          clientUuid,
          serverId: Number(existing.id),
          status: ITEM_STATUS.CONFLICT,
          serverItem: {
            serverId: Number(existing.id),
            clientUuid: existing.client_uuid,
            nama: existing.nama,
            warna: existing.warna,
            icon: existing.icon,
            updatedAt: toIsoStringSafe(existing.updated_at),
            deletedAt: null,
          },
        };
      }
    }

    const updateRes = await client.query(
      `UPDATE public.notebook_categories 
       SET nama = $1, warna = $2, icon = $3 
       WHERE id = $4 AND user_id = $5 
       RETURNING id, updated_at;`,
      [cleanNama, cleanWarna, cleanIcon, existing.id, userId]
    );

    // Sinkronkan nama kategori di catatan jika nama berubah
    if (cleanNama !== existing.nama) {
      await client.query(
        `UPDATE public.notebooks
         SET kategori = $1, diperbarui_pada = timezone('utc', now())
         WHERE (kategori_id = $2 OR (kategori IS NOT NULL AND LOWER(TRIM(kategori)) = LOWER(TRIM($3)))) AND user_id = $4 AND deleted_at IS NULL;`,
        [cleanNama, existing.id, existing.nama, userId]
      );
    }

    const row = updateRes.rows[0];
    return {
      clientUuid,
      serverId: Number(row.id),
      status: ITEM_STATUS.UPDATED,
      updatedAt: toIsoStringSafe(row.updated_at),
    };
  }

  // Validasi kuota maksimal 50 kategori materi per user sebelum insert
  const countRes = await client.query(
    `SELECT COUNT(*)::int as count FROM public.notebook_categories WHERE user_id = $1 AND deleted_at IS NULL;`,
    [userId]
  );
  if ((countRes.rows[0]?.count || 0) >= 50) {
    return {
      clientUuid,
      status: ITEM_STATUS.REJECTED,
      error: "Batas maksimal 50 kategori materi telah tercapai",
    };
  }

  const insertRes = await client.query(
    `INSERT INTO public.notebook_categories (user_id, nama, warna, icon, client_uuid)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id, client_uuid) DO UPDATE
     SET nama = EXCLUDED.nama, warna = EXCLUDED.warna, icon = EXCLUDED.icon, deleted_at = NULL
     RETURNING id, updated_at;`,
    [userId, cleanNama, cleanWarna, cleanIcon, clientUuid]
  );
  const row = insertRes.rows[0] || { id: 0, updated_at: new Date() };
  return {
    clientUuid,
    serverId: Number(row.id),
    status: ITEM_STATUS.CREATED,
    updatedAt: toIsoStringSafe(row.updated_at),
  };
}

/**
 * Upsert idempotent untuk tasks dengan LWW dan mergeSubtasks.
 * 
 * @param {import("pg").PoolClient} client 
 * @param {string} userId 
 * @param {Object} item 
 * @param {Map<string, number>} [categoryCache] 
 * @returns {Promise<Object>}
 */
export async function upsertTask(client, userId, item, categoryCache = null) {
  if (!item || !isUuid(item.clientUuid)) {
    return {
      clientUuid: item?.clientUuid || null,
      status: ITEM_STATUS.REJECTED,
      error: "clientUuid valid diperlukan",
    };
  }

  const clientUuid = item.clientUuid;
  const isDeleted = Boolean(item.deleted || item.deletedAt);

  const existingRes = await client.query(
    `SELECT * FROM public.tasks WHERE user_id = $1 AND client_uuid = $2 FOR UPDATE;`,
    [userId, clientUuid]
  );
  const existing = existingRes.rows[0];

  if (isDeleted) {
    if (!existing) {
      return { clientUuid, status: ITEM_STATUS.NOOP };
    }
    if (existing.deleted_at) {
      return {
        clientUuid,
        serverId: Number(existing.id),
        status: ITEM_STATUS.NOOP,
        updatedAt: toIsoStringSafe(existing.updated_at),
      };
    }
    const delRes = await client.query(
      `UPDATE public.tasks SET deleted_at = timezone('utc', now()) WHERE id = $1 AND user_id = $2 RETURNING id, updated_at;`,
      [existing.id, userId]
    );
    const row = delRes.rows[0] || existing;
    const updatedAt = toIsoStringSafe(row?.updated_at) || new Date().toISOString();
    return {
      clientUuid,
      serverId: Number(existing.id),
      status: ITEM_STATUS.DELETED,
      updatedAt,
    };
  }

  const rawJudul = typeof item.judul === "string" ? item.judul.trim() : "";
  if (!rawJudul && !existing) {
    return {
      clientUuid,
      status: ITEM_STATUS.REJECTED,
      error: "Judul tugas wajib diisi",
    };
  }

  const cleanJudul = rawJudul ? rawJudul.slice(0, 255) : (existing ? existing.judul : "");
  const cleanDeskripsi = typeof item.deskripsi === "string" ? item.deskripsi.trim().slice(0, 2000) : (existing ? existing.deskripsi : "");
  const cleanDeadline = item.deadline !== undefined
    ? (item.deadline ? toIsoStringSafe(item.deadline) : null)
    : (item.tenggatWaktu !== undefined
        ? (item.tenggatWaktu ? toIsoStringSafe(item.tenggatWaktu) : null)
        : (existing ? toIsoStringSafe(existing.deadline) : null));
  const cleanReminder = item.reminder !== undefined
    ? (item.reminder ? String(item.reminder).trim().slice(0, 100) : null)
    : (existing ? existing.reminder : null);
  const prioritas = item.prioritas !== undefined ? Boolean(item.prioritas) : (existing ? Boolean(existing.prioritas) : false);

  let kategoriId = null;
  if (item.kategoriClientUuid !== undefined) {
    kategoriId = await resolveCategoryId(client, userId, item.kategoriClientUuid, categoryCache);
  } else if (item.kategoriId !== null && item.kategoriId !== undefined) {
    const catCheck = await client.query(
      `SELECT id FROM public.categories WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL LIMIT 1;`,
      [Number(item.kategoriId), userId]
    );
    kategoriId = catCheck.rows[0]?.id ? Number(catCheck.rows[0].id) : null;
  } else if (existing) {
    kategoriId = existing.kategori_id;
  }

  let serverSubtasks = existing?.subtasks || [];
  if (typeof serverSubtasks === "string") {
    try {
      serverSubtasks = JSON.parse(serverSubtasks);
    } catch {
      serverSubtasks = [];
    }
  }

  let clientSubtasks = item.subtasks || [];
  if (typeof clientSubtasks === "string") {
    try {
      clientSubtasks = JSON.parse(clientSubtasks);
    } catch {
      clientSubtasks = [];
    }
  }

  let mergedSubtasks = [];
  if (existing) {
    mergedSubtasks = mergeSubtasks(serverSubtasks, clientSubtasks);
  } else {
    mergedSubtasks = normalizeSubtasks(clientSubtasks);
  }

  let isSelesai = item.selesai !== undefined ? Boolean(item.selesai) : (existing ? Boolean(existing.selesai) : false);
  const activeSubtasks = mergedSubtasks.filter((st) => !st.deleted);
  if (activeSubtasks.length > 0) {
    const allActiveDone = activeSubtasks.every((st) => st.selesai);
    if (allActiveDone) {
      isSelesai = true;
    } else if (isSelesai && item.subtasksManualCheckAll) {
      mergedSubtasks = mergedSubtasks.map((st) => (st.deleted ? st : { ...st, selesai: true }));
    } else {
      isSelesai = false;
    }
  }

  let selesaiPada = null;
  if (isSelesai) {
    selesaiPada = item.selesaiPada
      ? toIsoStringSafe(item.selesaiPada)
      : (toIsoStringSafe(existing?.selesai_pada) || new Date().toISOString());
  }

  if (existing) {
    if (existing.deleted_at) {
      return {
        clientUuid,
        serverId: Number(existing.id),
        status: ITEM_STATUS.CONFLICT,
        serverItem: {
          serverId: Number(existing.id),
          clientUuid: existing.client_uuid,
          judul: existing.judul,
          selesai: existing.selesai,
          updatedAt: toIsoStringSafe(existing.updated_at),
          deletedAt: toIsoStringSafe(existing.deleted_at),
        },
      };
    }

    if (item.updatedAt && existing.updated_at) {
      const clientTime = new Date(item.updatedAt).getTime();
      const serverTime = new Date(existing.updated_at).getTime();
      if (!isNaN(clientTime) && !isNaN(serverTime) && clientTime < serverTime) {
        return {
          clientUuid,
          serverId: Number(existing.id),
          status: ITEM_STATUS.CONFLICT,
          serverItem: {
            serverId: Number(existing.id),
            clientUuid: existing.client_uuid,
            judul: existing.judul,
            selesai: existing.selesai,
            subtasks: existing.subtasks,
            updatedAt: toIsoStringSafe(existing.updated_at),
            deletedAt: null,
          },
        };
      }
    }

    const updateRes = await client.query(
      `UPDATE public.tasks
       SET judul = $1,
           deskripsi = $2,
           deadline = $3,
           reminder = $4,
           kategori_id = $5,
           prioritas = $6,
           selesai = $7,
           selesai_pada = $8,
           subtasks = $9,
           reminder_sent = CASE 
             WHEN (deadline IS DISTINCT FROM $3) OR (reminder IS DISTINCT FROM $4) THEN false 
             ELSE reminder_sent 
           END,
           deadline_sent = CASE 
             WHEN (deadline IS DISTINCT FROM $3) THEN false 
             ELSE deadline_sent 
           END
       WHERE id = $10 AND user_id = $11
       RETURNING id, updated_at;`,
      [
        cleanJudul,
        cleanDeskripsi,
        cleanDeadline,
        cleanReminder,
        kategoriId,
        prioritas,
        isSelesai,
        selesaiPada,
        JSON.stringify(mergedSubtasks),
        existing.id,
        userId,
      ]
    );
    const row = updateRes.rows[0];
    return {
      clientUuid,
      serverId: Number(row.id),
      status: ITEM_STATUS.UPDATED,
      updatedAt: toIsoStringSafe(row.updated_at),
    };
  }

  // Validasi kuota maksimal 1.000 tugas per akun sebelum insert
  const countRes = await client.query(
    `SELECT COUNT(*)::int as count FROM public.tasks WHERE user_id = $1 AND deleted_at IS NULL;`,
    [userId]
  );
  if ((countRes.rows[0]?.count || 0) >= 1000) {
    return {
      clientUuid,
      status: ITEM_STATUS.REJECTED,
      error: "Batas maksimal 1.000 tugas per akun telah tercapai",
    };
  }

  const insertRes = await client.query(
    `INSERT INTO public.tasks (
       user_id, kategori_id, judul, deskripsi, deadline, reminder,
       prioritas, selesai, selesai_pada, subtasks, client_uuid, dibuat_pada
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, timezone('utc', now()))
     ON CONFLICT (user_id, client_uuid) DO UPDATE
     SET kategori_id = EXCLUDED.kategori_id,
         judul = EXCLUDED.judul,
         deskripsi = EXCLUDED.deskripsi,
         deadline = EXCLUDED.deadline,
         reminder = EXCLUDED.reminder,
         prioritas = EXCLUDED.prioritas,
         selesai = EXCLUDED.selesai,
         selesai_pada = EXCLUDED.selesai_pada,
         subtasks = EXCLUDED.subtasks,
         reminder_sent = CASE
           WHEN (public.tasks.deadline IS DISTINCT FROM EXCLUDED.deadline) OR (public.tasks.reminder IS DISTINCT FROM EXCLUDED.reminder) THEN false
           ELSE public.tasks.reminder_sent
         END,
         deadline_sent = CASE
           WHEN (public.tasks.deadline IS DISTINCT FROM EXCLUDED.deadline) THEN false
           ELSE public.tasks.deadline_sent
         END,
         deleted_at = NULL
     RETURNING id, updated_at;`,
    [
      userId,
      kategoriId,
      cleanJudul,
      cleanDeskripsi,
      cleanDeadline,
      cleanReminder,
      prioritas,
      isSelesai,
      selesaiPada,
      JSON.stringify(mergedSubtasks),
      clientUuid,
    ]
  );
  const row = insertRes.rows[0] || { id: 0, updated_at: new Date() };
  return {
    clientUuid,
    serverId: Number(row.id),
    status: ITEM_STATUS.CREATED,
    updatedAt: toIsoStringSafe(row.updated_at),
  };
}

/**
 * Upsert idempotent untuk notebooks dengan kuota 100 KB dan remap kategori materi.
 * 
 * @param {import("pg").PoolClient} client 
 * @param {string} userId 
 * @param {Object} item 
 * @param {Map<string, { id: number, nama: string }>} [notebookCategoryCache] 
 * @returns {Promise<Object>}
 */
export async function upsertNotebook(client, userId, item, notebookCategoryCache = null) {
  if (!item || !isUuid(item.clientUuid)) {
    return {
      clientUuid: item?.clientUuid || null,
      status: ITEM_STATUS.REJECTED,
      error: "clientUuid valid diperlukan",
    };
  }

  const clientUuid = item.clientUuid;
  const isDeleted = Boolean(item.deleted || item.deletedAt);

  const existingRes = await client.query(
    `SELECT * FROM public.notebooks WHERE user_id = $1 AND client_uuid = $2 FOR UPDATE;`,
    [userId, clientUuid]
  );
  const existing = existingRes.rows[0];

  if (isDeleted) {
    if (!existing) {
      return { clientUuid, status: ITEM_STATUS.NOOP };
    }
    if (existing.deleted_at) {
      return {
        clientUuid,
        serverId: Number(existing.id),
        status: ITEM_STATUS.NOOP,
        updatedAt: toIsoStringSafe(existing.updated_at),
      };
    }
    const delRes = await client.query(
      `UPDATE public.notebooks SET deleted_at = timezone('utc', now()) WHERE id = $1 AND user_id = $2 RETURNING id, updated_at;`,
      [existing.id, userId]
    );
    const row = delRes.rows[0] || existing;
    const updatedAt = toIsoStringSafe(row?.updated_at) || new Date().toISOString();
    return {
      clientUuid,
      serverId: Number(existing.id),
      status: ITEM_STATUS.DELETED,
      updatedAt,
    };
  }

  const rawJudul = typeof item.judul === "string" ? item.judul.trim() : "";
  if (!rawJudul && !existing) {
    return {
      clientUuid,
      status: ITEM_STATUS.REJECTED,
      error: "Judul materi wajib diisi",
    };
  }

  const cleanJudul = rawJudul ? rawJudul.slice(0, 255) : (existing ? existing.judul : "");
  const cleanKonten = typeof item.konten === "string" ? item.konten : (existing ? existing.konten : "");
  if (cleanKonten.length > 100000) {
    return {
      clientUuid,
      status: ITEM_STATUS.REJECTED,
      error: "Konten materi maksimal 100.000 karakter",
    };
  }

  const penting = item.penting !== undefined ? Boolean(item.penting) : (existing ? Boolean(existing.penting) : false);
  const cleanWarna = typeof item.warna === "string" && item.warna.trim() ? item.warna.trim().slice(0, 30) : (existing?.warna || "#D97706");

  let kategoriId = null;
  let kategoriNama = "";
  if (item.kategoriClientUuid !== undefined) {
    const catInfo = await resolveNotebookCategoryId(client, userId, item.kategoriClientUuid, notebookCategoryCache);
    if (catInfo) {
      kategoriId = catInfo.id;
      kategoriNama = catInfo.nama;
    }
  } else if (item.kategoriId !== null && item.kategoriId !== undefined) {
    const catCheck = await client.query(
      `SELECT id, nama FROM public.notebook_categories WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL LIMIT 1;`,
      [Number(item.kategoriId), userId]
    );
    if (catCheck.rows[0]) {
      kategoriId = Number(catCheck.rows[0].id);
      kategoriNama = catCheck.rows[0].nama;
    }
  } else if (typeof item.kategori === "string" && item.kategori.trim()) {
    kategoriNama = item.kategori.trim().slice(0, 50);
    const catSearch = await client.query(
      `SELECT id, nama FROM public.notebook_categories WHERE user_id = $1 AND LOWER(TRIM(nama)) = LOWER(TRIM($2)) AND deleted_at IS NULL LIMIT 1;`,
      [userId, kategoriNama]
    );
    if (catSearch.rows[0]) {
      kategoriId = Number(catSearch.rows[0].id);
      kategoriNama = catSearch.rows[0].nama;
    }
  } else if (existing) {
    kategoriId = existing.kategori_id;
    kategoriNama = existing.kategori || "";
  }

  if (existing) {
    if (existing.deleted_at) {
      return {
        clientUuid,
        serverId: Number(existing.id),
        status: ITEM_STATUS.CONFLICT,
        serverItem: {
          serverId: Number(existing.id),
          clientUuid: existing.client_uuid,
          judul: existing.judul,
          updatedAt: toIsoStringSafe(existing.updated_at),
          deletedAt: toIsoStringSafe(existing.deleted_at),
        },
      };
    }

    if (item.updatedAt && existing.updated_at) {
      const clientTime = new Date(item.updatedAt).getTime();
      const serverTime = new Date(existing.updated_at).getTime();
      if (!isNaN(clientTime) && !isNaN(serverTime) && clientTime < serverTime) {
        return {
          clientUuid,
          serverId: Number(existing.id),
          status: ITEM_STATUS.CONFLICT,
          serverItem: {
            serverId: Number(existing.id),
            clientUuid: existing.client_uuid,
            judul: existing.judul,
            konten: existing.konten,
            updatedAt: toIsoStringSafe(existing.updated_at),
            deletedAt: null,
          },
        };
      }
    }

    const updateRes = await client.query(
      `UPDATE public.notebooks
       SET judul = $1,
           konten = $2,
           penting = $3,
           warna = $4,
           kategori = $5,
           kategori_id = $6,
           diperbarui_pada = timezone('utc', now())
       WHERE id = $7 AND user_id = $8
       RETURNING id, updated_at;`,
      [cleanJudul, cleanKonten, penting, cleanWarna, kategoriNama, kategoriId, existing.id, userId]
    );
    const row = updateRes.rows[0];
    return {
      clientUuid,
      serverId: Number(row.id),
      status: ITEM_STATUS.UPDATED,
      updatedAt: toIsoStringSafe(row.updated_at),
    };
  }

  const countRes = await client.query(
    `SELECT COUNT(*)::int as count FROM public.notebooks WHERE user_id = $1 AND deleted_at IS NULL;`,
    [userId]
  );
  if ((countRes.rows[0]?.count || 0) >= 300) {
    return {
      clientUuid,
      status: ITEM_STATUS.REJECTED,
      error: "Batas maksimal 300 notebook telah tercapai",
    };
  }

  const insertRes = await client.query(
    `INSERT INTO public.notebooks (
       user_id, judul, konten, penting, warna, kategori, kategori_id, client_uuid, dibuat_pada, diperbarui_pada
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, timezone('utc', now()), timezone('utc', now()))
     ON CONFLICT (user_id, client_uuid) DO UPDATE
     SET judul = EXCLUDED.judul,
         konten = EXCLUDED.konten,
         penting = EXCLUDED.penting,
         warna = EXCLUDED.warna,
         kategori = EXCLUDED.kategori,
         kategori_id = EXCLUDED.kategori_id,
         deleted_at = NULL
     RETURNING id, updated_at;`,
    [userId, cleanJudul, cleanKonten, penting, cleanWarna, kategoriNama, kategoriId, clientUuid]
  );
  const row = insertRes.rows[0] || { id: 0, updated_at: new Date() };
  return {
    clientUuid,
    serverId: Number(row.id),
    status: ITEM_STATUS.CREATED,
    updatedAt: toIsoStringSafe(row.updated_at),
  };
}

/**
 * Keyset cursor pagination berbasis (updated_at, id) untuk delta pull sync.
 * Menyertakan baris tombstone (deleted_at IS NOT NULL) saat delta sync agar client tahu item terhapus.
 * 
 * @param {import("pg").PoolClient} client 
 * @param {string} userId 
 * @param {string} entityName 
 * @param {Object} options 
 * @returns {Promise<{ items: Array, cursor: { updatedAt: string, id: number } | null, hasMore: boolean }>}
 */
export async function pullEntity(client, userId, entityName, { since = null, cursor = null, limit = PULL_PAGE_SIZE } = {}) {
  const safeLimit = Math.min(Math.max(1, parseInt(limit, 10) || PULL_PAGE_SIZE), 500);

  let sql = "";
  const params = [userId];

  if (entityName === "categories") {
    sql = `SELECT id, user_id, nama, warna, icon, client_uuid, updated_at, deleted_at FROM public.categories WHERE user_id = $1`;
  } else if (entityName === "notebookCategories") {
    sql = `SELECT id, user_id, nama, warna, icon, dibuat_pada, client_uuid, updated_at, deleted_at FROM public.notebook_categories WHERE user_id = $1`;
  } else if (entityName === "tasks") {
    sql = `
      SELECT t.id, t.user_id, t.kategori_id, t.judul, t.deskripsi, t.deadline, t.reminder,
             t.prioritas, t.selesai, t.selesai_pada, t.subtasks, t.dibuat_pada, t.client_uuid,
             t.updated_at, t.deleted_at, c.client_uuid AS kategori_client_uuid
      FROM public.tasks t
      LEFT JOIN public.categories c ON c.id = t.kategori_id
      WHERE t.user_id = $1
    `;
  } else if (entityName === "notebooks") {
    sql = `
      SELECT n.id, n.user_id, n.kategori_id, n.kategori, n.judul, n.konten, n.penting, n.warna,
             n.dibuat_pada, n.diperbarui_pada, n.client_uuid, n.updated_at, n.deleted_at,
             nc.client_uuid AS kategori_client_uuid
      FROM public.notebooks n
      LEFT JOIN public.notebook_categories nc
        ON nc.user_id = n.user_id
        AND nc.deleted_at IS NULL
        AND (nc.id = n.kategori_id OR (n.kategori_id IS NULL AND n.kategori IS NOT NULL AND n.kategori != '' AND LOWER(TRIM(nc.nama)) = LOWER(TRIM(n.kategori))))
      WHERE n.user_id = $1
    `;
  } else {
    throw new Error(`Entitas tidak dikenal untuk pull: ${entityName}`);
  }

  const prefix = entityName === "tasks" ? "t." : (entityName === "notebooks" ? "n." : "");
  const isDeltaSync = Boolean(since);

  if (cursor && cursor.updatedAt && cursor.id !== undefined && cursor.id !== null) {
    params.push(cursor.updatedAt, Number(cursor.id));
    sql += ` AND (${prefix}updated_at > $2 OR (${prefix}updated_at = $2 AND ${prefix}id > $3))`;
  } else if (since) {
    params.push(since);
    sql += ` AND ${prefix}updated_at > $2`;
  }

  // Pada initial sync (since is null), jangan pernah mengembalikan item yang sudah di-soft-delete (tombstone)
  if (!isDeltaSync) {
    sql += ` AND ${prefix}deleted_at IS NULL`;
  }

  sql += ` ORDER BY ${prefix}updated_at ASC, ${prefix}id ASC LIMIT $${params.length + 1};`;
  params.push(safeLimit + 1);

  const res = await client.query(sql, params);
  const rows = res.rows;
  const hasMore = rows.length > safeLimit;
  const slicedRows = hasMore ? rows.slice(0, safeLimit) : rows;

  const nextCursor = slicedRows.length > 0 ? {
    updatedAt: toIsoStringSafe(slicedRows[slicedRows.length - 1].updated_at) || new Date().toISOString(),
    id: Number(slicedRows[slicedRows.length - 1].id),
  } : null;

  const mappedItems = slicedRows.map((r) => {
    const parseDate = toIsoStringSafe;

    if (entityName === "categories" || entityName === "notebookCategories") {
      return {
        id: Number(r.id),
        serverId: Number(r.id),
        clientUuid: r.client_uuid,
        nama: r.nama,
        warna: r.warna,
        icon: r.icon,
        updatedAt: parseDate(r.updated_at),
        deletedAt: parseDate(r.deleted_at),
      };
    }

    if (entityName === "tasks") {
      let subtasks = [];
      if (Array.isArray(r.subtasks)) {
        subtasks = r.subtasks;
      } else if (typeof r.subtasks === "string") {
        try {
          const parsed = JSON.parse(r.subtasks);
          if (Array.isArray(parsed)) subtasks = parsed;
        } catch {
          subtasks = [];
        }
      }
      return {
        id: Number(r.id),
        serverId: Number(r.id),
        clientUuid: r.client_uuid,
        kategoriId: r.kategori_id ? Number(r.kategori_id) : null,
        kategoriClientUuid: r.kategori_client_uuid || null,
        judul: r.judul,
        deskripsi: r.deskripsi || "",
        deadline: parseDate(r.deadline),
        reminder: r.reminder || null,
        prioritas: Boolean(r.prioritas),
        selesai: Boolean(r.selesai),
        selesaiPada: parseDate(r.selesai_pada),
        subtasks: Array.isArray(subtasks) ? subtasks : [],
        dibuatPada: parseDate(r.dibuat_pada) || new Date().toISOString(),
        updatedAt: parseDate(r.updated_at),
        deletedAt: parseDate(r.deleted_at),
      };
    }

    if (entityName === "notebooks") {
      return {
        id: Number(r.id),
        serverId: Number(r.id),
        clientUuid: r.client_uuid,
        kategoriId: r.kategori_id ? Number(r.kategori_id) : null,
        kategoriClientUuid: r.kategori_client_uuid || null,
        kategori: r.kategori || "",
        judul: r.judul,
        konten: r.konten || "",
        penting: Boolean(r.penting),
        warna: r.warna || "#D97706",
        dibuatPada: parseDate(r.dibuat_pada) || new Date().toISOString(),
        diperbaruiPada: parseDate(r.diperbarui_pada) || new Date().toISOString(),
        updatedAt: parseDate(r.updated_at),
        deletedAt: parseDate(r.deleted_at),
      };
    }
  });

  return {
    items: mappedItems,
    cursor: nextCursor,
    hasMore,
  };
}
