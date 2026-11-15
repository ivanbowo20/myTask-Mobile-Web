import test from "node:test";
import assert from "node:assert/strict";
import { withTransaction } from "../../lib/db.js";
import {
  DB_NAME,
  DB_VERSION,
  DB_STORES_V1,
  createLocalDb,
  purgeUserData,
  destroyLocalDb,
} from "../../lib/local/db.js";

test("withTransaction menjalankan BEGIN, COMMIT, dan merilis client saat sukses", async () => {
  const queryLog = [];
  let releasedWith = null;

  const mockClient = {
    query: async (sql, params) => {
      queryLog.push(sql);
      return { rows: [] };
    },
    release: (destroy) => {
      releasedWith = destroy;
    },
  };

  const originalPool = globalThis._pgPool;
  globalThis._pgPool = {
    connect: async () => mockClient,
  };

  try {
    const result = await withTransaction(async (client) => {
      await client.query("SELECT 1");
      return "SUCCESS_VAL";
    });

    assert.equal(result, "SUCCESS_VAL");
    assert.deepEqual(queryLog, ["BEGIN", "SELECT 1", "COMMIT"]);
    assert.equal(releasedWith, false, "Client dirilis normal tanpa flag destroy saat transaksi sukses");
  } finally {
    globalThis._pgPool = originalPool;
  }
});

test("withTransaction menjalankan ROLLBACK, melempar error asli, dan merilis client dengan destroy saat terjadi error", async () => {
  const queryLog = [];
  let releasedWith = null;

  const mockClient = {
    query: async (sql) => {
      queryLog.push(sql);
      return { rows: [] };
    },
    release: (destroy) => {
      releasedWith = destroy;
    },
  };

  const originalPool = globalThis._pgPool;
  globalThis._pgPool = {
    connect: async () => mockClient,
  };

  try {
    const expectedErr = new Error("Simulated query failure");
    await assert.rejects(
      async () => {
        await withTransaction(async (client) => {
          await client.query("INSERT INTO tasks VALUES (1)");
          throw expectedErr;
        });
      },
      (err) => err === expectedErr
    );

    assert.deepEqual(queryLog, ["BEGIN", "INSERT INTO tasks VALUES (1)", "ROLLBACK"]);
    assert.equal(releasedWith, true, "Client harus dirilis dengan flag destroy saat terjadi error transaksi");
  } finally {
    globalThis._pgPool = originalPool;
  }
});

test("withTransaction tetap merilis client dan melempar error asli jika ROLLBACK gagal", async () => {
  const queryLog = [];
  let releasedWith = null;

  const mockClient = {
    query: async (sql) => {
      queryLog.push(sql);
      if (sql === "ROLLBACK") {
        throw new Error("Connection terminated during rollback");
      }
      return { rows: [] };
    },
    release: (destroy) => {
      releasedWith = destroy;
    },
  };

  const originalPool = globalThis._pgPool;
  globalThis._pgPool = {
    connect: async () => mockClient,
  };

  try {
    const originalErr = new Error("Primary transaction failure");
    await assert.rejects(
      async () => {
        await withTransaction(async () => {
          throw originalErr;
        });
      },
      (err) => err === originalErr
    );

    assert.deepEqual(queryLog, ["BEGIN", "ROLLBACK"]);
    assert.equal(releasedWith, true, "Client harus tetap dirilis saat rollback gagal");
  } finally {
    globalThis._pgPool = originalPool;
  }
});

test("localDb: DB_NAME dan DB_VERSION sesuai cetak biru kontrak", () => {
  assert.equal(DB_NAME, "mytask_offline");
  assert.equal(DB_VERSION, 1);
});

test("localDb: DB_STORES_V1 memuat 6 store wajib dan memiliki indeks multi-tenant userId pada setiap store", () => {
  const expectedStores = ["tasks", "categories", "notebookCategories", "notebooks", "outbox", "meta"];
  for (const store of expectedStores) {
    assert.ok(DB_STORES_V1[store], `Store '${store}' wajib terdefinisi di DB_STORES_V1`);
    assert.ok(
      DB_STORES_V1[store].includes("userId"),
      `Store '${store}' wajib menyertakan indeks multi-tenant 'userId'`
    );
  }
});

test("createLocalDb: menginisialisasi instance Dexie dengan nama dan skema yang tepat", () => {
  const db = createLocalDb("test_offline_db");
  assert.equal(db.name, "test_offline_db");
  assert.ok(db.tables.length >= 6);
});

test("purgeUserData: menghapus data multi-tenant di seluruh store untuk user tertentu", async () => {
  const deletedStores = [];

  const mockDb = {
    tasks: { where: (col) => ({ equals: (val) => ({ delete: async () => deletedStores.push(`tasks:${col}=${val}`) }) }) },
    categories: { where: (col) => ({ equals: (val) => ({ delete: async () => deletedStores.push(`categories:${col}=${val}`) }) }) },
    notebookCategories: { where: (col) => ({ equals: (val) => ({ delete: async () => deletedStores.push(`notebookCategories:${col}=${val}`) }) }) },
    notebooks: { where: (col) => ({ equals: (val) => ({ delete: async () => deletedStores.push(`notebooks:${col}=${val}`) }) }) },
    outbox: { where: (col) => ({ equals: (val) => ({ delete: async () => deletedStores.push(`outbox:${col}=${val}`) }) }) },
    meta: { where: (col) => ({ equals: (val) => ({ delete: async () => deletedStores.push(`meta:${col}=${val}`) }) }) },
    transaction: async (mode, tables, fn) => fn(),
  };

  await purgeUserData("usr_logout_123", mockDb);

  assert.equal(deletedStores.length, 6);
  assert.ok(deletedStores.includes("tasks:userId=usr_logout_123"));
  assert.ok(deletedStores.includes("categories:userId=usr_logout_123"));
  assert.ok(deletedStores.includes("notebookCategories:userId=usr_logout_123"));
  assert.ok(deletedStores.includes("notebooks:userId=usr_logout_123"));
  assert.ok(deletedStores.includes("outbox:userId=usr_logout_123"));
  assert.ok(deletedStores.includes("meta:userId=usr_logout_123"));
});

test("purgeUserData: no-op aman jika userId null atau bukan string", async () => {
  let called = false;
  const mockDb = {
    transaction: async () => {
      called = true;
    },
  };

  await purgeUserData(null, mockDb);
  await purgeUserData("", mockDb);
  await purgeUserData(12345, mockDb);

  assert.equal(called, false);
});

test("destroyLocalDb: memanggil db.delete() secara aman", async () => {
  let deleteCalled = false;
  const mockDb = {
    delete: async () => {
      deleteCalled = true;
    },
  };

  await destroyLocalDb(mockDb);
  assert.equal(deleteCalled, true);
});
