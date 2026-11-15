/**
 * Client-Side Storage Schema (Dexie.js)
 * lib/local/db.js
 *
 * Mengelola basis data IndexedDB lokal "mytask_offline" dengan Dexie.js v4.
 * Setiap row pada seluruh store menyimpan userId untuk isolasi data multi-tenant.
 */

import Dexie from "dexie";

export const DB_NAME = "mytask_offline";
export const DB_VERSION = 1;

export const DB_STORES_V1 = Object.freeze({
  tasks: "clientUuid, userId, serverId, kategoriClientUuid, updatedAt, deletedAt, pending, [userId+deletedAt], [userId+kategoriClientUuid]",
  categories: "clientUuid, userId, serverId, nama, updatedAt, deletedAt, pending, [userId+deletedAt]",
  notebookCategories: "clientUuid, userId, serverId, nama, updatedAt, deletedAt, pending, [userId+deletedAt]",
  notebooks: "clientUuid, userId, serverId, kategoriClientUuid, updatedAt, deletedAt, pending, [userId+deletedAt]",
  outbox: "++id, userId, entity, clientUuid, mutationType, status, attempts, createdAt, [userId+status], [userId+entity+clientUuid]",
  meta: "key, userId",
});

/**
 * Membuat dan mengonfigurasi instance Dexie.
 *
 * @param {string} name
 * @returns {Dexie}
 */
export function createLocalDb(name = DB_NAME) {
  const db = new Dexie(name);
  db.version(DB_VERSION).stores(DB_STORES_V1);
  return db;
}

/**
 * Instance kanonik basis data lokal aplikasi.
 */
export const localDb = createLocalDb(DB_NAME);

/**
 * Menghapus seluruh data milik user tertentu dari semua store lokal.
 * Digunakan saat logout atau pergantian akun untuk mencegah kebocoran data multi-tenant.
 *
 * @param {string} userId
 * @param {Dexie} [db]
 * @returns {Promise<void>}
 */
export async function purgeUserData(userId, db = localDb) {
  if (!userId || typeof userId !== "string") {
    return;
  }

  await db.transaction("rw", [db.tasks, db.categories, db.notebookCategories, db.notebooks, db.outbox, db.meta], async () => {
    await Promise.all([
      db.tasks.where("userId").equals(userId).delete(),
      db.categories.where("userId").equals(userId).delete(),
      db.notebookCategories.where("userId").equals(userId).delete(),
      db.notebooks.where("userId").equals(userId).delete(),
      db.outbox.where("userId").equals(userId).delete(),
      db.meta.where("userId").equals(userId).delete(),
    ]);
  });
}

/**
 * Menghapus basis data IndexedDB secara permanen dari browser.
 *
 * @param {Dexie} [db]
 * @returns {Promise<void>}
 */
export async function destroyLocalDb(db = localDb) {
  try {
    await db.delete();
  } catch (error) {
    console.error("[offline-db] Gagal menghapus database lokal:", error);
    throw error;
  }
}

export default localDb;
