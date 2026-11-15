import test from "node:test";
import assert from "node:assert/strict";
import {
  planCoalesce,
  OUTBOX_STATUS,
  MUTATION_TYPE,
  enqueueWithRow,
  takeBatch,
  ack,
  markFailedAll,
  getPendingCount,
} from "../../lib/local/outbox.js";

test("planCoalesce: mengembalikan action 'insert' saat tidak ada entri pending sebelumnya", () => {
  const newMutation = {
    userId: "usr_1",
    entity: "tasks",
    clientUuid: "a0000000-0000-4000-8000-000000000001",
    mutationType: MUTATION_TYPE.CREATE,
    payload: { judul: "Tugas Baru Offline" },
  };

  const plan = planCoalesce(null, newMutation);

  assert.equal(plan.action, "insert");
  assert.equal(plan.mergedEntry.userId, "usr_1");
  assert.equal(plan.mergedEntry.entity, "tasks");
  assert.equal(plan.mergedEntry.clientUuid, "a0000000-0000-4000-8000-000000000001");
  assert.equal(plan.mergedEntry.mutationType, MUTATION_TYPE.CREATE);
  assert.equal(plan.mergedEntry.status, OUTBOX_STATUS.PENDING);
  assert.equal(plan.mergedEntry.attempts, 0);
  assert.deepEqual(plan.mergedEntry.payload, { judul: "Tugas Baru Offline" });
});

test("planCoalesce: tidak meng-coalesce entri yang sedang berstatus 'processing'", () => {
  const existingProcessingEntry = {
    id: 101,
    userId: "usr_1",
    entity: "tasks",
    clientUuid: "a0000000-0000-4000-8000-000000000001",
    mutationType: MUTATION_TYPE.CREATE,
    status: OUTBOX_STATUS.PROCESSING,
    payload: { judul: "Versi 1 Inflight" },
  };

  const newMutation = {
    userId: "usr_1",
    entity: "tasks",
    clientUuid: "a0000000-0000-4000-8000-000000000001",
    mutationType: MUTATION_TYPE.UPDATE,
    payload: { judul: "Versi 2 Baru" },
  };

  const plan = planCoalesce(existingProcessingEntry, newMutation);

  assert.equal(plan.action, "insert", "Harus membuat entri baru agar tidak merusak mutasi yang sedang terbang");
  assert.equal(plan.mergedEntry.status, OUTBOX_STATUS.PENDING);
});

test("planCoalesce: Skenario 1 - draft baru dibuat (CREATE) lalu langsung dihapus (DELETE) dibatalkan bersih (discard)", () => {
  const existingCreateEntry = {
    id: 42,
    userId: "usr_1",
    entity: "tasks",
    clientUuid: "a0000000-0000-4000-8000-000000000001",
    mutationType: MUTATION_TYPE.CREATE,
    status: OUTBOX_STATUS.PENDING,
    payload: { judul: "Draft Belum Pernah Sync" },
  };

  const deleteMutation = {
    userId: "usr_1",
    entity: "tasks",
    clientUuid: "a0000000-0000-4000-8000-000000000001",
    mutationType: MUTATION_TYPE.DELETE,
    payload: { deletedAt: new Date().toISOString() },
  };

  const plan = planCoalesce(existingCreateEntry, deleteMutation);

  assert.equal(plan.action, "discard");
  assert.equal(plan.removeTargetId, 42);
});

test("planCoalesce: Skenario 2 - draft baru (CREATE) mengalami autosave berulang (UPDATE) tetap mempertahankan tipe CREATE", () => {
  const existingCreateEntry = {
    id: 55,
    userId: "usr_1",
    entity: "notebooks",
    clientUuid: "b0000000-0000-4000-8000-000000000002",
    mutationType: MUTATION_TYPE.CREATE,
    status: OUTBOX_STATUS.PENDING,
    payload: { judul: "Catatan Baru", content: "Paragraf 1" },
  };

  const updateMutation = {
    userId: "usr_1",
    entity: "notebooks",
    clientUuid: "b0000000-0000-4000-8000-000000000002",
    mutationType: MUTATION_TYPE.UPDATE,
    payload: { content: "Paragraf 1 dan Paragraf 2" },
  };

  const plan = planCoalesce(existingCreateEntry, updateMutation);

  assert.equal(plan.action, "update_existing");
  assert.equal(plan.targetId, 55);
  assert.equal(plan.mergedEntry.mutationType, MUTATION_TYPE.CREATE);
  assert.equal(plan.mergedEntry.payload.judul, "Catatan Baru");
  assert.equal(plan.mergedEntry.payload.content, "Paragraf 1 dan Paragraf 2");
});

