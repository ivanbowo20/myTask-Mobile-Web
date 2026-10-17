'use client';
import { createContext, useContext, useState, useMemo, useEffect, useCallback, useRef } from "react";
import { hitungStatusDeadline, WAKTU_ACUAN, RETENTION_MS } from "./utils";
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

  // Instant Cache (Offline-First): Ambil dari localStorage saat client mount untuk 0ms instant render
  useEffect(() => {
    if (!activeUserId) return;
    const cached = getStoredCache(activeUserId);
    if (cached) {
      if (Array.isArray(cached.tasks) && cached.tasks.length > 0 && tasks.length === 0) {
        setTasks(cached.tasks);
        setIsLoading(false);
      }
      if (Array.isArray(cached.categories) && cached.categories.length > 0 && categories.length === 0) {
        setCategories(cached.categories);
        setIsLoading(false);
      }
    }
  }, [activeUserId]);

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

  // Auto-purge tugas selesai setelah 15 menit
  useEffect(() => {
    function purgeExpiredTasks() {
      const now = Date.now();
      setTasks((prev) => {
        const remaining = prev.filter((t) => {
          if (!t.selesai || !t.selesaiPada) return true;
          const selesaiTime = new Date(t.selesaiPada).getTime();
          if (isNaN(selesaiTime)) return true;
          return now - selesaiTime < RETENTION_MS;
        });
        return remaining.length === prev.length ? prev : remaining;
      });
    }

    purgeExpiredTasks();
    const interval = setInterval(purgeExpiredTasks, 5000);
    return () => clearInterval(interval);
  }, []);

  // Modal visibility states
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);

  // Task Operations (Optimistic UI + Cloud Database Sync)
  async function addTask(newTask) {
    const tempId = Date.now();
    const taskWithId = {
      ...newTask,
      id: tempId,
      dibuatPada: new Date().toISOString(),
    };
    setTasks((prev) => [taskWithId, ...prev]);
    toast.success("Tugas baru berhasil ditambahkan!");

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
      } else {
        toast.error("Gagal menyimpan tugas ke cloud server.");
      }
    } catch (err) {
      console.error("Gagal sinkronisasi tambah tugas:", err);
    }
  }

  async function updateTask(updatedTask) {
    setTasks((prev) =>
      prev.map((t) => (t.id === updatedTask.id ? updatedTask : t))
    );
    toast.success("Perubahan tugas berhasil disimpan!");

    try {
      const res = await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedTask),
      });
      if (!res.ok) {
        toast.error("Gagal memperbarui tugas di cloud server.");
      }
    } catch (err) {
      console.error("Gagal sinkronisasi update tugas:", err);
    }
  }

  async function deleteTask(taskId) {
    const targetId = Number(taskId);
    setTasks((prev) => prev.filter((t) => Number(t.id) !== targetId));
    toast.success("Tugas berhasil dihapus.");

    try {
      const res = await fetch(`/api/tasks?id=${targetId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast.error("Gagal menghapus tugas dari cloud server.");
      }
    } catch (err) {
      console.error("Gagal menghapus tugas:", err);
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
      toast.success("Tugas selesai! Disimpan 15 menit sebelum dihapus otomatis.");
    } else {
      toast.info("Tugas dipulihkan kembali ke daftar aktif!");
    }

    try {
      await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...targetTask,
          selesai: nextSelesai,
          selesaiPada: nextSelesaiPada,
        }),
      });
    } catch (err) {
      console.error("Gagal update status selesai:", err);
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
      await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...targetTask,
          prioritas: nextPrioritas,
        }),
      });
    } catch (err) {
      console.error("Gagal update status penting:", err);
    }
  }

  // Category Operations (Optimistic UI + Cloud Database Sync)
  async function addCategory(newCategory) {
    const tempId = Date.now();
    const catWithId = {
      ...newCategory,
      id: tempId,
    };
    setCategories((prev) => [...prev, catWithId]);
    toast.success(`Kategori "${newCategory.nama}" berhasil ditambahkan!`);

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
      }
    } catch (err) {
      console.error("Gagal menambah kategori:", err);
    }
  }

  async function updateCategory(updatedCategory) {
    setCategories((prev) =>
      prev.map((c) => (c.id === updatedCategory.id ? updatedCategory : c))
    );
    toast.success(`Kategori "${updatedCategory.nama}" berhasil diperbarui!`);

    try {
      await fetch("/api/categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedCategory),
      });
    } catch (err) {
      console.error("Gagal update kategori:", err);
    }
  }

  async function deleteCategory(categoryId) {
    const targetId = Number(categoryId);
    // Lepas relasi tugas yang memakai kategori ini
    setTasks((prev) =>
      prev.map((t) =>
        Number(t.kategoriId) === targetId ? { ...t, kategoriId: null } : t
      )
    );
    setCategories((prev) => prev.filter((c) => Number(c.id) !== targetId));
    toast.success("Kategori berhasil dihapus.");

    try {
      await fetch(`/api/categories?id=${targetId}`, {
        method: "DELETE",
      });
    } catch (err) {
      console.error("Gagal menghapus kategori:", err);
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
        const st = hitungStatusDeadline(t, WAKTU_ACUAN);
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
