import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveCategoryId,
  resolveNotebookCategoryId,
  upsertCategory,
  upsertNotebookCategory,
  upsertTask,
  upsertNotebook,
  pullEntity,
} from "../../lib/modules/sync/sync.repository.js";
import { ITEM_STATUS } from "../../lib/sync/contract.js";

/**
 * Mock PostgreSQL Client builder untuk memverifikasi eksekusi SQL secara presisi
 */
function createMockClient(queryHandler) {
  const queries = [];
  return {
    queries,
    async query(sql, params = []) {
      queries.push({ sql, params });
      return queryHandler(sql, params);
    },
  };
}

test("upsertCategory: menolak payload tanpa clientUuid valid", async () => {
  const client = createMockClient(() => ({ rows: [] }));
  const res = await upsertCategory(client, "user_1", { nama: "Kerja" });
  assert.equal(res.status, ITEM_STATUS.REJECTED);
  assert.match(res.error, /clientUuid valid diperlukan/i);
});

test("upsertCategory: soft delete kategori yang ada dan unassign tugas terkait", async () => {
  const categoryUuid = "11111111-1111-4111-8111-111111111111";
  const nowIso = new Date().toISOString();

  const client = createMockClient((sql, params) => {
    if (sql.includes("SELECT id, user_id, nama")) {
      return {
        rows: [
          {
            id: "10",
            user_id: "user_1",
            nama: "Kerja",
            warna: "#000",
            icon: "Briefcase",
            client_uuid: categoryUuid,
            updated_at: new Date(nowIso),
            deleted_at: null,
          },
        ],
      };
    }
    if (sql.includes("UPDATE public.categories") && sql.includes("deleted_at")) {
      return {
        rows: [{ id: "10", updated_at: new Date(nowIso), deleted_at: new Date(nowIso) }],
      };
    }
    if (sql.includes("UPDATE public.tasks SET kategori_id = NULL")) {
      return { rowCount: 3 };
    }
    return { rows: [] };
  });

  const res = await upsertCategory(client, "user_1", {
    clientUuid: categoryUuid,
    deleted: true,
  });

  assert.equal(res.status, ITEM_STATUS.DELETED);
  assert.equal(res.serverId, 10);
  assert.ok(client.queries.some((q) => q.sql.includes("public.tasks") && q.sql.includes("kategori_id = NULL")));
});

test("upsertCategory: mendeteksi nama duplikat case-insensitive", async () => {
  const clientUuid = "22222222-2222-4222-8222-222222222222";
  const client = createMockClient((sql) => {
    if (sql.includes("SELECT id, user_id, nama")) {
      return { rows: [] }; // belum ada baris dengan client_uuid ini
    }
    if (sql.includes("LOWER(nama) = LOWER($2)")) {
      return { rows: [{ id: "99", client_uuid: "another-uuid" }] }; // ada kategori lain dengan nama sama
    }
    return { rows: [] };
  });

  const res = await upsertCategory(client, "user_1", {
    clientUuid,
    nama: "kuliah",
  });

  assert.equal(res.status, ITEM_STATUS.DUPLICATE_NAME);
  assert.match(res.error, /sudah ada/i);
});

test("upsertCategory: LWW mendeteksi konflik saat server memiliki timestamp lebih baru", async () => {
  const clientUuid = "33333333-3333-4333-8333-333333333333";
  const serverTime = new Date("2026-11-14T12:00:00Z");
  const olderClientTime = "2026-11-14T11:00:00Z";

  const client = createMockClient((sql) => {
    if (sql.includes("SELECT id, user_id, nama")) {
      return {
        rows: [
          {
            id: "15",
            user_id: "user_1",
            nama: "Versi Server",
            warna: "#123",
            icon: "Folder",
            client_uuid: clientUuid,
            updated_at: serverTime,
            deleted_at: null,
          },
        ],
      };
    }
    if (sql.includes("LOWER(nama) = LOWER($2)")) {
      return { rows: [] };
    }
    return { rows: [] };
  });

  const res = await upsertCategory(client, "user_1", {
    clientUuid,
    nama: "Versi Client Kadaluarsa",
    updatedAt: olderClientTime,
  });

  assert.equal(res.status, ITEM_STATUS.CONFLICT);
  assert.equal(res.serverItem.nama, "Versi Server");
});

