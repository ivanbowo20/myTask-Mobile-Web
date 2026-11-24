'use client';

import { createContext, useContext, useState, useMemo, useEffect, useCallback, useRef } from "react";
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

const EMPTY_ARRAY = [];
const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUuid(val) {
  return typeof val === "string" && UUID_V4_RE.test(val.trim());
}

function generateValidUuid() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function normalizeNotebookItem(item) {
  if (!item || typeof item !== "object") return item;
  const resolvedId = item.id ?? item.serverId ?? item.clientUuid;
  const resolvedServerId =
    item.serverId ?? (typeof item.id === "number" && Number.isFinite(item.id) ? item.id : null);
  return {
    ...item,
    id: resolvedId,
    ...(resolvedServerId !== null ? { serverId: resolvedServerId } : {}),
  };
}

function matchesNotebook(item, identifier) {
  if (!item || identifier === null || identifier === undefined || identifier === "") {
    return false;
  }
  if (typeof identifier === "object") {
    const targetId = identifier.id ?? identifier.serverId;
    const targetUuid = identifier.clientUuid;
    if (targetId !== undefined && targetId !== null) {
      if (
        String(item.id) === String(targetId) ||
        (item.serverId !== undefined && item.serverId !== null && String(item.serverId) === String(targetId))
      ) {
        return true;
      }
    }
    if (targetUuid && item.clientUuid && String(item.clientUuid) === String(targetUuid)) {
      return true;
    }
    return false;
  }
  const strId = String(identifier);
  return (
    (item.id !== undefined && item.id !== null && String(item.id) === strId) ||
    (item.serverId !== undefined && item.serverId !== null && String(item.serverId) === strId) ||
    (item.clientUuid !== undefined && item.clientUuid !== null && String(item.clientUuid) === strId)
  );
}

