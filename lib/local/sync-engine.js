/**
 * Client Sync Engine
 * lib/local/sync-engine.js
 *
 * Mengoordinasikan pertukaran data antara IndexedDB lokal (Dexie.js) dan endpoint /api/sync:
 * 1. flushOutbox: mengirim batch mutasi lokal per 50 item dengan backoff eksponensial.
 * 2. pullChanges: menarik delta perubahan dari server dengan keyset cursor pagination.
 * 3. syncAll: orkestrasi push-then-pull atomik dengan concurrency guard dan event conflict.
 */

import {
  ENTITY_ORDER,
  ITEM_STATUS,
  SYNC_BATCH_SIZE,
} from "../sync/contract.js";
import { localDb } from "./db.js";
import {
  takeBatch,
  ack,
  markFailedAll,
  getPendingCount,
  OUTBOX_STATUS,
} from "./outbox.js";

export const SYNC_ENDPOINT = "/api/sync";
const BASE_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30000;

// State sinkronisasi in-memory per user
const syncLocks = new Map();
const backoffTrackers = new Map();

/**
 * Menghitung durasi backoff eksponensial dengan jitter.
 *
 * @param {number} attempts
 * @param {number} [baseMs=1000]
 * @param {number} [maxMs=30000]
 * @returns {number}
 */
export function calculateBackoff(attempts, baseMs = BASE_BACKOFF_MS, maxMs = MAX_BACKOFF_MS) {
  const exponent = Math.min(attempts, 6);
  const backoff = Math.min(maxMs, baseMs * Math.pow(2, exponent));
  const jitter = Math.floor(Math.random() * 300);
  return backoff + jitter;
}

/**
 * Mengirimkan event ke window jika lingkungan browser tersedia.
 *
 * @param {string} eventName
 * @param {object} detail
 */
function emitBrowserEvent(eventName, detail = {}) {
  if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
    try {
      window.dispatchEvent(new CustomEvent(eventName, { detail }));
    } catch (_) {}
  }
}

/**
 * Membaca metadata kursor dan timestamp sinkronisasi terakhir untuk seorang user.
 *
 * @param {import("dexie").Dexie} db
 * @param {string} userId
 * @returns {Promise<{ lastSyncAt: string | null, cursors: object }>}
 */
export async function getSyncMeta(db = localDb, userId) {
  if (!userId) return { lastSyncAt: null, cursors: {} };

  const metaRows = await db.meta.where("userId").equals(userId).toArray();
  const metaMap = new Map(metaRows.map((r) => [r.key, r.value]));

  const lastSyncAt = metaMap.get(`lastSyncAt:${userId}`) || null;
  const cursors = {};

  for (const entity of ENTITY_ORDER) {
    const rawCursor = metaMap.get(`cursor:${userId}:${entity}`);
    if (rawCursor) {
      try {
        cursors[entity] = typeof rawCursor === "string" ? JSON.parse(rawCursor) : rawCursor;
      } catch (_) {
        cursors[entity] = null;
      }
    }
  }

  return { lastSyncAt, cursors };
}

/**
 * Menyimpan metadata kursor dan timestamp sinkronisasi ke tabel localDb.meta.
 *
 * @param {import("dexie").Dexie} db
 * @param {string} userId
 * @param {string} serverTime
 * @param {object} cursors
 * @returns {Promise<void>}
 */
export async function saveSyncMeta(db = localDb, userId, serverTime, cursors = {}) {
  if (!userId) return;

  const entriesToPut = [];

  if (serverTime) {
    entriesToPut.push({
      key: `lastSyncAt:${userId}`,
      userId,
      value: serverTime,
      updatedAt: new Date().toISOString(),
    });
  }

  for (const entity of ENTITY_ORDER) {
    if (cursors[entity] !== undefined) {
      entriesToPut.push({
        key: `cursor:${userId}:${entity}`,
        userId,
        value: cursors[entity] ? JSON.stringify(cursors[entity]) : null,
        updatedAt: new Date().toISOString(),
      });
    }
  }

  if (entriesToPut.length > 0) {
    await db.meta.bulkPut(entriesToPut);
  }
}

/**
 * Mengirimkan antrian mutasi outbox ke server dalam potongan batch (maksimal 50 item per batch).
 *
 * @param {string} userId
 * @param {object} [options]
 * @param {import("dexie").Dexie} [options.db=localDb]
 * @param {typeof fetch} [options.fetcher=fetch]
 * @param {string} [options.endpoint=SYNC_ENDPOINT]
 * @returns {Promise<{ ok: boolean, pushedCount: number, error?: string }>}
 */
