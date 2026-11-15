import test from "node:test";
import assert from "node:assert/strict";
import {
  saveSessionSnapshot,
  getSessionSnapshot,
  clearSessionSnapshot,
} from "../../lib/local/session-snapshot.js";

test("saveSessionSnapshot: menyimpan data identitas user yang bersih di meta store", async () => {
  const store = {};

  const mockDb = {
    meta: {
      put: async ({ key, userId, value, updatedAt }) => {
        store[key] = { userId, value, updatedAt };
      },
    },
  };

  await saveSessionSnapshot("usr_123", { name: "Budi", email: "budi@example.com", image: "https://avatar.png" }, mockDb);

  assert.ok(store["session_snapshot:usr_123"]);
  const saved = JSON.parse(store["session_snapshot:usr_123"].value);
  assert.equal(saved.id, "usr_123");
  assert.equal(saved.name, "Budi");
  assert.equal(saved.email, "budi@example.com");
  assert.equal(saved.image, "https://avatar.png");
  assert.ok(saved.savedAt);
});

test("saveSessionSnapshot: no-op aman saat userId atau userObject kosong", async () => {
  let putCalled = false;
  const mockDb = {
    meta: {
      put: async () => {
        putCalled = true;
      },
    },
  };

  await saveSessionSnapshot(null, { name: "A" }, mockDb);
  await saveSessionSnapshot("usr_1", null, mockDb);
  assert.equal(putCalled, false);
});

test("getSessionSnapshot: membaca data snapshot tersimpan dengan benar", async () => {
  const mockDb = {
    meta: {
      get: async (key) => {
        if (key === "session_snapshot:usr_456") {
          return {
            key,
            value: JSON.stringify({ id: "usr_456", name: "Siti", email: "siti@example.com" }),
          };
        }
        return null;
      },
    },
  };

  const snapshot = await getSessionSnapshot("usr_456", mockDb);
  assert.ok(snapshot);
  assert.equal(snapshot.id, "usr_456");
  assert.equal(snapshot.name, "Siti");

  const notFound = await getSessionSnapshot("usr_unknown", mockDb);
  assert.equal(notFound, null);
});

test("clearSessionSnapshot: menghapus snapshot user dari meta store", async () => {
  let deletedKey = null;

  const mockDb = {
    meta: {
      delete: async (key) => {
        deletedKey = key;
      },
    },
  };

  await clearSessionSnapshot("usr_789", mockDb);
  assert.equal(deletedKey, "session_snapshot:usr_789");
});
