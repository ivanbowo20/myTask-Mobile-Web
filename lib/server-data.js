import { query } from "./db.js";

/**
 * Normalizes database task row into a clean, serializable object.
 */
export function mapRowToTask(row) {
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

/**
 * Normalizes database category row into a clean, serializable object.
 */
export function mapRowToCategory(row) {
  return {
    id: Number(row.id),
    userId: row.user_id,
    nama: row.nama,
    warna: row.warna,
    icon: row.icon,
  };
}

/**
 * Fetches initial tasks and categories server-side directly from PostgreSQL.
 * Parameterized by userId to enforce strict multi-tenant isolation (IDOR protection).
 */
export async function getInitialDashboardData(userId) {
  if (!userId) {
    return { tasks: [], categories: [], error: false };
  }

  try {
    const [tasksRes, catRes] = await Promise.all([
      query(
        `SELECT * FROM public.tasks WHERE user_id = $1 ORDER BY dibuat_pada DESC LIMIT 300;`,
        [userId]
      ),
      query(
        `SELECT * FROM public.categories WHERE user_id = $1 ORDER BY id ASC LIMIT 100;`,
        [userId]
      ),
    ]);

    const tasks = (tasksRes?.rows || []).map(mapRowToTask);
    const categories = (catRes?.rows || []).map(mapRowToCategory);

    return { tasks, categories, error: false };
  } catch (err) {
    console.error("Gagal memuat data server-side SSR di getInitialDashboardData:", err);
    return { tasks: [], categories: [], error: true };
  }
}
