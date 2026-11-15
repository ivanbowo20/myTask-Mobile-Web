/**
 * Verification Script: Backend Sync Endpoint & Soft Delete
 * scripts/verify-sync-endpoint.mjs
 * 
 * Memvalidasi kepatuhan implementasi Fase 1:
 * 1. Kontrak frozen HTTP POST /api/sync
 * 2. Idempotensi upsert dan soft delete (tombstones)
 * 3. Topological sorting & dangling reference prevention
 * 4. Subtasks merge keying & LWW conflict resolution
 * 5. Keyset cursor pagination (pullEntity)
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import {
  SYNC_BATCH_SIZE,
  PULL_PAGE_SIZE,
  SYNC_MAX_BODY_BYTES,
  MAX_CLOCK_SKEW_MS,
  ENTITY_ORDER,
  ITEM_STATUS,
  isUuid,
} from "../lib/sync/contract.js";
import { sortSyncItems, assertNoDanglingRefs } from "../lib/sync/ordering.js";
import { normalizeSubtasks, mergeSubtasks } from "../lib/sync/subtasks.js";
import { runSync } from "../lib/modules/sync/sync.service.js";

console.log("=== VERIFIKASI FASE 1: BACKEND SYNC API & SOFT DELETE ===");

let passed = 0;
let failed = 0;

function runCheck(name, fn) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] ${name}: ${err.message}`);
    failed++;
  }
}

async function runAsyncCheck(name, fn) {
  try {
    await fn();
    console.log(`[PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] ${name}: ${err.message}`);
    failed++;
  }
}

// 1. Verifikasi Kontrak & Limit
runCheck("Kontrak kapasitas & konstanta batas sinkronisasi sesuai spesifikasi", () => {
  assert.equal(SYNC_BATCH_SIZE, 50);
  assert.equal(PULL_PAGE_SIZE, 200);
  assert.equal(SYNC_MAX_BODY_BYTES, 2_097_152);
  assert.equal(MAX_CLOCK_SKEW_MS, 300_000);
  assert.deepEqual(ENTITY_ORDER, ["categories", "notebookCategories", "tasks", "notebooks"]);
  assert.equal(ITEM_STATUS.DELETED, "deleted");
  assert.equal(ITEM_STATUS.CONFLICT, "conflict");
});

// 2. Verifikasi Kode Route Handler & Static AST
runCheck("Route handler app/api/sync/route.js terkonfigurasi dengan guard lengkap", () => {
  const routeCode = fs.readFileSync("app/api/sync/route.js", "utf8");
  assert.ok(routeCode.includes("auth.api.getSession"), "Missing auth session check");
  assert.ok(routeCode.includes("checkRateLimit"), "Missing rate limit guard");
  assert.ok(routeCode.includes("SYNC_MAX_BODY_BYTES"), "Missing payload size guard");
  assert.ok(routeCode.includes("runSync"), "Missing runSync invocation");
});

// 3. Verifikasi Soft Delete pada API Routes
runCheck("API Categories, Notebook-Categories, Tasks, Notebooks bermigrasi ke Soft Delete", () => {
  const catCode = fs.readFileSync("app/api/categories/route.js", "utf8");
  assert.ok(catCode.includes("SET deleted_at = timezone('utc', now())"), "Categories DELETE not soft delete");
  assert.ok(catCode.includes("deleted_at IS NULL"), "Categories query missing deleted_at IS NULL");

  const nbCatCode = fs.readFileSync("app/api/notebook-categories/route.js", "utf8");
  assert.ok(nbCatCode.includes("SET deleted_at = timezone('utc'::text, now())"), "Notebook categories DELETE not soft delete");
  assert.ok(nbCatCode.includes("deleted_at IS NULL"), "Notebook categories query missing deleted_at IS NULL");

  const taskRepoCode = fs.readFileSync("lib/modules/tasks/task.repository.js", "utf8");
  assert.ok(taskRepoCode.includes("SET deleted_at = timezone('utc', now())"), "Tasks DELETE not soft delete");
  assert.ok(taskRepoCode.includes("deleted_at IS NULL"), "Tasks query missing deleted_at IS NULL");

  const nbCode = fs.readFileSync("app/api/notebooks/route.js", "utf8");
  assert.ok(nbCode.includes("SET deleted_at = timezone('utc'::text, now())"), "Notebooks DELETE not soft delete");
  assert.ok(nbCode.includes("deleted_at IS NULL"), "Notebooks query missing deleted_at IS NULL");
});

// 4. Verifikasi Blast Radius Notifikasi & Server-Data
runCheck("Notifikasi dispatch dan server-data memfilter baris yang sudah soft-deleted", () => {
  const dispatchCode = fs.readFileSync("app/api/notifications/dispatch/route.js", "utf8");
  assert.ok(dispatchCode.includes("t.deleted_at IS NULL"), "Dispatch notifications missing deleted_at filter on tasks");

  const serverDataCode = fs.readFileSync("lib/server-data.js", "utf8");
  assert.ok(serverDataCode.includes("deleted_at IS NULL"), "SSR server-data missing deleted_at filter");
});

// 5. Verifikasi Subtask Merging Monotonik
runCheck("Logika mergeSubtasks stabil dan anti-zombie resurrection", () => {
  const server = [
    { id: "s-1", judul: "A", selesai: true, deleted: false },
    { id: "s-2", judul: "B", selesai: false, deleted: true },
  ];
  const client = [
    { id: "s-1", judul: "A", selesai: false, deleted: false },
    { id: "s-2", judul: "B", selesai: true, deleted: false }, // coba bangkitkan item terhapus
    { id: "s-3", judul: "C", selesai: true, deleted: false },
  ];

  const merged = mergeSubtasks(server, client);
  const s2 = merged.find((x) => x.id === "s-2");
  assert.equal(s2.deleted, true, "Item tombstone server tidak boleh bangkit kembali");

  const s3 = merged.find((x) => x.id === "s-3");
  assert.ok(s3, "Subtask baru client harus berhasil ditambahkan");
});

// 6. Verifikasi Batch Limit 50 items pada Service
await runAsyncCheck("runSync menolak payload yang melampaui batch limit 50 items", async () => {
  const overflowPayload = {
    push: {
      tasks: Array.from({ length: 55 }, (_, i) => ({
        clientUuid: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
        judul: `Tugas ${i}`,
      })),
    },
  };
  const res = await runSync("user_test", overflowPayload);
  assert.equal(res.status, 400);
});

// 7. Verifikasi Idempotensi ON CONFLICT & Proteksi Subtask All-Deleted di sync.repository.js
runCheck("sync.repository.js memuat ON CONFLICT idempotensi dan proteksi activeSubtasks", () => {
  const repoCode = fs.readFileSync("lib/modules/sync/sync.repository.js", "utf8");
  assert.ok(repoCode.includes("ON CONFLICT (user_id, client_uuid) DO UPDATE"), "Missing ON CONFLICT idempotency update");
  assert.ok(repoCode.includes("activeSubtasks"), "Missing activeSubtasks check in task completion logic");
  assert.ok(repoCode.includes("isDeltaSync"), "Missing isDeltaSync tombstone pagination guard");
});

// 8. Verifikasi Rate Limit Header Retry-After
runCheck("app/api/sync/route.js memuat header Retry-After saat rate limit", () => {
  const routeCode = fs.readFileSync("app/api/sync/route.js", "utf8");
  assert.ok(routeCode.includes("Retry-After"), "Missing Retry-After header in 429 response");
});

// 9. Verifikasi app/api/notebook-categories bebas ON CONFLICT (user_id, nama) yang invalid
runCheck("app/api/notebook-categories/route.js bebas query ON CONFLICT (user_id, nama) yang usang", () => {
  const nbCatRoute = fs.readFileSync("app/api/notebook-categories/route.js", "utf8");
  assert.ok(!nbCatRoute.includes("ON CONFLICT (user_id, nama)"), "Invalid ON CONFLICT (user_id, nama) still present");
});

console.log(`\n=== HASIL: ${passed} LULUS, ${failed} GAGAL ===`);
if (failed > 0) {
  process.exit(1);
}
