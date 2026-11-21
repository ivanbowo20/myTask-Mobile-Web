import { Pool } from "pg";
import crypto from "crypto";

export function isPlaceholderEnv(value) {
  if (typeof value !== "string") return true;
  const trimmed = value.trim();
  if (!trimmed) return true;
  return /^YOUR_[A-Z0-9_]+_HERE$/i.test(trimmed);
}

export function isValidDatabaseUrl(rawUrl = process.env.DATABASE_URL) {
  if (isPlaceholderEnv(rawUrl)) return false;
  const trimmed = rawUrl.trim();
  if (!/^postgres(?:ql)?:\/\//i.test(trimmed)) return false;
  try {
    const parsed = new URL(trimmed);
    return Boolean(parsed.hostname && !isPlaceholderEnv(parsed.hostname));
  } catch {
    return false;
  }
}

export function isUsingRealDatabase() {
  return isValidDatabaseUrl(process.env.DATABASE_URL);
}

function getMockStore() {
  if (!globalThis.__mockPgStore) {
    globalThis.__mockPgStore = {
      tasks: [],
      categories: [],
      notebooks: [],
      notebook_categories: [],
      push_subscriptions: [],
      notifications: [],
      nextId: {
        tasks: 1,
        categories: 1,
        notebooks: 1,
        notebook_categories: 1,
        push_subscriptions: 1,
        notifications: 1,
      },
    };
  }
  return globalThis.__mockPgStore;
}

function nowIso() {
  return new Date().toISOString();
}

function toTs(val) {
  if (!val) return 0;
  const t = new Date(val).getTime();
  return Number.isNaN(t) ? 0 : t;
}

async function mockQuery(text, params = []) {
  const sql = String(text || "").trim();
  const upper = sql.toUpperCase();
  const store = getMockStore();

  if (upper === "BEGIN" || upper === "COMMIT" || upper === "ROLLBACK") {
    return { rows: [], rowCount: 0 };
  }

  // ---------------------------------------------------------------------------
  // public.categories
  // ---------------------------------------------------------------------------
  if (upper.includes("FROM PUBLIC.CATEGORIES") || upper.includes("INTO PUBLIC.CATEGORIES") || upper.includes("UPDATE PUBLIC.CATEGORIES")) {
    if (upper.startsWith("INSERT INTO PUBLIC.CATEGORIES")) {
      const [userId, nama, warna, icon, clientUuid] = params;
      const resolvedUuid = clientUuid || crypto.randomUUID();
      const existing = store.categories.find(
        (c) => c.user_id === userId && c.client_uuid === resolvedUuid
      );
      const ts = nowIso();
      if (existing) {
        existing.nama = nama;
        existing.warna = warna;
        existing.icon = icon;
        existing.deleted_at = null;
        existing.updated_at = ts;
        return { rows: [{ ...existing }], rowCount: 1 };
      }
      const row = {
        id: store.nextId.categories++,
        user_id: userId,
        nama,
        warna: warna || "#38BDF8",
        icon: icon || "Briefcase",
        client_uuid: resolvedUuid,
        created_at: ts,
        updated_at: ts,
        deleted_at: null,
      };
      store.categories.push(row);
      return { rows: [{ ...row }], rowCount: 1 };
    }

    if (upper.startsWith("UPDATE PUBLIC.CATEGORIES")) {
      if (upper.includes("SET DELETED_AT")) {
        const [id, userId] = params;
        const row = store.categories.find((c) => c.id === Number(id) && c.user_id === userId && !c.deleted_at);
        if (!row) return { rows: [], rowCount: 0 };
        const ts = nowIso();
        row.deleted_at = ts;
        row.updated_at = ts;
        return { rows: [{ ...row }], rowCount: 1 };
      }
      const [nama, warna, icon, id, userId] = params;
      const row = store.categories.find((c) => c.id === Number(id) && c.user_id === userId && !c.deleted_at);
      if (!row) return { rows: [], rowCount: 0 };
      row.nama = nama;
      row.warna = warna;
      row.icon = icon;
      row.updated_at = nowIso();
      return { rows: [{ ...row }], rowCount: 1 };
    }

    if (upper.includes("COUNT(*)")) {
      const [userId] = params;
      const count = store.categories.filter((c) => c.user_id === userId && !c.deleted_at).length;
      return { rows: [{ count }], rowCount: 1 };
    }

    if (upper.includes("LOWER(NAMA) = LOWER($2)")) {
      const [userId, nama, excludeVal] = params;
      const target = String(nama || "").toLowerCase();
      const rows = store.categories.filter((c) => {
        if (c.user_id !== userId || c.deleted_at) return false;
        if (String(c.nama || "").toLowerCase() !== target) return false;
        if (upper.includes("ID != $3") && c.id === Number(excludeVal)) return false;
        if (upper.includes("CLIENT_UUID != $3") && c.client_uuid === excludeVal) return false;
        return true;
      });
      return { rows: rows.map((r) => ({ ...r })), rowCount: rows.length };
    }

    if (upper.includes("WHERE ID = $1 AND USER_ID = $2")) {
      const [id, userId] = params;
      const row = store.categories.find((c) => c.id === Number(id) && c.user_id === userId && !c.deleted_at);
      return { rows: row ? [{ ...row }] : [], rowCount: row ? 1 : 0 };
    }

    if (upper.includes("WHERE USER_ID = $1 AND CLIENT_UUID = $2")) {
      const [userId, clientUuid] = params;
      const includeDeleted = !upper.includes("DELETED_AT IS NULL");
      const row = store.categories.find(
        (c) => c.user_id === userId && c.client_uuid === clientUuid && (includeDeleted || !c.deleted_at)
      );
      return { rows: row ? [{ ...row }] : [], rowCount: row ? 1 : 0 };
    }

    // List / pull categories
    const userId = params[0];
    let rows = store.categories.filter((c) => c.user_id === userId);
    if (upper.includes("DELETED_AT IS NULL")) {
      rows = rows.filter((c) => !c.deleted_at);
    }
    if (upper.includes("UPDATED_AT > $2 AND ID > $3") || upper.includes("(UPDATED_AT = $2 AND ID > $3)")) {
      const cursorTs = toTs(params[1]);
      const cursorId = Number(params[2]);
      rows = rows.filter((c) => {
        const ts = toTs(c.updated_at);
        return ts > cursorTs || (ts === cursorTs && c.id > cursorId);
      });
    } else if (upper.includes("UPDATED_AT > $2")) {
      const sinceTs = toTs(params[1]);
      rows = rows.filter((c) => toTs(c.updated_at) > sinceTs);
    }
    if (upper.includes("ORDER BY UPDATED_AT ASC")) {
      rows = [...rows].sort((a, b) => toTs(a.updated_at) - toTs(b.updated_at) || a.id - b.id);
    } else {
      rows = [...rows].sort((a, b) => a.id - b.id);
    }
    if (upper.includes("LIMIT $")) {
      const limit = Number(params[params.length - 1]) || 100;
      rows = rows.slice(0, limit);
    }
    return { rows: rows.map((r) => ({ ...r })), rowCount: rows.length };
  }

  // ---------------------------------------------------------------------------
  // public.notebook_categories
  // ---------------------------------------------------------------------------
  if (upper.includes("PUBLIC.NOTEBOOK_CATEGORIES")) {
    if (upper.startsWith("INSERT INTO PUBLIC.NOTEBOOK_CATEGORIES")) {
      const [userId, nama, warna, icon, clientUuid] = params;
      const resolvedUuid = clientUuid || crypto.randomUUID();
      const existing = store.notebook_categories.find(
        (c) => c.user_id === userId && c.client_uuid === resolvedUuid
      );
      const ts = nowIso();
      if (existing) {
        existing.nama = nama;
        existing.warna = warna;
        existing.icon = icon;
        existing.deleted_at = null;
        existing.updated_at = ts;
        return { rows: [{ ...existing }], rowCount: 1 };
      }
      const row = {
        id: store.nextId.notebook_categories++,
        user_id: userId,
        nama,
        warna: warna || "#0284C7",
        icon: icon || "FolderSimple",
        client_uuid: resolvedUuid,
        dibuat_pada: ts,
        updated_at: ts,
        deleted_at: null,
      };
      store.notebook_categories.push(row);
      return { rows: [{ ...row }], rowCount: 1 };
    }

    if (upper.startsWith("UPDATE PUBLIC.NOTEBOOK_CATEGORIES")) {
      if (upper.includes("SET DELETED_AT")) {
        const [id, userId] = params;
        const row = store.notebook_categories.find((c) => c.id === Number(id) && c.user_id === userId && !c.deleted_at);
        if (!row) return { rows: [], rowCount: 0 };
        const ts = nowIso();
        row.deleted_at = ts;
        row.updated_at = ts;
        return { rows: [{ ...row }], rowCount: 1 };
      }
      if (upper.includes("SET WARNA = $1, ICON = $2")) {
        const [warna, icon, id, userId] = params;
        const row = store.notebook_categories.find((c) => c.id === Number(id) && c.user_id === userId && !c.deleted_at);
        if (!row) return { rows: [], rowCount: 0 };
        row.warna = warna;
        row.icon = icon;
        row.updated_at = nowIso();
        return { rows: [{ ...row }], rowCount: 1 };
      }
      const [nama, warna, icon, id, userId] = params;
      const row = store.notebook_categories.find((c) => c.id === Number(id) && c.user_id === userId && !c.deleted_at);
      if (!row) return { rows: [], rowCount: 0 };
      row.nama = nama;
      row.warna = warna;
      row.icon = icon;
      row.updated_at = nowIso();
      return { rows: [{ ...row }], rowCount: 1 };
    }

    if (upper.includes("COUNT(*)::INT AS COUNT FROM PUBLIC.NOTEBOOK_CATEGORIES")) {
      const [userId] = params;
      const count = store.notebook_categories.filter((c) => c.user_id === userId && !c.deleted_at).length;
      return { rows: [{ count }], rowCount: 1 };
    }

    if (upper.includes("LOWER(TRIM(NAMA)) = LOWER(TRIM($2))")) {
      const [userId, nama, excludeUuid] = params;
      const target = String(nama || "").trim().toLowerCase();
      const rows = store.notebook_categories.filter((c) => {
        if (c.user_id !== userId || c.deleted_at) return false;
        if (String(c.nama || "").trim().toLowerCase() !== target) return false;
        if (upper.includes("CLIENT_UUID != $3") && c.client_uuid === excludeUuid) return false;
        return true;
      });
      return { rows: rows.map((r) => ({ ...r })), rowCount: rows.length };
    }

    if (upper.includes("WHERE ID = $1 AND USER_ID = $2")) {
      const [id, userId] = params;
      const row = store.notebook_categories.find((c) => c.id === Number(id) && c.user_id === userId && !c.deleted_at);
      return { rows: row ? [{ ...row }] : [], rowCount: row ? 1 : 0 };
    }

    if (upper.includes("WHERE USER_ID = $1 AND CLIENT_UUID = $2")) {
      const [userId, clientUuid] = params;
      const includeDeleted = !upper.includes("DELETED_AT IS NULL");
      const row = store.notebook_categories.find(
        (c) => c.user_id === userId && c.client_uuid === clientUuid && (includeDeleted || !c.deleted_at)
      );
      return { rows: row ? [{ ...row }] : [], rowCount: row ? 1 : 0 };
    }

    // List / pull notebook_categories (with optional notebook count)
    const userId = params[0];
    let rows = store.notebook_categories.filter((c) => c.user_id === userId);
    if (upper.includes("DELETED_AT IS NULL")) {
      rows = rows.filter((c) => !c.deleted_at);
    }
    if (upper.includes("UPDATED_AT = $2 AND ID > $3")) {
      const cursorTs = toTs(params[1]);
      const cursorId = Number(params[2]);
      rows = rows.filter((c) => {
        const ts = toTs(c.updated_at);
        return ts > cursorTs || (ts === cursorTs && c.id > cursorId);
      });
    } else if (upper.includes("UPDATED_AT > $2")) {
      const sinceTs = toTs(params[1]);
      rows = rows.filter((c) => toTs(c.updated_at) > sinceTs);
    }
    if (upper.includes("ORDER BY UPDATED_AT ASC")) {
      rows = [...rows].sort((a, b) => toTs(a.updated_at) - toTs(b.updated_at) || a.id - b.id);
    } else {
      rows = [...rows].sort((a, b) => toTs(a.dibuat_pada) - toTs(b.dibuat_pada));
    }
    if (upper.includes("LIMIT $")) {
      const limit = Number(params[params.length - 1]) || 100;
      rows = rows.slice(0, limit);
    }
    const mapped = rows.map((c) => {
      const count = store.notebooks.filter(
        (n) =>
          n.user_id === userId &&
          !n.deleted_at &&
          (n.kategori_id === c.id ||
            (n.kategori && String(n.kategori).trim().toLowerCase() === String(c.nama).trim().toLowerCase()))
      ).length;
      return { ...c, count };
    });
    return { rows: mapped, rowCount: mapped.length };
  }

  // ---------------------------------------------------------------------------
  // public.notebooks
  // ---------------------------------------------------------------------------
  if (upper.includes("PUBLIC.NOTEBOOKS")) {
    if (upper.startsWith("INSERT INTO PUBLIC.NOTEBOOKS")) {
      const ts = nowIso();
      if (params.length === 8) {
        // From sync.repository.js: [userId, cleanJudul, cleanKonten, penting, cleanWarna, kategoriNama, kategoriId, clientUuid]
        const [userId, judul, konten, penting, warna, kategori, kategori_id, clientUuid] = params;
        const resolvedUuid = clientUuid || crypto.randomUUID();
        const existing = store.notebooks.find((n) => n.user_id === userId && n.client_uuid === resolvedUuid);
        if (existing) {
          existing.judul = judul;
          existing.konten = konten;
          existing.penting = Boolean(penting);
          existing.warna = warna;
          existing.kategori = kategori || "";
          existing.kategori_id = kategori_id || null;
          existing.deleted_at = null;
          existing.updated_at = ts;
          existing.diperbarui_pada = ts;
          return { rows: [{ ...existing }], rowCount: 1 };
        }
        const row = {
          id: store.nextId.notebooks++,
          user_id: userId,
          judul,
          konten: konten || "",
          penting: Boolean(penting),
          warna: warna || "#D97706",
          kategori: kategori || "",
          kategori_id: kategori_id || null,
          client_uuid: resolvedUuid,
          dibuat_pada: ts,
          diperbarui_pada: ts,
          updated_at: ts,
          deleted_at: null,
        };
        store.notebooks.push(row);
        return { rows: [{ ...row }], rowCount: 1 };
      }
      // From /api/notebooks POST: [userId, cleanJudul, cleanKonten, Boolean(penting), cleanWarna, cleanKategori]
      const [userId, judul, konten, penting, warna, kategori] = params;
      const row = {
        id: store.nextId.notebooks++,
        user_id: userId,
        judul,
        konten: konten || "",
        penting: Boolean(penting),
        warna: warna || "#D97706",
        kategori: kategori || "",
        kategori_id: null,
        client_uuid: crypto.randomUUID(),
        dibuat_pada: ts,
        diperbarui_pada: ts,
        updated_at: ts,
        deleted_at: null,
      };
      store.notebooks.push(row);
      return { rows: [{ ...row }], rowCount: 1 };
    }

    if (upper.startsWith("UPDATE PUBLIC.NOTEBOOKS")) {
      const ts = nowIso();
      if (upper.includes("SET DELETED_AT")) {
        const [id, userId] = params;
        const row = store.notebooks.find((n) => n.id === Number(id) && n.user_id === userId && !n.deleted_at);
        if (!row) return { rows: [], rowCount: 0 };
        row.deleted_at = ts;
        row.updated_at = ts;
        return { rows: [{ ...row }], rowCount: 1 };
      }
      if (upper.includes("ANY($3::BIGINT[])")) {
        const [kategori, kategoriId, ids, userId] = params;
        const idSet = new Set((ids || []).map(Number));
        const updated = [];
        for (const n of store.notebooks) {
          if (n.user_id === userId && !n.deleted_at && idSet.has(n.id)) {
            n.kategori = kategori;
            n.kategori_id = kategoriId;
            n.diperbarui_pada = ts;
            n.updated_at = ts;
            updated.push({ id: n.id, kategori: n.kategori, kategori_id: n.kategori_id });
          }
        }
        return { rows: updated, rowCount: updated.length };
      }
      if (upper.includes("SET KATEGORI = '', KATEGORI_ID = NULL")) {
        const [catId, catNama, userId] = params;
        const normNama = String(catNama || "").trim().toLowerCase();
        let count = 0;
        for (const n of store.notebooks) {
          if (
            n.user_id === userId &&
            !n.deleted_at &&
            (n.kategori_id === Number(catId) ||
              (n.kategori && String(n.kategori).trim().toLowerCase() === normNama))
          ) {
            n.kategori = "";
            n.kategori_id = null;
            n.diperbarui_pada = ts;
            n.updated_at = ts;
            count++;
          }
        }
        return { rows: [], rowCount: count };
      }
      if (upper.includes("SET KATEGORI = $1, DIPERBARUI_PADA")) {
        const [newNama, catId, oldNama, userId] = params;
        const normOld = String(oldNama || "").trim().toLowerCase();
        let count = 0;
        for (const n of store.notebooks) {
          if (
            n.user_id === userId &&
            !n.deleted_at &&
            (n.kategori_id === Number(catId) ||
              (n.kategori && String(n.kategori).trim().toLowerCase() === normOld))
          ) {
            n.kategori = newNama;
            n.diperbarui_pada = ts;
            n.updated_at = ts;
            count++;
          }
        }
        return { rows: [], rowCount: count };
      }
      if (params.length === 8) {
        // From sync.repository.js: [cleanJudul, cleanKonten, penting, cleanWarna, kategoriNama, kategoriId, existing.id, userId]
        const [judul, konten, penting, warna, kategori, kategori_id, id, userId] = params;
        const row = store.notebooks.find((n) => n.id === Number(id) && n.user_id === userId);
        if (!row) return { rows: [], rowCount: 0 };
        row.judul = judul;
        row.konten = konten;
        row.penting = Boolean(penting);
        row.warna = warna;
        row.kategori = kategori || "";
        row.kategori_id = kategori_id || null;
        row.diperbarui_pada = ts;
        row.updated_at = ts;
        return { rows: [{ ...row }], rowCount: 1 };
      }
      // From /api/notebooks PUT: [newJudul, newKonten, newPenting, newWarna, newKategori, Number(id), session.user.id]
      const [judul, konten, penting, warna, kategori, id, userId] = params;
      const row = store.notebooks.find((n) => n.id === Number(id) && n.user_id === userId && !n.deleted_at);
      if (!row) return { rows: [], rowCount: 0 };
      row.judul = judul;
      row.konten = konten;
      row.penting = Boolean(penting);
      row.warna = warna;
      row.kategori = kategori || "";
      row.diperbarui_pada = ts;
      row.updated_at = ts;
      return { rows: [{ ...row }], rowCount: 1 };
    }

    if (upper.includes("COUNT(*)")) {
      const [userId] = params;
      const count = store.notebooks.filter((n) => n.user_id === userId && !n.deleted_at).length;
      return { rows: [{ count }], rowCount: 1 };
    }

    if (upper.includes("WHERE ID = $1 AND USER_ID = $2")) {
      const [id, userId] = params;
      const row = store.notebooks.find((n) => n.id === Number(id) && n.user_id === userId && !n.deleted_at);
      return { rows: row ? [{ ...row }] : [], rowCount: row ? 1 : 0 };
    }

    if (upper.includes("WHERE USER_ID = $1 AND CLIENT_UUID = $2")) {
      const [userId, clientUuid] = params;
      const row = store.notebooks.find((n) => n.user_id === userId && n.client_uuid === clientUuid);
      return { rows: row ? [{ ...row }] : [], rowCount: row ? 1 : 0 };
    }

    // List / pull notebooks
    const userId = params[0];
    let rows = store.notebooks.filter((n) => n.user_id === userId);
    if (upper.includes("DELETED_AT IS NULL") && !upper.includes("LEFT JOIN")) {
      rows = rows.filter((n) => !n.deleted_at);
    } else if (upper.includes("N.DELETED_AT IS NULL")) {
      rows = rows.filter((n) => !n.deleted_at);
    }
    if (upper.includes("ILIKE $2")) {
      const search = String(params[1] || "").replace(/%/g, "").toLowerCase();
      rows = rows.filter(
        (n) =>
          String(n.judul || "").toLowerCase().includes(search) ||
          String(n.konten || "").toLowerCase().includes(search)
      );
    }
    if (upper.includes("N.UPDATED_AT = $2 AND N.ID > $3")) {
      const cursorTs = toTs(params[1]);
      const cursorId = Number(params[2]);
      rows = rows.filter((n) => {
        const ts = toTs(n.updated_at);
        return ts > cursorTs || (ts === cursorTs && n.id > cursorId);
      });
    } else if (upper.includes("N.UPDATED_AT > $2")) {
      const sinceTs = toTs(params[1]);
      rows = rows.filter((n) => toTs(n.updated_at) > sinceTs);
    }
    if (upper.includes("ORDER BY N.UPDATED_AT ASC")) {
      rows = [...rows].sort((a, b) => toTs(a.updated_at) - toTs(b.updated_at) || a.id - b.id);
    } else {
      rows = [...rows].sort(
        (a, b) =>
          Number(Boolean(b.penting)) - Number(Boolean(a.penting)) ||
          toTs(b.diperbarui_pada) - toTs(a.diperbarui_pada) ||
          toTs(b.dibuat_pada) - toTs(a.dibuat_pada)
      );
    }
    if (upper.includes("LIMIT $")) {
      const limit = Number(params[params.length - 1]) || 150;
      rows = rows.slice(0, limit);
    }
    const mapped = rows.map((n) => {
      const cat = store.notebook_categories.find(
        (c) =>
          c.user_id === userId &&
          !c.deleted_at &&
          (c.id === n.kategori_id ||
            (n.kategori && String(c.nama).trim().toLowerCase() === String(n.kategori).trim().toLowerCase()))
      );
      return { ...n, kategori_client_uuid: cat?.client_uuid || null };
    });
    return { rows: mapped, rowCount: mapped.length };
  }

  // ---------------------------------------------------------------------------
  // public.tasks
  // ---------------------------------------------------------------------------
  if (upper.includes("PUBLIC.TASKS")) {
    if (upper.startsWith("INSERT INTO PUBLIC.TASKS")) {
      const ts = nowIso();
      if (params.length === 11) {
        // From sync.repository.js
        const [
          userId,
          kategoriId,
          judul,
          deskripsi,
          deadline,
          reminder,
          prioritas,
          selesai,
          selesaiPada,
          subtasks,
          clientUuid,
        ] = params;
        const resolvedUuid = clientUuid || crypto.randomUUID();
        const existing = store.tasks.find((t) => t.user_id === userId && t.client_uuid === resolvedUuid);
        let parsedSubtasks = subtasks;
        if (typeof subtasks === "string") {
          try {
            parsedSubtasks = JSON.parse(subtasks);
          } catch {
            parsedSubtasks = [];
          }
        }
        if (existing) {
          existing.kategori_id = kategoriId ?? null;
          existing.judul = judul;
          existing.deskripsi = deskripsi || "";
          existing.deadline = deadline || null;
          existing.reminder = reminder || null;
          existing.prioritas = Boolean(prioritas);
          existing.selesai = Boolean(selesai);
          existing.selesai_pada = selesaiPada || null;
          existing.subtasks = Array.isArray(parsedSubtasks) ? parsedSubtasks : [];
          existing.deleted_at = null;
          existing.updated_at = ts;
          return { rows: [{ ...existing }], rowCount: 1 };
        }
        const row = {
          id: store.nextId.tasks++,
          user_id: userId,
          kategori_id: kategoriId ?? null,
          judul,
          deskripsi: deskripsi || "",
          deadline: deadline || null,
          reminder: reminder || null,
          prioritas: Boolean(prioritas),
          selesai: Boolean(selesai),
          selesai_pada: selesaiPada || null,
          subtasks: Array.isArray(parsedSubtasks) ? parsedSubtasks : [],
          reminder_sent: false,
          deadline_sent: false,
          client_uuid: resolvedUuid,
          dibuat_pada: ts,
          updated_at: ts,
          deleted_at: null,
        };
        store.tasks.push(row);
        return { rows: [{ ...row }], rowCount: 1 };
      }
      // From task.repository.js: [userId, kategoriId, judul, deskripsi, deadline, reminder, Boolean(prioritas), Boolean(selesai), JSON.stringify(subtasks || [])]
      const [userId, kategoriId, judul, deskripsi, deadline, reminder, prioritas, selesai, subtasks] = params;
      let parsedSubtasks = subtasks;
      if (typeof subtasks === "string") {
        try {
          parsedSubtasks = JSON.parse(subtasks);
        } catch {
          parsedSubtasks = [];
        }
      }
      const row = {
        id: store.nextId.tasks++,
        user_id: userId,
        kategori_id: kategoriId ?? null,
        judul,
        deskripsi: deskripsi || "",
        deadline: deadline || null,
        reminder: reminder || null,
        prioritas: Boolean(prioritas),
        selesai: Boolean(selesai),
        selesai_pada: Boolean(selesai) ? ts : null,
        subtasks: Array.isArray(parsedSubtasks) ? parsedSubtasks : [],
        reminder_sent: false,
        deadline_sent: false,
        client_uuid: crypto.randomUUID(),
        dibuat_pada: ts,
        updated_at: ts,
        deleted_at: null,
      };
      store.tasks.push(row);
      return { rows: [{ ...row }], rowCount: 1 };
    }

    if (upper.startsWith("UPDATE PUBLIC.TASKS")) {
      const ts = nowIso();
      if (upper.includes("SET KATEGORI_ID = NULL")) {
        const [catId, userId] = params;
        let count = 0;
        for (const t of store.tasks) {
          if (t.kategori_id === Number(catId) && t.user_id === userId && !t.deleted_at) {
            t.kategori_id = null;
            t.updated_at = ts;
            count++;
          }
        }
        return { rows: [], rowCount: count };
      }
      if (upper.includes("SET DELETED_AT")) {
        if (upper.includes("SELESAI = TRUE")) {
          const [userId] = params;
          const deleted = [];
          for (const t of store.tasks) {
            if (t.user_id === userId && t.selesai === true && !t.deleted_at) {
              t.deleted_at = ts;
              t.updated_at = ts;
              deleted.push({ id: t.id });
            }
          }
          return { rows: deleted, rowCount: deleted.length };
        }
        const [id, userId] = params;
        const row = store.tasks.find((t) => t.id === Number(id) && t.user_id === userId && !t.deleted_at);
        if (!row) return { rows: [], rowCount: 0 };
        row.deleted_at = ts;
        row.updated_at = ts;
        return { rows: [{ ...row }], rowCount: 1 };
      }
      if (params.length === 11) {
        const [judul, deskripsi, deadline, reminder, kategoriId, prioritas, selesai, selesaiPada, subtasks, id, userId] = params;
        const row = store.tasks.find((t) => t.id === Number(id) && t.user_id === userId && !t.deleted_at);
        if (!row) return { rows: [], rowCount: 0 };
        let parsedSubtasks = subtasks;
        if (typeof subtasks === "string") {
          try {
            parsedSubtasks = JSON.parse(subtasks);
          } catch {
            parsedSubtasks = [];
          }
        }
        row.judul = judul;
        row.deskripsi = deskripsi || "";
        row.deadline = deadline || null;
        row.reminder = reminder || null;
        row.kategori_id = kategoriId ?? null;
        row.prioritas = Boolean(prioritas);
        row.selesai = Boolean(selesai);
        row.selesai_pada = selesaiPada || null;
        row.subtasks = Array.isArray(parsedSubtasks) ? parsedSubtasks : [];
        row.updated_at = ts;
        return { rows: [{ ...row }], rowCount: 1 };
      }
    }

    if (upper.includes("COUNT(*)")) {
      const [userId] = params;
      const count = store.tasks.filter((t) => t.user_id === userId && !t.deleted_at).length;
      return { rows: [{ count }], rowCount: 1 };
    }

    if (upper.includes("WHERE ID = $1 AND USER_ID = $2")) {
      const [id, userId] = params;
      const row = store.tasks.find((t) => t.id === Number(id) && t.user_id === userId && !t.deleted_at);
      return { rows: row ? [{ ...row }] : [], rowCount: row ? 1 : 0 };
    }

    if (upper.includes("WHERE USER_ID = $1 AND CLIENT_UUID = $2")) {
      const [userId, clientUuid] = params;
      const row = store.tasks.find((t) => t.user_id === userId && t.client_uuid === clientUuid);
      return { rows: row ? [{ ...row }] : [], rowCount: row ? 1 : 0 };
    }

    // List / pull tasks
    const userId = params[0];
    let rows = store.tasks.filter((t) => t.user_id === userId);
    if (upper.includes("T.DELETED_AT IS NULL") || (upper.includes("DELETED_AT IS NULL") && !upper.includes("LEFT JOIN"))) {
      rows = rows.filter((t) => !t.deleted_at);
    }
    if (upper.includes("T.UPDATED_AT = $2 AND T.ID > $3")) {
      const cursorTs = toTs(params[1]);
      const cursorId = Number(params[2]);
      rows = rows.filter((t) => {
        const ts = toTs(t.updated_at);
        return ts > cursorTs || (ts === cursorTs && t.id > cursorId);
      });
    } else if (upper.includes("T.UPDATED_AT > $2")) {
      const sinceTs = toTs(params[1]);
      rows = rows.filter((t) => toTs(t.updated_at) > sinceTs);
    }
    if (upper.includes("ORDER BY T.UPDATED_AT ASC")) {
      rows = [...rows].sort((a, b) => toTs(a.updated_at) - toTs(b.updated_at) || a.id - b.id);
    } else {
      rows = [...rows].sort((a, b) => toTs(b.dibuat_pada) - toTs(a.dibuat_pada));
    }
    // Handle optional LIMIT / OFFSET
    let offset = 0;
    let limit = 300;
    if (upper.includes("OFFSET $")) {
      offset = Number(params[params.length - 1]) || 0;
      limit = Number(params[params.length - 2]) || 300;
    } else if (upper.includes("LIMIT $")) {
      limit = Number(params[params.length - 1]) || 300;
    }
    rows = rows.slice(offset, offset + limit);
    const mapped = rows.map((t) => {
      const cat = store.categories.find((c) => c.id === t.kategori_id && c.user_id === userId);
      return { ...t, kategori_client_uuid: cat?.client_uuid || null };
    });
    return { rows: mapped, rowCount: mapped.length };
  }

  // ---------------------------------------------------------------------------
  // public.push_subscriptions & public.notifications
  // ---------------------------------------------------------------------------
  if (upper.includes("PUBLIC.PUSH_SUBSCRIPTIONS")) {
    if (upper.startsWith("INSERT INTO PUBLIC.PUSH_SUBSCRIPTIONS")) {
      const [user_id, endpoint, p256dh, auth] = params;
      const existing = store.push_subscriptions.find((s) => s.endpoint === endpoint);
      if (existing) {
        existing.user_id = user_id;
        existing.p256dh = p256dh;
        existing.auth = auth;
        existing.created_at = nowIso();
        return { rows: [{ ...existing }], rowCount: 1 };
      }
      const row = {
        id: store.nextId.push_subscriptions++,
        user_id,
        endpoint,
        p256dh,
        auth,
        created_at: nowIso(),
      };
      store.push_subscriptions.push(row);
      return { rows: [{ ...row }], rowCount: 1 };
    }
    if (upper.startsWith("DELETE FROM PUBLIC.PUSH_SUBSCRIPTIONS")) {
      if (params.length === 2) {
        const [userId, endpoint] = params;
        store.push_subscriptions = store.push_subscriptions.filter(
          (s) => !(s.user_id === userId && s.endpoint === endpoint)
        );
      } else {
        const [id] = params;
        store.push_subscriptions = store.push_subscriptions.filter((s) => s.id !== Number(id));
      }
      return { rows: [], rowCount: 1 };
    }
    if (upper.includes("WHERE USER_ID = $1")) {
      const [userId] = params;
      const rows = store.push_subscriptions.filter((s) => s.user_id === userId);
      return { rows: rows.map((r) => ({ ...r })), rowCount: rows.length };
    }
    return { rows: [], rowCount: 0 };
  }

  if (upper.includes("PUBLIC.NOTIFICATIONS")) {
    if (upper.startsWith("INSERT INTO PUBLIC.NOTIFICATIONS")) {
      const row = {
        id: store.nextId.notifications++,
        user_id: params[0],
        task_id: params.length >= 5 ? params[1] : null,
        tipe: params.length >= 5 ? params[2] : "reengagement",
        judul: params.length >= 5 ? params[3] : params[1],
        pesan: params.length >= 5 ? params[4] : params[2],
        dibaca: false,
        dibuat_pada: nowIso(),
      };
      store.notifications.push(row);
      return { rows: [{ ...row }], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }

  return { rows: [], rowCount: 0 };
}

function getResolvedConnectionString(rawUrl = process.env.DATABASE_URL) {
  if (!isValidDatabaseUrl(rawUrl)) return null;
  const trimmed = rawUrl.trim();

  try {
    const parsed = new URL(trimmed);
    // If connecting directly to Supabase db.<ref>.supabase.co, route through IPv4 pooler to prevent IPv6 ENOENT/timeout
    const match = parsed.hostname.match(/^db\.([a-z0-9]+)\.supabase\.co$/i);
    if (match) {
      const projectRef = match[1];
      const rawPoolerHost = process.env.DATABASE_POOLER_HOST;
      const poolerRegion = !isPlaceholderEnv(rawPoolerHost)
        ? rawPoolerHost.trim()
        : "aws-0-ap-southeast-1.pooler.supabase.com";
      // WHATWG URL.password is already percent-encoded; preserve as-is to avoid double-encoding special characters
      const encodedPassword = parsed.password || "";
      const dbPath = parsed.pathname && parsed.pathname !== "/" ? parsed.pathname : "/postgres";
      const search = parsed.search || "";
      return `postgresql://postgres.${projectRef}:${encodedPassword}@${poolerRegion}:6543${dbPath}${search}`;
    }
  } catch {
    // Return trimmed URL if parsing fails
  }
  return trimmed;
}

function getPoolMax() {
  const raw = process.env.PG_POOL_MAX;
  if (!isPlaceholderEnv(raw)) {
    const parsed = parseInt(raw.trim(), 10);
    if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 50) {
      return parsed;
    }
  }
  return process.env.NODE_ENV === "production" ? 3 : 10;
}

function resolveSslOption(connectionString) {
  try {
    const parsed = new URL(connectionString);
    const isLocalHost =
      parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1" ||
      parsed.hostname === "::1";
    const sslMode = (parsed.searchParams.get("sslmode") || "").toLowerCase();
    if (sslMode === "disable") return false;
    if (isLocalHost && !sslMode) return false;
    return { rejectUnauthorized: false };
  } catch {
    return { rejectUnauthorized: false };
  }
}

export function getDbConfigSignature() {
  const connectionString = getResolvedConnectionString();
  if (!connectionString) return "mock";
  const max = getPoolMax();
  return crypto
    .createHash("sha256")
    .update(`${connectionString}|max=${max}`)
    .digest("hex");
}

function getMockPool() {
  if (!globalThis._mockPgPool) {
    console.warn("[DB] DATABASE_URL not configured (or still placeholder) — using emergency in-memory mock database");
    globalThis._mockPgPool = {
      query: mockQuery,
      connect: async () => ({
        query: mockQuery,
        release: () => {},
      }),
      on: () => {},
      end: async () => {},
    };
  }
  return globalThis._mockPgPool;
}

export function getDbPool() {
  // Hormati mock/custom pool yang disuntikkan secara eksternal (misalnya oleh unit test)
  if (globalThis._pgPool && !(globalThis._pgPool instanceof Pool)) {
    return globalThis._pgPool;
  }

  const connectionString = getResolvedConnectionString();
  if (!connectionString) {
    if (globalThis._pgPool) {
      const stalePool = globalThis._pgPool;
      globalThis._pgPool = null;
      globalThis._pgPoolConfigHash = null;
      if (typeof stalePool?.end === "function") {
        stalePool.end().catch(() => {});
      }
    }
    return getMockPool();
  }

  const max = getPoolMax();
  const configHash = crypto
    .createHash("sha256")
    .update(`${connectionString}|max=${max}`)
    .digest("hex");

  if (!globalThis._pgPool || globalThis._pgPoolConfigHash !== configHash) {
    if (globalThis._pgPool) {
      const stalePool = globalThis._pgPool;
      if (typeof stalePool?.end === "function") {
        stalePool.end().catch(() => {});
      }
    }

    globalThis._pgPool = new Pool({
      connectionString,
      ssl: resolveSslOption(connectionString),
      max,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 10000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
    });
    globalThis._pgPoolConfigHash = configHash;

    // Prevent unhandled error event crash on idle database client
    globalThis._pgPool.on("error", (err) => {
      console.error("Unexpected error on idle pg client:", err);
    });

    try {
      const parsed = new URL(connectionString);
      console.info(`[DB] PostgreSQL pool initialized for ${parsed.hostname}:${parsed.port || "5432"} (max=${max})`);
    } catch {
      console.info(`[DB] PostgreSQL pool initialized (max=${max})`);
    }
  }
  return globalThis._pgPool;
}

/**
 * Menutup pool PostgreSQL lama (jika ada) dan memuat ulang koneksi baru dari environment aktif.
 * Memastikan perubahan DATABASE_URL / PG_POOL_MAX langsung aktif tanpa state pool usang.
 */
export async function reloadDbPool() {
  if (globalThis._pgPool) {
    const oldPool = globalThis._pgPool;
    globalThis._pgPool = null;
    globalThis._pgPoolConfigHash = null;
    try {
      if (typeof oldPool?.end === "function") {
        await oldPool.end();
      }
    } catch (err) {
      console.warn("[DB] Error while closing previous PostgreSQL pool:", err?.message || err);
    }
  }
  return getDbPool();
}

export async function query(text, params) {
  const p = getDbPool();
  try {
    return await p.query(text, params);
  } catch (err) {
    const isTransient =
      err.code === "ECONNRESET" ||
      err.code === "57P01" ||
      err.code === "08006" ||
      err.code === "08001" ||
      err.code === "ETIMEDOUT" ||
      /terminated unexpectedly|socket hang up|Connection closed/i.test(err.message || "");

    if (isTransient) {
      console.warn("Retrying database query after transient connection error:", err.message);
      return await p.query(text, params);
    }
    throw err;
  }
}

/**
 * Menjalankan fungsi di dalam transaksi PostgreSQL terisolasi.
 * Menjamin BEGIN, COMMIT, ROLLBACK saat terjadi error, dan selalu release client di blok finally.
 * 
 * @template T
 * @param {(client: import("pg").PoolClient) => Promise<T>} fn 
 * @returns {Promise<T>}
 */
export async function withTransaction(fn) {
  const pool = getDbPool();
  const client = await pool.connect();
  let hasError = false;
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    hasError = true;
    try {
      await client.query("ROLLBACK");
    } catch (_) {
      // Abaikan error rollback jika koneksi terputus
    }
    throw err;
  } finally {
    client.release(hasError);
  }
}