test("planCoalesce: Skenario 3 - entitas yang sudah ada di-update berulang (UPDATE + UPDATE) mengonsolidasi payload", () => {
  const existingUpdateEntry = {
    id: 77,
    userId: "usr_1",
    entity: "notebooks",
    clientUuid: "c0000000-0000-4000-8000-000000000003",
    mutationType: MUTATION_TYPE.UPDATE,
    status: OUTBOX_STATUS.PENDING,
    payload: { content: "Revisi 1", updatedAt: "2026-11-14T10:00:00.000Z" },
  };

  const secondUpdate = {
    userId: "usr_1",
    entity: "notebooks",
    clientUuid: "c0000000-0000-4000-8000-000000000003",
    mutationType: MUTATION_TYPE.UPDATE,
    payload: { content: "Revisi 2 Final", updatedAt: "2026-11-14T10:05:00.000Z" },
  };

  const plan = planCoalesce(existingUpdateEntry, secondUpdate);

  assert.equal(plan.action, "update_existing");
  assert.equal(plan.targetId, 77);
  assert.equal(plan.mergedEntry.mutationType, MUTATION_TYPE.UPDATE);
  assert.equal(plan.mergedEntry.payload.content, "Revisi 2 Final");
});

test("planCoalesce: Skenario 4 - update lokal yang disusul delete (UPDATE + DELETE) bertransisi menjadi DELETE final", () => {
  const existingUpdateEntry = {
    id: 88,
    userId: "usr_1",
    entity: "tasks",
    clientUuid: "d0000000-0000-4000-8000-000000000004",
    mutationType: MUTATION_TYPE.UPDATE,
    status: OUTBOX_STATUS.PENDING,
    payload: { judul: "Tugas Sudah Di-rename" },
  };

  const deleteMutation = {
    userId: "usr_1",
    entity: "tasks",
    clientUuid: "d0000000-0000-4000-8000-000000000004",
    mutationType: MUTATION_TYPE.DELETE,
    payload: { deletedAt: "2026-11-14T11:00:00.000Z" },
  };

  const plan = planCoalesce(existingUpdateEntry, deleteMutation);

  assert.equal(plan.action, "update_existing");
  assert.equal(plan.targetId, 88);
  assert.equal(plan.mergedEntry.mutationType, MUTATION_TYPE.DELETE);
  assert.equal(plan.mergedEntry.payload.deletedAt, "2026-11-14T11:00:00.000Z");
});

test("takeBatch: mengurutkan mutasi berdasarkan topologi entitas (kategori sebelum tugas)", async () => {
  const storedItems = [
    { id: 1, userId: "usr_1", entity: "tasks", status: OUTBOX_STATUS.PENDING, clientUuid: "t1" },
    { id: 2, userId: "usr_1", entity: "categories", status: OUTBOX_STATUS.PENDING, clientUuid: "c1" },
    { id: 3, userId: "usr_1", entity: "notebooks", status: OUTBOX_STATUS.PENDING, clientUuid: "n1" },
    { id: 4, userId: "usr_1", entity: "notebookCategories", status: OUTBOX_STATUS.PENDING, clientUuid: "nc1" },
    { id: 5, userId: "usr_1", entity: "tasks", status: OUTBOX_STATUS.PENDING, clientUuid: "t2" },
  ];

  const updatedIds = [];

  const mockDb = {
    outbox: {
      where: (index) => ({
        equals: (val) => ({
          sortBy: async () => storedItems.filter((i) => i.userId === val[0] && i.status === val[1]),
        }),
      }),
      update: async (id, changes) => {
        updatedIds.push({ id, changes });
      },
    },
    transaction: async (mode, tables, fn) => fn(),
  };

  const batch = await takeBatch(mockDb, "usr_1", 10);

  assert.equal(batch.length, 5);
  // Urutan topologi: categories -> notebookCategories -> tasks -> notebooks
  assert.equal(batch[0].entity, "categories");
  assert.equal(batch[1].entity, "notebookCategories");
  assert.equal(batch[2].entity, "tasks");
  assert.equal(batch[3].entity, "tasks");
  assert.equal(batch[4].entity, "notebooks");

  // Seluruh item ditandai status 'processing'
  assert.ok(batch.every((b) => b.status === OUTBOX_STATUS.PROCESSING));
  assert.equal(updatedIds.length, 5);
});

