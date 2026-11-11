/**
 * Task Data Access Layer (Repository)
 * lib/modules/tasks/task.repository.js
 */

import { query } from "@/lib/db";
import { mapRowToTask } from "./task.schemas";

/**
 * Mengambil daftar tugas milik user dengan paginasi aman
 */
export async function findTasksByUserId(userId, { limit = 300, offset = null } = {}) {
  let querySql = `SELECT * FROM public.tasks WHERE user_id = $1 ORDER BY dibuat_pada DESC`;
  const queryParams = [userId];

  queryParams.push(limit);
  querySql += ` LIMIT $${queryParams.length}`;

  if (offset !== null && offset !== undefined) {
    queryParams.push(offset);
    querySql += ` OFFSET $${queryParams.length}`;
  }

  const result = await query(querySql, queryParams);
  return result.rows.map(mapRowToTask);
}

/**
 * Menghitung total jumlah tugas milik user (untuk limit kuota)
 */
export async function countTasksByUserId(userId) {
  const result = await query(
    `SELECT COUNT(*)::int as count FROM public.tasks WHERE user_id = $1;`,
    [userId]
  );
  return result.rows[0]?.count || 0;
}

/**
 * Memeriksa kepemilikan kategori untuk proteksi IDOR
 */
export async function checkCategoryOwnership(categoryId, userId) {
  if (categoryId === null || categoryId === undefined) return true;
  const result = await query(
    `SELECT id FROM public.categories WHERE id = $1 AND user_id = $2;`,
    [categoryId, userId]
  );
  return result.rows.length > 0;
}

/**
 * Membuat tugas baru di database
 */
export async function createTaskInDb({
  userId,
  kategoriId,
  judul,
  deskripsi,
  deadline,
  reminder,
  prioritas,
  selesai,
  subtasks = [],
}) {
  const result = await query(
    `INSERT INTO public.tasks (user_id, kategori_id, judul, deskripsi, deadline, reminder, prioritas, selesai, subtasks, dibuat_pada)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
     RETURNING *;`,
    [
      userId,
      kategoriId,
      judul,
      deskripsi,
      deadline,
      reminder,
      Boolean(prioritas),
      Boolean(selesai),
      JSON.stringify(subtasks || []),
    ]
  );

  return mapRowToTask(result.rows[0]);
}

/**
 * Mengambil deadline tugas yang ada untuk validasi perubahan deadline
 */
export async function findTaskDeadlineByIdAndUser(taskId, userId) {
  const result = await query(
    `SELECT deadline FROM public.tasks WHERE id = $1 AND user_id = $2;`,
    [taskId, userId]
  );
  if (result.rows.length === 0) return null;
  return {
    deadline: result.rows[0].deadline
      ? new Date(result.rows[0].deadline).toISOString()
      : null,
  };
}

/**
 * Memperbarui data tugas di database
 */
export async function updateTaskInDb({
  id,
  userId,
  judul,
  deskripsi,
  deadline,
  reminder,
  kategoriId,
  prioritas,
  selesai,
  selesaiPada,
  subtasks = [],
}) {
  const result = await query(
    `UPDATE public.tasks
     SET judul = $1,
         deskripsi = $2,
         deadline = $3,
         reminder = $4,
         kategori_id = $5,
         prioritas = $6,
         selesai = $7,
         selesai_pada = $8,
         subtasks = $9,
         reminder_sent = CASE 
           WHEN (deadline IS DISTINCT FROM $3) OR (reminder IS DISTINCT FROM $4) THEN false 
           ELSE reminder_sent 
         END,
         deadline_sent = CASE 
           WHEN (deadline IS DISTINCT FROM $3) THEN false 
           ELSE deadline_sent 
         END
     WHERE id = $10 AND user_id = $11
     RETURNING *;`,
    [
      judul,
      deskripsi,
      deadline,
      reminder,
      kategoriId,
      Boolean(prioritas),
      Boolean(selesai),
      selesaiPada,
      JSON.stringify(subtasks || []),
      id,
      userId,
    ]
  );

  if (result.rows.length === 0) return null;
  return mapRowToTask(result.rows[0]);
}

/**
 * Menghapus satu tugas berdasarkan ID dan User ID
 */
export async function deleteTaskByIdAndUser(taskId, userId) {
  const result = await query(
    `DELETE FROM public.tasks WHERE id = $1 AND user_id = $2;`,
    [taskId, userId]
  );
  return result.rowCount || 0;
}

/**
 * Menghapus massal seluruh tugas yang sudah selesai milik user
 */
export async function deleteCompletedTasksByUserId(userId) {
  const result = await query(
    `DELETE FROM public.tasks WHERE user_id = $1 AND selesai = true;`,
    [userId]
  );
  return result.rowCount || 0;
}
