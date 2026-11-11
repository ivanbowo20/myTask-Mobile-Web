/**
 * Task Domain Schemas, Constants, Validations & Mappers
 * lib/modules/tasks/task.schemas.js
 */

export const MAX_JUDUL_LENGTH = 255;
export const MAX_DESKRIPSI_LENGTH = 2000;
export const MAX_REMINDER_LENGTH = 100;
export const MAX_SUBTASKS_COUNT = 15;
export const MAX_SUBTASK_JUDUL_LENGTH = 150;

export function validateSubtasksInput(rawSubtasks) {
  if (!rawSubtasks || !Array.isArray(rawSubtasks)) {
    return [];
  }
  return rawSubtasks
    .slice(0, MAX_SUBTASKS_COUNT)
    .map((item, index) => {
      if (!item || typeof item !== "object") return null;
      const cleanJudul = typeof item.judul === "string" ? item.judul.trim().slice(0, MAX_SUBTASK_JUDUL_LENGTH) : "";
      if (!cleanJudul) return null;
      return {
        id: item.id ? String(item.id) : `sub_${Date.now()}_${index}`,
        judul: cleanJudul,
        selesai: Boolean(item.selesai),
      };
    })
    .filter(Boolean);
}

export function getReminderOffsetMs(reminder) {
  switch (reminder) {
    case "30m":
      return 30 * 60 * 1000;
    case "1h":
      return 60 * 60 * 1000;
    case "3h":
      return 3 * 60 * 60 * 1000;
    case "6h":
      return 6 * 60 * 60 * 1000;
    case "1d":
      return 24 * 60 * 60 * 1000;
    case "15m":
    default:
      return 15 * 60 * 1000;
  }
}

export function parseSafeIsoDate(val) {
  if (val === null || val === undefined || val === "") {
    return { valid: true, value: null };
  }
  const d = new Date(val);
  if (isNaN(d.getTime())) {
    return { valid: false, value: null };
  }
  return { valid: true, value: d.toISOString() };
}

export function mapRowToTask(row) {
  if (!row) return null;

  const parseDbDate = (d) => {
    if (!d) return null;
    const dateObj = new Date(d);
    return isNaN(dateObj.getTime()) ? null : dateObj.toISOString();
  };

  let subtasks = [];
  if (Array.isArray(row.subtasks)) {
    subtasks = row.subtasks;
  } else if (typeof row.subtasks === "string") {
    try {
      const parsed = JSON.parse(row.subtasks);
      if (Array.isArray(parsed)) subtasks = parsed;
    } catch {
      subtasks = [];
    }
  }

  return {
    id: Number(row.id),
    userId: row.user_id,
    kategoriId: row.kategori_id ? Number(row.kategori_id) : null,
    judul: row.judul,
    deskripsi: row.deskripsi || "",
    deadline: parseDbDate(row.deadline),
    prioritas: Boolean(row.prioritas),
    selesai: Boolean(row.selesai),
    reminder: row.reminder || null,
    subtasks: subtasks.map((st, idx) => ({
      id: st.id ? String(st.id) : `sub_${row.id || "0"}_${idx}`,
      judul: typeof st.judul === "string" ? st.judul : "",
      selesai: Boolean(st.selesai),
    })),
    dibuatPada: parseDbDate(row.dibuat_pada) || new Date().toISOString(),
    selesaiPada: parseDbDate(row.selesai_pada),
  };
}

export function validateCreateTaskInput(body) {
  const {
    judul,
    deskripsi = "",
    deadline = null,
    reminder = null,
    kategoriId = null,
    prioritas = false,
    selesai = false,
    subtasks = [],
  } = body || {};

  // Validasi judul wajib & batas karakter
  if (!judul || typeof judul !== "string" || !judul.trim()) {
    return { error: "Judul tugas wajib diisi", status: 400 };
  }
  const cleanJudul = judul.trim();
  if (cleanJudul.length > MAX_JUDUL_LENGTH) {
    return { error: `Judul tugas maksimal ${MAX_JUDUL_LENGTH} karakter`, status: 400 };
  }

  // Validasi batas panjang deskripsi
  const cleanDeskripsi = typeof deskripsi === "string" ? deskripsi.trim() : "";
  if (cleanDeskripsi.length > MAX_DESKRIPSI_LENGTH) {
    return { error: `Deskripsi tugas maksimal ${MAX_DESKRIPSI_LENGTH} karakter`, status: 400 };
  }

  // Validasi format tanggal deadline
  const parsedDeadline = parseSafeIsoDate(deadline);
  if (!parsedDeadline.valid) {
    return { error: "Format tanggal tenggat waktu tidak valid", status: 400 };
  }

  // Validasi tenggat waktu tidak boleh berada di masa lalu (buffer 2 menit toleransi latency)
  if (parsedDeadline.value) {
    const deadlineTimestamp = new Date(parsedDeadline.value).getTime();
    const minimumAllowedTime = Date.now() - 120000;
    if (deadlineTimestamp < minimumAllowedTime) {
      return { error: "Tenggat waktu tidak boleh berada di masa lalu", status: 400 };
    }
  }

  // Validasi reminder
  let cleanReminder = null;
  if (reminder) {
    cleanReminder = String(reminder).trim().slice(0, MAX_REMINDER_LENGTH);
  }

  // Validasi format kategoriId
  let cleanKategoriId = null;
  if (kategoriId !== null && kategoriId !== undefined && kategoriId !== "") {
    const parsedCatId = Number(kategoriId);
    if (!Number.isFinite(parsedCatId)) {
      return { error: "Kategori ID tidak valid", status: 400 };
    }
    cleanKategoriId = parsedCatId;
  }

  // Validasi & sanitasi sub-tugas
  let cleanSubtasks = validateSubtasksInput(subtasks);
  let isSelesai = Boolean(selesai);

  // Aturan sinkronisasi centang 2 arah:
  if (isSelesai && cleanSubtasks.length > 0) {
    cleanSubtasks = cleanSubtasks.map((st) => ({ ...st, selesai: true }));
  } else if (!isSelesai && cleanSubtasks.length > 0 && cleanSubtasks.every((st) => st.selesai)) {
    isSelesai = true;
  }

  return {
    value: {
      cleanJudul,
      cleanDeskripsi,
      parsedDeadline,
      cleanReminder,
      cleanKategoriId,
      prioritas: Boolean(prioritas),
      selesai: isSelesai,
      cleanSubtasks,
    },
  };
}