test("ack: menghapus item sukses dari outbox dan mengosongkan status pending tabel lokal", async () => {
  const outboxItems = [
    { id: 10, userId: "usr_1", entity: "tasks", clientUuid: "task_uuid_1" },
  ];
  const localRows = {
    task_uuid_1: { clientUuid: "task_uuid_1", pending: 1, judul: "Tugas" },
  };
  const deletedOutboxIds = [];

  const mockDb = {
    outbox: {
      where: () => ({
        equals: () => ({
          first: async () => outboxItems[0],
        }),
      }),
      delete: async (id) => {
        deletedOutboxIds.push(id);
      },
    },
    tasks: {
      get: async (uuid) => localRows[uuid],
      update: async (uuid, changes) => {
        Object.assign(localRows[uuid], changes);
      },
    },
    categories: { get: async () => null, update: async () => {} },
    notebookCategories: { get: async () => null, update: async () => {} },
    notebooks: { get: async () => null, update: async () => {} },
    transaction: async (mode, tables, fn) => fn(),
  };

  const results = {
    tasks: [
      {
        clientUuid: "task_uuid_1",
        status: "created",
        serverId: 999,
        updatedAt: "2026-11-14T12:00:00.000Z",
      },
    ],
  };

  const summary = await ack(mockDb, "usr_1", results);

  assert.equal(summary.acknowledgedCount, 1);
  assert.equal(deletedOutboxIds.includes(10), true);
  assert.equal(localRows.task_uuid_1.pending, 0);
  assert.equal(localRows.task_uuid_1.serverId, 999);
});

test("markFailedAll: mereset status entri processing kembali ke pending dan menambah counter attempts", async () => {
  const store = {
    10: { id: 10, status: OUTBOX_STATUS.PROCESSING, attempts: 1 },
    20: { id: 20, status: OUTBOX_STATUS.PROCESSING, attempts: 0 },
  };

  const mockDb = {
    outbox: {
      get: async (id) => store[id],
      update: async (id, changes) => {
        Object.assign(store[id], changes);
      },
    },
    transaction: async (mode, tables, fn) => fn(),
  };

  await markFailedAll(mockDb, [10, 20], "Network offline timeout");

  assert.equal(store[10].status, OUTBOX_STATUS.PENDING);
  assert.equal(store[10].attempts, 2);
  assert.equal(store[10].lastError, "Network offline timeout");

  assert.equal(store[20].status, OUTBOX_STATUS.PENDING);
  assert.equal(store[20].attempts, 1);
  assert.equal(store[20].lastError, "Network offline timeout");
});

test("getPendingCount: menghitung jumlah entri pending yang akurat", async () => {
  const mockDb = {
    outbox: {
      where: () => ({
        equals: () => ({
          count: async () => 7,
        }),
      }),
    },
  };

  const count = await getPendingCount(mockDb, "usr_1");
  assert.equal(count, 7);
});

test("enqueueWithRow: partial update guard mempertahankan properti lokal yang sudah ada tanpa menimpanya", async () => {
  const localTasks = {
    task_existing_1: {
      clientUuid: "task_existing_1",
      userId: "usr_1",
      serverId: 55,
      judul: "Tugas Judul Asli",
      deskripsi: "Deskripsi asli penting",
      prioritas: false,
      pending: 0,
    },
  };

  const outboxEntries = [];
  let nextOutboxId = 1;

  const mockDb = {
    tasks: {
      get: async (uuid) => localTasks[uuid] ? { ...localTasks[uuid] } : null,
      put: async (row) => {
        localTasks[row.clientUuid] = { ...row };
      },
      delete: async (uuid) => {
        delete localTasks[uuid];
      },
    },
    outbox: {
      where: () => ({
        equals: () => ({
          filter: () => ({
            first: async () => null,
            last: async () => null,
          }),
        }),
      }),
      add: async (entry) => {
        const id = nextOutboxId++;
        outboxEntries.push({ id, ...entry });
        return id;
      },
      put: async (entry) => {
        const idx = outboxEntries.findIndex((e) => e.id === entry.id);
        if (idx !== -1) outboxEntries[idx] = entry;
      },
      delete: async (id) => {
        const idx = outboxEntries.findIndex((e) => e.id === id);
        if (idx !== -1) outboxEntries.splice(idx, 1);
      },
    },
    transaction: async (mode, tables, fn) => fn(),
  };

  // Simulasikan offline edit parsial: hanya toggle prioritas
  const res = await enqueueWithRow({
    db: mockDb,
    userId: "usr_1",
    entity: "tasks",
    clientUuid: "task_existing_1",
    mutationType: "update",
    row: { prioritas: true },
  });

  assert.equal(res.action, "insert");
  assert.equal(localTasks.task_existing_1.prioritas, true);
  assert.equal(localTasks.task_existing_1.judul, "Tugas Judul Asli", "Judul asli WAJIB tetap ada!");
  assert.equal(localTasks.task_existing_1.deskripsi, "Deskripsi asli penting", "Deskripsi asli WAJIB tetap ada!");
  assert.equal(localTasks.task_existing_1.serverId, 55, "ServerId WAJIB tetap ada!");
  assert.equal(localTasks.task_existing_1.pending, 1, "Status pending harus 1!");
});

