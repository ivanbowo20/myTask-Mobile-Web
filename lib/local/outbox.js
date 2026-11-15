/**
 * Outbox Queue with Coalescing & Atomicity
 * lib/local/outbox.js
 *
 * Mengelola antrian mutasi offline dengan fitur coalescing cerdas:
 * 1. Autosave berulang (update + update) dikonsolidasi menjadi satu mutasi terkini.
 * 2. Item baru yang dihapus sebelum sempat sinkron (create + delete) dibatalkan secara bersih (discard).
 * 3. Update yang disusul delete (update + delete) diubah menjadi mutasi delete final.
 */

import { ENTITY_ORDER, SYNC_BATCH_SIZE } from "../sync/contract.js";
import { localDb } from "./db.js";

export const OUTBOX_STATUS = Object.freeze({
  PENDING: "pending",
  PROCESSING: "processing",
  FAILED: "failed",
});

export const MUTATION_TYPE = Object.freeze({
  CREATE: "create",
  UPDATE: "update",
  DELETE: "delete",
});

/**
 * Fungsi murni perencana coalescing untuk mutasi yang masuk.
 * Menentukan apakah mutasi baru harus di-insert, meng-update entri pending yang ada,
 * atau membatalkan kedua mutasi jika item dibuat lalu langsung dihapus sebelum sinkron.
 *
 * @param {object|null} existingPendingEntry Entri outbox pending yang sudah ada untuk (userId, entity, clientUuid)
 * @param {object} newMutation Mutasi baru yang ingin dicatat
 * @returns {{
 *   action: "insert" | "update_existing" | "discard",
 *   targetId?: number,
 *   mergedEntry?: object,
 *   removeTargetId?: number
 * }}
 */