test("upsertNotebookCategory: soft delete mengosongkan kategori di notebooks", async () => {
  const clientUuid = "44444444-4444-4444-8444-444444444444";
  const now = new Date();

  const client = createMockClient((sql) => {
    if (sql.includes("SELECT id, user_id, nama")) {
      return {
        rows: [
          {
            id: "20",
            user_id: "user_1",
            nama: "Materi Kuliah",
            warna: "#0284C7",
            icon: "FolderSimple",
            client_uuid: clientUuid,
            updated_at: now,
            deleted_at: null,
          },
        ],
      };
    }
    if (sql.includes("UPDATE public.notebook_categories") && sql.includes("deleted_at")) {
      return { rows: [{ id: "20", updated_at: now, deleted_at: now }] };
    }
    if (sql.includes("UPDATE public.notebooks SET kategori = ''")) {
      return { rowCount: 2 };
    }
    return { rows: [] };
  });

  const res = await upsertNotebookCategory(client, "user_1", {
    clientUuid,
    deleted: true,
  });

  assert.equal(res.status, ITEM_STATUS.DELETED);
  assert.equal(res.serverId, 20);
  assert.ok(client.queries.some((q) => q.sql.includes("public.notebooks") && q.sql.includes("kategori = ''")));
});

test("upsertTask: mengintegrasikan mergeSubtasks tanpa kehilangan sub-tugas server", async () => {
  const taskUuid = "55555555-5555-4555-8555-555555555555";
  const now = new Date();

  const serverSubtasks = [
    { id: "sub-1", judul: "Subtask Server", selesai: false, deleted: false },
  ];
  const clientSubtasks = [
    { id: "sub-2", judul: "Subtask Client Offline", selesai: true, deleted: false },
  ];

  let capturedSubtasksSql = null;

  const client = createMockClient((sql, params) => {
    if (sql.includes("SELECT * FROM public.tasks")) {
      return {
        rows: [
          {
            id: "101",
            user_id: "user_1",
            judul: "Tugas Induk",
            deskripsi: "",
            deadline: null,
            reminder: null,
            prioritas: false,
            selesai: false,
            subtasks: serverSubtasks,
            client_uuid: taskUuid,
            updated_at: now,
            deleted_at: null,
          },
        ],
      };
    }
    if (sql.includes("UPDATE public.tasks")) {
      capturedSubtasksSql = params[8]; // param ke-9 adalah JSON string subtasks
      return { rows: [{ id: "101", updated_at: new Date() }] };
    }
    return { rows: [] };
  });

  const res = await upsertTask(client, "user_1", {
    clientUuid: taskUuid,
    judul: "Tugas Induk Diperbarui",
    subtasks: clientSubtasks,
    updatedAt: new Date(now.getTime() + 5000).toISOString(),
  });

  assert.equal(res.status, ITEM_STATUS.UPDATED);
  assert.ok(capturedSubtasksSql);
  const parsed = JSON.parse(capturedSubtasksSql);
  assert.equal(parsed.length, 2);
  assert.ok(parsed.some((s) => s.id === "sub-1"));
  assert.ok(parsed.some((s) => s.id === "sub-2"));
});