test("enqueueWithRow: action discard membatalkan draft dan menghapusnya dari tabel lokal", async () => {
  const localNotebooks = {
    nb_draft_1: {
      clientUuid: "nb_draft_1",
      userId: "usr_1",
      judul: "Draft Baru Offline",
      pending: 1,
    },
  };

  const outboxEntries = [
    {
      id: 99,
      userId: "usr_1",
      entity: "notebooks",
      clientUuid: "nb_draft_1",
      mutationType: "create",
      status: OUTBOX_STATUS.PENDING,
    },
  ];

  const mockDb = {
    notebooks: {
      get: async (uuid) => localNotebooks[uuid],
      delete: async (uuid) => {
        delete localNotebooks[uuid];
      },
      put: async () => {},
    },
    outbox: {
      where: () => ({
        equals: () => ({
          filter: () => ({
            first: async () => outboxEntries[0] || null,
            last: async () => outboxEntries[0] || null,
          }),
        }),
      }),
      delete: async (id) => {
        const idx = outboxEntries.findIndex((e) => e.id === id);
        if (idx !== -1) outboxEntries.splice(idx, 1);
      },
      put: async () => {},
      add: async () => 1,
    },
    transaction: async (mode, tables, fn) => fn(),
  };

  const res = await enqueueWithRow({
    db: mockDb,
    userId: "usr_1",
    entity: "notebooks",
    clientUuid: "nb_draft_1",
    mutationType: "delete",
    row: { deletedAt: new Date().toISOString() },
  });

  assert.equal(res.action, "discard");
  assert.equal(outboxEntries.length, 0, "Entri outbox harus dibatalkan");
  assert.equal(localNotebooks.nb_draft_1, undefined, "Baris lokal harus dihapus");
});

test("ack: in-flight race condition - tidak mengosongkan pending jika masih ada mutasi lokal pending baru", async () => {
  // Skenario: Entri 1 sedang 'processing' di server, tapi user sudah mengetik edit baru (Entri 2 'pending')
  const outboxEntries = [
    { id: 1, userId: "usr_1", entity: "tasks", clientUuid: "t_race", status: OUTBOX_STATUS.PROCESSING },
    { id: 2, userId: "usr_1", entity: "tasks", clientUuid: "t_race", status: OUTBOX_STATUS.PENDING },
  ];

  const localTasks = {
    t_race: { clientUuid: "t_race", pending: 1, judul: "Tugas Baru Diedit Lagi" },
  };

  const mockDb = {
    outbox: {
      where: () => ({
        equals: () => ({
          filter: (fn) => ({
            first: async () => outboxEntries.find(fn) || null,
          }),
        }),
      }),
      delete: async (id) => {
        const idx = outboxEntries.findIndex((e) => e.id === id);
        if (idx !== -1) outboxEntries.splice(idx, 1);
      },
    },
    tasks: {
      get: async (uuid) => localTasks[uuid],
      update: async (uuid, changes) => {
        Object.assign(localTasks[uuid], changes);
      },
    },
    categories: { get: async () => null, update: async () => {} },
    notebookCategories: { get: async () => null, update: async () => {} },
    notebooks: { get: async () => null, update: async () => {} },
    transaction: async (mode, tables, fn) => fn(),
  };

  const syncResults = {
    tasks: [
      { clientUuid: "t_race", status: "created", serverId: 777, updatedAt: "2026-11-14T12:00:00Z" },
    ],
  };

  const ackResult = await ack(mockDb, "usr_1", syncResults);

  assert.equal(ackResult.acknowledgedCount, 1);
  // Entri 1 yang processing harus dihapus, Entri 2 yang pending harus tetap ada!
  assert.equal(outboxEntries.some((e) => e.id === 1), false);
  assert.equal(outboxEntries.some((e) => e.id === 2), true);
  // Karena Entri 2 masih pending, localTasks.t_race.pending HARUS TETAP 1!
  assert.equal(localTasks.t_race.pending, 1, "pending lokal WAJIB tetap 1 karena ada mutasi pending yang belum sync!");
});

