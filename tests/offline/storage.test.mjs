import test from "node:test";
import assert from "node:assert/strict";
import {
  isQuotaError,
  ensurePersisted,
  pruneSyncedNotebooks,
} from "../../lib/local/storage.js";

test("isQuotaError: mendeteksi berbagai jenis error kuota penyimpanan peramban", () => {
  assert.equal(isQuotaError({ name: "QuotaExceededError" }), true);
  assert.equal(isQuotaError({ name: "NS_ERROR_DOM_QUOTA_REACHED" }), true);
  assert.equal(isQuotaError({ code: 22 }), true);
  assert.equal(isQuotaError({ code: 1014 }), true);
  assert.equal(isQuotaError(new Error("Storage quota exceeded on client")), true);

  assert.equal(isQuotaError(new Error("Network connection dropped")), false);
  assert.equal(isQuotaError(null), false);
  assert.equal(isQuotaError(undefined), false);
  assert.equal(isQuotaError({ code: 500 }), false);
});

test("ensurePersisted: mengembalikan false secara aman saat navigator tidak tersedia di lingkungan non-browser", async () => {
  const originalNav = globalThis.navigator;
  try {
    delete globalThis.navigator;
    const res = await ensurePersisted();
    assert.equal(res, false);
  } finally {
    globalThis.navigator = originalNav;
  }
});

test("pruneSyncedNotebooks: TIDAK PERNAH menghapus catatan materi yang sedang berstatus pending", async () => {
  const notebooksStore = [
    { clientUuid: "nb_pending_1", userId: "usr_1", judul: "Catatan Pending 1", pending: 1, updatedAt: "2026-01-01T00:00:00.000Z" },
    { clientUuid: "nb_pending_2", userId: "usr_1", judul: "Catatan Pending 2", pending: 1, updatedAt: "2026-01-02T00:00:00.000Z" },
    { clientUuid: "nb_synced_1", userId: "usr_1", judul: "Catatan Synced 1", pending: 0, updatedAt: "2026-01-03T00:00:00.000Z" },
  ];

  let deletedUuids = [];

  const mockDb = {
    notebooks: {
      where: () => ({
        equals: () => ({
          toArray: async () => [...notebooksStore],
        }),
      }),
      bulkDelete: async (uuids) => {
        deletedUuids = uuids;
      },
    },
    outbox: {
      where: () => ({
        equals: () => ({
          toArray: async () => [],
        }),
      }),
    },
    transaction: async (mode, tables, fn) => fn(),
  };

  // keepCount = 0 agar mencoba membersihkan semuanya
  const result = await pruneSyncedNotebooks({
    db: mockDb,
    userId: "usr_1",
    keepCount: 0,
    keepDays: 0,
  });

  assert.equal(result.prunedCount, 1, "Hanya catatan tersinkron yang boleh dihapus");
  assert.deepEqual(deletedUuids, ["nb_synced_1"]);
  assert.equal(deletedUuids.includes("nb_pending_1"), false, "Catatan pending 1 dilarang dihapus");
  assert.equal(deletedUuids.includes("nb_pending_2"), false, "Catatan pending 2 dilarang dihapus");
});

test("pruneSyncedNotebooks: melindungi catatan yang clientUuid-nya sedang berada di antrian outbox", async () => {
  const notebooksStore = [
    { clientUuid: "nb_in_outbox", userId: "usr_2", judul: "Catatan Outbox", pending: 0, updatedAt: "2025-01-01T00:00:00.000Z" },
    { clientUuid: "nb_old_synced", userId: "usr_2", judul: "Catatan Kuno", pending: 0, updatedAt: "2025-01-02T00:00:00.000Z" },
  ];

  let deletedUuids = [];

  const mockDb = {
    notebooks: {
      where: () => ({
        equals: () => ({
          toArray: async () => [...notebooksStore],
        }),
      }),
      bulkDelete: async (uuids) => {
        deletedUuids = uuids;
      },
    },
    outbox: {
      where: () => ({
        equals: () => ({
          toArray: async () => [
            { entity: "notebooks", clientUuid: "nb_in_outbox", status: "pending" },
          ],
        }),
      }),
    },
    transaction: async (mode, tables, fn) => fn(),
  };

  const result = await pruneSyncedNotebooks({
    db: mockDb,
    userId: "usr_2",
    keepCount: 0,
    keepDays: 0,
  });

  assert.equal(result.prunedCount, 1);
  assert.deepEqual(deletedUuids, ["nb_old_synced"]);
  assert.equal(deletedUuids.includes("nb_in_outbox"), false, "Catatan di outbox harus terlindungi");
});
