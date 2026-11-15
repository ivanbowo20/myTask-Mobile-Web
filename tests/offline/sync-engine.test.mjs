import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateBackoff,
  flushOutbox,
  pullChanges,
  applyPullDelta,
  syncAll,
} from "../../lib/local/sync-engine.js";
import { OUTBOX_STATUS } from "../../lib/local/outbox.js";

test("calculateBackoff: menghasilkan durasi backoff eksponensial dalam batas yang wajar", () => {
  const b0 = calculateBackoff(0, 1000, 30000);
  assert.ok(b0 >= 1000 && b0 <= 1300, "Attempt 0 harus berkisar ~1000ms + jitter");

  const b3 = calculateBackoff(3, 1000, 30000);
  assert.ok(b3 >= 8000 && b3 <= 8300, "Attempt 3 harus berkisar ~8000ms + jitter");

  const b10 = calculateBackoff(10, 1000, 30000);
  assert.ok(b10 <= 30300, "Attempt tinggi tidak boleh melebihi maxBackoff + jitter");
});

test("flushOutbox: menolak eksekusi tanpa userId", async () => {
  const result = await flushOutbox(null);
  assert.equal(result.ok, false);
  assert.equal(result.pushedCount, 0);
});

test("flushOutbox: berhasil mengirim batch dan memproses respon rekonsiliasi server", async () => {
  const pendingOutbox = [
    {
      id: 1,
      userId: "usr_sync_1",
      entity: "tasks",
      clientUuid: "task_uuid_101",
      mutationType: "create",
      status: OUTBOX_STATUS.PENDING,
      payload: { judul: "Tugas Offline Baru" },
    },
  ];

  const localTasks = {
    task_uuid_101: { clientUuid: "task_uuid_101", pending: 1, judul: "Tugas Offline Baru" },
  };

  const metaStore = {};
  let capturedRequestBody = null;

  const mockDb = {
    outbox: {
      get: async (id) => pendingOutbox.find((i) => i.id === id),
      where: (idx) => ({
        equals: (val) => ({
          sortBy: async () => {
            if (idx === "[userId+status]") {
              return pendingOutbox.filter((i) => i.userId === val[0] && i.status === val[1]);
            }
            return pendingOutbox;
          },
          first: async () => {
            if (idx === "[userId+entity+clientUuid]") {
              return pendingOutbox.find((i) => i.userId === val[0] && i.entity === val[1] && i.clientUuid === val[2]);
            }
            return pendingOutbox[0] || null;
          },
          count: async () => {
            if (idx === "[userId+status]") {
              return pendingOutbox.filter((i) => i.userId === val[0] && i.status === val[1]).length;
            }
            return pendingOutbox.length;
          },
        }),
      }),
      update: async (id, changes) => {
        const item = pendingOutbox.find((i) => i.id === id);
        if (item) Object.assign(item, changes);
      },
      delete: async (id) => {
        const idx = pendingOutbox.findIndex((i) => i.id === id);
        if (idx !== -1) pendingOutbox.splice(idx, 1);
      },
    },
    tasks: {
      get: async (uuid) => localTasks[uuid],
      update: async (uuid, changes) => {
        Object.assign(localTasks[uuid], changes);
      },
      put: async (row) => {
        localTasks[row.clientUuid] = row;
      },
    },
    categories: { get: async () => null, update: async () => {}, put: async () => {} },
    notebookCategories: { get: async () => null, update: async () => {}, put: async () => {} },
    notebooks: { get: async () => null, update: async () => {}, put: async () => {} },
    meta: {
      where: () => ({
        equals: () => ({
          toArray: async () => Object.entries(metaStore).map(([key, value]) => ({ key, value })),
        }),
      }),
      bulkPut: async (entries) => {
        for (const e of entries) metaStore[e.key] = e.value;
      },
    },
    transaction: async (mode, tables, fn) => fn(),
  };

  const mockFetcher = async (url, options) => {
    capturedRequestBody = JSON.parse(options.body);
    return {
      ok: true,
      status: 200,
      json: async () => ({
        serverTime: "2026-11-14T12:00:00.000Z",
        results: {
          tasks: [
            {
              clientUuid: "task_uuid_101",
              status: "created",
              serverId: 888,
              updatedAt: "2026-11-14T12:00:00.000Z",
            },
          ],
        },
        pull: { categories: [], notebookCategories: [], tasks: [], notebooks: [] },
        cursors: {},
        hasMore: { categories: false, notebookCategories: false, tasks: false, notebooks: false },
      }),
    };
  };

  const res = await flushOutbox("usr_sync_1", {
    db: mockDb,
    fetcher: mockFetcher,
  });

  assert.equal(res.ok, true);
  assert.equal(res.pushedCount, 1);
  assert.equal(capturedRequestBody.push.tasks.length, 1);
  assert.equal(capturedRequestBody.push.tasks[0].clientUuid, "task_uuid_101");
  assert.equal(localTasks.task_uuid_101.pending, 0);
  assert.equal(localTasks.task_uuid_101.serverId, 888);
});

