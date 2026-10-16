'use client';
import { createContext, useContext, useState, useMemo, useEffect } from "react";
import { DUMMY_TASKS, DUMMY_CATEGORIES } from "./mock-data";
import { hitungStatusDeadline, WAKTU_ACUAN, RETENTION_MS } from "./utils";
import { toast } from "./use-toast";

const TaskContext = createContext(null);

export function TaskProvider({ children }) {
  const [tasks, setTasks] = useState(DUMMY_TASKS);
  const [categories, setCategories] = useState(DUMMY_CATEGORIES);

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

  // Task Operations
  function addTask(newTask) {
    const id = Date.now();
    const taskWithId = {
      ...newTask,
      id,
      dibuatPada: new Date().toISOString(),
    };
    setTasks((prev) => [taskWithId, ...prev]);
    toast.success("Tugas baru berhasil ditambahkan!");
  }

  function updateTask(updatedTask) {
    setTasks((prev) =>
      prev.map((t) => (t.id === updatedTask.id ? updatedTask : t))
    );
    toast.success("Perubahan tugas berhasil disimpan!");
  }

  function deleteTask(taskId) {
    const targetId = Number(taskId);
    setTasks((prev) => prev.filter((t) => Number(t.id) !== targetId));
    toast.success("Tugas berhasil dihapus.");
  }

  function toggleComplete(taskId) {
    const targetId = Number(taskId);
    const targetTask = tasks.find((t) => Number(t.id) === targetId);
    if (!targetTask) return;

    const nextSelesai = !targetTask.selesai;

    // 1. Pure state update
    setTasks((prev) =>
      prev.map((t) =>
        Number(t.id) === targetId
          ? {
              ...t,
              selesai: nextSelesai,
              selesaiPada: nextSelesai ? new Date().toISOString() : null,
            }
          : t
      )
    );

    // 2. Side-effect toast dipanggil tepat 1x di luar updater
    if (nextSelesai) {
      toast.success("Tugas selesai! Disimpan 15 menit sebelum dihapus otomatis.");
    } else {
      toast.info("Tugas dipulihkan kembali ke daftar aktif!");
    }
  }

  function toggleImportant(taskId) {
    const targetId = Number(taskId);
    const targetTask = tasks.find((t) => Number(t.id) === targetId);
    if (!targetTask) return;

    const nextPrioritas = !targetTask.prioritas;

    // 1. Pure state update
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

    // 2. Side-effect toast dipanggil tepat 1x di luar updater
    if (nextPrioritas) {
      toast.info("Tugas ditandai sebagai penting.");
    } else {
      toast.info("Tanda penting dilepas.");
    }
  }

  // Category Operations
  function addCategory(newCategory) {
    const id = Date.now();
    const catWithId = {
      ...newCategory,
      id,
    };
    setCategories((prev) => [...prev, catWithId]);
    toast.success(`Kategori "${newCategory.nama}" berhasil ditambahkan!`);
  }

  function updateCategory(updatedCategory) {
    setCategories((prev) =>
      prev.map((c) => (c.id === updatedCategory.id ? updatedCategory : c))
    );
    toast.success(`Kategori "${updatedCategory.nama}" berhasil diperbarui!`);
  }

  function deleteCategory(categoryId) {
    const targetId = Number(categoryId);
    // Unlink tasks that have this category
    setTasks((prev) =>
      prev.map((t) =>
        Number(t.kategoriId) === targetId ? { ...t, kategoriId: null } : t
      )
    );
    setCategories((prev) => prev.filter((c) => Number(c.id) !== targetId));
    toast.success("Kategori berhasil dihapus.");
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
    tasks,
    categories,
    stats,
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
