/**
 * Session Snapshot for Offline Continuity
 * lib/local/session-snapshot.js
 *
 * Menyimpan snapshot identitas sesi aktif pengguna di IndexedDB (localDb.meta)
 * agar saat offline 7-14 hari aplikasi tidak me-redirect pengguna ke halaman login
 * akibat kegagalan request /api/auth/get-session.
 */

import { localDb } from "./db.js";

const SNAPSHOT_KEY_PREFIX = "session_snapshot:";

/**
 * Menyimpan snapshot session user di IndexedDB.
 *
 * @param {string} userId
 * @param {object} userObject
 * @param {import("dexie").Dexie} [db=localDb]
 * @returns {Promise<void>}
 */
export async function saveSessionSnapshot(userId, userObject, db = localDb) {
  if (!userId || !userObject || typeof userObject !== "object") {
    return;
  }

  const cleanUser = {
    id: userId,
    name: userObject.name || "Pengguna",
    email: userObject.email || "",
    image: userObject.image || null,
    savedAt: new Date().toISOString(),
  };

  try {
    await db.meta.put({
      key: `${SNAPSHOT_KEY_PREFIX}${userId}`,
      userId,
      value: JSON.stringify(cleanUser),
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn("[offline-session] Gagal menyimpan snapshot session:", err);
  }
}

/**
 * Mengambil snapshot session user yang tersimpan di IndexedDB saat offline.
 *
 * @param {string} userId
 * @param {import("dexie").Dexie} [db=localDb]
 * @returns {Promise<object|null>}
 */
export async function getSessionSnapshot(userId, db = localDb) {
  if (!userId) {
    return null;
  }

  try {
    const entry = await db.meta.get(`${SNAPSHOT_KEY_PREFIX}${userId}`);
    if (!entry || !entry.value) {
      return null;
    }
    return JSON.parse(entry.value);
  } catch (err) {
    console.warn("[offline-session] Gagal membaca snapshot session:", err);
    return null;
  }
}

/**
 * Menghapus snapshot session user saat logout.
 *
 * @param {string} userId
 * @param {import("dexie").Dexie} [db=localDb]
 * @returns {Promise<void>}
 */
export async function clearSessionSnapshot(userId, db = localDb) {
  if (!userId) {
    return;
  }

  try {
    await db.meta.delete(`${SNAPSHOT_KEY_PREFIX}${userId}`);
  } catch (err) {
    console.warn("[offline-session] Gagal menghapus snapshot session:", err);
  }
}