test("ack: resolusi conflict LWW memperbarui baris lokal dengan serverItem authoritative", async () => {
  const outboxEntries = [
    { id: 5, userId: "usr_1", entity: "tasks", clientUuid: "t_conflict", status: OUTBOX_STATUS.PROCESSING },
  ];

  const localTasks = {
    t_conflict: { clientUuid: "t_conflict", pending: 1, judul: "Versi Client Kalah" },
  };

  const mockDb = {
    outbox: {
      where: () => ({
        equals: () => ({
          filter: (fn) => ({
            first: async () => outboxEntries.find(fn) || null,
          }),
        }),
      }),
      delete: async (id) => {
        const idx = outboxEntries.findIndex((e) => e.id === id);
        if (idx !== -1) outboxEntries.splice(idx, 1);
      },
    },
    tasks: {
      get: async (uuid) => localTasks[uuid],
      put: async (row) => {
        localTasks[row.clientUuid] = { ...row };
      },
      update: async (uuid, changes) => {
        Object.assign(localTasks[uuid], changes);
      },
    },
    categories: { get: async () => null, update: async () => {}, put: async () => {} },
    notebookCategories: { get: async () => null, update: async () => {}, put: async () => {} },
    notebooks: { get: async () => null, update: async () => {}, put: async () => {} },
    transaction: async (mode, tables, fn) => fn(),
  };

  const syncResults = {
    tasks: [
      {
        clientUuid: "t_conflict",
        status: "conflict",
        serverItem: {
          serverId: 888,
          clientUuid: "t_conflict",
          judul: "Versi Server Pemenang LWW",
          updatedAt: "2026-11-14T15:00:00Z",
        },
      },
    ],
  };

  const ackResult = await ack(mockDb, "usr_1", syncResults);

  assert.equal(ackResult.errorCount, 1);
  assert.equal(outboxEntries.length, 0);
  assert.equal(localTasks.t_conflict.judul, "Versi Server Pemenang LWW");
  assert.equal(localTasks.t_conflict.pending, 0);
});

test("ack: penolakan duplicate_name menandai entri outbox FAILED dan bukan sukses", async () => {
  const outboxEntries = [
    { id: 9, userId: "usr_1", entity: "categories", clientUuid: "cat_dup", status: OUTBOX_STATUS.PROCESSING },
  ];

  const mockDb = {
    outbox: {
      where: () => ({
        equals: () => ({
          filter: (fn) => ({
            first: async () => outboxEntries.find(fn) || null,
          }),
        }),
      }),
      update: async (id, changes) => {
        const item = outboxEntries.find((e) => e.id === id);
        if (item) Object.assign(item, changes);
      },
      delete: async () => {},
    },
    tasks: { get: async () => null, update: async () => {} },
    categories: { get: async () => null, update: async () => {} },
    notebookCategories: { get: async () => null, update: async () => {} },
    notebooks: { get: async () => null, update: async () => {} },
    transaction: async (mode, tables, fn) => fn(),
  };

  const syncResults = {
    categories: [
      { clientUuid: "cat_dup", status: "duplicate_name", error: "Nama kategori sudah ada" },
    ],
  };

  const ackResult = await ack(mockDb, "usr_1", syncResults);

  assert.equal(ackResult.acknowledgedCount, 0, "Duplicate name tidak boleh dianggap sukses!");
  assert.equal(ackResult.errorCount, 1);
  assert.equal(outboxEntries[0].status, OUTBOX_STATUS.FAILED);
  assert.ok(outboxEntries[0].lastError.includes("duplicate_name"));
});

