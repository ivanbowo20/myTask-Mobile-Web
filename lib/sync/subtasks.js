/**
 * Pure Subtask Normalization & Merging Helpers
 * lib/sync/subtasks.js
 * 
 * Keyed by stable UUID (or existing id) to prevent duplicates, phantom resurrections,
 * and loss of concurrent offline edits.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function generateUuid() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/**
 * Memvalidasi dan membersihkan array sub-tugas.
 * Menghasilkan array objek sub-tugas dengan id stabil dan properti tersanitasi.
 * 
 * @param {Array} raw 
 * @returns {Array<{ id: string, judul: string, selesai: boolean, deleted: boolean }>}
 */
export function normalizeSubtasks(raw) {
  if (!Array.isArray(raw)) return [];

  return raw
    .slice(0, 15)
    .map((item) => {
      if (!item || typeof item !== "object") return null;

      const rawId = item.id != null ? String(item.id).trim() : "";
      const isExisting = rawId.length > 0;
      const id = isExisting ? rawId : generateUuid();

      const judul = typeof item.judul === "string" ? item.judul.trim().slice(0, 150) : "";
      const selesai = Boolean(item.selesai);
      const deleted = Boolean(item.deleted);

      return { id, judul, selesai, deleted, _isExisting: isExisting };
    })
    .filter((item) => item !== null && (item._isExisting || item.judul.length > 0 || item.deleted))
    .map(({ _isExisting, ...subtask }) => subtask);
}

/**
 * Menggabungkan sub-tugas dari server dan client berbasis id UUID stabil.
 * - Sub-tugas baru di server dipertahankan.
 * - Sub-tugas baru di client ditambahkan.
 * - Perubahan status (selesai/judul/deleted) di client diaplikasikan ke item bersangkutan.
 * - Tombstone bersifat monotonik: sekali dihapus (deleted: true) di salah satu sisi,
 *   sub-tugas tidak akan bangkit kembali (anti-zombie resurrection).
 * - Judul sebelumnya dipertahankan jika client hanya mengirim mutasi toggle selesai/delete.
 * 
 * @param {Array} serverArr 
 * @param {Array} clientArr 
 * @returns {Array<{ id: string, judul: string, selesai: boolean, deleted: boolean }>}
 */
export function mergeSubtasks(serverArr, clientArr) {
  const map = new Map();

  for (const item of normalizeSubtasks(serverArr)) {
    map.set(item.id, {
      id: item.id,
      judul: item.judul,
      selesai: item.selesai,
      deleted: item.deleted,
    });
  }

  for (const item of normalizeSubtasks(clientArr)) {
    const prev = map.get(item.id);
    if (prev) {
      map.set(item.id, {
        id: item.id,
        judul: item.judul && item.judul.length > 0 ? item.judul : prev.judul,
        selesai: item.selesai !== undefined ? Boolean(item.selesai) : prev.selesai,
        deleted: Boolean(prev.deleted || item.deleted),
      });
    } else if (item.judul && item.judul.length > 0 || item.deleted) {
      map.set(item.id, {
        id: item.id,
        judul: item.judul,
        selesai: Boolean(item.selesai),
        deleted: Boolean(item.deleted),
      });
    }
  }

  return Array.from(map.values());
}