export function NotebookProvider({
  children,
  initialNotebooks = EMPTY_ARRAY,
}) {
  const { data: session } = useSession();
  const [offlineFallbackUserId, setOfflineFallbackUserId] = useState(null);
  const sessionUserId = session?.user?.id ?? null;

  useEffect(() => {
    if (sessionUserId) {
      setOfflineFallbackUserId((prev) => (prev === sessionUserId ? prev : sessionUserId));
    } else if (typeof window !== "undefined" && !navigator.onLine && !offlineFallbackUserId) {
      try {
        const raw = localStorage.getItem("better-auth.session_data");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.user?.id) setOfflineFallbackUserId(parsed.user.id);
        }
      } catch (_) {}
    }
  }, [sessionUserId, offlineFallbackUserId]);

  const userId = sessionUserId || offlineFallbackUserId || null;
  const hasInitialNotebooks = Array.isArray(initialNotebooks) && initialNotebooks.length > 0;

  const [notebooks, setNotebooks] = useState(() =>
    hasInitialNotebooks ? initialNotebooks : []
  );

  const [isLoading, setIsLoading] = useState(!hasInitialNotebooks);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingNotebook, setEditingNotebook] = useState(null);
  const [previewNotebook, setPreviewNotebook] = useState(null);
  const [deletingNotebook, setDeletingNotebook] = useState(null);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Custom Categories list (hydrated safely inside useEffect to prevent SSR mismatch)
  const [customCategories, setCustomCategories] = useState([]);
  const hasHydratedCategoriesRef = useRef(false);
  const hydratedUserIdRef = useRef(null);
  const categoriesAbortRef = useRef(null);
  const notebooksAbortRef = useRef(null);
  const pendingDeletedKeysRef = useRef(new Set());

  // Cleanup active fetches on unmount
  useEffect(() => {
    return () => {
      if (categoriesAbortRef.current) categoriesAbortRef.current.abort();
      if (notebooksAbortRef.current) notebooksAbortRef.current.abort();
    };
  }, []);

  // Hydrate cached notebooks & custom categories safely once per userId after mount
  useEffect(() => {
    if (typeof window === "undefined" || !userId) return;
    if (hydratedUserIdRef.current === userId) return;
    hydratedUserIdRef.current = userId;

    if (!hasInitialNotebooks) {
      const cached = getStoredCache(userId);
      if (Array.isArray(cached) && cached.length > 0) {
        setNotebooks((prev) =>
          prev.length === 0 ? cached.map(normalizeNotebookItem) : prev
        );
      }
    }

    try {
      const raw = localStorage.getItem(`taskflow_notebook_categories_${userId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setCustomCategories(parsed);
        }
      }
    } catch {
      // Ignore malformed local cache
    }
    hasHydratedCategoriesRef.current = true;
  }, [userId, hasInitialNotebooks]);

  // Persist notebooks cache cleanly via effect (zero side-effects in state updaters)
  useEffect(() => {
    if (!userId || (isLoading && notebooks.length === 0)) return;
    setStoredCache(userId, notebooks);
  }, [userId, notebooks, isLoading]);

  // Persist customCategories cache cleanly via effect (zero side-effects in state updaters)
  useEffect(() => {
    if (typeof window === "undefined" || !userId || !hasHydratedCategoriesRef.current) return;
    try {
      localStorage.setItem(
        `taskflow_notebook_categories_${userId}`,
        JSON.stringify(customCategories)
      );
    } catch (err) {
      console.warn("Gagal menyimpan kategori lokal:", err);
    }
  }, [userId, customCategories]);

  // Fetch categories from API or Dexie
  const fetchCategories = useCallback(async () => {
    if (categoriesAbortRef.current) {
      categoriesAbortRef.current.abort();
    }
    const controller = new AbortController();
    categoriesAbortRef.current = controller;

    if (OFFLINE_SYNC_ENABLED && typeof window !== "undefined" && userId) {
      try {
        const localCats = await localDb.notebookCategories
          .where("userId")
          .equals(userId)
          .filter((row) => !row.deletedAt)
          .toArray();
        if (controller.signal.aborted) return;
        if (localCats.length > 0) {
          setCustomCategories(localCats.map((c) => ({
            id: c.serverId || c.id || c.clientUuid,
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
        signal: controller.signal,
      });
      if (!res.ok || controller.signal.aborted) return;
      const data = await res.json();
      if (!controller.signal.aborted && Array.isArray(data.categories)) {
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
      if (err?.name === "AbortError") return;
      console.warn("fetchCategories error:", err);
    }
  }, [userId]);

  useEffect(() => {
    if (typeof window === "undefined" || !userId) return;
    fetchCategories();
  }, [userId, fetchCategories]);

  const saveCustomCategories = useCallback((cats) => {
    setCustomCategories(cats);
  }, []);

  const createCategoryWithNotes = useCallback(async ({ nama, warna = "#0284C7", icon = "FolderSimple", noteIds = [] }) => {
    const trimmed = (nama || "").trim();
    if (!trimmed) return null;

    if (OFFLINE_SYNC_ENABLED && userId && typeof window !== "undefined") {
      try {
        const nowIso = new Date().toISOString();
        const clientUuid = generateValidUuid();

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
          const idSet = new Set(noteIds.map(String));
          setNotebooks((prev) => {
            const next = prev.map((n) =>
              idSet.has(String(n.id)) || (n.serverId && idSet.has(String(n.serverId)))
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
        return [...filtered, {
          id: category.id,
          clientUuid: category.clientUuid,
          name: category.nama,
          color: category.warna,
          icon: category.icon,
          count: assignedCount || 0,
        }];
      });

      if (Array.isArray(noteIds) && noteIds.length > 0) {
        const idSet = new Set(noteIds.map(String));
        setNotebooks((prev) =>
          prev.map((n) =>
            idSet.has(String(n.id)) || (n.serverId && idSet.has(String(n.serverId)))
              ? { ...n, kategori: trimmed, kategoriId: category.id, diperbaruiPada: new Date().toISOString() }
              : n
          )
        );
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
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "assign", noteIds, targetCategoryName: trimmed }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Gagal memindahkan catatan.");
      }

      const idSet = new Set(noteIds.map(String));
      setNotebooks((prev) =>
        prev.map((n) =>
          idSet.has(String(n.id)) || (n.serverId && idSet.has(String(n.serverId)))
            ? { ...n, kategori: trimmed, diperbaruiPada: new Date().toISOString() }
            : n
        )
      );

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
    const rawName = typeof categoryName === "string" ? categoryName : categoryName?.name || "";
    const trimmed = rawName.trim();
    if (!trimmed) return;

    const existingCat = customCategories.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());

    if (OFFLINE_SYNC_ENABLED && userId && typeof window !== "undefined") {
      try {
        if (existingCat && isValidUuid(existingCat.clientUuid)) {
          const nowIso = new Date().toISOString();
          const tombstone = {
            userId,
            clientUuid: existingCat.clientUuid,
            deletedAt: nowIso,
            pending: 1,
          };
          await enqueueWithRow(localDb, userId, "notebookCategories", tombstone, {
            deletedAt: nowIso,
          });
        }
        setCustomCategories((prev) =>
          prev.filter((c) => c.name.toLowerCase() !== trimmed.toLowerCase())
        );
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
      const catIdParam =
        existingCat?.id && !isNaN(Number(existingCat.id))
          ? `id=${encodeURIComponent(existingCat.id)}&`
          : "";
      const res = await fetch(
        `/api/notebook-categories?${catIdParam}nama=${encodeURIComponent(trimmed)}`,
        {
          method: "DELETE",
        }
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Gagal menghapus kategori.");
      }

      setCustomCategories((prev) =>
        prev.filter((c) => c.name.toLowerCase() !== trimmed.toLowerCase())
      );

      setNotebooks((prev) =>
        prev.map((n) =>
          (n.kategori || "").toLowerCase() === trimmed.toLowerCase()
            ? { ...n, kategori: "", kategoriId: null }
            : n
        )
      );

      if (selectedCategory.toLowerCase() === trimmed.toLowerCase()) {
        setSelectedCategory("all");
      }

      toast.success(`Kategori "${trimmed}" dihapus.`);
    } catch (err) {
      console.error("deleteCustomCategory error:", err);
      toast.error("Gagal menghapus kategori.");
    }
  }, [userId, customCategories, selectedCategory]);

  // Fetch notebooks from API or Dexie
  const fetchNotebooks = useCallback(async (silent = false) => {
    if (notebooksAbortRef.current) {
      notebooksAbortRef.current.abort();
    }
    const controller = new AbortController();
    notebooksAbortRef.current = controller;

    if (!silent) setIsLoading(true);

    const isPendingDeleted = (row) => {
      const set = pendingDeletedKeysRef.current;
      if (set.size === 0) return false;
      if (row.id !== undefined && row.id !== null && set.has(String(row.id))) return true;
      if (row.serverId !== undefined && row.serverId !== null && set.has(String(row.serverId))) return true;
      if (row.clientUuid && set.has(String(row.clientUuid))) return true;
      return false;
    };

    let localDeletedUuids = new Set();
    let localPendingRows = [];

    if (OFFLINE_SYNC_ENABLED && typeof window !== "undefined" && userId) {
      try {
        const allLocal = await localDb.notebooks
          .where("userId")
          .equals(userId)
          .toArray();
        if (controller.signal.aborted) return;

        for (const r of allLocal) {
          if (r.deletedAt && r.clientUuid) {
            localDeletedUuids.add(r.clientUuid);
          } else if (!r.deletedAt && r.pending === 1) {
            localPendingRows.push(normalizeNotebookItem(r));
          }
        }

        const localList = allLocal
          .filter((row) => !row.deletedAt && !isPendingDeleted(row))
          .map(normalizeNotebookItem);

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
        signal: controller.signal,
      });
      if (!res.ok) throw new Error("Gagal mengambil data notebook");
      const data = await res.json();
      if (controller.signal.aborted) return;

      const rawList = Array.isArray(data.notebooks) ? data.notebooks : [];
      const normalizedServerList = rawList
        .map(normalizeNotebookItem)
        .filter((row) => !isPendingDeleted(row) && (!row.clientUuid || !localDeletedUuids.has(row.clientUuid)));

      if (OFFLINE_SYNC_ENABLED && localPendingRows.length > 0) {
        const serverUuids = new Set(normalizedServerList.map((n) => n.clientUuid).filter(Boolean));
        const unsyncedLocals = localPendingRows.filter(
          (loc) => loc.clientUuid && !serverUuids.has(loc.clientUuid) && !isPendingDeleted(loc)
        );
        setNotebooks([...unsyncedLocals, ...normalizedServerList]);
      } else {
        setNotebooks(normalizedServerList);
      }
    } catch (err) {
      if (err?.name === "AbortError") return;
      console.error("fetchNotebooks error:", err);
      if (!silent) {
        toast.error("Gagal memuat catatan materi dari server.");
      }
    } finally {
      if (!silent && notebooksAbortRef.current === controller) {
        setIsLoading(false);
      }
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
            .where("userId")
            .equals(userId)
            .filter((row) => !row.deletedAt)
            .toArray();
          setNotebooks(freshNotes.map(normalizeNotebookItem));
          fetchCategories();
        } catch (err) {
          console.warn("[offline-notebook] Gagal reload setelah sync:", err);
        }
      }
    };

    window.addEventListener("mytask:synced", handleSynced);
    return () => window.removeEventListener("mytask:synced", handleSynced);
  }, [userId, fetchCategories]);

  // Modals controls
  const openAddNotebook = useCallback(() => setIsAddOpen(true), []);
  const closeAddNotebook = useCallback(() => setIsAddOpen(false), []);
  const openEditNotebook = useCallback((notebook) => setEditingNotebook(normalizeNotebookItem(notebook)), []);
  const closeEditNotebook = useCallback(() => setEditingNotebook(null), []);
  const openPreviewNotebook = useCallback((notebook) => setPreviewNotebook(normalizeNotebookItem(notebook)), []);
  const closePreviewNotebook = useCallback(() => setPreviewNotebook(null), []);
  const openDeleteConfirm = useCallback((notebook) => setDeletingNotebook(normalizeNotebookItem(notebook)), []);
  const closeDeleteConfirm = useCallback(() => setDeletingNotebook(null), []);

  // Action: Add Notebook
  const addNotebook = useCallback(async ({ judul, konten, penting, warna, kategori = "" }) => {
    const cleanKategori = typeof kategori === "string" ? kategori.trim() : "";
    const nowIso = new Date().toISOString();

    if (OFFLINE_SYNC_ENABLED && userId && typeof window !== "undefined") {
      try {
        const clientUuid = generateValidUuid();

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
              return [...prev, { name: cleanKategori, color: "#0284C7", icon: "FolderSimple", createdAt: nowIso }];
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
      const normalized = normalizeNotebookItem(notebook);
      setNotebooks((prev) => [normalized, ...prev]);

      if (cleanKategori) {
        setCustomCategories((prev) => {
          if (!prev.some((c) => c.name.toLowerCase() === cleanKategori.toLowerCase())) {
            return [...prev, { name: cleanKategori, color: "#0284C7", icon: "FolderSimple", createdAt: new Date().toISOString() }];
          }
          return prev;
        });
      }

      toast.success("Catatan materi berhasil disimpan!");
      closeAddNotebook();
      return normalized;
    } catch (err) {
      console.error("addNotebook error:", err);
      toast.error(err.message || "Gagal menambahkan catatan.");
      throw err;
    }
  }, [userId, closeAddNotebook]);

  // Action: Update Notebook
  const updateNotebook = useCallback(async (id, { judul, konten, penting, warna, kategori }, isSilentAutoSave = false) => {
    const target = notebooks.find((n) => matchesNotebook(n, id));
    const effectiveId = target?.serverId ?? target?.id ?? id;
    const payload = { id: effectiveId, clientUuid: target?.clientUuid || null, judul, konten, penting, warna };
    if (kategori !== undefined) {
      payload.kategori = typeof kategori === "string" ? kategori.trim() : "";
    }
    const nowIso = new Date().toISOString();

    if (OFFLINE_SYNC_ENABLED && userId && typeof window !== "undefined") {
      try {
        const clientUuid = isValidUuid(target?.clientUuid) ? target.clientUuid : generateValidUuid();

        const updatedRow = normalizeNotebookItem({
          ...(target || {}),
          ...payload,
          clientUuid,
          userId,
          diperbaruiPada: nowIso,
          updatedAt: nowIso,
          pending: 1,
        });

        await enqueueWithRow(localDb, userId, "notebooks", updatedRow, {
          ...payload,
          updatedAt: nowIso,
        });

        setNotebooks((prev) =>
          prev.map((item) => (matchesNotebook(item, id) || item.clientUuid === clientUuid ? updatedRow : item))
        );

        if (editingNotebook && (matchesNotebook(editingNotebook, id) || editingNotebook.clientUuid === clientUuid)) {
          setEditingNotebook(updatedRow);
        }
        if (previewNotebook && (matchesNotebook(previewNotebook, id) || previewNotebook.clientUuid === clientUuid)) {
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
      const normalized = normalizeNotebookItem(notebook);
      setNotebooks((prev) => prev.map((item) => (matchesNotebook(item, id) ? normalized : item)));

      if (payload.kategori) {
        setCustomCategories((prev) => {
          if (!prev.some((c) => c.name.toLowerCase() === payload.kategori.toLowerCase())) {
            return [...prev, { name: payload.kategori, color: "#0284C7", icon: "FolderSimple", createdAt: new Date().toISOString() }];
          }
          return prev;
        });
      }

      if (editingNotebook && matchesNotebook(editingNotebook, id)) {
        setEditingNotebook(normalized);
      }
      if (previewNotebook && matchesNotebook(previewNotebook, id)) {
        setPreviewNotebook(normalized);
      }

      if (!isSilentAutoSave) {
        toast.success("Catatan berhasil diperbarui!");
      }

      return normalized;
    } catch (err) {
      console.error("updateNotebook error:", err);
      if (!isSilentAutoSave) {
        toast.error(err.message || "Gagal memperbarui catatan.");
      }
      throw err;
    }
  }, [userId, editingNotebook, previewNotebook, notebooks]);

  // Action: Toggle Important (Pin to top)
  const toggleImportant = useCallback(async (id) => {
    const target = notebooks.find((n) => matchesNotebook(n, id));
    if (!target) return;

    const nextPenting = !target.penting;
    const nowIso = new Date().toISOString();

    setNotebooks((prev) =>
      prev.map((item) =>
        matchesNotebook(item, id)
          ? { ...item, penting: nextPenting, diperbaruiPada: nowIso, pending: OFFLINE_SYNC_ENABLED ? 1 : (item.pending || 0) }
          : item
      )
    );

    setPreviewNotebook((prev) =>
      prev && matchesNotebook(prev, id)
        ? { ...prev, penting: nextPenting, diperbaruiPada: nowIso }
        : prev
    );

    if (OFFLINE_SYNC_ENABLED && userId && typeof window !== "undefined") {
      try {
        const clientUuid = isValidUuid(target.clientUuid) ? target.clientUuid : generateValidUuid();

        const row = normalizeNotebookItem({
          ...target,
          clientUuid,
          userId,
          penting: nextPenting,
          updatedAt: nowIso,
          diperbaruiPada: nowIso,
          pending: 1,
        });

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
      const effectiveId = target.serverId ?? target.id ?? id;
      const res = await fetch("/api/notebooks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: effectiveId, clientUuid: target.clientUuid || null, penting: nextPenting }),
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
        prev.map((item) => (matchesNotebook(item, id) ? target : item))
      );
      setPreviewNotebook((prev) => (prev && matchesNotebook(prev, id) ? target : prev));
      toast.error("Gagal mengubah status penting catatan.");
    }
  }, [notebooks, userId]);

  // Action: Delete Notebook
  const deleteNotebook = useCallback(async (idOrNotebook) => {
    const previousIndex = notebooks.findIndex((n) => matchesNotebook(n, idOrNotebook));
    const target =
      previousIndex !== -1
        ? notebooks[previousIndex]
        : (typeof idOrNotebook === "object" && idOrNotebook !== null ? idOrNotebook : null);

    const resolvedServerId =
      target?.serverId ??
      (target?.id !== undefined && !isNaN(Number(target.id)) ? Number(target.id) : null) ??
      (typeof idOrNotebook !== "object" && !isNaN(Number(idOrNotebook)) ? Number(idOrNotebook) : null);

    const resolvedClientUuid =
      target?.clientUuid ??
      (typeof idOrNotebook === "string" && isValidUuid(idOrNotebook) ? idOrNotebook : null);

    const lockKeys = [
      target?.id,
      target?.serverId,
      target?.clientUuid,
      typeof idOrNotebook !== "object" ? idOrNotebook : null,
    ]
      .filter((k) => k !== undefined && k !== null && k !== "")
      .map(String);

    lockKeys.forEach((k) => pendingDeletedKeysRef.current.add(k));

    setNotebooks((prev) => prev.filter((item) => !matchesNotebook(item, target || idOrNotebook)));
    setPreviewNotebook((prev) => (prev && matchesNotebook(prev, target || idOrNotebook) ? null : prev));
    setEditingNotebook((prev) => (prev && matchesNotebook(prev, target || idOrNotebook) ? null : prev));
    closeDeleteConfirm();

    // 1. Jika OFFLINE_SYNC_ENABLED dan catatan memang hanya draft offline (belum punya serverId atau sedang offline)
    if (OFFLINE_SYNC_ENABLED && userId && target && typeof window !== "undefined") {
      try {
        const nowIso = new Date().toISOString();
        if (isValidUuid(resolvedClientUuid)) {
          const tombstone = normalizeNotebookItem({
            ...target,
            userId,
            clientUuid: resolvedClientUuid,
            deletedAt: nowIso,
            pending: 1,
          });

          await enqueueWithRow(localDb, userId, "notebooks", tombstone, {
            deletedAt: nowIso,
          });
        }

        // Jika sedang offline atau item belum pernah punya serverId, cukup selesaikan via outbox
        const isOnline = typeof navigator === "undefined" || navigator.onLine;
        if (!isOnline || (!resolvedServerId && isValidUuid(resolvedClientUuid))) {
          lockKeys.forEach((k) => pendingDeletedKeysRef.current.delete(k));
          toast.success("Catatan materi berhasil dihapus.");
          if (isOnline) {
            syncAll(userId).catch(() => {});
          }
          return;
        }
      } catch (e) {
        console.warn("[offline-notebook] Enqueue delete notebook gagal, lanjutkan direct DELETE:", e);
      }
    }

    // 2. Eksekusi penghapusan langsung ke API server (dengan rollback jika gagal)
    try {
      const queryParts = [];
      if (resolvedServerId !== null && !isNaN(Number(resolvedServerId))) {
        queryParts.push(`id=${encodeURIComponent(resolvedServerId)}`);
      }
      if (resolvedClientUuid) {
        queryParts.push(`clientUuid=${encodeURIComponent(resolvedClientUuid)}`);
      }
      if (queryParts.length === 0 && typeof idOrNotebook !== "object" && idOrNotebook) {
        queryParts.push(`id=${encodeURIComponent(idOrNotebook)}`);
      }

      const res = await fetch(`/api/notebooks?${queryParts.join("&")}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        // Jika 404 (sudah terhapus di server), anggap sukses dan bersihkan Dexie jika ada
        if (res.status !== 404) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Gagal menghapus catatan");
        }
      }

      if (OFFLINE_SYNC_ENABLED && typeof window !== "undefined" && resolvedClientUuid) {
        try {
          await localDb.notebooks.update(resolvedClientUuid, {
            deletedAt: new Date().toISOString(),
            pending: 0,
          });
        } catch (_) {}
      }

      toast.success("Catatan materi berhasil dihapus.");
    } catch (err) {
      console.error("deleteNotebook error:", err);
      // Rollback state pada kegagalan server agar UI selalu jujur dengan state database
      if (target) {
        setNotebooks((prev) => {
          if (prev.some((item) => matchesNotebook(item, target))) return prev;
          const next = [...prev];
          next.splice(previousIndex >= 0 ? previousIndex : 0, 0, normalizeNotebookItem(target));
          return next;
        });
      }
      toast.error(err.message || "Gagal menghapus catatan dari server.");
    } finally {
      lockKeys.forEach((k) => pendingDeletedKeysRef.current.delete(k));
    }
  }, [userId, notebooks, closeDeleteConfirm]);

  const confirmDelete = useCallback(() => {
    if (!deletingNotebook) return;
    deleteNotebook(deletingNotebook);
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
