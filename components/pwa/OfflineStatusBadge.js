'use client';

import React from "react";
import { CloudSlash, ArrowsClockwise, CloudCheck, WarningCircle } from "@phosphor-icons/react";
import { useOnlineStatus } from "../../lib/use-online-status";
import { OFFLINE_SYNC_ENABLED } from "../../lib/local/feature-flag";

/**
 * Komponen Indikator Status Offline & Pending Sync
 * components/pwa/OfflineStatusBadge.js
 *
 * Mengikuti standar SielloMita Anti-Slop:
 * - Zero Unicode emoji (hanya ikon vektor Phosphor).
 * - Target sentuh mobile ergonomis (min 44x44px).
 * - Permukaan solid grounded berkarakter.
 */
export function OfflineStatusBadge({ userId, className = "" }) {
  const {
    isOnline,
    pendingCount,
    isSyncing,
    hasConflict,
    syncNow,
  } = useOnlineStatus(userId);

  // Jika fitur offline sync tidak aktif dan user sedang online, tidak perlu menampilkan apa-apa
  if (!OFFLINE_SYNC_ENABLED && isOnline) {
    return null;
  }

  // Jika sedang online dan tidak ada antrian pending dan tidak ada konflik, sembunyikan badge
  if (isOnline && pendingCount === 0 && !hasConflict && !isSyncing) {
    return null;
  }

  // State 1: Offline Total
  if (!isOnline) {
    return (
      <div
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-medium transition-all ${className}`}
        role="status"
        aria-live="polite"
        title="Aplikasi berjalan dalam mode offline. Data tersimpan aman di perangkat ini."
      >
        <CloudSlash size={16} weight="bold" className="shrink-0" />
        <span className="hidden sm:inline">Mode Offline</span>
        {pendingCount > 0 && (
          <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-[10px] font-mono font-semibold">
            {pendingCount}
          </span>
        )}
      </div>
    );
  }

  // State 2: Konflik LWW Terdeteksi
  if (hasConflict) {
    return (
      <button
        onClick={syncNow}
        disabled={isSyncing}
        className={`inline-flex items-center gap-2 min-h-[44px] px-3 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-medium transition-all hover:bg-rose-500/20 focus:outline-none focus:ring-2 focus:ring-rose-500/40 active:scale-95 ${className}`}
        aria-label="Resolusi konflik sinkronisasi"
        title="Terdapat penyesuaian data dengan versi cloud terbaru. Klik untuk menyinkronkan."
      >
        <WarningCircle size={16} weight="fill" className="shrink-0 text-rose-500" />
        <span>Konflik Diselesaikan</span>
        <ArrowsClockwise
          size={14}
          weight="bold"
          className={`shrink-0 ${isSyncing ? "animate-spin" : ""}`}
        />
      </button>
    );
  }

  // State 3: Sedang Sinkronisasi
  if (isSyncing) {
    return (
      <div
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400 text-xs font-medium ${className}`}
        role="status"
        aria-live="polite"
      >
        <ArrowsClockwise size={16} weight="bold" className="shrink-0 animate-spin" />
        <span className="hidden sm:inline">Menyinkronkan...</span>
        {pendingCount > 0 && (
          <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-[10px] font-mono font-semibold">
            {pendingCount}
          </span>
        )}
      </div>
    );
  }

  // State 4: Online dengan Antrian Pending (Tombol Manual Sync)
  if (pendingCount > 0) {
    return (
      <button
        onClick={syncNow}
        className={`inline-flex items-center gap-2 min-h-[44px] px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-medium transition-all hover:bg-neutral-200 dark:hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-400 active:scale-95 ${className}`}
        aria-label={`Sinkronkan ${pendingCount} perubahan pending`}
        title={`Ada ${pendingCount} perubahan lokal yang belum tersimpan ke server. Klik untuk sinkronisasi.`}
      >
        <CloudCheck size={16} weight="bold" className="shrink-0 text-sky-500" />
        <span className="hidden sm:inline">Simpan Cloud</span>
        <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-600 dark:text-sky-400 text-[10px] font-mono font-semibold">
          {pendingCount}
        </span>
        <ArrowsClockwise size={14} weight="bold" className="shrink-0" />
      </button>
    );
  }

  return null;
}

export default OfflineStatusBadge;
