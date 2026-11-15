import test from "node:test";
import assert from "node:assert/strict";
import { normalizeSubtasks, mergeSubtasks } from "../../lib/sync/subtasks.js";

test("client menambah sub-tugas baru tanpa menghapus milik server", () => {
  const server = [{ id: "3f8b89e4-4d8b-4ef9-8da7-1a0e10b147e8", judul: "Baca bab 1", selesai: true, deleted: false }];
  const client = [{ id: "e0c7a5f6-8a71-4648-9c5c-7d9a8e0f6b12", judul: "Baca bab 2", selesai: false, deleted: false }];
  const merged = mergeSubtasks(server, client);
  assert.deepEqual(merged.map((s) => s.id), [
    "3f8b89e4-4d8b-4ef9-8da7-1a0e10b147e8",
    "e0c7a5f6-8a71-4648-9c5c-7d9a8e0f6b12",
  ]);
});

test("tombstone sub-tugas tidak hilang setelah merge berikutnya", () => {
  const server = [
    { id: "3f8b89e4-4d8b-4ef9-8da7-1a0e10b147e8", judul: "A", selesai: false, deleted: false },
    { id: "e0c7a5f6-8a71-4648-9c5c-7d9a8e0f6b12", judul: "B", selesai: false, deleted: true },
  ];
  const client = [{ id: "3f8b89e4-4d8b-4ef9-8da7-1a0e10b147e8", judul: "A", selesai: true, deleted: false }];
  const merged = mergeSubtasks(server, client);
  assert.equal(merged.find((s) => s.id === "e0c7a5f6-8a71-4648-9c5c-7d9a8e0f6b12").deleted, true);
  assert.equal(merged.find((s) => s.id === "3f8b89e4-4d8b-4ef9-8da7-1a0e10b147e8").selesai, true);
});

test("anti-zombie resurrection: client offline dengan deleted:false tidak menghidupkan tombstone server", () => {
  const server = [
    { id: "3f8b89e4-4d8b-4ef9-8da7-1a0e10b147e8", judul: "Item Terhapus", selesai: false, deleted: true },
  ];
  // Client yang baru online mengirimkan state lokal lama (deleted: false)
  const client = [
    { id: "3f8b89e4-4d8b-4ef9-8da7-1a0e10b147e8", judul: "Item Terhapus", selesai: false, deleted: false },
  ];
  const merged = mergeSubtasks(server, client);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].deleted, true, "Tombstone harus tetap aktif (deleted: true) dan tidak bangkit kembali");
});

test("id sub-tugas baru otomatis di-generate dengan UUID yang valid", () => {
  const client = [{ judul: "Tanpa id", selesai: false }];
  const merged = mergeSubtasks([], client);
  assert.equal(merged.length, 1);
  assert.match(merged[0].id, /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
});

test("id non-UUID legacy dipertahankan stabil dan tidak terduplikasi", () => {
  const server = [{ id: "sub_1731600000000_1", judul: "Tugas Lama", selesai: false }];
  const client = [{ id: "sub_1731600000000_1", judul: "Tugas Lama", selesai: true }];
  const merged = mergeSubtasks(server, client);
  assert.equal(merged.length, 1, "Sub-tugas legacy tidak boleh terduplikasi menjadi 2 item");
  assert.equal(merged[0].id, "sub_1731600000000_1");
  assert.equal(merged[0].selesai, true);
});

test("client toggle selesai tanpa mengirim ulang judul mempertahankan judul asli", () => {
  const server = [{ id: "3f8b89e4-4d8b-4ef9-8da7-1a0e10b147e8", judul: "Beli kebutuhan dapur", selesai: false }];
  const client = [{ id: "3f8b89e4-4d8b-4ef9-8da7-1a0e10b147e8", selesai: true }];
  const merged = mergeSubtasks(server, client);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].judul, "Beli kebutuhan dapur");
  assert.equal(merged[0].selesai, true);
});

test("client menghapus sub-tugas tanpa mengirim ulang judul mempertahankan judul di tombstone", () => {
  const server = [{ id: "3f8b89e4-4d8b-4ef9-8da7-1a0e10b147e8", judul: "Arsip penting", selesai: false }];
  const client = [{ id: "3f8b89e4-4d8b-4ef9-8da7-1a0e10b147e8", deleted: true }];
  const merged = mergeSubtasks(server, client);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].judul, "Arsip penting");
  assert.equal(merged[0].deleted, true);
});

test("normalizeSubtasks membuang sub-tugas baru kosong tanpa id", () => {
  const normalized = normalizeSubtasks([
    null,
    undefined,
    { judul: "" },
    { judul: "   " },
    { judul: "Valid Task", selesai: 1 },
    { id: "e0c7a5f6-8a71-4648-9c5c-7d9a8e0f6b12", judul: "Deleted Task", deleted: true },
  ]);

  assert.equal(normalized.length, 2);
  assert.equal(normalized[0].judul, "Valid Task");
  assert.equal(normalized[0].selesai, true);
  assert.equal(normalized[1].deleted, true);
});

test("normalizeSubtasks membatasi maksimal 15 sub-tugas dan memotong judul > 150 karakter", () => {
  const lots = Array.from({ length: 25 }, (_, i) => ({
    id: `item-${i}`,
    judul: `Subtask ${i} ` + "x".repeat(200),
  }));
  const normalized = normalizeSubtasks(lots);
  assert.equal(normalized.length, 15);
  assert.ok(normalized[0].judul.length <= 150);
});

test("normalizeSubtasks dan mergeSubtasks menangani input null dan non-array secara aman", () => {
  assert.deepEqual(normalizeSubtasks(null), []);
  assert.deepEqual(normalizeSubtasks(undefined), []);
  assert.deepEqual(normalizeSubtasks("string"), []);
  assert.deepEqual(normalizeSubtasks({}), []);

  assert.deepEqual(mergeSubtasks(null, null), []);
  assert.deepEqual(mergeSubtasks([], null), []);
  assert.deepEqual(mergeSubtasks(null, []), []);
});

test("client memperbarui properti sub-tugas yang cocok id-nya", () => {
  const server = [{ id: "3f8b89e4-4d8b-4ef9-8da7-1a0e10b147e8", judul: "Draf Awal", selesai: false }];
  const client = [{ id: "3f8b89e4-4d8b-4ef9-8da7-1a0e10b147e8", judul: "Draf Revisi", selesai: true }];
  const merged = mergeSubtasks(server, client);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].judul, "Draf Revisi");
  assert.equal(merged[0].selesai, true);
});