test("upsertTask: remap kategoriClientUuid menggunakan cache in-memory", async () => {
  const taskUuid = "66666666-6666-4666-8666-666666666666";
  const catUuid = "77777777-7777-4777-8777-777777777777";
  const categoryCache = new Map([[catUuid, 88]]);

  let capturedKategoriId = null;

  const client = createMockClient((sql, params) => {
    if (sql.includes("SELECT * FROM public.tasks")) {
      return { rows: [] }; // tugas baru
    }
    if (sql.includes("INSERT INTO public.tasks")) {
      capturedKategoriId = params[1]; // param ke-2 adalah kategori_id
      return { rows: [{ id: "202", updated_at: new Date() }] };
    }
    return { rows: [] };
  });

  const res = await upsertTask(
    client,
    "user_1",
    {
      clientUuid: taskUuid,
      kategoriClientUuid: catUuid,
      judul: "Tugas dengan Kategori Baru",
    },
    categoryCache
  );

  assert.equal(res.status, ITEM_STATUS.CREATED);
  assert.equal(capturedKategoriId, 88);
  // Pastikan tidak ada query SELECT ke public.categories karena sudah di-cache
  assert.ok(!client.queries.some((q) => q.sql.includes("SELECT id FROM public.categories")));
});

test("upsertTask: menyimpan deadline dan reminder dengan tepat saat pembuatan tugas baru", async () => {
  const taskUuid = "12345678-1234-4234-8234-123456789abc";
  const targetIso = "2026-11-20T14:30:00.000Z";

  let capturedParams = null;

  const client = createMockClient((sql, params) => {
    if (sql.includes("SELECT * FROM public.tasks")) {
      return { rows: [] }; // tugas baru
    }
    if (sql.includes("INSERT INTO public.tasks")) {
      capturedParams = params;
      return { rows: [{ id: "301", updated_at: new Date() }] };
    }
    return { rows: [] };
  });

  const res = await upsertTask(client, "user_1", {
    clientUuid: taskUuid,
    judul: "Tugas Berjadwal",
    deadline: targetIso,
    reminder: "30m",
  });

  assert.equal(res.status, ITEM_STATUS.CREATED);
  assert.ok(capturedParams);
  // param ke-5 adalah cleanDeadline, param ke-6 adalah cleanReminder
  assert.equal(capturedParams[4], targetIso);
  assert.equal(capturedParams[5], "30m");
});

test("upsertTask: mendukung alias fallback tenggatWaktu jika antrian lawas dikirim", async () => {
  const taskUuid = "23456789-2345-4345-8345-23456789abcd";
  const targetIso = "2026-11-25T09:00:00.000Z";

  let capturedParams = null;

  const client = createMockClient((sql, params) => {
    if (sql.includes("SELECT * FROM public.tasks")) {
      return { rows: [] }; // tugas baru
    }
    if (sql.includes("INSERT INTO public.tasks")) {
      capturedParams = params;
      return { rows: [{ id: "302", updated_at: new Date() }] };
    }
    return { rows: [] };
  });

  const res = await upsertTask(client, "user_1", {
    clientUuid: taskUuid,
    judul: "Tugas Antrian Lawas",
    tenggatWaktu: targetIso,
  });

  assert.equal(res.status, ITEM_STATUS.CREATED);
  assert.ok(capturedParams);
  assert.equal(capturedParams[4], targetIso);
});

test("upsertTask: mengizinkan pengosongan deadline (null) saat tugas yang ada diperbarui", async () => {
  const taskUuid = "34567890-3456-4456-8456-34567890abcd";
  const now = new Date();

  let capturedParams = null;

  const client = createMockClient((sql, params) => {
    if (sql.includes("SELECT * FROM public.tasks")) {
      return {
        rows: [
          {
            id: "501",
            user_id: "user_1",
            judul: "Tugas dengan Deadline Lama",
            deskripsi: "",
            deadline: "2026-11-18T10:00:00.000Z",
            reminder: "1h",
            prioritas: false,
            selesai: false,
            subtasks: [],
            client_uuid: taskUuid,
            updated_at: now,
            deleted_at: null,
          },
        ],
      };
    }
    if (sql.includes("UPDATE public.tasks")) {
      capturedParams = params;
      return { rows: [{ id: "501", updated_at: new Date() }] };
    }
    return { rows: [] };
  });

  const res = await upsertTask(client, "user_1", {
    clientUuid: taskUuid,
    judul: "Tugas Dihapus Deadlinenya",
    deadline: null,
    reminder: null,
    updatedAt: new Date(now.getTime() + 1000).toISOString(),
  });

  assert.equal(res.status, ITEM_STATUS.UPDATED);
  assert.ok(capturedParams);
  // param ke-3 pada UPDATE public.tasks adalah deadline, param ke-4 adalah reminder
  assert.equal(capturedParams[2], null);
  assert.equal(capturedParams[3], null);
});