export function planCoalesce(existingPendingEntry, newMutation) {
  if (!existingPendingEntry || existingPendingEntry.status !== OUTBOX_STATUS.PENDING) {
    return {
      action: "insert",
      mergedEntry: {
        userId: newMutation.userId,
        entity: newMutation.entity,
        clientUuid: newMutation.clientUuid,
        mutationType: newMutation.mutationType,
        payload: newMutation.payload,
        status: OUTBOX_STATUS.PENDING,
        attempts: 0,
        createdAt: newMutation.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };
  }

  const existingType = existingPendingEntry.mutationType;
  const nextType = newMutation.mutationType;

  // Skenario 1: Draft offline dibuat, lalu dihapus sebelum pernah dikirim ke server.
  // Karena server belum pernah mengetahui item ini, mutasi dibatalkan total (discard).
  if (existingType === MUTATION_TYPE.CREATE && nextType === MUTATION_TYPE.DELETE) {
    return {
      action: "discard",
      removeTargetId: existingPendingEntry.id,
    };
  }

  // Skenario 2: Draft offline dibuat, lalu mengalami update/autosave berulang.
  // Tetap pertahankan tipe CREATE, perbarui isi payload dengan data terbaru.
  if (existingType === MUTATION_TYPE.CREATE && nextType === MUTATION_TYPE.UPDATE) {
    return {
      action: "update_existing",
      targetId: existingPendingEntry.id,
      mergedEntry: {
        ...existingPendingEntry,
        payload: {
          ...existingPendingEntry.payload,
          ...newMutation.payload,
        },
        updatedAt: new Date().toISOString(),
      },
    };
  }

  // Skenario 3: Item yang sudah ada di-update berulang kali secara offline.
  // Ganti payload entri pending dengan data mutasi terakhir.
  if (existingType === MUTATION_TYPE.UPDATE && nextType === MUTATION_TYPE.UPDATE) {
    return {
      action: "update_existing",
      targetId: existingPendingEntry.id,
      mergedEntry: {
        ...existingPendingEntry,
        payload: {
          ...existingPendingEntry.payload,
          ...newMutation.payload,
        },
        updatedAt: new Date().toISOString(),
      },
    };
  }

  // Skenario 4: Item mengalami update lokal, lalu disusul perintah delete.
  // Ubah tipe mutasi menjadi DELETE dan gunakan payload penghapusan (tombstone).
  if (existingType === MUTATION_TYPE.UPDATE && nextType === MUTATION_TYPE.DELETE) {
    return {
      action: "update_existing",
      targetId: existingPendingEntry.id,
      mergedEntry: {
        ...existingPendingEntry,
        mutationType: MUTATION_TYPE.DELETE,
        payload: newMutation.payload,
        updatedAt: new Date().toISOString(),
      },
    };
  }

  // Skenario default: jika kombinasi lain tidak dapat di-coalesce, masukkan sebagai entri baru
  return {
    action: "insert",
    mergedEntry: {
      userId: newMutation.userId,
      entity: newMutation.entity,
      clientUuid: newMutation.clientUuid,
      mutationType: newMutation.mutationType,
      payload: newMutation.payload,
      status: OUTBOX_STATUS.PENDING,
      attempts: 0,
      createdAt: newMutation.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Menyimpan data lokal dan mencatat/meng-coalesce mutasi outbox dalam satu transaksi IndexedDB atomik.
 * Mendukung pemanggilan fleksibel:
 * 1. Format Objek: enqueueWithRow({ db, userId, entity, clientUuid, mutationType, row, payload })
 * 2. Format Posisional: enqueueWithRow(db, userId, entity, row, payload)
 *    atau enqueueWithRow(db, userId, entity, mutationType, row, payload)
 *
 * @param {object | import("dexie").Dexie} arg1
 * @param {string} [arg2]
 * @param {string} [arg3]
 * @param {any} [arg4]
 * @param {any} [arg5]
 * @param {any} [arg6]
 * @returns {Promise<{ action: string, outboxId?: number }>}
 */
export async function enqueueWithRow(arg1, arg2, arg3, arg4, arg5, arg6) {
  let db = localDb;
  let userId;
  let entity;
  let clientUuid;
  let mutationType;
  let row;
  let payload;

  if (
    arg1 &&
    typeof arg1 === "object" &&
    typeof arg2 === "string" &&
    typeof arg3 === "string"
  ) {
    // Skenario A: Pemanggilan posisional (db, userId, entity, row, payload)
    // atau (db, userId, entity, mutationType, row, payload)
    db = arg1;
    userId = arg2;
    entity = arg3;

    if (
      typeof arg4 === "string" &&
      (arg4 === "create" || arg4 === "update" || arg4 === "delete")
    ) {
      mutationType = arg4;
      row = arg5;
      payload = arg6 || row;
    } else {
      row = arg4;
      payload = arg5 || row;
    }
  } else if (arg1 && typeof arg1 === "object") {
    // Skenario B: Pemanggilan via objek konfigurasi
    db = arg1.db || localDb;
    userId = arg1.userId;
    entity = arg1.entity;
    clientUuid = arg1.clientUuid;
    mutationType = arg1.mutationType;
    row = arg1.row;
    payload = arg1.payload || row;
  }

  if (!userId || !entity || !row) {
    throw new Error("enqueueWithRow: Parameter userId, entity, dan row wajib diisi.");
  }

  clientUuid = clientUuid || row.clientUuid;
  if (!clientUuid) {
    throw new Error("enqueueWithRow: clientUuid tidak ditemukan pada data row.");
  }

  const targetTable = db[entity];
  if (!targetTable) {
    throw new Error(`enqueueWithRow: Entitas tabel '${entity}' tidak ditemukan pada database lokal.`);
  }

  return await db.transaction("rw", [targetTable, db.outbox], async () => {
    // Ambil baris lokal saat ini untuk menentukan mutationType dan partial update guard
    const existingLocal = await targetTable.get(clientUuid);

    // Auto-infer mutationType secara cerdas jika tidak dispesifikasi eksplisit
    let effectiveMutationType = mutationType;
    if (!effectiveMutationType) {
      if (row.deletedAt || payload?.deletedAt) {
        effectiveMutationType = MUTATION_TYPE.DELETE;
      } else if (!existingLocal) {
        effectiveMutationType = MUTATION_TYPE.CREATE;
      } else {
        effectiveMutationType = MUTATION_TYPE.UPDATE;
      }
    }

    // 1. Cari entri pending sebelumnya untuk entitas dan clientUuid yang sama (ambil yang terbaru)
    let existingEntry = null;
    const query = db.outbox
      .where("[userId+entity+clientUuid]")
      .equals([userId, entity, clientUuid]);

    if (query && typeof query.filter === "function") {
      const filtered = query.filter((item) => item.status === OUTBOX_STATUS.PENDING);
      if (typeof filtered.last === "function") {
        existingEntry = await filtered.last();
      } else if (typeof filtered.first === "function") {
        existingEntry = await filtered.first();
      }
    } else if (query && typeof query.first === "function") {
      existingEntry = await query.first();
    }

    const mutationPayload = payload || row;

    const plan = planCoalesce(existingEntry, {
      userId,
      entity,
      clientUuid,
      mutationType: effectiveMutationType,
      payload: mutationPayload,
    });

    if (plan.action === "discard") {
      // Hapus entri outbox dan hapus baris dari tabel lokal karena belum pernah tersinkron
      if (plan.removeTargetId) {
        await db.outbox.delete(plan.removeTargetId);
      }
      await targetTable.delete(clientUuid);
      return { action: "discard" };
    }

    // Ambil baris lokal saat ini untuk mempertahankan properti yang tidak diubah (partial update guard)
    const mergedLocalRow = {
      ...(existingLocal || {}),
      ...row,
      userId,
      clientUuid,
      pending: 1,
    };

    if (plan.action === "update_existing") {
      await db.outbox.put(plan.mergedEntry);
      await targetTable.put(mergedLocalRow);
      return { action: "update_existing", outboxId: plan.targetId };
    }

    // Default action: insert
    await targetTable.put(mergedLocalRow);
    const newId = await db.outbox.add(plan.mergedEntry);
    return { action: "insert", outboxId: newId };
  });
}

/**
 * Mengambil batch mutasi pending yang siap dikirim ke server.
 * Memastikan urutan dependensi topologis (categories -> notebookCategories -> tasks -> notebooks)
 * dan mengubah status entri terpilih menjadi 'processing' secara atomik.
 *
 * @param {import("dexie").Dexie} [db]
 * @param {string} userId
 * @param {number} [batchSize=SYNC_BATCH_SIZE]
 * @returns {Promise<Array<object>>}
 */
export async function takeBatch(db = localDb, userId, batchSize = SYNC_BATCH_SIZE) {
  if (!userId) {
    return [];
  }

  return await db.transaction("rw", [db.outbox], async () => {
    // Ambil seluruh entri pending untuk user ini
    const pendingItems = await db.outbox
      .where("[userId+status]")
      .equals([userId, OUTBOX_STATUS.PENDING])
      .sortBy("id");

    if (pendingItems.length === 0) {
      return [];
    }

    // Urutkan berdasarkan topologi entitas, lalu FIFO ID
    const entityRank = new Map(ENTITY_ORDER.map((name, idx) => [name, idx]));

    const sortedItems = [...pendingItems].sort((a, b) => {
      const rankA = entityRank.has(a.entity) ? entityRank.get(a.entity) : 99;
      const rankB = entityRank.has(b.entity) ? entityRank.get(b.entity) : 99;
      if (rankA !== rankB) {
        return rankA - rankB;
      }
      return a.id - b.id;
    });

    const selectedBatch = sortedItems.slice(0, batchSize);

    // Tandai status 'processing' untuk mencegah duplikasi pengiriman paralel
    const now = new Date().toISOString();
    for (const item of selectedBatch) {
      await db.outbox.update(item.id, {
        status: OUTBOX_STATUS.PROCESSING,
        updatedAt: now,
      });
    }

    return selectedBatch.map((item) => ({
      ...item,
      status: OUTBOX_STATUS.PROCESSING,
    }));
  });
}

/**
 * Mengonfirmasi hasil rekonsiliasi dari server (acknowledgment).
 * Menghapus entri outbox yang berhasil disinkronkan dan mereset flag pending = 0
 * pada tabel lokal bersangkutan.
 *
 * @param {import("dexie").Dexie} [db]
 * @param {string} userId
 * @param {object} results Objek mapping status per entitas dari respons /api/sync
 * @returns {Promise<{ acknowledgedCount: number, errorCount: number }>}
 */
export async function ack(db = localDb, userId, results = {}) {
  if (!userId || !results) {
    return { acknowledgedCount: 0, errorCount: 0 };
  }

  const tablesToLock = [db.outbox, db.tasks, db.categories, db.notebookCategories, db.notebooks];

  return await db.transaction("rw", tablesToLock, async () => {
    let acknowledgedCount = 0;
    let errorCount = 0;

    for (const entity of ENTITY_ORDER) {
      const itemResults = results[entity] || [];
      const targetTable = db[entity];

      for (const res of itemResults) {
        const { clientUuid, status, serverId, updatedAt, serverItem } = res;
        if (!clientUuid) continue;

        // Cari entri outbox yang sedang diproses untuk item ini (prioritaskan status processing)
        const itemQuery = db.outbox
          .where("[userId+entity+clientUuid]")
          .equals([userId, entity, clientUuid]);

        let outboxEntry = null;
        if (itemQuery && typeof itemQuery.filter === "function") {
          outboxEntry = await itemQuery.filter((item) => item.status === OUTBOX_STATUS.PROCESSING).first();
        }
        if (!outboxEntry && itemQuery && typeof itemQuery.first === "function") {
          outboxEntry = await itemQuery.first();
        }

        const isSuccessStatus =
          status === "created" ||
          status === "updated" ||
          status === "deleted" ||
          status === "noop";

        if (isSuccessStatus) {
          acknowledgedCount++;

          // Hapus entri outbox yang baru saja berhasil di-ack
          if (outboxEntry) {
            await db.outbox.delete(outboxEntry.id);
          }

          // Periksa apakah masih ada mutasi lokal pending lainnya untuk entitas & item ini
          let remainingPending = null;
          if (itemQuery && typeof itemQuery.filter === "function") {
            remainingPending = await itemQuery.filter((item) => item.status === OUTBOX_STATUS.PENDING).first();
          }

          const hasRemainingPending = Boolean(remainingPending);

          // Perbarui status lokal jika baris masih ada
          if (targetTable) {
            const localRow = await targetTable.get(clientUuid);
            if (localRow) {
              if (status === "deleted") {
                // Tandai tombstone lokal atau pertahankan pending jika masih ada mutasi lokal baru
                await targetTable.update(clientUuid, {
                  pending: hasRemainingPending ? 1 : 0,
                  deletedAt: updatedAt || new Date().toISOString(),
                  ...(serverId ? { serverId } : {}),
                });
              } else {
                await targetTable.update(clientUuid, {
                  pending: hasRemainingPending ? 1 : 0,
                  ...(serverId ? { serverId } : {}),
                  ...(updatedAt ? { updatedAt } : {}),
                });
              }
            }
          }
        } else if (status === "conflict") {
          // Konflik: Server-authoritative LWW menang. Hapus entri outbox yang kalah
          errorCount++;
          if (outboxEntry) {
            await db.outbox.delete(outboxEntry.id);
          }

          let remainingPending = null;
          if (itemQuery && typeof itemQuery.filter === "function") {
            remainingPending = await itemQuery.filter((item) => item.status === OUTBOX_STATUS.PENDING).first();
          }

          if (targetTable) {
            if (serverItem && typeof serverItem === "object") {
              await targetTable.put({
                ...serverItem,
                userId,
                clientUuid,
                pending: remainingPending ? 1 : 0,
              });
            } else {
              await targetTable.update(clientUuid, {
                pending: remainingPending ? 1 : 0,
              });
            }
          }
        } else if (status === "rejected" || status === "duplicate_name") {
          // Item ditolak permanen atau duplikat nama
          errorCount++;
          if (outboxEntry) {
            await db.outbox.update(outboxEntry.id, {
              status: OUTBOX_STATUS.FAILED,
              lastError: res.error ? `[${status}] ${res.error}` : `Item rejected by server: ${status}`,
            });
          }
          if (targetTable) {
            await targetTable.update(clientUuid, { pending: 0 });
          }
        }
      }
    }

    return { acknowledgedCount, errorCount };
  });
}

/**
 * Mengembalikan status seluruh item yang sedang 'processing' kembali ke 'pending'
 * ketika terjadi kegagalan jaringan atau server error (HTTP 5xx).
 *
 * @param {import("dexie").Dexie} [db]
 * @param {Array<number>} outboxIds
 * @param {string} [errorReason="Network error or sync failure"]
 * @returns {Promise<void>}
 */
export async function markFailedAll(db = localDb, outboxIds = [], errorReason = "Network error") {
  if (!outboxIds || outboxIds.length === 0) {
    return;
  }

  await db.transaction("rw", [db.outbox], async () => {
    const now = new Date().toISOString();
    for (const id of outboxIds) {
      const entry = await db.outbox.get(id);
      if (entry) {
        const nextAttempts = (entry.attempts || 0) + 1;
        await db.outbox.update(id, {
          status: OUTBOX_STATUS.PENDING,
          attempts: nextAttempts,
          lastError: String(errorReason),
          updatedAt: now,
        });
      }
    }
  });
}

/**
 * Menghitung total mutasi pending untuk seorang user.
 *
 * @param {import("dexie").Dexie} [db]
 * @param {string} userId
 * @returns {Promise<number>}
 */
export async function getPendingCount(db = localDb, userId) {
  if (!userId) return 0;
  return await db.outbox
    .where("[userId+status]")
    .equals([userId, OUTBOX_STATUS.PENDING])
    .count();
}

/**
 * Menghapus seluruh entri outbox milik seorang user.
 *
 * @param {import("dexie").Dexie} [db]
 * @param {string} userId
 * @returns {Promise<void>}
 */
export async function clearOutbox(db = localDb, userId) {
  if (!userId) return;
  await db.outbox.where("userId").equals(userId).delete();
}