test("flushOutbox: menandai gagal saat server merespon HTTP 500 error", async () => {
  const pendingOutbox = [
    {
      id: 5,
      userId: "usr_sync_2",
      entity: "tasks",
      clientUuid: "task_err_5",
      status: OUTBOX_STATUS.PENDING,
      attempts: 0,
    },
  ];

  const mockDb = {
    outbox: {
      where: () => ({
        equals: () => ({
          sortBy: async () => pendingOutbox,
          count: async () => pendingOutbox.length,
        }),
      }),
      get: async (id) => pendingOutbox.find((i) => i.id === id),
      update: async (id, changes) => {
        const item = pendingOutbox.find((i) => i.id === id);
        if (item) Object.assign(item, changes);
      },
    },
    meta: {
      where: () => ({
        equals: () => ({
          toArray: async () => [],
        }),
      }),
    },
    transaction: async (mode, tables, fn) => fn(),
  };

  const mockFetcher = async () => ({
    ok: false,
    status: 500,
    text: async () => "Internal Database Error",
  });

  const res = await flushOutbox("usr_sync_2", {
    db: mockDb,
    fetcher: mockFetcher,
  });

  assert.equal(res.ok, false);
  assert.equal(pendingOutbox[0].status, OUTBOX_STATUS.PENDING);
  assert.equal(pendingOutbox[0].attempts, 1);
  assert.ok(pendingOutbox[0].lastError.includes("500"));
});

test("applyPullDelta: melindungi baris lokal yang sedang pending dari penimpaan pasif server", async () => {
  const localTasks = {
    local_uuid_pending: {
      clientUuid: "local_uuid_pending",
      judul: "Judul Lokal Baru Diedit",
      pending: 1,
    },
    local_uuid_synced: {
      clientUuid: "local_uuid_synced",
      judul: "Judul Lama",
      pending: 0,
    },
  };

  const mockDb = {
    tasks: {
      get: async (uuid) => localTasks[uuid],
      put: async (row) => {
        localTasks[row.clientUuid] = row;
      },
      update: async (uuid, changes) => {
        Object.assign(localTasks[uuid], changes);
      },
    },
    categories: { get: async () => null, put: async () => {}, update: async () => {} },
    notebookCategories: { get: async () => null, put: async () => {}, update: async () => {} },
    notebooks: { get: async () => null, put: async () => {}, update: async () => {} },
    transaction: async (mode, tables, fn) => fn(),
  };

  const pullData = {
    tasks: [
      {
        clientUuid: "local_uuid_pending",
        judul: "Judul Server Yang Seharusnya Ditolak Karena Lokal Masih Pending",
      },
      {
        clientUuid: "local_uuid_synced",
        judul: "Judul Server Yang Diterima",
      },
    ],
  };

  await applyPullDelta(mockDb, "usr_test", pullData);

  assert.equal(localTasks.local_uuid_pending.judul, "Judul Lokal Baru Diedit");
  assert.equal(localTasks.local_uuid_pending.pending, 1);
  assert.equal(localTasks.local_uuid_synced.judul, "Judul Server Yang Diterima");
  assert.equal(localTasks.local_uuid_synced.pending, 0);
});

