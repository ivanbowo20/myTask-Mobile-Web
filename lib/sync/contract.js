/**
 * Frozen Synchronization Contract & Boundaries
 * lib/sync/contract.js
 * 
 * Mendefinisikan konstanta batas kapasitas, urutan entitas topologis,
 * status item rekonsiliasi, serta spesifikasi protokol HTTP untuk /api/sync.
 * Kontrak ini dibekukan (frozen) dan dipakai bersama oleh server dan client.
 */

export const SYNC_BATCH_SIZE = 50;
export const PULL_PAGE_SIZE = 200;
export const SYNC_MAX_BODY_BYTES = 2_097_152; // 2 MB
export const MAX_CLOCK_SKEW_MS = 300_000;    // 5 menit
export const TOMBSTONE_RETENTION_DAYS = 90;

export const ENTITY_ORDER = Object.freeze([
  "categories",
  "notebookCategories",
  "tasks",
  "notebooks",
]);

export const ITEM_STATUS = Object.freeze({
  CREATED: "created",
  UPDATED: "updated",
  DELETED: "deleted",
  CONFLICT: "conflict",
  REJECTED: "rejected",
  DUPLICATE_NAME: "duplicate_name",
  NOOP: "noop",
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Memvalidasi apakah sebuah string merupakan format UUID v1-v5 yang valid.
 * 
 * @param {unknown} value 
 * @returns {boolean}
 */
export function isUuid(value) {
  return typeof value === "string" && UUID_RE.test(value.trim());
}

/**
 * ==============================================================================
 * SPESIFIKASI KONTRAK HTTP: POST /api/sync
 * ==============================================================================
 * 
 * Request Body:
 * {
 *   since: string | null,                 // ISO UTC timestamp kursor delta terakhir; null = initial full snapshot
 *   cursors?: {                           // Keyset cursor pagination per entitas untuk pull batch lanjutan
 *     categories?: { updatedAt: string, id: number },
 *     notebookCategories?: { updatedAt: string, id: number },
 *     tasks?: { updatedAt: string, id: number },
 *     notebooks?: { updatedAt: string, id: number }
 *   },
 *   clientTime: string,                   // ISO UTC timestamp waktu lokal client (untuk audit skew)
 *   push: {                               // Mutasi lokal yang akan di-push ke server
 *     categories?:          SyncCategoryItem[],
 *     notebookCategories?:  SyncNotebookCategoryItem[],
 *     tasks?:               SyncTaskItem[],
 *     notebooks?:           SyncNotebookItem[]
 *   }
 * }
 * 
 * Response Body (HTTP 200 OK):
 * {
 *   serverTime: string,                   // ISO UTC timestamp server saat batch diproses
 *   results: {                            // Status rekonsiliasi per item yang di-push
 *     categories?:          ItemResult[],
 *     notebookCategories?:  ItemResult[],
 *     tasks?:               ItemResult[],
 *     notebooks?:           ItemResult[]
 *   },
 *   pull: {                               // Perubahan delta dari server yang belum dimiliki client
 *     categories:           CategoryRow[],
 *     notebookCategories:   NotebookCategoryRow[],
 *     tasks:                TaskRow[],
 *     notebooks:            NotebookRow[]
 *   },
 *   cursors: {
 *     categories?:          { updatedAt: string, id: number } | null,
 *     notebookCategories?:  { updatedAt: string, id: number } | null,
 *     tasks?:               { updatedAt: string, id: number } | null,
 *     notebooks?:           { updatedAt: string, id: number } | null
 *   },
 *   hasMore: {
 *     categories:           boolean,
 *     notebookCategories:   boolean,
 *     tasks:                boolean,
 *     notebooks:            boolean
 *   }
 * }
 * 
 * Aturan Integritas Data Baris (Row):
 * 1. Setiap baris (Row) wajib menyertakan:
 *    - clientUuid: string (UUID unik stabil)
 *    - serverId: number (bigint id PostgreSQL)
 *    - updatedAt: string (ISO timestamp server-authoritative)
 *    - deletedAt: string | null (tombstone)
 * 2. Baris Tasks & Notebooks wajib menyertakan kategoriClientUuid (bukan hanya kategori_id integer),
 *    sehingga client offline dapat langsung merelasikan entitas tanpa perlu menunggu resolusi integer.
 * ==============================================================================
 */
