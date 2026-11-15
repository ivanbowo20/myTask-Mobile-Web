import test from "node:test";
import assert from "node:assert/strict";
import { runSync } from "../../lib/modules/sync/sync.service.js";
import { SYNC_BATCH_SIZE, ITEM_STATUS } from "../../lib/sync/contract.js";

test("runSync: menolak userId kosong", async () => {
  const res = await runSync(null, {});
  assert.equal(res.status, 401);
  assert.match(res.error, /User ID diperlukan/i);
});

test("runSync: menolak batch push lebih dari SYNC_BATCH_SIZE (50 items)", async () => {
  const payload = {
    push: {
      tasks: Array.from({ length: 51 }, (_, i) => ({
        clientUuid: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
        judul: `Tugas ${i}`,
      })),
    },
  };

  const res = await runSync("user_test", payload);
  assert.equal(res.status, 400);
  assert.match(res.error, /melebihi batas maksimal 50/i);
});

test("runSync: clamping timestamp client yang berada di masa depan", async () => {
  const farFuture = new Date(Date.now() + 1_000_000).toISOString();
  const taskUuid = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const catUuid = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

  const payload = {
    push: {
      categories: [
        {
          clientUuid: catUuid,
          nama: "Kategori Masa Depan",
          updatedAt: farFuture,
        },
      ],
      tasks: [
        {
          clientUuid: taskUuid,
          kategoriClientUuid: catUuid,
          judul: "Tugas Masa Depan",
          updatedAt: farFuture,
        },
      ],
    },
  };

  const originalPool = globalThis._pgPool;
  const executedSqls = [];

  const mockClient = {
    query: async (sql, params = []) => {
      executedSqls.push({ sql, params });
      if (sql.includes("SELECT id, user_id, nama")) {
        return { rows: [] }; // category not existing
      }
      if (sql.includes("LOWER(nama) = LOWER($2)")) {
        return { rows: [] };
      }
      if (sql.includes("INSERT INTO public.categories")) {
        return { rows: [{ id: "100", updated_at: new Date() }] };
      }
      if (sql.includes("SELECT * FROM public.tasks")) {
        return { rows: [] }; // task not existing
      }
      if (sql.includes("INSERT INTO public.tasks")) {
        return { rows: [{ id: "200", updated_at: new Date() }] };
      }
      if (sql.includes("FROM public.categories") || sql.includes("FROM public.notebook_categories") || sql.includes("FROM public.tasks") || sql.includes("FROM public.notebooks")) {
        return { rows: [] }; // pull delta returns empty
      }
      return { rows: [] };
    },
    release: () => {},
  };

  globalThis._pgPool = {
    connect: async () => mockClient,
  };

  try {
    const res = await runSync("user_test", payload);
    assert.ok(res.results);
    assert.equal(res.results.categories[0].status, ITEM_STATUS.CREATED);
    assert.equal(res.results.tasks[0].status, ITEM_STATUS.CREATED);
    assert.ok(res.pull);
    assert.ok(res.cursors);
    assert.ok(res.hasMore);

    // Verifikasi bahwa payload.push.tasks[0].updatedAt telah di-clamp ke sekarang (tidak di masa depan)
    assert.ok(new Date(payload.push.tasks[0].updatedAt).getTime() <= Date.now() + 500);
  } finally {
    globalThis._pgPool = originalPool;
  }
});

test("runSync: menolak tugas yang merujuk kategoriClientUuid menggantung (dangling ref)", async () => {
  const taskUuid = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
  const nonexistentCatUuid = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

  const payload = {
    push: {
      tasks: [
        {
          clientUuid: taskUuid,
          kategoriClientUuid: nonexistentCatUuid,
          judul: "Tugas dengan Kategori Gaib",
        },
      ],
    },
  };

  const originalPool = globalThis._pgPool;
  const mockClient = {
    query: async (sql) => {
      if (sql.includes("SELECT id FROM public.categories WHERE user_id = $1 AND client_uuid = $2")) {
        return { rows: [] }; // kategori tidak ada di DB
      }
      return { rows: [] };
    },
    release: () => {},
  };

  globalThis._pgPool = {
    connect: async () => mockClient,
  };

  try {
    const res = await runSync("user_test", payload);
    assert.equal(res.results.tasks[0].status, ITEM_STATUS.REJECTED);
    assert.match(res.results.tasks[0].error, /Kategori tugas rujukan tidak ditemukan/i);
  } finally {
    globalThis._pgPool = originalPool;
  }
});

test("runSync: berhasil meresolusi kategoriClientUuid yang ada di DB dari sync sebelumnya", async () => {
  const taskUuid = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
  const existingCatUuid = "ffffffff-ffff-4fff-8fff-ffffffffffff";

  const payload = {
    push: {
      tasks: [
        {
          clientUuid: taskUuid,
          kategoriClientUuid: existingCatUuid,
          judul: "Tugas Berelasi Kategori Lama",
        },
      ],
    },
  };

  const originalPool = globalThis._pgPool;
  let catSelectCount = 0;

  const mockClient = {
    query: async (sql, params = []) => {
      if (sql.includes("SELECT id FROM public.categories WHERE user_id = $1 AND client_uuid = $2")) {
        catSelectCount++;
        return { rows: [{ id: "55" }] }; // kategori ditemukan di DB
      }
      if (sql.includes("SELECT * FROM public.tasks")) {
        return { rows: [] }; // tugas baru
      }
      if (sql.includes("SELECT COUNT(*)::int as count FROM public.tasks")) {
        return { rows: [{ count: 0 }] };
      }
      if (sql.includes("INSERT INTO public.tasks")) {
        assert.equal(params[1], 55, "kategoriId harus terisi 55");
        return { rows: [{ id: "303", updated_at: new Date() }] };
      }
      if (sql.includes("FROM public.categories") || sql.includes("FROM public.tasks") || sql.includes("FROM public.notebooks") || sql.includes("FROM public.notebook_categories")) {
        return { rows: [] };
      }
      return { rows: [] };
    },
    release: () => {},
  };

  globalThis._pgPool = {
    connect: async () => mockClient,
  };

  try {
    const res = await runSync("user_test", payload);
    assert.equal(res.results.tasks[0].status, ITEM_STATUS.CREATED);
    assert.equal(res.results.tasks[0].serverId, 303);
    // Verifikasi optimasi: SELECT ke kategori hanya boleh 1 kali karena di-cache in-memory
    assert.equal(catSelectCount, 1);
  } finally {
    globalThis._pgPool = originalPool;
  }
});
