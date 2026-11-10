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

let cacheDebounceTimer = null;

function setStoredCache(userId, data) {
  if (typeof window === "undefined" || !userId) return;

  if (cacheDebounceTimer) {
    clearTimeout(cacheDebounceTimer);
  }

  // Non-blocking debounced storage write via requestIdleCallback
  // Mencegah freeze pada Main Thread di HP dengan storage eMMC 5.1 (seperti Infinix Smart 6)
  cacheDebounceTimer = setTimeout(() => {
    const writeToStorage = () => {
      try {
        localStorage.setItem(getCacheKey(userId), JSON.stringify(data));
      } catch (err) {
        console.warn("Gagal menyimpan cache offline notebook:", err);
      }
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      window.requestIdleCallback(writeToStorage, { timeout: 1000 });
    } else {
      writeToStorage();
    }
  }, 350);
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
  const [previewNotebook, setPreviewNotebook] = useState(null);
  const [deletingNotebook, setDeletingNotebook] = useState(null);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("all"); // 'all' | 'today' | 'week' | 'month'
  const [sortBy, setSortBy] = useState("newest"); // 'newest' | 'oldest' | 'title'
  const [selectedCategory, setSelectedCategory] = useState("all"); // 'all' | categoryName

  // Custom Categories list (persisted in database + localStorage fallback)
  const [customCategories, setCustomCategories] = useState(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(`taskflow_notebook_categories_${userId || "default"}`);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Fetch categories from API
  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/notebook-categories", {
        headers: { "Cache-Control": "no-cache" },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.categories)) {
        setCustomCategories(data.categories.map((c) => ({
          id: c.id,
          name: c.nama,
          color: c.warna || "#0284C7",
          icon: c.icon || "FolderSimple",
          count: c.count || 0,
        })));
      }
    } catch (err) {
      console.warn("fetchCategories error:", err);
    }
  }, []);

  // Sinkronkan daftar kategori lokal saat userId berubah
  useEffect(() => {
    if (typeof window === "undefined" || !userId) return;
    fetchCategories();
  }, [userId, fetchCategories]);

  // Simpan kategori kustom ke localStorage saat bertambah (offline-first fallback)
  const saveCustomCategories = useCallback((cats) => {
    setCustomCategories(cats);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(
          `taskflow_notebook_categories_${userId || "default"}`,
          JSON.stringify(cats)
        );
      } catch (err) {
        console.warn("Gagal menyimpan kategori lokal:", err);
      }
    }
  }, [userId]);

  // Action: Buat Kategori Baru dengan Deteksi & Pilihan Catatan yang Sudah Ada
  const createCategoryWithNotes = useCallback(async ({ nama, warna = "#0284C7", icon = "FolderSimple", noteIds = [] }) => {
    const trimmed = (nama || "").trim();
    if (!trimmed) return null;

    try {
      const res = await fetch("/api/notebook-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nama: trimmed, warna, icon, noteIds }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Gagal membuat kategori.");
      }

      const { category, assignedCount } = await res.json();

      setCustomCategories((prev) => {
        const filtered = prev.filter((c) => c.name.toLowerCase() !== trimmed.toLowerCase());
        const nextCats = [...filtered, {
          id: category.id,
          name: category.nama,
          color: category.warna,
          icon: category.icon,
          count: assignedCount || 0,
        }];
        saveCustomCategories(nextCats);
        return nextCats;
      });

      // Optimistic update notes
      if (Array.isArray(noteIds) && noteIds.length > 0) {
        const idSet = new Set(noteIds.map(Number));
        setNotebooks((prev) => {
          const next = prev.map((n) =>
            idSet.has(Number(n.id))
              ? { ...n, kategori: trimmed, kategoriId: category.id, diperbaruiPada: new Date().toISOString() }
              : n
          );
          if (userId) setStoredCache(userId, next);
          return next;
        });
      }

      setSelectedCategory(trimmed);

      if (assignedCount > 0) {
        toast.success(`Kategori "${trimmed}" dibuat dan ${assignedCount} catatan berhasil dimasukkan!`);
      } else {
        toast.success(`Kategori "${trimmed}" berhasil dibuat!`);
      }

      return category;
    } catch (err) {
      console.error("createCategoryWithNotes error:", err);
      toast.error(err.message || "Gagal membuat kategori.");
      throw err;
    }
  }, [userId, saveCustomCategories]);

  // Action: Pindahkan Beberapa Catatan ke Suatu Kategori
  const assignNotesToCategory = useCallback(async (noteIds, targetCategoryName) => {
    const trimmed = (targetCategoryName || "").trim();
    if (!Array.isArray(noteIds) || noteIds.length === 0) return;

    try {
      const res = await fetch("/api/notebook-categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteIds, targetCategoryName: trimmed }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Gagal memindahkan catatan.");
      }

      const idSet = new Set(noteIds.map(Number));
      setNotebooks((prev) => {
        const next = prev.map((n) =>
          idSet.has(Number(n.id))
            ? { ...n, kategori: trimmed, diperbaruiPada: new Date().toISOString() }
            : n
        );
        if (userId) setStoredCache(userId, next);
        return next;
      });

      fetchCategories();

      toast.success(
        trimmed
          ? `${noteIds.length} catatan berhasil dimasukkan ke kategori "${trimmed}".`
          : `${noteIds.length} catatan dilepas dari kategori.`
      );
    } catch (err) {
      console.error("assignNotesToCategory error:", err);
      toast.error(err.message || "Gagal memindahkan catatan.");
      throw err;
    }
  }, [userId, fetchCategories]);

  // Action: Pindah Catatan Tunggal
  const moveNoteToCategory = useCallback(async (noteId, targetCategoryName) => {
    return assignNotesToCategory([noteId], targetCategoryName);
  }, [assignNotesToCategory]);

  // Tambah kategori kustom (alias)
  const addCustomCategory = useCallback((categoryName, color = "#0284C7", icon = "FolderSimple") => {
    return createCategoryWithNotes({ nama: categoryName, warna: color, icon, noteIds: [] });
  }, [createCategoryWithNotes]);

  // Hapus kategori kustom
  const deleteCustomCategory = useCallback(async (category) => {
    const name = typeof category === "object" ? category?.name : category;
    const catId = typeof category === "object" ? category?.id : null;
    const trimmed = (name || "").trim();
    if (!trimmed) return;

    try {
      if (catId) {
        await fetch(`/api/notebook-categories?id=${catId}`, { method: "DELETE" });
      }

      setCustomCategories((prev) => {
        const next = prev.filter((c) => c.name.toLowerCase() !== trimmed.toLowerCase());
        saveCustomCategories(next);
        return next;
      });

      setNotebooks((prev) => {
        const next = prev.map((n) =>
          (n.kategori || "").toLowerCase() === trimmed.toLowerCase()
            ? { ...n, kategori: "", kategoriId: null }
            : n
        );
        if (userId) setStoredCache(userId, next);
        return next;
      });

      if (selectedCategory.toLowerCase() === trimmed.toLowerCase()) {
        setSelectedCategory("all");
      }

      toast.success(`Kategori "${trimmed}" dihapus.`);
    } catch (err) {
      console.error("deleteCustomCategory error:", err);
      toast.error("Gagal menghapus kategori.");
    }
  }, [userId, selectedCategory, saveCustomCategories]);

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

  const openPreviewNotebook = useCallback((notebook) => setPreviewNotebook(notebook), []);
  const closePreviewNotebook = useCallback(() => setPreviewNotebook(null), []);

  const openDeleteConfirm = useCallback((notebook) => setDeletingNotebook(notebook), []);
  const closeDeleteConfirm = useCallback(() => setDeletingNotebook(null), []);

  // Action: Add Notebook
  const addNotebook = useCallback(async ({ judul, konten, penting, warna, kategori = "" }) => {
    try {
      const cleanKategori = typeof kategori === "string" ? kategori.trim() : "";
      const res = await fetch("/api/notebooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ judul, konten, penting, warna, kategori: cleanKategori }),
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

      // Pastikan kategori baru tercatat di customCategories jika belum ada
      if (cleanKategori) {
        setCustomCategories((prev) => {
          if (!prev.some((c) => c.name.toLowerCase() === cleanKategori.toLowerCase())) {
            const nextCats = [...prev, { name: cleanKategori, color: "#0284C7", icon: "FolderSimple", createdAt: new Date().toISOString() }];
            saveCustomCategories(nextCats);
            return nextCats;
          }
          return prev;
        });
      }

      toast.success("Catatan materi berhasil disimpan!");
      closeAddNotebook();
      return notebook;
    } catch (err) {
      console.error("addNotebook error:", err);
      toast.error(err.message || "Gagal menambahkan catatan.");
      throw err;
    }
  }, [userId, closeAddNotebook, saveCustomCategories]);

  // Action: Update Notebook
  const updateNotebook = useCallback(async (id, { judul, konten, penting, warna, kategori }, isSilentAutoSave = false) => {
    try {
      const payload = { id, judul, konten, penting, warna };
      if (kategori !== undefined) {
        payload.kategori = typeof kategori === "string" ? kategori.trim() : "";
      }

      const res = await fetch("/api/notebooks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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

      if (payload.kategori) {
        setCustomCategories((prev) => {
          if (!prev.some((c) => c.name.toLowerCase() === payload.kategori.toLowerCase())) {
            const nextCats = [...prev, { name: payload.kategori, color: "#0284C7", icon: "FolderSimple", createdAt: new Date().toISOString() }];
            saveCustomCategories(nextCats);
            return nextCats;
          }
          return prev;
        });
      }

      if (editingNotebook && editingNotebook.id === id) {
        setEditingNotebook(notebook);
      }
      if (previewNotebook && previewNotebook.id === id) {
        setPreviewNotebook(notebook);
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
  }, [userId, editingNotebook, previewNotebook, saveCustomCategories]);

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

    setPreviewNotebook((prev) =>
      prev && prev.id === id
        ? { ...prev, penting: nextPenting, diperbaruiPada: new Date().toISOString() }
        : prev
    );

    try {
      const res = await fetch("/api/notebooks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, penting: nextPenting }),
      });

      if (!res.ok) throw new Error("Gagal memperbarui status penting");

      toast.success(
        nextPenting
          ? "Catatan disematkan ke paling atas!"
          : "Sematkan catatan dilepas."
      );
    } catch (err) {
      console.error("toggleImportant error:", err);
      // Rollback optimistic update
      setNotebooks((prev) =>
        prev.map((item) => (item.id === id ? target : item))
      );
      setPreviewNotebook((prev) => (prev && prev.id === id ? target : prev));
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

      setPreviewNotebook((prev) => (prev && prev.id === id ? null : prev));

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

    // 1. Category Filter
    if (selectedCategory && selectedCategory !== "all") {
      if (selectedCategory === "_uncategorized") {
        result = result.filter((n) => !n.kategori || !n.kategori.trim());
      } else {
        result = result.filter(
          (n) => (n.kategori || "").toLowerCase() === selectedCategory.toLowerCase()
        );
      }
    }

    // 2. Text Search (Judul & Konten)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (n) =>
          (n.judul && n.judul.toLowerCase().includes(q)) ||
          (n.konten && n.konten.toLowerCase().includes(q))
      );
    }

    // 3. Date Filter
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

    // 4. Sorting: Important always first, then by selected sort
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
  }, [notebooks, selectedCategory, searchQuery, dateFilter, sortBy]);

  const pinnedNotebooks = useMemo(
    () => filteredNotebooks.filter((n) => n.penting),
    [filteredNotebooks]
  );

  const otherNotebooks = useMemo(
    () => filteredNotebooks.filter((n) => !n.penting),
    [filteredNotebooks]
  );

  // Daftar gabungan seluruh kategori (kustom + yang ada di catatan) beserta counter
  const allCategories = useMemo(() => {
    const map = new Map();

    // 1. Masukkan kategori kustom yang tersimpan
    customCategories.forEach((cat) => {
      if (cat?.name) {
        map.set(cat.name.toLowerCase(), {
          name: cat.name,
          color: cat.color || "#0284C7",
          icon: cat.icon || "FolderSimple",
          count: 0,
        });
      }
    });

    // 2. Masukkan kategori dari notebook yang belum ada di customCategories
    notebooks.forEach((n) => {
      const k = (n.kategori || "").trim();
      if (k) {
        const lower = k.toLowerCase();
        if (!map.has(lower)) {
          map.set(lower, {
            name: k,
            color: n.warna || "#0284C7",
            icon: "FolderSimple",
            count: 0,
          });
        }
      }
    });

    // 3. Hitung jumlah catatan untuk tiap kategori
    notebooks.forEach((n) => {
      const k = (n.kategori || "").trim().toLowerCase();
      if (k && map.has(k)) {
        map.get(k).count += 1;
      }
    });

    return Array.from(map.values());
  }, [customCategories, notebooks]);

  const uncategorizedNotebooks = useMemo(
    () => notebooks.filter((n) => !n.kategori || !n.kategori.trim()),
    [notebooks]
  );

  const stats = useMemo(() => {
    return {
      total: notebooks.length,
      important: notebooks.filter((n) => n.penting).length,
      uncategorized: uncategorizedNotebooks.length,
      categoriesCount: allCategories.length,
    };
  }, [notebooks, uncategorizedNotebooks, allCategories]);

  const value = useMemo(
    () => ({
      notebooks,
      filteredNotebooks,
      pinnedNotebooks,
      otherNotebooks,
      allCategories,
      customCategories,
      selectedCategory,
      setSelectedCategory,
      addCustomCategory,
      createCategoryWithNotes,
      assignNotesToCategory,
      moveNoteToCategory,
      deleteCustomCategory,
      uncategorizedNotebooks,
      stats,
      isLoading,
      isAddOpen,
      openAddNotebook,
      closeAddNotebook,
      editingNotebook,
      openEditNotebook,
      closeEditNotebook,
      previewNotebook,
      openPreviewNotebook,
      closePreviewNotebook,
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
      allCategories,
      customCategories,
      selectedCategory,
      addCustomCategory,
      createCategoryWithNotes,
      assignNotesToCategory,
      moveNoteToCategory,
      deleteCustomCategory,
      uncategorizedNotebooks,
      stats,
      isLoading,
      isAddOpen,
      openAddNotebook,
      closeAddNotebook,
      editingNotebook,
      openEditNotebook,
      closeEditNotebook,
      previewNotebook,
      openPreviewNotebook,
      closePreviewNotebook,
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