test("enqueueWithRow: pemanggilan posisional 5-argumen auto-infer CREATE saat baris belum ada", async () => {
  const localTasks = {};
  const outboxEntries = [];

  const mockDb = {
    tasks: {
      get: async (uuid) => localTasks[uuid],
      put: async (row) => {
        localTasks[row.clientUuid] = row;
      },
      delete: async (uuid) => {
        delete localTasks[uuid];
      },
    },
    outbox: {
      where: () => ({
        equals: () => ({
          filter: () => ({
            first: async () => null,
            last: async () => null,
          }),
        }),
      }),
      add: async (entry) => {
        const id = outboxEntries.length + 1;
        outboxEntries.push({ id, ...entry });
        return id;
      },
      put: async () => {},
      delete: async () => {},
    },
    transaction: async (mode, tables, fn) => fn(),
  };

  const taskRow = {
    clientUuid: "pos_task_1",
    userId: "usr_pos",
    judul: "Tugas Posisional",
    pending: 1,
  };

  const res = await enqueueWithRow(mockDb, "usr_pos", "tasks", taskRow, {
    judul: "Tugas Posisional",
  });

  assert.equal(res.action, "insert");
  assert.equal(outboxEntries.length, 1);
  assert.equal(outboxEntries[0].mutationType, "create");
  assert.equal(outboxEntries[0].payload.judul, "Tugas Posisional");
  assert.equal(localTasks.pos_task_1.judul, "Tugas Posisional");
  assert.equal(localTasks.pos_task_1.pending, 1);
});

test("enqueueWithRow: pemanggilan posisional auto-infer UPDATE saat baris sudah ada", async () => {
  const localTasks = {
    pos_task_existing: {
      clientUuid: "pos_task_existing",
      userId: "usr_pos",
      judul: "Judul Lama",
      selesai: false,
      pending: 0,
    },
  };
  const outboxEntries = [];

  const mockDb = {
    tasks: {
      get: async (uuid) => localTasks[uuid],
      put: async (row) => {
        localTasks[row.clientUuid] = row;
      },
      delete: async (uuid) => {
        delete localTasks[uuid];
      },
    },
    outbox: {
      where: () => ({
        equals: () => ({
          filter: () => ({
            first: async () => null,
            last: async () => null,
          }),
        }),
      }),
      add: async (entry) => {
        const id = outboxEntries.length + 1;
        outboxEntries.push({ id, ...entry });
        return id;
      },
      put: async () => {},
      delete: async () => {},
    },
    transaction: async (mode, tables, fn) => fn(),
  };

  const updatedRow = {
    ...localTasks.pos_task_existing,
    selesai: true,
  };

  const res = await enqueueWithRow(mockDb, "usr_pos", "tasks", updatedRow, {
    selesai: true,
  });

  assert.equal(res.action, "insert");
  assert.equal(outboxEntries.length, 1);
  assert.equal(outboxEntries[0].mutationType, "update");
  assert.equal(outboxEntries[0].payload.selesai, true);
  assert.equal(localTasks.pos_task_existing.selesai, true);
});

test("enqueueWithRow: pemanggilan posisional auto-infer DELETE saat ada deletedAt", async () => {
  const localTasks = {
    pos_task_del: {
      clientUuid: "pos_task_del",
      userId: "usr_pos",
      judul: "Tugas Hapus",
      pending: 0,
    },
  };
  const outboxEntries = [];

  const mockDb = {
    tasks: {
      get: async (uuid) => localTasks[uuid],
      put: async (row) => {
        localTasks[row.clientUuid] = row;
      },
      delete: async (uuid) => {
        delete localTasks[uuid];
      },
    },
    outbox: {
      where: () => ({
        equals: () => ({
          filter: () => ({
            first: async () => null,
            last: async () => null,
          }),
        }),
      }),
      add: async (entry) => {
        const id = outboxEntries.length + 1;
        outboxEntries.push({ id, ...entry });
        return id;
      },
      put: async () => {},
      delete: async () => {},
    },
    transaction: async (mode, tables, fn) => fn(),
  };

  const tombstone = {
    ...localTasks.pos_task_del,
    deletedAt: "2026-11-15T09:00:00.000Z",
  };

  const res = await enqueueWithRow(mockDb, "usr_pos", "tasks", tombstone, {
    deletedAt: tombstone.deletedAt,
  });

  assert.equal(res.action, "insert");
  assert.equal(outboxEntries.length, 1);
  assert.equal(outboxEntries[0].mutationType, "delete");
  assert.equal(outboxEntries[0].payload.deletedAt, tombstone.deletedAt);
});