test("upsertNotebook: menolak konten melebihi batas 100.000 karakter", async () => {
  const notebookUuid = "88888888-8888-4888-8888-888888888888";
  const client = createMockClient(() => ({ rows: [] }));

  const hugeContent = "A".repeat(100001);
  const res = await upsertNotebook(client, "user_1", {
    clientUuid: notebookUuid,
    judul: "Catatan Raksasa",
    konten: hugeContent,
  });

  assert.equal(res.status, ITEM_STATUS.REJECTED);
  assert.match(res.error, /100\.000/i);
});

test("pullEntity: menyusun keyset pagination cursor dan menyertakan tombstone saat delta sync", async () => {
  const now = new Date();
  const client = createMockClient((sql, params) => {
    assert.ok(sql.includes("t.updated_at > $2 OR (t.updated_at = $2 AND t.id > $3)"));
    assert.ok(sql.includes("c.client_uuid AS kategori_client_uuid"));
    return {
      rows: [
        {
          id: "50",
          user_id: "user_1",
          judul: "Tugas 1",
          client_uuid: "uuid-1",
          updated_at: new Date(now.getTime() + 1000),
          deleted_at: null,
          kategori_client_uuid: "cat-uuid-1",
        },
        {
          id: "51",
          user_id: "user_1",
          judul: "Tugas Dihapus",
          client_uuid: "uuid-2",
          updated_at: new Date(now.getTime() + 2000),
          deleted_at: new Date(now.getTime() + 2000),
          kategori_client_uuid: null,
        },
      ],
    };
  });

  const pullResult = await pullEntity(client, "user_1", "tasks", {
    cursor: { updatedAt: now.toISOString(), id: 49 },
    limit: 10,
  });

  assert.equal(pullResult.items.length, 2);
  assert.equal(pullResult.items[0].kategoriClientUuid, "cat-uuid-1");
  assert.ok(pullResult.items[1].deletedAt !== null); // tombstone disertakan
  assert.equal(pullResult.cursor.id, 51);
  assert.equal(pullResult.hasMore, false);
});

test("upsertTask: menghapus seluruh sub-tugas TIDAK boleh otomatis menyelesaikan tugas utama", async () => {
  const taskUuid = "99999999-9999-4999-8999-999999999999";
  const now = new Date();

  // Task awal memiliki 1 subtask, dan status tugas adalah belum selesai (selesai: false)
  const serverSubtasks = [
    { id: "sub-1", judul: "Subtask 1", selesai: false, deleted: false },
  ];
  // Client menghapus subtask 1 (deleted: true)
  const clientSubtasks = [
    { id: "sub-1", judul: "Subtask 1", selesai: false, deleted: true },
  ];

  let capturedIsSelesai = null;

  const client = createMockClient((sql, params) => {
    if (sql.includes("SELECT * FROM public.tasks")) {
      return {
        rows: [
          {
            id: "300",
            user_id: "user_1",
            judul: "Tugas Masih Aktif",
            deskripsi: "",
            deadline: null,
            reminder: null,
            prioritas: false,
            selesai: false,
            selesai_pada: null,
            subtasks: serverSubtasks,
            client_uuid: taskUuid,
            updated_at: now,
            deleted_at: null,
          },
        ],
      };
    }
    if (sql.includes("UPDATE public.tasks")) {
      capturedIsSelesai = params[6]; // param ke-7 adalah selesai
      return { rows: [{ id: "300", updated_at: new Date() }] };
    }
    return { rows: [] };
  });

  const res = await upsertTask(client, "user_1", {
    clientUuid: taskUuid,
    judul: "Tugas Masih Aktif",
    selesai: false,
    subtasks: clientSubtasks,
    updatedAt: new Date(now.getTime() + 1000).toISOString(),
  });

  assert.equal(res.status, ITEM_STATUS.UPDATED);
  // Verifikasi FATAL BUG fix: selesai HARUS tetap false saat seluruh subtask dihapus!
  assert.equal(capturedIsSelesai, false, "Tugas tidak boleh otomatis selesai saat semua subtask dihapus");
});

