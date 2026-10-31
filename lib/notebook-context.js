'use client';

import { createContext, useContext, useState, useMemo, useEffect, useCallback, useRef } from "react";
import { toast } from "./use-toast";
import { useSession } from "./auth-client";

const NotebookContext = createContext(null);

function getCacheKey(userId) {
  return `taskflow_notebooks_${userId}`;
}

function getStoredCache(userId) {
  if (typeof window === "undefined" || !userId) return null;
  try {
    const raw = localStorage.getItem(getCacheKey(userId));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.warn("Gagal membaca cache offline notebook:", err);
    return null;
  }
}

function setStoredCache(userId, data) {
  if (typeof window === "undefined" || !userId) return;
  try {
    localStorage.setItem(getCacheKey(userId), JSON.stringify(data));
  } catch (err) {
    console.warn("Gagal menyimpan cache offline notebook:", err);
  }
}

export function NotebookProvider({
  children,
  initialNotebooks = [],
}) {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const [notebooks, setNotebooks] = useState(() => {
    if (initialNotebooks && initialNotebooks.length > 0) return initialNotebooks;
    if (typeof window !== "undefined" && userId) {
      const cached = getStoredCache(userId);
      if (Array.isArray(cached) && cached.length > 0) return cached;
    }
    return [];
  });

  const [isLoading, setIsLoading] = useState(!initialNotebooks || initialNotebooks.length === 0);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingNotebook, setEditingNotebook] = useState(null);
  const [deletingNotebook, setDeletingNotebook] = useState(null);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("all"); // 'all' | 'today' | 'week' | 'month'
  const [sortBy, setSortBy] = useState("newest"); // 'newest' | 'oldest'

  // Fetch notebooks from API
  const fetchNotebooks = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const res = await fetch("/api/notebooks", {
        headers: { "Cache-Control": "no-cache" },
      });
      if (!res.ok) throw new Error("Gagal mengambil data notebook");
      const data = await res.json();
      const list = Array.isArray(data.notebooks) ? data.notebooks : [];
      setNotebooks(list);
      if (userId) setStoredCache(userId, list);
    } catch (err) {
      console.error("fetchNotebooks error:", err);
      if (!silent) {
        toast.error("Gagal memuat catatan materi dari server.");
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [userId]);

  // Initial load when user session is available
  useEffect(() => {
    if (userId) {
      fetchNotebooks(true);
    }
  }, [userId, fetchNotebooks]);

  // Modals controls
  const openAddNotebook = useCallback(() => setIsAddOpen(true), []);
  const closeAddNotebook = useCallback(() => setIsAddOpen(false), []);

  const openEditNotebook = useCallback((notebook) => setEditingNotebook(notebook), []);
  const closeEditNotebook = useCallback(() => setEditingNotebook(null), []);

  const openDeleteConfirm = useCallback((notebook) => setDeletingNotebook(notebook), []);
  const closeDeleteConfirm = useCallback(() => setDeletingNotebook(null), []);

  // Action: Add Notebook
  const addNotebook = useCallback(async ({ judul, konten, penting, warna }) => {
    try {
      const res = await fetch("/api/notebooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ judul, konten, penting, warna }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Gagal menyimpan notebook");
      }

      const { notebook } = await res.json();
      setNotebooks((prev) => {
        const next = [notebook, ...prev];
        if (userId) setStoredCache(userId, next);
        return next;
      });

      toast.success("Catatan materi berhasil disimpan!");
      closeAddNotebook();
      return notebook;
    } catch (err) {
      console.error("addNotebook error:", err);
      toast.error(err.message || "Gagal menambahkan catatan.");
      throw err;
    }
  }, [userId, closeAddNotebook]);

  // Action: Update Notebook
  const updateNotebook = useCallback(async (id, { judul, konten, penting, warna }, isSilentAutoSave = false) => {
    try {
      const res = await fetch("/api/notebooks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, judul, konten, penting, warna }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Gagal memperbarui notebook");
      }

      const { notebook } = await res.json();
      setNotebooks((prev) => {
        const next = prev.map((item) => (item.id === id ? notebook : item));
        if (userId) setStoredCache(userId, next);
        return next;
      });

      if (editingNotebook && editingNotebook.id === id) {
        setEditingNotebook(notebook);
      }

      if (!isSilentAutoSave) {
        toast.success("Catatan berhasil diperbarui!");
      }

      return notebook;
    } catch (err) {
      console.error("updateNotebook error:", err);
      if (!isSilentAutoSave) {
        toast.error(err.message || "Gagal memperbarui catatan.");
      }
      throw err;
    }
  }, [userId, editingNotebook]);

  // Action: Toggle Important (Pin to top)
  const toggleImportant = useCallback(async (id) => {
    const target = notebooks.find((n) => n.id === id);
    if (!target) return;

    const nextPenting = !target.penting;

    // Optimistic UI update
    setNotebooks((prev) => {
      const next = prev.map((item) =>
        item.id === id ? { ...item, penting: nextPenting, diperbaruiPada: new Date().toISOString() } : item
      );
      if (userId) setStoredCache(userId, next);
      return next;
    });

    try {
      const res = await fetch("/api/notebooks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, penting: nextPenting }),
      });

      if (!res.ok) throw new Error("Gagal memperbarui status penting");

      toast.success(
        nextPenting
          ? "📌 Catatan disematkan ke paling atas!"
          : "Sematkan catatan dilepas."
      );
    } catch (err) {
      console.error("toggleImportant error:", err);
      // Rollback optimistic update
      setNotebooks((prev) =>
        prev.map((item) => (item.id === id ? target : item))
      );
      toast.error("Gagal mengubah status penting catatan.");
    }
  }, [notebooks, userId]);

  // Action: Delete Notebook
  const deleteNotebook = useCallback(async (id) => {
    try {
      const res = await fetch(`/api/notebooks?id=${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Gagal menghapus catatan");
      }

      setNotebooks((prev) => {
        const next = prev.filter((item) => item.id !== id);
        if (userId) setStoredCache(userId, next);
        return next;
      });

      toast.success("Catatan materi berhasil dihapus.");
      closeDeleteConfirm();
    } catch (err) {
      console.error("deleteNotebook error:", err);
      toast.error(err.message || "Gagal menghapus catatan.");
    }
  }, [userId, closeDeleteConfirm]);

  const confirmDelete = useCallback(() => {
    if (deletingNotebook?.id) {
      deleteNotebook(deletingNotebook.id);
    }
  }, [deletingNotebook, deleteNotebook]);

  // Filtered & Sorted Notebooks computation
  const filteredNotebooks = useMemo(() => {
    let result = [...notebooks];

    // 1. Text Search (Judul & Konten)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (n) =>
          (n.judul && n.judul.toLowerCase().includes(q)) ||
          (n.konten && n.konten.toLowerCase().includes(q))
      );
    }

    // 2. Date Filter
    if (dateFilter !== "all") {
      const now = new Date();
      result = result.filter((n) => {
        const d = new Date(n.dibuatPada || n.diperbaruiPada);
        if (isNaN(d.getTime())) return true;

        if (dateFilter === "today") {
          return (
            d.getDate() === now.getDate() &&
            d.getMonth() === now.getMonth() &&
            d.getFullYear() === now.getFullYear()
          );
        }

        if (dateFilter === "week") {
          const diffDays = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
          return diffDays <= 7;
        }

        if (dateFilter === "month") {
          const diffDays = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
          return diffDays <= 30;
        }

        return true;
      });
    }

    // 3. Sorting: Important always first, then by selected sort
    result.sort((a, b) => {
      if (a.penting !== b.penting) {
        return a.penting ? -1 : 1;
      }

      if (sortBy === "oldest") {
        return new Date(a.dibuatPada).getTime() - new Date(b.dibuatPada).getTime();
      }

      if (sortBy === "title") {
        return (a.judul || "").localeCompare(b.judul || "");
      }

      // Default 'newest'
      return new Date(b.diperbaruiPada || b.dibuatPada).getTime() - new Date(a.diperbaruiPada || a.dibuatPada).getTime();
    });

    return result;
  }, [notebooks, searchQuery, dateFilter, sortBy]);

  const pinnedNotebooks = useMemo(
    () => filteredNotebooks.filter((n) => n.penting),
    [filteredNotebooks]
  );

  const otherNotebooks = useMemo(
    () => filteredNotebooks.filter((n) => !n.penting),
    [filteredNotebooks]
  );

  const stats = useMemo(() => {
    return {
      total: notebooks.length,
      important: notebooks.filter((n) => n.penting).length,
    };
  }, [notebooks]);

  const value = useMemo(
    () => ({
      notebooks,
      filteredNotebooks,
      pinnedNotebooks,
      otherNotebooks,
      stats,
      isLoading,
      isAddOpen,
      openAddNotebook,
      closeAddNotebook,
      editingNotebook,
      openEditNotebook,
      closeEditNotebook,
      deletingNotebook,
      openDeleteConfirm,
      closeDeleteConfirm,
      confirmDelete,
      addNotebook,
      updateNotebook,
      deleteNotebook,
      toggleImportant,
      searchQuery,
      setSearchQuery,
      dateFilter,
      setDateFilter,
      sortBy,
      setSortBy,
      fetchNotebooks,
    }),
    [
      notebooks,
      filteredNotebooks,
      pinnedNotebooks,
      otherNotebooks,
      stats,
      isLoading,
      isAddOpen,
      openAddNotebook,
      closeAddNotebook,
      editingNotebook,
      openEditNotebook,
      closeEditNotebook,
      deletingNotebook,
      openDeleteConfirm,
      closeDeleteConfirm,
      confirmDelete,
      addNotebook,
      updateNotebook,
      deleteNotebook,
      toggleImportant,
      searchQuery,
      dateFilter,
      sortBy,
      fetchNotebooks,
    ]
  );

  return (
    <NotebookContext.Provider value={value}>
      {children}
    </NotebookContext.Provider>
  );
}

export function useNotebooks() {
  const context = useContext(NotebookContext);
  if (!context) {
    throw new Error("useNotebooks harus digunakan di dalam NotebookProvider");
  }
  return context;
}
