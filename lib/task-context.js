'use client';

import { createContext, useContext, useState, useMemo, useEffect, useCallback, useRef } from "react";
import { hitungStatusDeadline } from "./utils";
import { toast } from "./use-toast";
import { useSession } from "./auth-client";
import { OFFLINE_SYNC_ENABLED } from "./local/feature-flag";
import { localDb } from "./local/db";
import { enqueueWithRow } from "./local/outbox";
import { syncAll } from "./local/sync-engine";
import { saveSessionSnapshot } from "./local/session-snapshot";

const TaskContext = createContext(null);

function getCacheKey(userId) {
  return `taskflow_cache_${userId}`;
}

function getStoredCache(userId) {
  if (typeof window === "undefined" || !userId) return null;
  try {
    const raw = localStorage.getItem(getCacheKey(userId));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.warn("Gagal membaca offline cache TaskFlow:", err);
    return null;
  }
}

function setStoredCache(userId, data) {
  if (typeof window === "undefined" || !userId) return;
  try {
    localStorage.setItem(getCacheKey(userId), JSON.stringify(data));
  } catch (err) {
    console.warn("Gagal menyimpan offline cache TaskFlow:", err);
  }
}

export function TaskProvider({
  children,
  initialSession = null,
  initialTasks = [],
  initialCategories = [],
  hasServerError = false,
}) {
  const { data: session, isPending } = useSession();

  // Snapshot fallback identitas pengguna untuk menjaga kesinambungan saat offline
  const [offlineFallbackUser, setOfflineFallbackUser] = useState(initialSession?.user || null);

  useEffect(() => {
    if (session?.user) {
      setOfflineFallbackUser(session.user);
    } else if (typeof window !== "undefined" && !navigator.onLine && !offlineFallbackUser) {
      try {
        const raw = localStorage.getItem("better-auth.session_data");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.user) setOfflineFallbackUser(parsed.user);
        }
      } catch (_) {}
    }
  }, [session, offlineFallbackUser]);

  const currentUser = session?.user || offlineFallbackUser || initialSession?.user || null;
  const currentSession = session || (currentUser ? { user: currentUser } : null) || initialSession;

  const [tasks, setTasks] = useState(initialTasks || []);
  const [categories, setCategories] = useState(initialCategories || []);

  const hasInitialData =
    !hasServerError &&
    Boolean(
      initialSession?.user || (initialTasks && initialTasks.length > 0)
    );
  const [isLoading, setIsLoading] = useState(!hasInitialData);

  const initialLoadedUserIdRef = useRef(
    hasInitialData ? (initialSession?.user?.id || null) : null
  );
  const prevUserIdRef = useRef(currentUser?.id || null);

  const activeUserId = currentUser?.id || null;

  // Snapshot session untuk kontinuitas offline
  useEffect(() => {
    if (activeUserId && OFFLINE_SYNC_ENABLED && currentUser) {
      saveSessionSnapshot(activeUserId, currentUser);
    }
  }, [activeUserId, currentUser]);

  const loadAbortRef = useRef(null);

  // Cleanup active fetch saat unmount
  useEffect(() => {
    return () => {
      if (loadAbortRef.current) {
        loadAbortRef.current.abort();
      }
    };
  }, []);

  // Ambil data tugas & kategori milik user aktif dari database atau Dexie
  const loadData = useCallback(async () => {
    if (!activeUserId) {
      setTasks([]);
      setCategories([]);
      setIsLoading(false);
      return;
    }

    if (loadAbortRef.current) {
      loadAbortRef.current.abort();
    }
    const controller = new AbortController();
    loadAbortRef.current = controller;

    try {
      setIsLoading(true);

      if (OFFLINE_SYNC_ENABLED && typeof window !== "undefined") {
        try {
          const localTasks = await localDb.tasks
            .where("userId")
            .equals(activeUserId)
            .filter((row) => !row.deletedAt)
            .toArray();
          const localCats = await localDb.categories
            .where("userId")
            .equals(activeUserId)
            .filter((row) => !row.deletedAt)
            .toArray();
          if (controller.signal.aborted) return;
          if (localTasks.length > 0) setTasks(localTasks);
          if (localCats.length > 0) setCategories(localCats);
        } catch (dexieErr) {
          console.warn("[offline-task] Gagal membaca data Dexie lokal:", dexieErr);
        }
      }

      const [tasksRes, catRes] = await Promise.all([
        fetch("/api/tasks", { signal: controller.signal }),
        fetch("/api/categories", { signal: controller.signal }),
      ]);

      if (controller.signal.aborted) return;

      if (tasksRes.ok) {
        const tasksData = await tasksRes.json();
        if (!controller.signal.aborted) {
          setTasks(tasksData.tasks || []);
        }
      }
      if (catRes.ok) {
        const catData = await catRes.json();
        if (!controller.signal.aborted) {
          setCategories(catData.categories || []);
        }
      }
    } catch (err) {
      if (err?.name === "AbortError") return;
      console.error("Gagal memuat data dari database:", err);
    } finally {
      if (loadAbortRef.current === controller) {
        setIsLoading(false);
      }
    }
  }, [activeUserId]);

  useEffect(() => {
    const currentId = currentUser?.id || null;

    if (initialLoadedUserIdRef.current && currentId === initialLoadedUserIdRef.current) {
      prevUserIdRef.current = currentId;
      return;
    }

    if (currentId !== prevUserIdRef.current || !hasInitialData) {
      prevUserIdRef.current = currentId;
      if (currentId !== initialLoadedUserIdRef.current) {
        initialLoadedUserIdRef.current = null;
      }
      loadData();
    }
  }, [currentUser?.id, hasInitialData, loadData]);

  // Instant Cache (Offline-First): Ambil dari localStorage saat client mount untuk 0ms instant render jika tidak ada SSR data
  useEffect(() => {
    if (!activeUserId) return;
    if (hasInitialData && !hasServerError) return;

    const cached = getStoredCache(activeUserId);
    if (cached) {
      if (Array.isArray(cached.tasks) && cached.tasks.length > 0) {
        setTasks(cached.tasks);
        setIsLoading(false);
      }
      if (Array.isArray(cached.categories) && cached.categories.length > 0) {
        setCategories(cached.categories);
        setIsLoading(false);
      }
    }
  }, [activeUserId, hasInitialData, hasServerError]);

  // Cache Persistence: Simpan ke localStorage dengan micro-debounce
  useEffect(() => {
    if (!activeUserId) return;
    if (isLoading && tasks.length === 0 && categories.length === 0 && !hasInitialData) {
      return;
    }
    const timer = setTimeout(() => {
      setStoredCache(activeUserId, {
        tasks,
        categories,
        updatedAt: Date.now(),
      });
    }, 150);
    return () => clearTimeout(timer);
  }, [activeUserId, tasks, categories, isLoading, hasInitialData]);

  // Listener event rekonsiliasi server (mytask:synced)
  useEffect(() => {
    if (typeof window === "undefined" || !activeUserId || !OFFLINE_SYNC_ENABLED) return;

    const handleSynced = async (e) => {
      if (e?.detail?.userId === activeUserId) {
        try {
          const freshTasks = await localDb.tasks
            .where("userId")
            .equals(activeUserId)
            .filter((row) => !row.deletedAt)
            .toArray();
          const freshCats = await localDb.categories
            .where("userId")
            .equals(activeUserId)
            .filter((row) => !row.deletedAt)
            .toArray();
          setTasks(freshTasks);
          setCategories(freshCats);
        } catch (err) {
          console.warn("[offline-task] Gagal reload data setelah sync:", err);
        }
      }
    };

    window.addEventListener("mytask:synced", handleSynced);
    return () => window.removeEventListener("mytask:synced", handleSynced);
  }, [activeUserId]);

  // Modal visibility states
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);

  const openAddTask = useCallback(() => setIsAddTaskOpen(true), []);
  const closeAddTask = useCallback(() => setIsAddTaskOpen(false), []);
  const openEditTask = useCallback((t) => setEditingTask(t), []);
  const closeEditTask = useCallback(() => setEditingTask(null), []);
  const openAddCategory = useCallback(() => setIsAddCategoryOpen(true), []);
  const closeAddCategory = useCallback(() => setIsAddCategoryOpen(false), []);
  const openEditCategory = useCallback((c) => setEditingCategory(c), []);
  const closeEditCategory = useCallback(() => setEditingCategory(null), []);

  // Task Operations
  async function addTask(newTask) {
    const tempId = Date.now();
    const clientUuid =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `task_${tempId}_${Math.random().toString(36).slice(2, 9)}`;

    const taskWithId = {
      ...newTask,
      id: tempId,
      clientUuid,
      dibuatPada: new Date().toISOString(),
      pending: OFFLINE_SYNC_ENABLED ? 1 : 0,
    };
    setTasks((prev) => [taskWithId, ...prev]);

    if (OFFLINE_SYNC_ENABLED && activeUserId && typeof window !== "undefined") {
      try {
        const nowIso = new Date().toISOString();
        const cat = categories.find((c) => String(c.id) === String(newTask.kategoriId) || c.clientUuid === newTask.kategoriClientUuid);
        const resolvedDeadline = newTask.deadline || null;
        const resolvedReminder = newTask.reminder || "1h";
        const resolvedKategoriClientUuid = cat?.clientUuid || newTask.kategoriClientUuid || null;

        const taskRow = {
          ...taskWithId,
          userId: activeUserId,
          clientUuid,
          deadline: resolvedDeadline,
          reminder: resolvedReminder,
          kategoriClientUuid: resolvedKategoriClientUuid,
          serverId: null,
          updatedAt: nowIso,
          deletedAt: null,
          pending: 1,
        };

        await enqueueWithRow(localDb, activeUserId, "tasks", taskRow, {
          judul: newTask.judul,
          deskripsi: newTask.deskripsi || "",
          prioritas: newTask.prioritas || false,
          deadline: resolvedDeadline,
          reminder: resolvedReminder,
          selesai: false,
          kategoriId: newTask.kategoriId || null,
          kategoriClientUuid: resolvedKategoriClientUuid,
          subtasks: newTask.subtasks || [],
          updatedAt: nowIso,
        });

        toast.success("Tugas baru berhasil ditambahkan!");
        if (typeof navigator !== "undefined" && navigator.onLine) {
          syncAll(activeUserId).catch(() => {});
        }
        return { success: true, task: taskRow };
      } catch (e) {
        console.warn("[offline-task] Enqueue outbox gagal, fallback ke fetch:", e);
      }
    }

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTask),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.task) {
          setTasks((prev) =>
            prev.map((t) => (t.id === tempId ? data.task : t))
          );
        }
        toast.success("Tugas baru berhasil ditambahkan!");
        return { success: true, task: data.task };
      } else {
        const errData = await res.json().catch(() => null);
        setTasks((prev) => prev.filter((t) => t.id !== tempId));
        toast.error(errData?.error || "Gagal menyimpan tugas ke cloud server.");
        return { success: false, error: errData?.error };
      }
    } catch (err) {
      setTasks((prev) => prev.filter((t) => t.id !== tempId));
      console.error("Gagal sinkronisasi tambah tugas:", err);
      toast.error("Gagal menyimpan tugas ke cloud server.");
      return { success: false, error: err };
    }
  }

  async function updateTask(updatedTask) {
    const targetId = Number(updatedTask.id);
    const previousTask = tasks.find((t) => Number(t.id) === targetId);

    const clientUuid =
      updatedTask.clientUuid ||
      previousTask?.clientUuid ||
      (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `task_${targetId}_upd`);

    const taskWithUuid = {
      ...updatedTask,
      clientUuid,
      pending: OFFLINE_SYNC_ENABLED ? 1 : (updatedTask.pending || 0),
    };

    setTasks((prev) =>
      prev.map((t) => (Number(t.id) === targetId ? taskWithUuid : t))
    );

    if (OFFLINE_SYNC_ENABLED && activeUserId && typeof window !== "undefined") {
      try {
        const nowIso = new Date().toISOString();
        const cat = categories.find((c) => String(c.id) === String(updatedTask.kategoriId) || c.clientUuid === updatedTask.kategoriClientUuid);
        const resolvedDeadline = updatedTask.deadline !== undefined ? updatedTask.deadline : (previousTask?.deadline || null);
        const resolvedReminder = updatedTask.reminder !== undefined ? updatedTask.reminder : (previousTask?.reminder || "1h");
        const resolvedKategoriClientUuid = cat?.clientUuid || updatedTask.kategoriClientUuid || previousTask?.kategoriClientUuid || null;

        const updatedRow = {
          ...(previousTask || {}),
          ...taskWithUuid,
          userId: activeUserId,
          clientUuid,
          deadline: resolvedDeadline,
          reminder: resolvedReminder,
          kategoriClientUuid: resolvedKategoriClientUuid,
          updatedAt: nowIso,
          pending: 1,
        };

        await enqueueWithRow(localDb, activeUserId, "tasks", updatedRow, {
          judul: updatedTask.judul,
          deskripsi: updatedTask.deskripsi !== undefined ? updatedTask.deskripsi : (previousTask?.deskripsi || ""),
          prioritas: updatedTask.prioritas !== undefined ? updatedTask.prioritas : (previousTask?.prioritas || false),
          deadline: resolvedDeadline,
          reminder: resolvedReminder,
          selesai: updatedTask.selesai !== undefined ? updatedTask.selesai : (previousTask?.selesai || false),
          selesaiPada: updatedTask.selesaiPada !== undefined ? updatedTask.selesaiPada : (previousTask?.selesaiPada || null),
          kategoriId: updatedTask.kategoriId !== undefined ? updatedTask.kategoriId : (previousTask?.kategoriId || null),
          kategoriClientUuid: resolvedKategoriClientUuid,
          subtasks: updatedTask.subtasks || previousTask?.subtasks || [],
          updatedAt: nowIso,
        });

        toast.success("Perubahan tugas berhasil disimpan!");
        if (typeof navigator !== "undefined" && navigator.onLine) {
          syncAll(activeUserId).catch(() => {});
        }
        return { success: true };
      } catch (e) {
        console.warn("[offline-task] Enqueue update gagal:", e);
      }
    }

    try {
      const res = await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedTask),
      });
      if (res.ok) {
        toast.success("Perubahan tugas berhasil disimpan!");
        return { success: true };
      } else {
        const errData = await res.json().catch(() => null);
        if (previousTask) {
          setTasks((prev) =>
            prev.map((t) => (Number(t.id) === targetId ? previousTask : t))
          );
        }
        toast.error(errData?.error || "Gagal memperbarui tugas di cloud server.");
        return { success: false, error: errData?.error };
      }
    } catch (err) {
      if (previousTask) {
        setTasks((prev) =>
          prev.map((t) => (Number(t.id) === targetId ? previousTask : t))
        );
      }
      console.error("Gagal sinkronisasi update tugas:", err);
      toast.error("Gagal memperbarui tugas di cloud server.");
      return { success: false, error: err };
    }
  }

  async function deleteTask(taskId) {
    const targetId = Number(taskId);
    const previousIndex = tasks.findIndex((t) => Number(t.id) === targetId || t.clientUuid === taskId);
    const previousTask = previousIndex !== -1 ? tasks[previousIndex] : null;

    setTasks((prev) => prev.filter((t) => Number(t.id) !== targetId && t.clientUuid !== taskId));

    if (OFFLINE_SYNC_ENABLED && activeUserId && previousTask && typeof window !== "undefined") {
      try {
        const clientUuid = previousTask.clientUuid || `task_${targetId}`;
        const tombstoneRow = {
          ...previousTask,
          userId: activeUserId,
          clientUuid,
          deletedAt: new Date().toISOString(),
          pending: 1,
        };
        await enqueueWithRow(localDb, activeUserId, "tasks", tombstoneRow, {
          deletedAt: tombstoneRow.deletedAt,
        });

        toast.success("Tugas berhasil dihapus.");
        if (typeof navigator !== "undefined" && navigator.onLine) {
          syncAll(activeUserId).catch(() => {});
        }
        return;
      } catch (e) {
        console.warn("[offline-task] Enqueue delete gagal:", e);
      }
    }

    try {
      const res = await fetch(`/api/tasks?id=${targetId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Tugas berhasil dihapus.");
      } else {
        if (previousTask) {
          setTasks((prev) => {
            if (prev.some((t) => Number(t.id) === targetId)) return prev;
            const next = [...prev];
            next.splice(previousIndex >= 0 ? previousIndex : 0, 0, previousTask);
            return next;
          });
        }
        toast.error("Gagal menghapus tugas dari cloud server.");
      }
    } catch (err) {
      if (previousTask) {
        setTasks((prev) => {
          if (prev.some((t) => Number(t.id) === targetId)) return prev;
          const next = [...prev];
          next.splice(previousIndex >= 0 ? previousIndex : 0, 0, previousTask);
          return next;
        });
      }
      console.error("Gagal menghapus tugas:", err);
      toast.error("Gagal menghapus tugas dari cloud server.");
    }
  }

  async function clearCompletedTasks() {
    const previousTasks = [...tasks];
    const completedTasks = tasks.filter((t) => t.selesai);
    const completedCount = completedTasks.length;

    if (completedCount === 0) {
      return { success: true, count: 0 };
    }

    setTasks((prev) => prev.filter((t) => !t.selesai));

    if (OFFLINE_SYNC_ENABLED && activeUserId && typeof window !== "undefined") {
      try {
        const nowIso = new Date().toISOString();
        for (const t of completedTasks) {
          const clientUuid = t.clientUuid || `task_${t.id}`;
          const tombstoneRow = {
            ...t,
            userId: activeUserId,
            clientUuid,
            deletedAt: nowIso,
            pending: 1,
          };
          await enqueueWithRow(localDb, activeUserId, "tasks", tombstoneRow, {
            deletedAt: nowIso,
          });
        }
        toast.success(`${completedCount} tugas selesai berhasil dibersihkan.`);
        if (typeof navigator !== "undefined" && navigator.onLine) {
          syncAll(activeUserId).catch(() => {});
        }
        return { success: true, count: completedCount };
      } catch (e) {
        console.warn("[offline-task] Clear completed offline gagal:", e);
      }
    }

    try {
      const res = await fetch("/api/tasks?scope=completed", {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success(`${completedCount} tugas selesai berhasil dibersihkan.`);
        return { success: true, count: completedCount };
      } else {
        setTasks(previousTasks);
        const errData = await res.json().catch(() => null);
        toast.error(errData?.error || "Gagal membersihkan tugas selesai dari cloud server.");
        return { success: false, error: errData?.error };
      }
    } catch (err) {
      setTasks(previousTasks);
      console.error("Gagal membersihkan tugas selesai:", err);
      toast.error("Gagal membersihkan tugas selesai dari cloud server.");
      return { success: false, error: err };
    }
  }

  async function toggleComplete(taskId) {
    const targetId = Number(taskId);
    const targetTask = tasks.find((t) => Number(t.id) === targetId || t.clientUuid === taskId);
    if (!targetTask) return;

    const nextSelesai = !targetTask.selesai;
    const nextSelesaiPada = nextSelesai ? new Date().toISOString() : null;

    const currentSubtasks = Array.isArray(targetTask.subtasks) ? targetTask.subtasks : [];
    const updatedSubtasks = currentSubtasks.map((st) => ({
      ...st,
      selesai: nextSelesai,
    }));

    const updatedTask = {
      ...targetTask,
      selesai: nextSelesai,
      selesaiPada: nextSelesaiPada,
      subtasks: updatedSubtasks,
      pending: OFFLINE_SYNC_ENABLED ? 1 : (targetTask.pending || 0),
    };

    setTasks((prev) =>
      prev.map((t) =>
        (Number(t.id) === targetId || (t.clientUuid && t.clientUuid === taskId))
          ? updatedTask
          : t
      )
    );

    if (nextSelesai) {
      toast.success("Tugas selesai!");
    } else {
      toast.info("Tugas dipulihkan kembali ke daftar aktif!");
    }

    if (OFFLINE_SYNC_ENABLED && activeUserId && typeof window !== "undefined") {
      try {
        const nowIso = new Date().toISOString();
        const clientUuid =
          targetTask.clientUuid ||
          (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : `task_${targetId}`);

        const row = {
          ...updatedTask,
          userId: activeUserId,
          clientUuid,
          updatedAt: nowIso,
          pending: 1,
        };

        await enqueueWithRow(localDb, activeUserId, "tasks", row, {
          selesai: nextSelesai,
          selesaiPada: nextSelesaiPada,
          subtasks: updatedSubtasks,
          updatedAt: nowIso,
        });

        if (typeof navigator !== "undefined" && navigator.onLine) {
          syncAll(activeUserId).catch(() => {});
        }
        return;
      } catch (e) {
        console.warn("[offline-task] Enqueue toggle complete gagal:", e);
      }
    }

    try {
      const res = await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...targetTask,
          selesai: nextSelesai,
          selesaiPada: nextSelesaiPada,
          subtasks: updatedSubtasks,
          subtasksManualCheckAll: nextSelesai,
        }),
      });
      if (!res.ok) {
        setTasks((prev) =>
          prev.map((t) => (Number(t.id) === targetId ? targetTask : t))
        );
        toast.error("Gagal memperbarui status tugas di cloud server.");
      }
    } catch (err) {
      setTasks((prev) =>
        prev.map((t) => (Number(t.id) === targetId ? targetTask : t))
      );
      console.error("Gagal update status selesai:", err);
      toast.error("Gagal memperbarui status tugas di cloud server.");
    }
  }

  async function toggleSubtask(taskId, subtaskId) {
    const targetId = Number(taskId);
    const targetTask = tasks.find((t) => Number(t.id) === targetId || t.clientUuid === taskId);
    if (!targetTask) return;

    const currentSubtasks = Array.isArray(targetTask.subtasks) ? targetTask.subtasks : [];
    const targetSubtask = currentSubtasks.find((st) => String(st.id) === String(subtaskId));
    if (!targetSubtask) return;

    const nextSubtaskSelesai = !targetSubtask.selesai;
    const nextSubtasks = currentSubtasks.map((st) =>
      String(st.id) === String(subtaskId)
        ? { ...st, selesai: nextSubtaskSelesai }
        : st
    );

    const activeSubtasks = nextSubtasks.filter((st) => !st.deleted);
    const allDone = activeSubtasks.length > 0 && activeSubtasks.every((st) => st.selesai);
    const nextTaskSelesai = allDone;
    const nextSelesaiPada = allDone ? (targetTask.selesaiPada || new Date().toISOString()) : null;

    const updatedTask = {
      ...targetTask,
      subtasks: nextSubtasks,
      selesai: nextTaskSelesai,
      selesaiPada: nextSelesaiPada,
      pending: OFFLINE_SYNC_ENABLED ? 1 : (targetTask.pending || 0),
    };

    setTasks((prev) =>
      prev.map((t) =>
        (Number(t.id) === targetId || (t.clientUuid && t.clientUuid === taskId)) ? updatedTask : t
      )
    );

    if (allDone && !targetTask.selesai) {
      toast.success("Semua sub-tugas selesai! Tugas utama terselesaikan");
    }

    if (OFFLINE_SYNC_ENABLED && activeUserId && typeof window !== "undefined") {
      try {
        const nowIso = new Date().toISOString();
        const clientUuid =
          targetTask.clientUuid ||
          (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : `task_${targetId}`);

        const row = {
          ...updatedTask,
          userId: activeUserId,
          clientUuid,
          updatedAt: nowIso,
          pending: 1,
        };

        await enqueueWithRow(localDb, activeUserId, "tasks", row, {
          subtasks: nextSubtasks,
          selesai: nextTaskSelesai,
          selesaiPada: nextSelesaiPada,
          updatedAt: nowIso,
        });

        if (typeof navigator !== "undefined" && navigator.onLine) {
          syncAll(activeUserId).catch(() => {});
        }
        return;
      } catch (e) {
        console.warn("[offline-task] Enqueue toggle subtask gagal:", e);
      }
    }

    try {
      const res = await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedTask),
      });
      if (!res.ok) {
        setTasks((prev) =>
          prev.map((t) => (Number(t.id) === targetId ? targetTask : t))
        );
        toast.error("Gagal memperbarui sub-tugas di server.");
      }
    } catch (err) {
      setTasks((prev) =>
        prev.map((t) => (Number(t.id) === targetId ? targetTask : t))
      );
      console.error("Gagal update status sub-tugas:", err);
      toast.error("Gagal memperbarui sub-tugas di server.");
    }
  }

  async function toggleImportant(taskId) {
    const targetId = Number(taskId);
    const targetTask = tasks.find((t) => Number(t.id) === targetId || t.clientUuid === taskId);
    if (!targetTask) return;

    const nextPrioritas = !targetTask.prioritas;
    const updatedTask = {
      ...targetTask,
      prioritas: nextPrioritas,
      pending: OFFLINE_SYNC_ENABLED ? 1 : (targetTask.pending || 0),
    };

    setTasks((prev) =>
      prev.map((t) =>
        (Number(t.id) === targetId || (t.clientUuid && t.clientUuid === taskId))
          ? updatedTask
          : t
      )
    );

    if (nextPrioritas) {
      toast.info("Tugas ditandai sebagai penting.");
    } else {
      toast.info("Tanda penting dilepas.");
    }

    if (OFFLINE_SYNC_ENABLED && activeUserId && typeof window !== "undefined") {
      try {
        const nowIso = new Date().toISOString();
        const clientUuid =
          targetTask.clientUuid ||
          (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : `task_${targetId}`);

        const row = {
          ...updatedTask,
          userId: activeUserId,
          clientUuid,
          updatedAt: nowIso,
          pending: 1,
        };

        await enqueueWithRow(localDb, activeUserId, "tasks", row, {
          prioritas: nextPrioritas,
          updatedAt: nowIso,
        });

        if (typeof navigator !== "undefined" && navigator.onLine) {
          syncAll(activeUserId).catch(() => {});
        }
        return;
      } catch (e) {
        console.warn("[offline-task] Enqueue toggle important gagal:", e);
      }
    }

    try {
      const res = await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...targetTask,
          prioritas: nextPrioritas,
        }),
      });
      if (!res.ok) {
        setTasks((prev) =>
          prev.map((t) => (Number(t.id) === targetId ? targetTask : t))
        );
        toast.error("Gagal memperbarui status tugas di cloud server.");
      }
    } catch (err) {
      setTasks((prev) =>
        prev.map((t) => (Number(t.id) === targetId ? targetTask : t))
      );
      console.error("Gagal update status penting:", err);
      toast.error("Gagal memperbarui status tugas di cloud server.");
    }
  }

  // Category Operations
  async function addCategory(newCategory) {
    const tempId = Date.now();
    const clientUuid =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `cat_${tempId}_${Math.random().toString(36).slice(2, 9)}`;

    const catWithId = {
      ...newCategory,
      id: tempId,
      clientUuid,
      pending: OFFLINE_SYNC_ENABLED ? 1 : 0,
    };
    setCategories((prev) => [...prev, catWithId]);

    if (OFFLINE_SYNC_ENABLED && activeUserId && typeof window !== "undefined") {
      try {
        const nowIso = new Date().toISOString();
        const catRow = {
          ...catWithId,
          userId: activeUserId,
          clientUuid,
          nama: newCategory.nama,
          updatedAt: nowIso,
          deletedAt: null,
          pending: 1,
        };

        await enqueueWithRow(localDb, activeUserId, "categories", catRow, {
          nama: newCategory.nama,
          warna: newCategory.warna || "#38BDF8",
          icon: newCategory.icon || "Briefcase",
          updatedAt: nowIso,
        });

        toast.success(`Kategori "${newCategory.nama}" berhasil ditambahkan!`);
        if (typeof navigator !== "undefined" && navigator.onLine) {
          syncAll(activeUserId).catch(() => {});
        }
        return;
      } catch (e) {
        console.warn("[offline-category] Enqueue add category gagal:", e);
      }
    }

    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCategory),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.category) {
          setCategories((prev) =>
            prev.map((c) => (c.id === tempId ? data.category : c))
          );
        }
        toast.success(`Kategori "${newCategory.nama}" berhasil ditambahkan!`);
      } else {
        setCategories((prev) => prev.filter((c) => c.id !== tempId));
        toast.error("Gagal menambah kategori ke cloud server.");
      }
    } catch (err) {
      setCategories((prev) => prev.filter((c) => c.id !== tempId));
      console.error("Gagal menambah kategori:", err);
      toast.error("Gagal menambah kategori ke cloud server.");
    }
  }

  async function updateCategory(updatedCategory) {
    const targetId = Number(updatedCategory.id);
    const previousCategory = categories.find((c) => Number(c.id) === targetId || c.clientUuid === updatedCategory.id);

    const clientUuid =
      updatedCategory.clientUuid ||
      previousCategory?.clientUuid ||
      (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `cat_${targetId}`);

    const catWithUuid = {
      ...updatedCategory,
      clientUuid,
      pending: OFFLINE_SYNC_ENABLED ? 1 : 0,
    };

    setCategories((prev) =>
      prev.map((c) => (Number(c.id) === targetId || c.clientUuid === clientUuid ? catWithUuid : c))
    );

    if (OFFLINE_SYNC_ENABLED && activeUserId && typeof window !== "undefined") {
      try {
        const nowIso = new Date().toISOString();
        const catRow = {
          ...(previousCategory || {}),
          ...catWithUuid,
          userId: activeUserId,
          clientUuid,
          nama: updatedCategory.nama,
          updatedAt: nowIso,
          pending: 1,
        };

        await enqueueWithRow(localDb, activeUserId, "categories", catRow, {
          nama: updatedCategory.nama,
          warna: updatedCategory.warna ?? previousCategory?.warna ?? "#38BDF8",
          icon: updatedCategory.icon ?? previousCategory?.icon ?? "Briefcase",
          updatedAt: nowIso,
        });

        toast.success(`Kategori "${updatedCategory.nama}" berhasil diperbarui!`);
        if (typeof navigator !== "undefined" && navigator.onLine) {
          syncAll(activeUserId).catch(() => {});
        }
        return;
      } catch (e) {
        console.warn("[offline-category] Enqueue update category gagal:", e);
      }
    }

    try {
      const res = await fetch("/api/categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedCategory),
      });
      if (res.ok) {
        toast.success(`Kategori "${updatedCategory.nama}" berhasil diperbarui!`);
      } else {
        if (previousCategory) {
          setCategories((prev) =>
            prev.map((c) => (Number(c.id) === targetId ? previousCategory : c))
          );
        }
        toast.error("Gagal memperbarui kategori di cloud server.");
      }
    } catch (err) {
      if (previousCategory) {
        setCategories((prev) =>
          prev.map((c) => (Number(c.id) === targetId ? previousCategory : c))
        );
      }
      console.error("Gagal update kategori:", err);
      toast.error("Gagal memperbarui kategori di cloud server.");
    }
  }

  async function deleteCategory(categoryId) {
    const targetId = Number(categoryId);
    const previousIndex = categories.findIndex((c) => Number(c.id) === targetId || c.clientUuid === categoryId);
    const previousCategory = previousIndex !== -1 ? categories[previousIndex] : null;

    const affectedTaskIds = new Set(
      tasks.filter((t) => Number(t.kategoriId) === targetId).map((t) => t.id)
    );

    setTasks((prev) =>
      prev.map((t) =>
        Number(t.kategoriId) === targetId ? { ...t, kategoriId: null } : t
      )
    );
    setCategories((prev) => prev.filter((c) => Number(c.id) !== targetId && c.clientUuid !== categoryId));

    if (OFFLINE_SYNC_ENABLED && activeUserId && previousCategory && typeof window !== "undefined") {
      try {
        const clientUuid = previousCategory.clientUuid || `cat_${targetId}`;
        const tombstoneRow = {
          ...previousCategory,
          userId: activeUserId,
          clientUuid,
          deletedAt: new Date().toISOString(),
          pending: 1,
        };

        await enqueueWithRow(localDb, activeUserId, "categories", tombstoneRow, {
          deletedAt: tombstoneRow.deletedAt,
        });

        toast.success("Kategori berhasil dihapus.");
        if (typeof navigator !== "undefined" && navigator.onLine) {
          syncAll(activeUserId).catch(() => {});
        }
        return;
      } catch (e) {
        console.warn("[offline-category] Enqueue delete category gagal:", e);
      }
    }

    try {
      const res = await fetch(`/api/categories?id=${targetId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Kategori berhasil dihapus.");
      } else {
        if (previousCategory) {
          setCategories((prev) => {
            if (prev.some((c) => Number(c.id) === targetId)) return prev;
            const next = [...prev];
            next.splice(previousIndex >= 0 ? previousIndex : 0, 0, previousCategory);
            return next;
          });
        }
        if (affectedTaskIds.size > 0) {
          setTasks((prev) =>
            prev.map((t) => (affectedTaskIds.has(t.id) ? { ...t, kategoriId: targetId } : t))
          );
        }
        toast.error("Gagal menghapus kategori di cloud server.");
      }
    } catch (err) {
      if (previousCategory) {
        setCategories((prev) => {
          if (prev.some((c) => Number(c.id) === targetId)) return prev;
          const next = [...prev];
          next.splice(previousIndex >= 0 ? previousIndex : 0, 0, previousCategory);
          return next;
        });
      }
      if (affectedTaskIds.size > 0) {
        setTasks((prev) =>
          prev.map((t) => (affectedTaskIds.has(t.id) ? { ...t, kategoriId: targetId } : t))
        );
      }
      console.error("Gagal menghapus kategori:", err);
      toast.error("Gagal menghapus kategori di cloud server.");
    }
  }

  // Categorized task lists and counts
  const stats = useMemo(() => {
    const total = tasks.length;
    let completed = 0;
    let important = 0;
    let today = 0;
    let overdue = 0;

    const overdueList = [];
    const todayList = [];
    const upcomingList = [];

    tasks.forEach((t) => {
      if (t.selesai) {
        completed++;
      } else {
        if (t.prioritas) important++;
        const st = hitungStatusDeadline(t);
        if (st === "terlewat") {
          overdue++;
          overdueList.push(t);
        } else if (st === "hari-ini") {
          today++;
          todayList.push(t);
        } else if (st === "akan-datang") {
          upcomingList.push(t);
        }
      }
    });

    return {
      total,
      completed,
      important,
      today,
      overdue,
      overdueList,
      todayList,
      upcomingList,
    };
  }, [tasks]);

  const value = useMemo(
    () => ({
      user: currentUser,
      session: currentSession,
      tasks,
      categories,
      stats,
      isLoading,
      refreshData: loadData,
      addTask,
      updateTask,
      deleteTask,
      clearCompletedTasks,
      toggleComplete,
      toggleImportant,
      toggleSubtask,
      addCategory,
      updateCategory,
      deleteCategory,
      // Modals
      isAddTaskOpen,
      openAddTask,
      closeAddTask,
      editingTask,
      openEditTask,
      closeEditTask,
      isAddCategoryOpen,
      openAddCategory,
      closeAddCategory,
      editingCategory,
      openEditCategory,
      closeEditCategory,
    }),
    [
      currentUser,
      currentSession,
      tasks,
      categories,
      stats,
      isLoading,
      loadData,
      isAddTaskOpen,
      openAddTask,
      closeAddTask,
      editingTask,
      openEditTask,
      closeEditTask,
      isAddCategoryOpen,
      openAddCategory,
      closeAddCategory,
      editingCategory,
      openEditCategory,
      closeEditCategory,
    ]
  );

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
}

export function useTasks() {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error("useTasks must be used within a TaskProvider");
  }
  return context;
}

export default TaskProvider;