export async function flushOutbox(userId, options = {}) {
  const db = options.db || localDb;
  const fetcher = options.fetcher || fetch;
  const endpoint = options.endpoint || SYNC_ENDPOINT;

  if (!userId) {
    return { ok: false, pushedCount: 0, error: "userId wajib diisi" };
  }

  let totalPushed = 0;
  const MAX_BATCHES = 20;
  let batchCount = 0;

  while (batchCount < MAX_BATCHES) {
    batchCount++;
    const batch = await takeBatch(db, userId, SYNC_BATCH_SIZE);
    if (!batch || batch.length === 0) {
      break;
    }

    const outboxIds = batch.map((item) => item.id);

    // Bentuk struktur payload push sesuai kontrak
    const pushPayload = {
      categories: [],
      notebookCategories: [],
      tasks: [],
      notebooks: [],
    };

    for (const item of batch) {
      if (pushPayload[item.entity]) {
        pushPayload[item.entity].push({
          clientUuid: item.clientUuid,
          mutationType: item.mutationType,
          ...item.payload,
        });
      }
    }

    const { lastSyncAt, cursors } = await getSyncMeta(db, userId);

    const requestBody = {
      since: lastSyncAt,
      cursors,
      clientTime: new Date().toISOString(),
      push: pushPayload,
    };

    try {
      const response = await fetcher(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => `HTTP ${response.status}`);
        await markFailedAll(db, outboxIds, `Server HTTP ${response.status}: ${errorText}`);
        emitBrowserEvent("mytask:outbox-changed", { userId, pendingCount: await getPendingCount(db, userId) });
        return { ok: false, pushedCount: totalPushed, error: errorText };
      }

      const data = await response.json();

      // Konfirmasi hasil push ke outbox dan update status baris lokal
      const ackResult = await ack(db, userId, data.results || {});
      totalPushed += ackResult.acknowledgedCount;

      // Reset entri batch yang tidak dikembalikan di results agar tidak tertahan di processing
      const acknowledgedUuids = new Set();
      for (const entity of ENTITY_ORDER) {
        for (const item of (data.results?.[entity] || [])) {
          if (item?.clientUuid) acknowledgedUuids.add(item.clientUuid);
        }
      }
      const unacknowledgedIds = batch
        .filter((item) => !acknowledgedUuids.has(item.clientUuid))
        .map((item) => item.id);

      if (unacknowledgedIds.length > 0) {
        await markFailedAll(db, unacknowledgedIds, "Item omitted from server reconciliation results");
      }

      // Deteksi adanya konflik dari hasil rekonsiliasi
      let hasConflict = false;
      for (const entity of ENTITY_ORDER) {
        const itemResults = (data.results && data.results[entity]) || [];
        for (const res of itemResults) {
          if (res.status === ITEM_STATUS.CONFLICT) {
            hasConflict = true;
            emitBrowserEvent("mytask:conflict", {
              userId,
              entity,
              clientUuid: res.clientUuid,
              detail: res,
            });
          }
        }
      }

      // Terapkan delta pull yang menyertai response
      if (data.pull) {
        await applyPullDelta(db, userId, data.pull);
      }

      // Perbarui kursor sync
      await saveSyncMeta(db, userId, data.serverTime, data.cursors || {});

      // Beritahu UI bahwa antrian outbox telah berkurang
      emitBrowserEvent("mytask:outbox-changed", {
        userId,
        pendingCount: await getPendingCount(db, userId),
        hasConflict,
      });

      // Hentikan perulangan jika batch terakhir < 50 item atau terdapat item yang diabaikan/gagal
      if (batch.length < SYNC_BATCH_SIZE || unacknowledgedIds.length > 0) {
        break;
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      await markFailedAll(db, outboxIds, errMsg);
      emitBrowserEvent("mytask:outbox-changed", {
        userId,
        pendingCount: await getPendingCount(db, userId),
      });
      return { ok: false, pushedCount: totalPushed, error: errMsg };
    }
  }

  return { ok: true, pushedCount: totalPushed };
}

/**
 * Menulis delta data dari server ke tabel lokal IndexedDB.
 * Mengabaikan penimpaan pada baris lokal yang saat ini berstatus pending = 1
 * kecuali jika terjadi server conflict override.
 *
 * @param {import("dexie").Dexie} db
 * @param {string} userId
 * @param {object} pullData Objek per entitas berisi array baris data dari server
 * @returns {Promise<void>}
 */
export async function applyPullDelta(db = localDb, userId, pullData = {}) {
  if (!userId || !pullData) return;

  const tablesToLock = [db.tasks, db.categories, db.notebookCategories, db.notebooks];

  await db.transaction("rw", tablesToLock, async () => {
    for (const entity of ENTITY_ORDER) {
      const rows = pullData[entity] || [];
      const table = db[entity];
      if (!table || rows.length === 0) continue;

      for (const serverRow of rows) {
        const clientUuid = serverRow.clientUuid;
        if (!clientUuid) continue;

        const existingLocal = await table.get(clientUuid);

        // Jika baris lokal memiliki mutasi pending, lindungi dari penimpaan pasif
        if (existingLocal && existingLocal.pending === 1) {
          continue;
        }

        // Jika baris server bertanda tombstone (deleted_at terisi)
        if (serverRow.deletedAt) {
          if (existingLocal) {
            await table.update(clientUuid, {
              ...serverRow,
              userId,
              pending: 0,
            });
          }
        } else {
          // Baris aktif normal: upsert ke tabel lokal dengan mempertahankan properti lokal jika ada
          await table.put({
            ...(existingLocal || {}),
            ...serverRow,
            userId,
            pending: 0,
          });
        }
      }
    }
  });
}