test("syncAll: mencegah eksekusi paralel ganda dengan mutex syncLocks", async () => {
  let activeFetcherCalls = 0;

  const mockDb = {
    outbox: {
      where: () => ({ equals: () => ({ sortBy: async () => [], count: async () => 0 }) }),
    },
    meta: {
      where: () => ({ equals: () => ({ toArray: async () => [] }) }),
      bulkPut: async () => {},
    },
    tasks: { get: async () => null, put: async () => {} },
    categories: { get: async () => null, put: async () => {} },
    notebookCategories: { get: async () => null, put: async () => {} },
    notebooks: { get: async () => null, put: async () => {} },
    transaction: async (mode, tables, fn) => fn(),
  };

  const mockFetcher = async () => {
    activeFetcherCalls++;
    await new Promise((r) => setTimeout(r, 20));
    return {
      ok: true,
      status: 200,
      json: async () => ({
        serverTime: "2026-11-14T12:00:00.000Z",
        results: {},
        pull: {},
        cursors: {},
        hasMore: {},
      }),
    };
  };

  const [res1, res2] = await Promise.all([
    syncAll("usr_mutex_test", { db: mockDb, fetcher: mockFetcher }),
    syncAll("usr_mutex_test", { db: mockDb, fetcher: mockFetcher }),
  ]);

  const oneSkipped = res1.skipped || res2.skipped;
  assert.equal(oneSkipped, true, "Salah satu panggilan bersamaan harus di-skip oleh concurrency guard");
});

test("pullChanges: menjaga initialSince tetap konsisten di seluruh halaman pagination keyset", async () => {
  const metaStore = {
    "lastSyncAt:usr_pages": "2026-11-14T10:00:00.000Z",
  };
  const requestsMade = [];
  let pageCounter = 0;

  const mockDb = {
    meta: {
      where: () => ({
        equals: () => ({
          toArray: async () => Object.entries(metaStore).map(([key, value]) => ({ key, value })),
        }),
      }),
      bulkPut: async (entries) => {
        for (const e of entries) metaStore[e.key] = e.value;
      },
    },
    tasks: { get: async () => null, put: async () => {} },
    categories: { get: async () => null, put: async () => {} },
    notebookCategories: { get: async () => null, put: async () => {} },
    notebooks: { get: async () => null, put: async () => {} },
    transaction: async (mode, tables, fn) => fn(),
  };

  const mockFetcher = async (url, options) => {
    pageCounter++;
    const body = JSON.parse(options.body);
    requestsMade.push(body);

    if (pageCounter === 1) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          serverTime: "2026-11-14T10:05:00.000Z",
          pull: {
            categories: [],
            notebookCategories: [],
            tasks: [{ clientUuid: "t_page_1", judul: "Tugas Page 1" }],
            notebooks: [],
          },
          cursors: { tasks: { updatedAt: "2026-11-14T10:02:00.000Z", id: 10 } },
          hasMore: { tasks: true, categories: false, notebookCategories: false, notebooks: false },
        }),
      };
    }

    return {
      ok: true,
      status: 200,
      json: async () => ({
        serverTime: "2026-11-14T10:05:00.000Z",
        pull: {
          categories: [],
          notebookCategories: [],
          tasks: [{ clientUuid: "t_page_2", judul: "Tugas Page 2" }],
          notebooks: [],
        },
        cursors: { tasks: null },
        hasMore: { tasks: false, categories: false, notebookCategories: false, notebooks: false },
      }),
    };
  };

  const result = await pullChanges("usr_pages", { db: mockDb, fetcher: mockFetcher });

  assert.equal(result.ok, true);
  assert.equal(result.pulledCount, 2);
  assert.equal(requestsMade.length, 2);

  // Initial since WAJIB sama di halaman 1 dan halaman 2!
  assert.equal(requestsMade[0].since, "2026-11-14T10:00:00.000Z");
  assert.equal(requestsMade[1].since, "2026-11-14T10:00:00.000Z", "Halaman 2 dilarang menimpa initial since di tengah jalan!");
  assert.deepEqual(requestsMade[1].cursors.tasks, { updatedAt: "2026-11-14T10:02:00.000Z", id: 10 });
  // Setelah tuntas, lastSyncAt baru diupdate ke serverTime akhir
  assert.equal(metaStore["lastSyncAt:usr_pages"], "2026-11-14T10:05:00.000Z");
});