test("pullEntity: initial sync halaman 2 dengan cursor WAJIB tetap memfilter deleted_at IS NULL", async () => {
  const now = new Date();
  let capturedSql = null;

  const client = createMockClient((sql) => {
    capturedSql = sql;
    return { rows: [] };
  });

  // Initial sync: since = null, cursor disediakan untuk paginasi halaman 2
  await pullEntity(client, "user_1", "tasks", {
    since: null,
    cursor: { updatedAt: now.toISOString(), id: 100 },
    limit: 50,
  });

  assert.ok(capturedSql, "SQL harus dieksekusi");
  assert.ok(
    capturedSql.includes("t.deleted_at IS NULL"),
    "Initial sync halaman 2+ wajib tetap menyaring deleted_at IS NULL agar tombstone tidak bocor"
  );
});

test("upsertCategory: menolak penambahan kategori jika kuota 50 telah tercapai", async () => {
  const newCatUuid = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
  const client = createMockClient((sql) => {
    if (sql.includes("SELECT id, user_id, nama")) {
      return { rows: [] }; // belum ada
    }
    if (sql.includes("LOWER(TRIM(nama))")) {
      return { rows: [] }; // tidak duplikat
    }
    if (sql.includes("SELECT COUNT(*)::int as count FROM public.categories")) {
      return { rows: [{ count: 50 }] }; // kuota penuh
    }
    return { rows: [] };
  });

  const res = await upsertCategory(client, "user_1", {
    clientUuid: newCatUuid,
    nama: "Kategori Ke-51",
  });

  assert.equal(res.status, ITEM_STATUS.REJECTED);
  assert.match(res.error, /50 kategori/i);
});

test("upsertNotebook: mempertahankan nama kategori string dan ID jika kategoriClientUuid tidak dikirim", async () => {
  const nbUuid = "ffffffff-1111-4222-8333-444444444444";
  let capturedKategoriNama = null;
  let capturedKategoriId = null;

  const client = createMockClient((sql, params) => {
    if (sql.includes("SELECT * FROM public.notebooks")) {
      return { rows: [] }; // notebook baru
    }
    if (sql.includes("SELECT id, nama FROM public.notebook_categories")) {
      return { rows: [{ id: "77", nama: "Catatan Kuliah" }] };
    }
    if (sql.includes("SELECT COUNT(*)::int as count FROM public.notebooks")) {
      return { rows: [{ count: 10 }] };
    }
    if (sql.includes("INSERT INTO public.notebooks")) {
      capturedKategoriNama = params[5];
      capturedKategoriId = params[6];
      return { rows: [{ id: "10", updated_at: new Date() }] };
    }
    return { rows: [] };
  });

  const res = await upsertNotebook(client, "user_1", {
    clientUuid: nbUuid,
    judul: "Materi Biologi",
    kategori: "Catatan Kuliah",
  });

  assert.equal(res.status, ITEM_STATUS.CREATED);
  assert.equal(capturedKategoriNama, "Catatan Kuliah");
  assert.equal(capturedKategoriId, 77);
});
