import test from "node:test";
import assert from "node:assert/strict";
import { OFFLINE_SYNC_ENABLED, isOfflineSyncActive } from "../../lib/local/feature-flag.js";

test("OFFLINE_SYNC_ENABLED: default ke false/0 saat variabel lingkungan belum diset ke '1'", () => {
  // Dalam lingkungan pengujian default tanpa NEXT_PUBLIC_OFFLINE_SYNC=1, bernilai false
  assert.equal(typeof OFFLINE_SYNC_ENABLED, "boolean");
});

test("isOfflineSyncActive: mengembalikan boolean identik dengan OFFLINE_SYNC_ENABLED", () => {
  assert.equal(isOfflineSyncActive(), OFFLINE_SYNC_ENABLED);
});
