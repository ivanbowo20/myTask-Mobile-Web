/**
 * Sync Dependency Ordering & Dangling Reference Validation
 * lib/sync/ordering.js
 * 
 * Memastikan payload sinkronisasi diproses dalam urutan topologis yang benar:
 * 1. categories (induk dari tasks)
 * 2. notebookCategories (induk dari notebooks)
 * 3. tasks (bergantung pada categories)
 * 4. notebooks (bergantung pada notebookCategories)
 */

/**
 * Mengurutkan item sinkronisasi push ke dalam urutan ketergantungan topologis
 * sehingga kategori dibuat sebelum tugas atau catatan yang merujuknya.
 * Mendukung objek push langsung maupun dibungkus { push: ... }.
 * 
 * @param {Object} items 
 * @returns {{ categories: Array, notebookCategories: Array, tasks: Array, notebooks: Array }}
 */
export function sortSyncItems(items = {}) {
  const safeItems = items && typeof items === "object" ? items : {};
  const push = safeItems.push && typeof safeItems.push === "object" ? safeItems.push : safeItems;

  return {
    categories: Array.isArray(push.categories) ? push.categories : [],
    notebookCategories: Array.isArray(push.notebookCategories) ? push.notebookCategories : [],
    tasks: Array.isArray(push.tasks) ? push.tasks : [],
    notebooks: Array.isArray(push.notebooks) ? push.notebooks : [],
  };
}

function toIterableArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val[Symbol.iterator] === "function") return Array.from(val);
  return [];
}

/**
 * Memeriksa apakah ada tugas atau catatan materi yang merujuk kategoriClientUuid
 * yang tidak ditemukan baik pada batch push saat ini maupun daftar UUID kategori yang sudah ada.
 * Item yang menggantung dikembalikan agar bisa ditunda (defer), bukan digagalkan.
 * Item yang sedang dalam proses penghapusan (tombstone) tidak dianggap dangling.
 * 
 * @param {Object} payload 
 * @returns {Array<{ entity: string, clientUuid: string, reason: string }>}
 */
export function assertNoDanglingRefs(payload = {}) {
  const dangling = [];
  const safePayload = payload && typeof payload === "object" ? payload : {};
  const push = safePayload.push && typeof safePayload.push === "object" ? safePayload.push : safePayload;

  const categories = Array.isArray(push.categories) ? push.categories : [];
  const tasks = Array.isArray(push.tasks) ? push.tasks : [];
  const notebookCategories = Array.isArray(push.notebookCategories) ? push.notebookCategories : [];
  const notebooks = Array.isArray(push.notebooks) ? push.notebooks : [];

  const knownCategories = new Set([
    ...categories.map((c) => c?.clientUuid).filter(Boolean),
    ...toIterableArray(safePayload.knownCategoryUuids).filter(Boolean),
  ]);

  for (const task of tasks) {
    const isDeleted = Boolean(task?.deletedAt || task?.deleted);
    if (!isDeleted && task?.kategoriClientUuid && !knownCategories.has(task.kategoriClientUuid)) {
      dangling.push({
        entity: "tasks",
        clientUuid: task.clientUuid,
        reason: "missing_category",
      });
    }
  }

  const knownNotebookCategories = new Set([
    ...notebookCategories.map((nc) => nc?.clientUuid).filter(Boolean),
    ...toIterableArray(safePayload.knownNotebookCategoryUuids).filter(Boolean),
  ]);

  for (const notebook of notebooks) {
    const isDeleted = Boolean(notebook?.deletedAt || notebook?.deleted);
    if (!isDeleted && notebook?.kategoriClientUuid && !knownNotebookCategories.has(notebook.kategoriClientUuid)) {
      dangling.push({
        entity: "notebooks",
        clientUuid: notebook.clientUuid,
        reason: "missing_category",
      });
    }
  }

  return dangling;
}
