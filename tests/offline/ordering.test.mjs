import test from "node:test";
import assert from "node:assert/strict";
import { sortSyncItems, assertNoDanglingRefs } from "../../lib/sync/ordering.js";

test("kategori selalu sebelum tugas, notebookCategories sebelum notebooks", () => {
  const out = sortSyncItems({
    tasks: [{ clientUuid: "t1" }],
    notebooks: [{ clientUuid: "n1" }],
    categories: [{ clientUuid: "c1" }],
    notebookCategories: [{ clientUuid: "nc1" }],
  });
  assert.deepEqual(Object.keys(out), ["categories", "notebookCategories", "tasks", "notebooks"]);
  assert.equal(out.categories[0].clientUuid, "c1");
  assert.equal(out.notebookCategories[0].clientUuid, "nc1");
  assert.equal(out.tasks[0].clientUuid, "t1");
  assert.equal(out.notebooks[0].clientUuid, "n1");
});

test("sortSyncItems mengekstrak dari objek push jika dibungkus { push: ... }", () => {
  const out = sortSyncItems({
    push: {
      categories: [{ clientUuid: "c1" }],
      tasks: [{ clientUuid: "t1" }],
    },
  });
  assert.equal(out.categories.length, 1);
  assert.equal(out.tasks.length, 1);
  assert.deepEqual(out.notebookCategories, []);
  assert.deepEqual(out.notebooks, []);
});

test("sortSyncItems menangani payload kosong atau tipe non-objek dengan nilai default array", () => {
  for (const empty of [{}, null, undefined, "invalid", 123]) {
    const out = sortSyncItems(empty);
    assert.deepEqual(Object.keys(out), ["categories", "notebookCategories", "tasks", "notebooks"]);
    assert.deepEqual(out.categories, []);
    assert.deepEqual(out.notebookCategories, []);
    assert.deepEqual(out.tasks, []);
    assert.deepEqual(out.notebooks, []);
  }
});

test("assertNoDanglingRefs mendeteksi relasi kategori yang belum ada di database atau batch", () => {
  const dangling = assertNoDanglingRefs({
    push: {
      categories: [{ clientUuid: "cat-1" }],
      tasks: [
        { clientUuid: "task-valid", kategoriClientUuid: "cat-1" },
        { clientUuid: "task-dangling", kategoriClientUuid: "cat-unknown" },
        { clientUuid: "task-no-cat", kategoriClientUuid: null },
      ],
      notebookCategories: [{ clientUuid: "nb-cat-1" }],
      notebooks: [
        { clientUuid: "nb-valid", kategoriClientUuid: "nb-cat-1" },
        { clientUuid: "nb-dangling", kategoriClientUuid: "nb-cat-unknown" },
      ],
    },
  });

  assert.equal(dangling.length, 2);
  assert.deepEqual(dangling[0], {
    entity: "tasks",
    clientUuid: "task-dangling",
    reason: "missing_category",
  });
  assert.deepEqual(dangling[1], {
    entity: "notebooks",
    clientUuid: "nb-dangling",
    reason: "missing_category",
  });
});

test("assertNoDanglingRefs menerima kategori yang sudah tersimpan di database via Set atau Array", () => {
  const dangling = assertNoDanglingRefs({
    push: {
      tasks: [{ clientUuid: "task-1", kategoriClientUuid: "cat-already-in-db" }],
      notebooks: [{ clientUuid: "nb-1", kategoriClientUuid: "nb-cat-already-in-db" }],
    },
    knownCategoryUuids: new Set(["cat-already-in-db"]),
    knownNotebookCategoryUuids: new Set(["nb-cat-already-in-db"]),
  });

  assert.equal(dangling.length, 0);
});

test("assertNoDanglingRefs mengabaikan item yang sedang dihapus (tombstone)", () => {
  const dangling = assertNoDanglingRefs({
    push: {
      tasks: [
        { clientUuid: "task-deleted-tombstone", kategoriClientUuid: "cat-deleted", deletedAt: "2026-11-14T10:00:00Z" },
        { clientUuid: "task-deleted-flag", kategoriClientUuid: "cat-deleted", deleted: true },
      ],
      notebooks: [
        { clientUuid: "nb-deleted-tombstone", kategoriClientUuid: "nb-cat-deleted", deletedAt: "2026-11-14T10:00:00Z" },
      ],
    },
  });

  assert.equal(dangling.length, 0, "Item tombstone tidak boleh dianggap dangling karena akan dihapus");
});
