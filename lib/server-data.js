import { query } from "./db.js";
import { isTaskExpired } from "./utils.js";

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
    // Zero-Cost Free Tier Optimization: purge completed tasks > 14 days old for this user
    await query(
      `DELETE FROM public.tasks
       WHERE user_id = $1
         AND selesai = true
         AND selesai_pada IS NOT NULL
         AND selesai_pada < NOW() - INTERVAL '14 days';`,
      [userId]
    );

    const [tasksRes, catRes] = await Promise.all([
      query(
        `SELECT * FROM public.tasks WHERE user_id = $1 ORDER BY dibuat_pada DESC;`,
        [userId]
      ),
      query(
        `SELECT * FROM public.categories WHERE user_id = $1 ORDER BY id ASC;`,
        [userId]
      ),
    ]);

    const tasks = (tasksRes?.rows || [])
      .map(mapRowToTask)
      .filter((t) => !isTaskExpired(t));
    const categories = (catRes?.rows || []).map(mapRowToCategory);

    return { tasks, categories, error: false };
  } catch (err) {
    console.error("Gagal memuat data server-side SSR di getInitialDashboardData:", err);
    return { tasks: [], categories: [], error: true };
  }
}
