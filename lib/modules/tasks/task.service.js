/**
 * Task Domain Orchestration & Business Logic (Service)
 * lib/modules/tasks/task.service.js
 */

import { sendImportantTaskCreatedEmail } from "@/lib/email";
import { handleDispatch } from "@/app/api/notifications/dispatch/route";
import * as taskRepo from "./task.repository";
import {
  validateCreateTaskInput,
  validateUpdateTaskInput,
  getReminderOffsetMs,
} from "./task.schemas";

/**
 * Mengambil daftar tugas milik user dengan validasi paginasi
 */
export async function getTasks(userId, { limitParam, offsetParam } = {}) {
  let limit = 300;
  let offset = null;

  if (limitParam !== null && limitParam !== undefined) {
    limit = Math.min(Math.max(1, parseInt(limitParam, 10) || 50), 300);
    if (offsetParam !== null && offsetParam !== undefined) {
      offset = Math.max(0, parseInt(offsetParam, 10) || 0);
    }
  }

  const tasks = await taskRepo.findTasksByUserId(userId, { limit, offset });
  return { tasks };
}

/**
 * Membuat tugas baru dengan validasi kuota 1.000 tugas, kepemilikan kategori,
 * pengiriman email tugas penting async, dan instant dispatch notifikasi.
 */
export async function createTask(userId, userEmail, body) {
  const validation = validateCreateTaskInput(body);
  if (validation.error) {
    return { error: validation.error, status: validation.status };
  }

  const {
    cleanJudul,
    cleanDeskripsi,
    parsedDeadline,
    cleanReminder,
    cleanKategoriId,
    prioritas,
    selesai,
  } = validation.value;

  // Eksekusi paralel: pemeriksaan kuota tugas dan proteksi IDOR kategori
  const [count, isCategoryValid] = await Promise.all([
    taskRepo.countTasksByUserId(userId),
    cleanKategoriId !== null
      ? taskRepo.checkCategoryOwnership(cleanKategoriId, userId)
      : Promise.resolve(true),
  ]);

  // Batasi kuota maksimal 1.000 tugas per akun
  if (count >= 1000) {
    return {
      error: "Batas maksimal 1.000 tugas per akun telah tercapai.",
      status: 400,
    };
  }

  // Validasi hasil kepemilikan kategori
  if (!isCategoryValid) {
    return {
      error: "Kategori tidak ditemukan atau Anda tidak memiliki akses",
      status: 400,
    };
  }

  const task = await taskRepo.createTaskInDb({
    userId,
    kategoriId: cleanKategoriId,
    judul: cleanJudul,
    deskripsi: cleanDeskripsi,
    deadline: parsedDeadline.value,
    reminder: cleanReminder,
    prioritas,
    selesai,
  });

  // Kirim notifikasi email untuk tugas penting secara asynchronous (non-blocking)
  if (prioritas && userEmail) {
    sendImportantTaskCreatedEmail({
      to: userEmail,
      taskTitle: cleanJudul,
      deadline: parsedDeadline.value,
      deskripsi: cleanDeskripsi,
    }).catch((err) => {
      console.error("[MAIL] Gagal mengirim email tugas penting:", err);
    });
  }

  // Instant Dispatch jika deadline <= threshold reminder saat tugas dibuat ATAU deadline <= sekarang
  if (parsedDeadline.value && !selesai) {
    const deadlineTime = new Date(parsedDeadline.value).getTime();
    const reminderOffset = getReminderOffsetMs(cleanReminder);
    if (deadlineTime - reminderOffset <= Date.now() || deadlineTime <= Date.now()) {
      handleDispatch().catch((err) => {
        console.error("[TASK_POST] Instant dispatch error:", err);
      });
    }
  }

  return { task, status: 201 };
}

/**
 * Memperbarui data tugas dengan validasi deadline masa lalu,
 * proteksi IDOR kategori, dan instant dispatch notifikasi.
 */
export async function updateTask(userId, body) {
  const validation = validateUpdateTaskInput(body);
  if (validation.error) {
    return { error: validation.error, status: validation.status };
  }

  const {
    parsedId,
    cleanJudul,
    cleanDeskripsi,
    parsedDeadline,
    cleanReminder,
    cleanKategoriId,
    prioritas,
    selesai,
    parsedSelesaiPada,
  } = validation.value;

  // Validasi perubahan tenggat waktu: tolak jika deadline BERUBAH dan berada di masa lalu
  if (parsedDeadline.value) {
    const currentTask = await taskRepo.findTaskDeadlineByIdAndUser(parsedId, userId);
    if (currentTask && parsedDeadline.value !== currentTask.deadline) {
      const deadlineTimestamp = new Date(parsedDeadline.value).getTime();
      const minimumAllowedTime = Date.now() - 120000;
      if (deadlineTimestamp < minimumAllowedTime) {
        return {
          error: "Perubahan tenggat waktu tidak boleh berada di masa lalu",
          status: 400,
        };
      }
    }
  }

  // Validasi kategoriId & Proteksi IDOR
  if (cleanKategoriId !== null) {
    const isCatValid = await taskRepo.checkCategoryOwnership(cleanKategoriId, userId);
    if (!isCatValid) {
      return {
        error: "Kategori tidak ditemukan atau Anda tidak memiliki akses",
        status: 400,
      };
    }
  }

  const task = await taskRepo.updateTaskInDb({
    id: parsedId,
    userId,
    judul: cleanJudul,
    deskripsi: cleanDeskripsi,
    deadline: parsedDeadline.value,
    reminder: cleanReminder,
    kategoriId: cleanKategoriId,
    prioritas,
    selesai,
    selesaiPada: parsedSelesaiPada,
  });

  if (!task) {
    return { error: "Tugas tidak ditemukan", status: 404 };
  }

  // Instant Dispatch jika deadline <= threshold reminder saat tugas di-update ATAU deadline <= sekarang
  if (parsedDeadline.value && !selesai) {
    const deadlineTime = new Date(parsedDeadline.value).getTime();
    const reminderOffset = getReminderOffsetMs(cleanReminder);
    if (deadlineTime - reminderOffset <= Date.now() || deadlineTime <= Date.now()) {
      handleDispatch().catch((err) => {
        console.error("[TASK_PUT] Instant dispatch error:", err);
      });
    }
  }

  return { task };
}

/**
 * Menghapus tugas (tunggal berdasarkan ID atau massal tugas selesai)
 */
export async function deleteTask(userId, { id, scope } = {}) {
  // Bulk delete seluruh tugas selesai milik user
  if (scope === "completed") {
    const deletedCount = await taskRepo.deleteCompletedTasksByUserId(userId);
    return {
      success: true,
      count: deletedCount,
      message: `${deletedCount} tugas selesai berhasil dihapus.`,
    };
  }

  const parsedId = Number(id);
  if (!id || !Number.isFinite(parsedId)) {
    return { error: "Task ID valid diperlukan", status: 400 };
  }

  await taskRepo.deleteTaskByIdAndUser(parsedId, userId);
  return { success: true };
}