export function validateUpdateTaskInput(body) {
  const {
    id,
    judul,
    deskripsi = "",
    deadline = null,
    reminder = null,
    kategoriId = null,
    prioritas = false,
    selesai = false,
    selesaiPada = null,
    subtasks = [],
  } = body || {};

  // Validasi Task ID
  const parsedId = Number(id);
  if (!id || !Number.isFinite(parsedId)) {
    return { error: "Task ID valid diperlukan", status: 400 };
  }

  // Validasi judul wajib & batas karakter
  if (!judul || typeof judul !== "string" || !judul.trim()) {
    return { error: "Judul tugas wajib diisi", status: 400 };
  }
  const cleanJudul = judul.trim();
  if (cleanJudul.length > MAX_JUDUL_LENGTH) {
    return { error: `Judul tugas maksimal ${MAX_JUDUL_LENGTH} karakter`, status: 400 };
  }

  // Validasi batas panjang deskripsi
  const cleanDeskripsi = typeof deskripsi === "string" ? deskripsi.trim() : "";
  if (cleanDeskripsi.length > MAX_DESKRIPSI_LENGTH) {
    return { error: `Deskripsi tugas maksimal ${MAX_DESKRIPSI_LENGTH} karakter`, status: 400 };
  }

  // Validasi tanggal deadline
  const parsedDeadline = parseSafeIsoDate(deadline);
  if (!parsedDeadline.valid) {
    return { error: "Format tanggal tenggat waktu tidak valid", status: 400 };
  }

  // Validasi reminder
  let cleanReminder = null;
  if (reminder) {
    cleanReminder = String(reminder).trim().slice(0, MAX_REMINDER_LENGTH);
  }

  // Validasi format kategoriId
  let cleanKategoriId = null;
  if (kategoriId !== null && kategoriId !== undefined && kategoriId !== "") {
    const parsedCatId = Number(kategoriId);
    if (!Number.isFinite(parsedCatId)) {
      return { error: "Kategori ID tidak valid", status: 400 };
    }
    cleanKategoriId = parsedCatId;
  }

  // Validasi & sanitasi sub-tugas
  let cleanSubtasks = validateSubtasksInput(subtasks);
  let isSelesai = Boolean(selesai);

  // Aturan sinkronisasi centang 2 arah:
  if (cleanSubtasks.length > 0) {
    const allSubtasksDone = cleanSubtasks.every((st) => st.selesai);
    if (allSubtasksDone) {
      isSelesai = true;
    } else if (isSelesai && body.subtasksManualCheckAll) {
      // Jika user klik centang tugas utama dan ada flag subtasksManualCheckAll
      cleanSubtasks = cleanSubtasks.map((st) => ({ ...st, selesai: true }));
    } else {
      // Jika salah satu sub-tugas belum selesai, tugas utama otomatis uncheck
      isSelesai = false;
    }
  }

  // Validasi tanggal selesai
  let parsedSelesaiPada = null;
  if (isSelesai) {
    if (selesaiPada) {
      const parsed = parseSafeIsoDate(selesaiPada);
      parsedSelesaiPada = parsed.valid && parsed.value ? parsed.value : new Date().toISOString();
    } else {
      parsedSelesaiPada = new Date().toISOString();
    }
  }

  return {
    value: {
      parsedId,
      cleanJudul,
      cleanDeskripsi,
      parsedDeadline,
      cleanReminder,
      cleanKategoriId,
      prioritas: Boolean(prioritas),
      selesai: isSelesai,
      cleanSubtasks,
      parsedSelesaiPada,
    },
  };
}
