import test from "node:test";
import assert from "node:assert/strict";
import {
  SYNC_BATCH_SIZE,
  PULL_PAGE_SIZE,
  SYNC_MAX_BODY_BYTES,
  MAX_CLOCK_SKEW_MS,
  TOMBSTONE_RETENTION_DAYS,
  ENTITY_ORDER,
  ITEM_STATUS,
  isUuid,
} from "../../lib/sync/contract.js";

test("kontrak batas kapasitas dan limit sinkronisasi bernilai tepat", () => {
  assert.equal(SYNC_BATCH_SIZE, 50);
  assert.equal(PULL_PAGE_SIZE, 200);
  assert.equal(SYNC_MAX_BODY_BYTES, 2_097_152);
  assert.equal(MAX_CLOCK_SKEW_MS, 300_000);
  assert.equal(TOMBSTONE_RETENTION_DAYS, 90);
});

test("urutan entitas topologis dibekukan dan memiliki 4 entitas utama", () => {
  assert.deepEqual(ENTITY_ORDER, ["categories", "notebookCategories", "tasks", "notebooks"]);
  assert.throws(() => {
    // Memastikan array dibekukan
    ENTITY_ORDER.push("invalid");
  });
});

test("enum ITEM_STATUS dibekukan dan memuat seluruh status rekonsiliasi", () => {
  assert.equal(ITEM_STATUS.CREATED, "created");
  assert.equal(ITEM_STATUS.UPDATED, "updated");
  assert.equal(ITEM_STATUS.DELETED, "deleted");
  assert.equal(ITEM_STATUS.CONFLICT, "conflict");
  assert.equal(ITEM_STATUS.REJECTED, "rejected");
  assert.equal(ITEM_STATUS.DUPLICATE_NAME, "duplicate_name");
  assert.equal(ITEM_STATUS.NOOP, "noop");

  assert.throws(() => {
    ITEM_STATUS.NEW_STATUS = "test";
  });
});

test("isUuid memvalidasi format string UUID dengan akurat", () => {
  assert.equal(isUuid("3f8b89e4-4d8b-4ef9-8da7-1a0e10b147e8"), true);
  assert.equal(isUuid("c9bf9e57-1685-4c89-bafb-ff5af830be8a"), true);
  assert.equal(isUuid("3F8B89E4-4D8B-4EF9-8DA7-1A0E10B147E8"), true); // Uppercase
  assert.equal(isUuid("  3f8b89e4-4d8b-4ef9-8da7-1a0e10b147e8  "), true); // With whitespace padding

  assert.equal(isUuid("not-a-uuid"), false);
  assert.equal(isUuid(""), false);
  assert.equal(isUuid(null), false);
  assert.equal(isUuid(undefined), false);
  assert.equal(isUuid(12345), false);
  assert.equal(isUuid({}), false);
  // Invalid version (6)
  assert.equal(isUuid("3f8b89e4-4d8b-6ef9-8da7-1a0e10b147e8"), false);
  // Invalid variant (c)
  assert.equal(isUuid("3f8b89e4-4d8b-4ef9-cda7-1a0e10b147e8"), false);
  // Nil UUID
  assert.equal(isUuid("00000000-0000-0000-0000-000000000000"), false);
});
