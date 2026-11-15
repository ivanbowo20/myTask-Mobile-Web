/**
 * Sync Application Service Layer
 * lib/modules/sync/sync.service.js
 * 
 * Mengorkestrasi transaksi atomik sinkronisasi offline-first:
 * - Validasi batas batching (maksimal 50 item push)
 * - Clock skew detection & future timestamp clamping
 * - Topological ordering (categories -> notebookCategories -> tasks -> notebooks)
 * - Dangling references protection
 * - Two-phase push & pull delta dengan keyset cursor
 */

import { withTransaction } from "../../db.js";
import {
  SYNC_BATCH_SIZE,
  MAX_CLOCK_SKEW_MS,
  ITEM_STATUS,
} from "../../sync/contract.js";
import { sortSyncItems, assertNoDanglingRefs } from "../../sync/ordering.js";
import {
  upsertCategory,
  upsertNotebookCategory,
  upsertTask,
  upsertNotebook,
  pullEntity,
} from "./sync.repository.js";

/**
 * Membatasi timestamp client agar tidak berada di masa depan yang melampaui server.
 * 
 * @param {Object} item 
 * @param {number} maxAllowedMs 
 */
function clampFutureTimestamp(item, maxAllowedMs) {
  if (item && item.updatedAt) {
    const t = new Date(item.updatedAt).getTime();
    if (!isNaN(t) && t > maxAllowedMs) {
      item.updatedAt = new Date(maxAllowedMs).toISOString();
    }
  }
}

/**
 * Menjalankan satu siklus sinkronisasi push & pull atomik untuk satu pengguna.
 * 
 * @param {string} userId 
 * @param {Object} payload 
 * @returns {Promise<Object>}
 */