test("flushOutbox: mengembalikan entri batch yang tidak terdapat pada results server kembali ke pending", async () => {
  const pendingOutbox = [
    {
      id: 11,
      userId: "usr_omit",
      entity: "tasks",
      clientUuid: "task_ack_1",
      status: OUTBOX_STATUS.PENDING,
      attempts: 0,
    },
    {
      id: 12,
      userId: "usr_omit",
      entity: "tasks",
      clientUuid: "task_omitted_2",
      status: OUTBOX_STATUS.PENDING,
      attempts: 0,
    },
  ];

  const mockDb = {
    outbox: {
      where: (idx) => ({
        equals: (val) => ({
          sortBy: async () => pendingOutbox.filter((i) => i.userId === val[0] && i.status === val[1]),
          first: async () => pendingOutbox.find((i) => i.userId === val[0] && i.entity === val[1] && i.clientUuid === val[2]),
          count: async () => pendingOutbox.length,
        }),
      }),
      get: async (id) => pendingOutbox.find((i) => i.id === id),
      update: async (id, changes) => {
        const item = pendingOutbox.find((i) => i.id === id);
        if (item) Object.assign(item, changes);
      },
      delete: async (id) => {
        const idx = pendingOutbox.findIndex((i) => i.id === id);
        if (idx !== -1) pendingOutbox.splice(idx, 1);
      },
    },
    tasks: {
      get: async () => ({ clientUuid: "task_ack_1", pending: 1 }),
      update: async () => {},
      put: async () => {},
    },
    categories: { get: async () => null, update: async () => {}, put: async () => {} },
    notebookCategories: { get: async () => null, update: async () => {}, put: async () => {} },
    notebooks: { get: async () => null, update: async () => {}, put: async () => {} },
    meta: {
      where: () => ({ equals: () => ({ toArray: async () => [] }) }),
      bulkPut: async () => {},
    },
    transaction: async (mode, tables, fn) => fn(),
  };

  const mockFetcher = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      serverTime: "2026-11-14T12:00:00.000Z",
      // Hanya mengembalikan task_ack_1; task_omitted_2 diabaikan oleh server
      results: {
        tasks: [{ clientUuid: "task_ack_1", status: "created", serverId: 101 }],
      },
      pull: {},
      cursors: {},
      hasMore: {},
    }),
  });

  const res = await flushOutbox("usr_omit", { db: mockDb, fetcher: mockFetcher });

  assert.equal(res.ok, true);
  // task_ack_1 terhapus dari outbox
  assert.equal(pendingOutbox.some((i) => i.id === 11), false);
  // task_omitted_2 dikembalikan statusnya ke PENDING dengan attempts = 1
  const omittedEntry = pendingOutbox.find((i) => i.id === 12);
  assert.ok(omittedEntry);
  assert.equal(omittedEntry.status, OUTBOX_STATUS.PENDING);
  assert.equal(omittedEntry.attempts, 1);
});
