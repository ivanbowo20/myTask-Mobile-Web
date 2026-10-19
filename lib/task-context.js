'use client';
import { createContext, useContext, useState, useMemo, useEffect, useCallback, useRef } from "react";
import { hitungStatusDeadline } from "./utils";
import { toast } from "./use-toast";
import { useSession } from "./auth-client";

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
  const currentSession = session !== undefined ? (session || (isPending ? initialSession : null)) : initialSession;
  const currentUser = currentSession?.user || (isPending ? initialSession?.user : null);

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

  // Ambil data tugas & kategori milik user aktif dari database Supabase
  const loadData = useCallback(async () => {
    if (!activeUserId) {
      setTasks([]);
      setCategories([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const [tasksRes, catRes] = await Promise.all([
        fetch("/api/tasks"),
        fetch("/api/categories"),
      ]);

      if (tasksRes.ok) {
        const tasksData = await tasksRes.json();
        setTasks(tasksData.tasks || []);
      }
      if (catRes.ok) {
        const catData = await catRes.json();
        setCategories(catData.categories || []);
      }
    } catch (err) {
      console.error("Gagal memuat data dari database:", err);
    } finally {
      setIsLoading(false);
    }
  }, [activeUserId]);

  useEffect(() => {
    const currentId = currentUser?.id || null;

    // Jika data awal (SSR) sudah dimuat dengan sukses untuk user ini,
    // jangan pernah fetch ulang saat useSession() di client selesai resolve.
    if (initialLoadedUserIdRef.current && currentId === initialLoadedUserIdRef.current) {
      prevUserIdRef.current = currentId;
      return;
    }

    // Jika user berganti akun atau tidak ada data awal dari server (fallback)
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
    // Jika SSR sudah berhasil memuat data awal secara valid, jangan timpa dengan cache lokal lama
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

  // Cache Persistence: Simpan ke localStorage setiap kali tasks atau categories berubah untuk user aktif
  useEffect(() => {
    if (!activeUserId) return;
    // Jangan menimpa cache dengan array kosong jika masih fase loading awal tanpa data
    if (isLoading && tasks.length === 0 && categories.length === 0 && !hasInitialData) {
      return;
    }
    setStoredCache(activeUserId, {
      tasks,
      categories,
      updatedAt: Date.now(),
    });
  }, [activeUserId, tasks, categories, isLoading, hasInitialData]);

  // Modal visibility states
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);

  // Task Operations (Optimistic UI + Cloud Database Sync with Rollback)
  async function addTask(newTask) {
    const tempId = Date.now();
    const taskWithId = {
      ...newTask,
      id: tempId,
      dibuatPada: new Date().toISOString(),
    };
    setTasks((prev) => [taskWithId, ...prev]);

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

    setTasks((prev) =>
      prev.map((t) => (Number(t.id) === targetId ? updatedTask : t))
    );

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
    const previousIndex = tasks.findIndex((t) => Number(t.id) === targetId);
    const previousTask = previousIndex !== -1 ? tasks[previousIndex] : null;

    setTasks((prev) => prev.filter((t) => Number(t.id) !== targetId));

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

  async function toggleComplete(taskId) {
    const targetId = Number(taskId);
    const targetTask = tasks.find((t) => Number(t.id) === targetId);
    if (!targetTask) return;

    const nextSelesai = !targetTask.selesai;
    const nextSelesaiPada = nextSelesai ? new Date().toISOString() : null;

    setTasks((prev) =>
      prev.map((t) =>
        Number(t.id) === targetId
          ? {
              ...t,
              selesai: nextSelesai,
              selesaiPada: nextSelesaiPada,
            }
          : t
      )
    );

    if (nextSelesai) {
      toast.success("Tugas selesai!");
    } else {
      toast.info("Tugas dipulihkan kembali ke daftar aktif!");
    }

    try {
      const res = await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...targetTask,
          selesai: nextSelesai,
          selesaiPada: nextSelesaiPada,
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

  async function toggleImportant(taskId) {
    const targetId = Number(taskId);
    const targetTask = tasks.find((t) => Number(t.id) === targetId);
    if (!targetTask) return;

    const nextPrioritas = !targetTask.prioritas;

    setTasks((prev) =>
      prev.map((t) =>
        Number(t.id) === targetId
          ? {
              ...t,
              prioritas: nextPrioritas,
            }
          : t
      )
    );

    if (nextPrioritas) {
      toast.info("Tugas ditandai sebagai penting.");
    } else {
      toast.info("Tanda penting dilepas.");
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

  // Category Operations (Optimistic UI + Cloud Database Sync with Rollback)
  async function addCategory(newCategory) {
    const tempId = Date.now();
    const catWithId = {
      ...newCategory,
      id: tempId,
    };
    setCategories((prev) => [...prev, catWithId]);

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
    const previousCategory = categories.find((c) => Number(c.id) === targetId);

    setCategories((prev) =>
      prev.map((c) => (Number(c.id) === targetId ? updatedCategory : c))
    );

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
    const previousIndex = categories.findIndex((c) => Number(c.id) === targetId);
    const previousCategory = previousIndex !== -1 ? categories[previousIndex] : null;

    // Lacak task id yang menggunakan kategori ini agar rollback tidak merusak update task lain yang konkuren
    const affectedTaskIds = new Set(
      tasks.filter((t) => Number(t.kategoriId) === targetId).map((t) => t.id)
    );

    // Lepas relasi tugas yang memakai kategori ini
    setTasks((prev) =>
      prev.map((t) =>
        Number(t.kategoriId) === targetId ? { ...t, kategoriId: null } : t
      )
    );
    setCategories((prev) => prev.filter((c) => Number(c.id) !== targetId));

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

  const value = {
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
    toggleComplete,
    toggleImportant,
    addCategory,
    updateCategory,
    deleteCategory,
    // Modals
    isAddTaskOpen,
    openAddTask: () => setIsAddTaskOpen(true),
    closeAddTask: () => setIsAddTaskOpen(false),
    editingTask,
    openEditTask: (t) => setEditingTask(t),
    closeEditTask: () => setEditingTask(null),
    isAddCategoryOpen,
    openAddCategory: () => setIsAddCategoryOpen(true),
    closeAddCategory: () => setIsAddCategoryOpen(false),
    editingCategory,
    openEditCategory: (c) => setEditingCategory(c),
    closeEditCategory: () => setEditingCategory(null),
  };

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
}

export function useTasks() {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error("useTasks must be used within a TaskProvider");
  }
  return context;
}
