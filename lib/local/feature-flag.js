/**
 * Offline Sync Feature Flag
 * lib/local/feature-flag.js
 *
 * Mengontrol aktivasi arsitektur Offline-First (Dexie.js + Outbox Queue + Service Worker).
 * Default bernilai false (0) untuk menjaga stabilitas jalur legacy di production.
 * Dapat diaktifkan melalui NEXT_PUBLIC_OFFLINE_SYNC=1 di file .env.local.
 */

export const OFFLINE_SYNC_ENABLED =
  typeof process !== "undefined" &&
  Boolean(process.env && process.env.NEXT_PUBLIC_OFFLINE_SYNC === "1");

/**
 * Memeriksa apakah fitur offline sync sedang aktif di runtime.
 * Aman dipanggil di browser maupun SSR.
 *
 * @returns {boolean}
 */
export function isOfflineSyncActive() {
  return OFFLINE_SYNC_ENABLED;
}

export default isOfflineSyncActive;