/**
 * Menarik seluruh delta perubahan dari server dengan pagination kursor keyset.
 *
 * @param {string} userId
 * @param {object} [options]
 * @param {import("dexie").Dexie} [options.db=localDb]
 * @param {typeof fetch} [options.fetcher=fetch]
 * @param {string} [options.endpoint=SYNC_ENDPOINT]
 * @returns {Promise<{ ok: boolean, pulledCount: number, error?: string }>}
 */
export async function pullChanges(userId, options = {}) {
  const db = options.db || localDb;
  const fetcher = options.fetcher || fetch;
  const endpoint = options.endpoint || SYNC_ENDPOINT;

  if (!userId) {
    return { ok: false, pulledCount: 0, error: "userId wajib diisi" };
  }

  let totalPulled = 0;
  let continuePaging = true;
  let pageCount = 0;
  const MAX_PAGES = 20; // Proteksi agar tidak infinite loop

  // Kunci initialSince di awal sesi pull agar pagination konsisten di seluruh halaman
  const { lastSyncAt: initialSince, cursors: initialCursors } = await getSyncMeta(db, userId);
  let activeCursors = { ...initialCursors };
  let latestServerTime = null;

  while (continuePaging && pageCount < MAX_PAGES) {
    pageCount++;

    const requestBody = {
      since: initialSince,
      cursors: activeCursors,
      clientTime: new Date().toISOString(),
      push: {}, // Pull-only request
    };

    try {
      const response = await fetcher(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => `HTTP ${response.status}`);
        return { ok: false, pulledCount: totalPulled, error: errorText };
      }

      const data = await response.json();

      let itemsInThisPage = 0;
      if (data.pull) {
        for (const entity of ENTITY_ORDER) {
          const rows = data.pull[entity] || [];
          itemsInThisPage += rows.length;
        }
        await applyPullDelta(db, userId, data.pull);
        totalPulled += itemsInThisPage;
      }

      if (data.serverTime) {
        latestServerTime = data.serverTime;
      }

      if (data.cursors) {
        activeCursors = { ...activeCursors, ...data.cursors };
      }

      // Simpan kursor halaman berjalan agar jika terputus, sesi berikutnya bisa lanjut
      await saveSyncMeta(db, userId, null, activeCursors);

      // Cek apakah masih ada halaman lanjutan
      const hasMore = data.hasMore || {};
      const stillHasMore = Object.values(hasMore).some(Boolean);

      if (!stillHasMore || itemsInThisPage === 0) {
        continuePaging = false;
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      return { ok: false, pulledCount: totalPulled, error: errMsg };
    }
  }

  // Setelah seluruh halaman selesai ditarik tuntas, perbarui lastSyncAt ke latestServerTime
  if (latestServerTime) {
    await saveSyncMeta(db, userId, latestServerTime, activeCursors);
  }

  return { ok: true, pulledCount: totalPulled };
}

/**
 * Menjalankan siklus sinkronisasi lengkap (push outbox lalu pull delta).
 * Dilengkapi dengan proteksi mutex (hanya 1 siklus sinkronisasi per user di satu waktu).
 *
 * @param {string} userId
 * @param {object} [options]
 * @param {import("dexie").Dexie} [options.db=localDb]
 * @param {typeof fetch} [options.fetcher=fetch]
 * @returns {Promise<{ ok: boolean, pushed: number, pulled: number, error?: string }>}
 */
export async function syncAll(userId, options = {}) {
  if (!userId) {
    return { ok: false, pushed: 0, pulled: 0, error: "userId wajib diisi" };
  }

  // Concurrency guard: jika sedang berjalan untuk user ini, hindari benturan
  if (syncLocks.get(userId)) {
    return { ok: true, pushed: 0, pulled: 0, skipped: true, reason: "Sync already in progress" };
  }

  syncLocks.set(userId, true);
  emitBrowserEvent("mytask:sync-start", { userId });

  try {
    // 1. Dorong mutasi antrian lokal ke server
    const flushResult = await flushOutbox(userId, options);

    // 2. Tarik delta perubahan terbaru dari server
    const pullResult = await pullChanges(userId, options);

    const isSuccess = flushResult.ok && pullResult.ok;
    const finalError = flushResult.error || pullResult.error;

    if (isSuccess) {
      backoffTrackers.set(userId, 0); // Reset retry counter
      emitBrowserEvent("mytask:synced", {
        userId,
        timestamp: new Date().toISOString(),
        pushed: flushResult.pushedCount,
        pulled: pullResult.pulledCount,
      });
    } else {
      const currentAttempts = (backoffTrackers.get(userId) || 0) + 1;
      backoffTrackers.set(userId, currentAttempts);
      emitBrowserEvent("mytask:sync-error", {
        userId,
        error: finalError,
        attempts: currentAttempts,
      });
    }

    return {
      ok: isSuccess,
      pushed: flushResult.pushedCount,
      pulled: pullResult.pulledCount,
      error: finalError,
    };
  } finally {
    syncLocks.delete(userId);
    emitBrowserEvent("mytask:sync-end", { userId });
  }
}
