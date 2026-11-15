'use client';

import { createContext, useContext, useState, useMemo, useEffect, useCallback } from "react";
import { toast } from "./use-toast";
import { useSession } from "./auth-client";
import { OFFLINE_SYNC_ENABLED } from "./local/feature-flag";
import { localDb } from "./local/db";
import { enqueueWithRow } from "./local/outbox";
import { syncAll } from "./local/sync-engine";

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
  const [offlineFallbackUserId, setOfflineFallbackUserId] = useState(null);

  useEffect(() => {
    if (session?.user?.id) {
      setOfflineFallbackUserId(session.user.id);
    } else if (typeof window !== "undefined" && !navigator.onLine && !offlineFallbackUserId) {
      try {
        const raw = localStorage.getItem("better-auth.session_data");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.user?.id) setOfflineFallbackUserId(parsed.user.id);
        }
      } catch (_) {}
    }
  }, [session, offlineFallbackUserId]);

  const userId = session?.user?.id || offlineFallbackUserId || null;

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
  const [dateFilter, setDateFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Custom Categories list
  const [customCategories, setCustomCategories] = useState(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(`taskflow_notebook_categories_${userId || "default"}`);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Fetch categories from API or Dexie
  const fetchCategories = useCallback(async () => {
    if (OFFLINE_SYNC_ENABLED && typeof window !== "undefined" && userId) {
      try {
        const localCats = await localDb.notebookCategories
          .where("[userId+deletedAt]")
          .equals([userId, null])
          .toArray();
        if (localCats.length > 0) {
          setCustomCategories(localCats.map((c) => ({
            id: c.serverId || c.clientUuid,
            clientUuid: c.clientUuid,
            name: c.nama,
            color: c.warna || "#0284C7",
            icon: c.icon || "FolderSimple",
            count: c.count || 0,
          })));
        }
      } catch (err) {
        console.warn("[offline-notebook] Gagal membaca kategori dari Dexie:", err);
      }
    }

    try {
      const res = await fetch("/api/notebook-categories", {
        headers: { "Cache-Control": "no-cache" },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.categories)) {
        setCustomCategories(data.categories.map((c) => ({
          id: c.id,
          clientUuid: c.clientUuid,
          name: c.nama,
          color: c.warna || "#0284C7",
          icon: c.icon || "FolderSimple",
          count: c.count || 0,
        })));
      }
    } catch (err) {
      console.warn("fetchCategories error:", err);
    }
  }, [userId]);

  useEffect(() => {
    if (typeof window === "undefined" || !userId) return;
    fetchCategories();
  }, [userId, fetchCategories]);

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

  const createCategoryWithNotes = useCallback(async ({ nama, warna = "#0284C7", icon = "FolderSimple", noteIds = [] }) => {
    const trimmed = (nama || "").trim();
    if (!trimmed) return null;

    if (OFFLINE_SYNC_ENABLED && userId && typeof window !== "undefined") {
      try {
        const nowIso = new Date().toISOString();
        const clientUuid =
          typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : `nbcat_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

        const catRow = {
          clientUuid,
          userId,
          serverId: null,
          nama: trimmed,
          warna,
          icon,
          count: Array.isArray(noteIds) ? noteIds.length : 0,
          pending: 1,
          updatedAt: nowIso,
          deletedAt: null,
        };

        await enqueueWithRow(localDb, userId, "notebookCategories", catRow, {
          nama: trimmed,
          warna,
          icon,
          updatedAt: nowIso,
        });

        const nextCats = [...customCategories.filter((c) => c.name.toLowerCase() !== trimmed.toLowerCase()), {
          id: clientUuid,
          clientUuid,
          name: trimmed,
          color: warna,
          icon,
          count: catRow.count,
        }];
        saveCustomCategories(nextCats);
        setSelectedCategory(trimmed);

        if (Array.isArray(noteIds) && noteIds.length > 0) {
          const idSet = new Set(noteIds.map(Number));
          setNotebooks((prev) => {
            const next = prev.map((n) =>
              idSet.has(Number(n.id))
                ? { ...n, kategori: trimmed, kategoriClientUuid: clientUuid, diperbaruiPada: nowIso, pending: 1 }
                : n
            );
            return next;
          });
        }

        toast.success(`Kategori "${trimmed}" berhasil dibuat!`);
        if (typeof navigator !== "undefined" && navigator.onLine) {
          syncAll(userId).catch(() => {});
        }
        return catRow;
      } catch (e) {
        console.warn("[offline-notebook] Enqueue kategori baru gagal, fallback ke fetch:", e);
      }
    }

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
          clientUuid: category.clientUuid,
          name: category.nama,
          color: category.warna,
          icon: category.icon,
          count: assignedCount || 0,
        }];
        saveCustomCategories(nextCats);
        return nextCats;
      });

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
  }, [userId, customCategories, saveCustomCategories]);

  const assignNotesToCategory = useCallback(async (noteIds, targetCategoryName) => {
    const trimmed = (targetCategoryName || "").trim();
    if (!Array.isArray(noteIds) || noteIds.length === 0) return;

    try {
      const res = await fetch("/api/notebook-categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "assign", noteIds, targetCategoryName: trimmed }),
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
      toast.success(`${noteIds.length} catatan berhasil dipindahkan ke "${trimmed || "Tanpa Kategori"}"!`);
    } catch (err) {
      console.error("assignNotesToCategory error:", err);
      toast.error(err.message || "Gagal memindahkan catatan.");
    }
  }, [userId, fetchCategories]);

  const moveNoteToCategory = useCallback(async (noteId, targetCategoryName) => {
    return assignNotesToCategory([noteId], targetCategoryName);
  }, [assignNotesToCategory]);

  const addCustomCategory = useCallback((nama, warna = "#0284C7", icon = "FolderSimple") => {
    const trimmed = (nama || "").trim();
    if (!trimmed) return;
    createCategoryWithNotes({ nama: trimmed, warna, icon, noteIds: [] });
  }, [createCategoryWithNotes]);

  const deleteCustomCategory = useCallback(async (categoryName) => {
    const trimmed = (categoryName || "").trim();
    if (!trimmed) return;

    if (OFFLINE_SYNC_ENABLED && userId && typeof window !== "undefined") {
      try {
        const existing = customCategories.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
        if (existing) {
          const clientUuid = existing.clientUuid || `nbcat_${existing.id}`;
          const nowIso = new Date().toISOString();
          const tombstone = {
            userId,
            clientUuid,
            deletedAt: nowIso,
            pending: 1,
          };
          await enqueueWithRow(localDb, userId, "notebookCategories", tombstone, {
            deletedAt: nowIso,
          });
        }
        setCustomCategories((prev) => {
          const next = prev.filter((c) => c.name.toLowerCase() !== trimmed.toLowerCase());
          saveCustomCategories(next);
          return next;
        });
        setNotebooks((prev) =>
          prev.map((n) =>
            (n.kategori || "").toLowerCase() === trimmed.toLowerCase()
              ? { ...n, kategori: "", kategoriId: null, pending: 1 }
              : n
          )
        );
        if (selectedCategory.toLowerCase() === trimmed.toLowerCase()) {
          setSelectedCategory("all");
        }
        toast.success(`Kategori "${trimmed}" dihapus.`);
        if (typeof navigator !== "undefined" && navigator.onLine) {
          syncAll(userId).catch(() => {});
        }
        return;
      } catch (e) {
        console.warn("[offline-notebook] Enqueue delete kategori gagal:", e);
      }
    }

    try {
      const res = await fetch(`/api/notebook-categories?nama=${encodeURIComponent(trimmed)}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Gagal menghapus kategori.");
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
  }, [userId, customCategories, selectedCategory, saveCustomCategories]);

  // Fetch notebooks from API or Dexie
  const fetchNotebooks = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);

    if (OFFLINE_SYNC_ENABLED && typeof window !== "undefined" && userId) {
      try {
        const localList = await localDb.notebooks
          .where("[userId+deletedAt]")
          .equals([userId, null])
          .toArray();
        if (localList.length > 0) {
          setNotebooks(localList);
          if (!silent) setIsLoading(false);
        }
      } catch (dexieErr) {
        console.warn("[offline-notebook] Gagal membaca Dexie:", dexieErr);
      }
    }

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

  useEffect(() => {
    if (userId) {
      fetchNotebooks(true);
    }
  }, [userId, fetchNotebooks]);

  // Listener event rekonsiliasi server (mytask:synced)
  useEffect(() => {
    if (typeof window === "undefined" || !userId || !OFFLINE_SYNC_ENABLED) return;

    const handleSynced = async (e) => {
      if (e?.detail?.userId === userId) {
        try {
          const freshNotes = await localDb.notebooks
            .where("[userId+deletedAt]")
            .equals([userId, null])
            .toArray();
          if (freshNotes.length > 0) setNotebooks(freshNotes);
          fetchCategories();
        } catch (e) {
          console.warn("[offline-notebook] Gagal reload setelah sync:", e);
        }
      }
    };

    window.addEventListener("mytask:synced", handleSynced);
    return () => window.removeEventListener("mytask:synced", handleSynced);
  }, [userId, fetchCategories]);

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
    const cleanKategori = typeof kategori === "string" ? kategori.trim() : "";
    const nowIso = new Date().toISOString();

    if (OFFLINE_SYNC_ENABLED && userId && typeof window !== "undefined") {
      try {
        const clientUuid =
          typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : `nb_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

        const noteRow = {
          id: Date.now(),
          clientUuid,
          userId,
          serverId: null,
          judul,
          konten,
          penting: Boolean(penting),
          warna: warna || "#0284C7",
          kategori: cleanKategori,
          dibuatPada: nowIso,
          diperbaruiPada: nowIso,
          updatedAt: nowIso,
          deletedAt: null,
          pending: 1,
        };

        await enqueueWithRow(localDb, userId, "notebooks", noteRow, {
          judul,
          konten,
          penting: Boolean(penting),
          warna: noteRow.warna,
          kategori: cleanKategori,
          updatedAt: nowIso,
        });

        setNotebooks((prev) => [noteRow, ...prev]);

        if (cleanKategori) {
          setCustomCategories((prev) => {
            if (!prev.some((c) => c.name.toLowerCase() === cleanKategori.toLowerCase())) {
              const nextCats = [...prev, { name: cleanKategori, color: "#0284C7", icon: "FolderSimple", createdAt: nowIso }];
              saveCustomCategories(nextCats);
              return nextCats;
            }
            return prev;
          });
        }

        toast.success("Catatan materi berhasil disimpan!");
        closeAddNotebook();
        if (typeof navigator !== "undefined" && navigator.onLine) {
          syncAll(userId).catch(() => {});
        }
        return noteRow;
      } catch (e) {
        console.warn("[offline-notebook] Enqueue add notebook gagal, fallback ke fetch:", e);
      }
    }

    try {
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
    const payload = { id, judul, konten, penting, warna };
    if (kategori !== undefined) {
      payload.kategori = typeof kategori === "string" ? kategori.trim() : "";
    }
    const nowIso = new Date().toISOString();

    if (OFFLINE_SYNC_ENABLED && userId && typeof window !== "undefined") {
      try {
        const target = notebooks.find((n) => n.id === id || n.clientUuid === id);
        const clientUuid =
          target?.clientUuid ||
          (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : `nb_${id}`);

        const updatedRow = {
          ...(target || {}),
          ...payload,
          clientUuid,
          userId,
          diperbaruiPada: nowIso,
          updatedAt: nowIso,
          pending: 1,
        };

        await enqueueWithRow(localDb, userId, "notebooks", updatedRow, {
          ...payload,
          updatedAt: nowIso,
        });

        setNotebooks((prev) =>
          prev.map((item) => (item.id === id || item.clientUuid === clientUuid ? updatedRow : item))
        );

        if (editingNotebook && (editingNotebook.id === id || editingNotebook.clientUuid === clientUuid)) {
          setEditingNotebook(updatedRow);
        }
        if (previewNotebook && (previewNotebook.id === id || previewNotebook.clientUuid === clientUuid)) {
          setPreviewNotebook(updatedRow);
        }

        if (!isSilentAutoSave) {
          toast.success("Catatan berhasil diperbarui!");
        }

        if (typeof navigator !== "undefined" && navigator.onLine) {
          syncAll(userId).catch(() => {});
        }
        return updatedRow;
      } catch (e) {
        console.warn("[offline-notebook] Enqueue update notebook gagal:", e);
      }
    }

    try {
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
  }, [userId, editingNotebook, previewNotebook, notebooks, saveCustomCategories]);

  // Action: Toggle Important (Pin to top)
  const toggleImportant = useCallback(async (id) => {
    const target = notebooks.find((n) => n.id === id || n.clientUuid === id);
    if (!target) return;

    const nextPenting = !target.penting;
    const nowIso = new Date().toISOString();

    setNotebooks((prev) =>
      prev.map((item) =>
        item.id === id || item.clientUuid === id
          ? { ...item, penting: nextPenting, diperbaruiPada: nowIso, pending: OFFLINE_SYNC_ENABLED ? 1 : (item.pending || 0) }
          : item
      )
    );

    setPreviewNotebook((prev) =>
      prev && (prev.id === id || prev.clientUuid === id)
        ? { ...prev, penting: nextPenting, diperbaruiPada: nowIso }
        : prev
    );

    if (OFFLINE_SYNC_ENABLED && userId && typeof window !== "undefined") {
      try {
        const clientUuid =
          target.clientUuid ||
          (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : `nb_${id}`);

        const row = {
          ...target,
          clientUuid,
          userId,
          penting: nextPenting,
          updatedAt: nowIso,
          diperbaruiPada: nowIso,
          pending: 1,
        };

        await enqueueWithRow(localDb, userId, "notebooks", row, {
          penting: nextPenting,
          updatedAt: nowIso,
        });

        toast.success(
          nextPenting
            ? "Catatan disematkan ke paling atas!"
            : "Sematkan catatan dilepas."
        );

        if (typeof navigator !== "undefined" && navigator.onLine) {
          syncAll(userId).catch(() => {});
        }
        return;
      } catch (e) {
        console.warn("[offline-notebook] Enqueue toggle important gagal:", e);
      }
    }

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
      setNotebooks((prev) =>
        prev.map((item) => (item.id === id ? target : item))
      );
      setPreviewNotebook((prev) => (prev && prev.id === id ? target : prev));
      toast.error("Gagal mengubah status penting catatan.");
    }
  }, [notebooks, userId]);

  // Action: Delete Notebook
  const deleteNotebook = useCallback(async (id) => {
    const target = notebooks.find((n) => n.id === id || n.clientUuid === id);

    setNotebooks((prev) => prev.filter((item) => item.id !== id && item.clientUuid !== id));
    setPreviewNotebook((prev) => (prev && (prev.id === id || prev.clientUuid === id) ? null : prev));
    closeDeleteConfirm();

    if (OFFLINE_SYNC_ENABLED && userId && target && typeof window !== "undefined") {
      try {
        const nowIso = new Date().toISOString();
        const clientUuid = target.clientUuid || `nb_${id}`;
        const tombstone = {
          ...target,
          userId,
          clientUuid,
          deletedAt: nowIso,
          pending: 1,
        };

        await enqueueWithRow(localDb, userId, "notebooks", tombstone, {
          deletedAt: nowIso,
        });

        toast.success("Catatan materi berhasil dihapus.");
        if (typeof navigator !== "undefined" && navigator.onLine) {
          syncAll(userId).catch(() => {});
        }
        return;
      } catch (e) {
        console.warn("[offline-notebook] Enqueue delete notebook gagal:", e);
      }
    }

    try {
      const res = await fetch(`/api/notebooks?id=${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Gagal menghapus catatan");
      }

      toast.success("Catatan materi berhasil dihapus.");
    } catch (err) {
      console.error("deleteNotebook error:", err);
      toast.error(err.message || "Gagal menghapus catatan.");
    }
  }, [userId, notebooks, closeDeleteConfirm]);

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

  // Daftar gabungan seluruh kategori beserta counter
  const allCategories = useMemo(() => {
    const map = new Map();

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

export default NotebookProvider;
