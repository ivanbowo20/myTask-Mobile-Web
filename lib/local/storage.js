/**
 * Local Storage Persistence & Quota Management
 * lib/local/storage.js
 *
 * Mengelola persistensi IndexedDB di peramban, mendeteksi error batas kuota (QuotaExceededError),
 * dan menyediakan fungsi pembersihan aman pruneSyncedNotebooks (hanya menghapus catatan yang sudah tersinkron).
 */

import { localDb } from "./db.js";

/**
 * Meminta browser memberikan izin persistent storage agar data IndexedDB tidak dihapus otomatis
 * saat disk perangkat sedang rendah (terutama pada peramban mobile WebKit/Chromium).
 *
 * @returns {Promise<boolean>} True jika storage berstatus persistent, false jika transient/gagal.
 */
export async function ensurePersisted() {
  if (typeof navigator === "undefined" || !navigator.storage || typeof navigator.storage.persist !== "function") {
    return false;
  }

  try {
    const isAlreadyPersisted = await navigator.storage.persisted();
    if (isAlreadyPersisted) {
      return true;
    }
    return await navigator.storage.persist();
  } catch (error) {
    console.warn("[storage] Gagal meminta persistent storage:", error);
    return false;
  }
}

/**
 * Memeriksa perkiraan sisa kuota dan penggunaan penyimpanan browser.
 *
 * @returns {Promise<{ quota: number, usage: number, percentUsed: number }>}
 */
export async function getStorageEstimate() {
  if (typeof navigator === "undefined" || !navigator.storage || typeof navigator.storage.estimate !== "function") {
    return { quota: 0, usage: 0, percentUsed: 0 };
  }

  try {
    const estimate = await navigator.storage.estimate();
    const quota = estimate.quota || 0;
    const usage = estimate.usage || 0;
    const percentUsed = quota > 0 ? Math.round((usage / quota) * 100) : 0;
    return { quota, usage, percentUsed };
  } catch (error) {
    console.warn("[storage] Gagal membaca storage estimate:", error);
    return { quota: 0, usage: 0, percentUsed: 0 };
  }
}

/**
 * Memeriksa apakah error yang terjadi merupakan QuotaExceededError dari browser.
 *
 * @param {unknown} error
 * @returns {boolean}
 */
export function isQuotaError(error) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const err = /** @type {{ name?: string, code?: number, message?: string }} */ (error);

  if (err.name === "QuotaExceededError" || err.name === "NS_ERROR_DOM_QUOTA_REACHED") {
    return true;
  }

  // Kode DOMException standar W3C
  if (err.code === 22 || err.code === 1014) {
    return true;
  }

  if (typeof err.message === "string" && /quota/i.test(err.message)) {
    return true;
  }

  return false;
}

/**
 * Membersihkan catatan materi (notebooks) lama yang SUDAH TERSINKRONKAN (pending === 0)
 * untuk membebaskan ruang disk lokal saat kuota browser mendekati batas.
 * 
 * ATURAN KESELAMATAN:
 * Fungsi ini DILARANG KERAS menghapus catatan yang berstatus pending (pending === 1)
 * atau catatan yang sedang berada di antrian outbox lokal.
 *
 * @param {object} params
 * @param {import("dexie").Dexie} [params.db=localDb]
 * @param {string} params.userId
 * @param {number} [params.keepCount=50] Jumlah catatan tersinkron terbaru yang wajib dipertahankan
 * @param {number} [params.keepDays=30] Jumlah hari retensi catatan tersinkron
 * @returns {Promise<{ prunedCount: number, remainingCount: number }>}
 */
export async function pruneSyncedNotebooks({
  db = localDb,
  userId,
  keepCount = 50,
  keepDays = 30,
}) {
  if (!userId) {
    return { prunedCount: 0, remainingCount: 0 };
  }

  return await db.transaction("rw", [db.notebooks, db.outbox], async () => {
    // 1. Ambil seluruh notebook milik user yang sudah tersinkron (pending !== 1)
    const allUserNotebooks = await db.notebooks
      .where("userId")
      .equals(userId)
      .toArray();

    const syncedNotebooks = allUserNotebooks.filter((nb) => nb.pending !== 1);
    const pendingNotebooks = allUserNotebooks.filter((nb) => nb.pending === 1);

    if (syncedNotebooks.length <= keepCount) {
      return {
        prunedCount: 0,
        remainingCount: allUserNotebooks.length,
      };
    }

    // 2. Kumpulkan clientUuid yang saat ini ada di antrian outbox (pending maupun processing) sebagai double-safety guard
    const outboxNotebookEntries = await db.outbox
      .where("userId")
      .equals(userId)
      .toArray();

    const outboxPendingUuids = new Set(
      outboxNotebookEntries
        .filter((entry) => entry.entity === "notebooks")
        .map((entry) => entry.clientUuid)
    );

    // 3. Urutkan dari yang paling baru ke yang paling lama
    syncedNotebooks.sort((a, b) => {
      const timeA = new Date(a.updatedAt || 0).getTime();
      const timeB = new Date(b.updatedAt || 0).getTime();
      return timeB - timeA;
    });

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - keepDays);
    const cutoffTimestamp = cutoffDate.getTime();

    const notebooksToKeep = [];
    const notebooksToPrune = [];

    for (let i = 0; i < syncedNotebooks.length; i++) {
      const nb = syncedNotebooks[i];

      // Proteksi mutlak: jangan sentuh jika ada di outbox
      if (outboxPendingUuids.has(nb.clientUuid)) {
        notebooksToKeep.push(nb);
        continue;
      }

      // Pertahankan minimal sejumlah keepCount catatan terbaru
      if (i < keepCount) {
        notebooksToKeep.push(nb);
        continue;
      }

      // Jika catatan lebih baru dari batas hari, pertahankan
      const nbTime = new Date(nb.updatedAt || 0).getTime();
      if (nbTime >= cutoffTimestamp) {
        notebooksToKeep.push(nb);
        continue;
      }

      notebooksToPrune.push(nb);
    }

    if (notebooksToPrune.length > 0) {
      const pruneUuids = notebooksToPrune.map((nb) => nb.clientUuid);
      await db.notebooks.bulkDelete(pruneUuids);
    }

    return {
      prunedCount: notebooksToPrune.length,
      remainingCount: notebooksToKeep.length + pendingNotebooks.length,
    };
  });
}