export async function runSync(userId, payload = {}) {
  if (!userId) {
    return { error: "User ID diperlukan untuk sinkronisasi", status: 401 };
  }

  const safePayload = payload && typeof payload === "object" ? payload : {};
  const { since = null, cursors = {}, clientTime = null } = safePayload;

  // 1. Ekstrak dan urutkan item push sesuai urutan topologis
  const sorted = sortSyncItems(safePayload);
  const totalPushItems =
    sorted.categories.length +
    sorted.notebookCategories.length +
    sorted.tasks.length +
    sorted.notebooks.length;

  // 2. Validasi batas kuota batch (maksimal 50 item)
  if (totalPushItems > SYNC_BATCH_SIZE) {
    return {
      error: `Batch sinkronisasi melebihi batas maksimal ${SYNC_BATCH_SIZE} item (diterima ${totalPushItems}).`,
      status: 400,
    };
  }

  // 3. Audit clock skew & clamp timestamp masa depan
  const nowMs = Date.now();
  if (clientTime) {
    const clientMs = new Date(clientTime).getTime();
    if (!isNaN(clientMs)) {
      const skewMs = Math.abs(nowMs - clientMs);
      if (skewMs > MAX_CLOCK_SKEW_MS) {
        console.warn(`[SYNC] Clock skew terdeteksi untuk user ${userId}: ${skewMs}ms`);
      }
    }
  }

  // Clamp seluruh item yang memiliki updatedAt di masa depan
  for (const cat of sorted.categories) clampFutureTimestamp(cat, nowMs);
  for (const nbCat of sorted.notebookCategories) clampFutureTimestamp(nbCat, nowMs);
  for (const task of sorted.tasks) clampFutureTimestamp(task, nowMs);
  for (const nb of sorted.notebooks) clampFutureTimestamp(nb, nowMs);

  // 4. Deteksi relasi menggantung (dangling references)
  const danglingList = assertNoDanglingRefs({
    push: sorted,
    knownCategoryUuids: safePayload.knownCategoryUuids || [],
    knownNotebookCategoryUuids: safePayload.knownNotebookCategoryUuids || [],
  });
  const danglingTaskSet = new Set(
    danglingList.filter((d) => d.entity === "tasks").map((d) => d.clientUuid)
  );
  const danglingNotebookSet = new Set(
    danglingList.filter((d) => d.entity === "notebooks").map((d) => d.clientUuid)
  );

  let hasTaskDispatchCandidate = false;

  // 5. Eksekusi seluruh mutasi push dan query pull dalam satu transaksi PostgreSQL atomik
  const syncResponse = await withTransaction(async (client) => {
    const results = {
      categories: [],
      notebookCategories: [],
      tasks: [],
      notebooks: [],
    };

    const categoryCache = new Map();
    const notebookCategoryCache = new Map();

    // A. Proses Kategori Tugas
    for (const catItem of sorted.categories) {
      const res = await upsertCategory(client, userId, catItem);
      results.categories.push(res);
      if (res.serverId && catItem.clientUuid) {
        categoryCache.set(catItem.clientUuid, res.serverId);
      }
    }

    // B. Proses Kategori Catatan Materi
    for (const nbCatItem of sorted.notebookCategories) {
      const res = await upsertNotebookCategory(client, userId, nbCatItem);
      results.notebookCategories.push(res);
      if (res.serverId && nbCatItem.clientUuid) {
        notebookCategoryCache.set(nbCatItem.clientUuid, {
          id: res.serverId,
          nama: nbCatItem.nama,
        });
      }
    }

    // C. Proses Tugas
    for (const taskItem of sorted.tasks) {
      if (taskItem?.clientUuid && danglingTaskSet.has(taskItem.clientUuid)) {
        // Jika kategori induk belum ada di database, coba periksa apakah sudah ada di database dari sync sebelumnya
        const existingCatId = await client.query(
          `SELECT id FROM public.categories WHERE user_id = $1 AND client_uuid = $2 AND deleted_at IS NULL LIMIT 1;`,
          [userId, taskItem.kategoriClientUuid]
        );
        if (existingCatId.rows.length === 0) {
          results.tasks.push({
            clientUuid: taskItem.clientUuid,
            status: ITEM_STATUS.REJECTED,
            error: "Kategori tugas rujukan tidak ditemukan di server.",
          });
          continue;
        }
        categoryCache.set(taskItem.kategoriClientUuid, Number(existingCatId.rows[0].id));
      }

      const res = await upsertTask(client, userId, taskItem, categoryCache);
      results.tasks.push(res);

      if (
        (res.status === ITEM_STATUS.CREATED || res.status === ITEM_STATUS.UPDATED) &&
        taskItem.deadline &&
        !taskItem.selesai
      ) {
        const dlTime = new Date(taskItem.deadline).getTime();
        if (!isNaN(dlTime) && dlTime <= Date.now() + 86400000) {
          hasTaskDispatchCandidate = true;
        }
      }
    }

    // D. Proses Catatan Materi (Notebooks)
    for (const nbItem of sorted.notebooks) {
      if (nbItem?.clientUuid && danglingNotebookSet.has(nbItem.clientUuid)) {
        const existingNbCat = await client.query(
          `SELECT id, nama FROM public.notebook_categories WHERE user_id = $1 AND client_uuid = $2 AND deleted_at IS NULL LIMIT 1;`,
          [userId, nbItem.kategoriClientUuid]
        );
        if (existingNbCat.rows.length === 0) {
          results.notebooks.push({
            clientUuid: nbItem.clientUuid,
            status: ITEM_STATUS.REJECTED,
            error: "Kategori materi rujukan tidak ditemukan di server.",
          });
          continue;
        }
        notebookCategoryCache.set(nbItem.kategoriClientUuid, {
          id: Number(existingNbCat.rows[0].id),
          nama: existingNbCat.rows[0].nama,
        });
      }

      const res = await upsertNotebook(client, userId, nbItem, notebookCategoryCache);
      results.notebooks.push(res);
    }

    // E. Tarik perubahan delta dari server (Pull)
    const [catPull, nbCatPull, taskPull, nbPull] = await Promise.all([
      pullEntity(client, userId, "categories", {
        since,
        cursor: cursors?.categories || null,
      }),
      pullEntity(client, userId, "notebookCategories", {
        since,
        cursor: cursors?.notebookCategories || null,
      }),
      pullEntity(client, userId, "tasks", {
        since,
        cursor: cursors?.tasks || null,
      }),
      pullEntity(client, userId, "notebooks", {
        since,
        cursor: cursors?.notebooks || null,
      }),
    ]);

    return {
      serverTime: new Date().toISOString(),
      results,
      pull: {
        categories: catPull.items,
        notebookCategories: nbCatPull.items,
        tasks: taskPull.items,
        notebooks: nbPull.items,
      },
      cursors: {
        categories: catPull.cursor,
        notebookCategories: nbCatPull.cursor,
        tasks: taskPull.cursor,
        notebooks: nbPull.cursor,
      },
      hasMore: {
        categories: catPull.hasMore,
        notebookCategories: nbCatPull.hasMore,
        tasks: taskPull.hasMore,
        notebooks: nbPull.hasMore,
      },
    };
  });

  // 6. Picu dispatch notifikasi seketika jika ada tugas baru/update yang mendekati deadline
  if (hasTaskDispatchCandidate) {
    import("@/app/api/notifications/dispatch/route")
      .then((m) => m.handleDispatch?.())
      .catch((err) => {
        console.error("[SYNC] Error memicu instant dispatch notifikasi:", err?.message || err);
      });
  }

  return syncResponse;
}
