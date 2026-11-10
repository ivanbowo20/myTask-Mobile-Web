/**
 * Task Domain Schemas, Constants, Validations & Mappers
 * lib/modules/tasks/task.schemas.js
 */

export const MAX_JUDUL_LENGTH = 255;
export const MAX_DESKRIPSI_LENGTH = 2000;
export const MAX_REMINDER_LENGTH = 100;

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

  return {
    value: {
      cleanJudul,
      cleanDeskripsi,
      parsedDeadline,
      cleanReminder,
      cleanKategoriId,
      prioritas: Boolean(prioritas),
      selesai: Boolean(selesai),
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

  // Validasi tanggal selesai
  let parsedSelesaiPada = null;
  if (selesai) {
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
      selesai: Boolean(selesai),
      parsedSelesaiPada,
    },
  };
}
