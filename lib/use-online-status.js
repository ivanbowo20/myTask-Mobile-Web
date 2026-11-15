'use client';

import { useState, useEffect, useCallback, useRef } from "react";
import { OFFLINE_SYNC_ENABLED } from "./local/feature-flag.js";
import { getPendingCount } from "./local/outbox.js";
import { syncAll } from "./local/sync-engine.js";

/**
 * Hook pelacak status konektivitas jaringan dan antrian sinkronisasi offline.
 *
 * @param {string} [userId] ID pengguna aktif
 * @returns {{
 *   isOnline: boolean,
 *   pendingCount: number,
 *   isSyncing: boolean,
 *   lastSyncedAt: string|null,
 *   hasConflict: boolean,
 *   syncNow: () => Promise<void>
 * }}
 */
export function useOnlineStatus(userId) {
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof window !== "undefined" && typeof navigator !== "undefined") {
      return navigator.onLine;
    }
    return true;
  });

  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [hasConflict, setHasConflict] = useState(false);

  const activeUserIdRef = useRef(userId);
  activeUserIdRef.current = userId;

  // Refresh hitungan antrian pending dari IndexedDB
  const refreshPendingCount = useCallback(async () => {
    const currentId = activeUserIdRef.current;
    if (!currentId || !OFFLINE_SYNC_ENABLED) {
      setPendingCount(0);
      return;
    }

    try {
      const count = await getPendingCount(undefined, currentId);
      setPendingCount(count);
    } catch {
      // IndexedDB mungkin diblokir di private browsing
    }
  }, []);

  // Pemicu sinkronisasi manual
  const syncNow = useCallback(async () => {
    const currentId = activeUserIdRef.current;
    if (!currentId || !OFFLINE_SYNC_ENABLED || !navigator.onLine) {
      return;
    }

    setIsSyncing(true);
    try {
      await syncAll(currentId);
      await refreshPendingCount();
    } catch (err) {
      console.warn("[offline-status] Gagal menjalankan sinkronisasi manual:", err);
    } finally {
      setIsSyncing(false);
    }
  }, [refreshPendingCount]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOnline = () => {
      setIsOnline(true);
      // Saat koneksi pulih, otomatis picu sinkronisasi antrian lokal
      if (activeUserIdRef.current && OFFLINE_SYNC_ENABLED) {
        syncNow();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    const handleOutboxChanged = (e) => {
      if (e?.detail?.userId === activeUserIdRef.current) {
        if (typeof e.detail.pendingCount === "number") {
          setPendingCount(e.detail.pendingCount);
        } else {
          refreshPendingCount();
        }
        if (e.detail.hasConflict) {
          setHasConflict(true);
        }
      }
    };

    const handleSyncStart = (e) => {
      if (e?.detail?.userId === activeUserIdRef.current) {
        setIsSyncing(true);
      }
    };

    const handleSyncEnd = (e) => {
      if (e?.detail?.userId === activeUserIdRef.current) {
        setIsSyncing(false);
      }
    };

    const handleSynced = (e) => {
      if (e?.detail?.userId === activeUserIdRef.current) {
        setLastSyncedAt(e.detail.timestamp || new Date().toISOString());
        refreshPendingCount();
      }
    };

    const handleConflict = (e) => {
      if (e?.detail?.userId === activeUserIdRef.current) {
        setHasConflict(true);
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("mytask:outbox-changed", handleOutboxChanged);
    window.addEventListener("mytask:sync-start", handleSyncStart);
    window.addEventListener("mytask:sync-end", handleSyncEnd);
    window.addEventListener("mytask:synced", handleSynced);
    window.addEventListener("mytask:conflict", handleConflict);

    // Initial check saat mount
    refreshPendingCount();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("mytask:outbox-changed", handleOutboxChanged);
      window.removeEventListener("mytask:sync-start", handleSyncStart);
      window.removeEventListener("mytask:sync-end", handleSyncEnd);
      window.removeEventListener("mytask:synced", handleSynced);
      window.removeEventListener("mytask:conflict", handleConflict);
    };
  }, [syncNow, refreshPendingCount]);

  return {
    isOnline,
    pendingCount,
    isSyncing,
    lastSyncedAt,
    hasConflict,
    syncNow,
  };
}

export default useOnlineStatus;
