'use client';

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Bell, ArrowRight } from "lucide-react";
import NotifItem from "./NotifItem";
import { getKategoriById } from "@/lib/utils";

export default function NotifDropdown({
  overdueTasks = [],
  todayTasks = [],
  upcomingTasks = [],
  categories = [],
  onMarkDone,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const totalNotif = overdueTasks.length + todayTasks.length;

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        event.stopPropagation();
        event.stopImmediatePropagation?.();
        setIsOpen(false);
        const triggerBtn = dropdownRef.current?.querySelector('button');
        triggerBtn?.focus();
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Pemberitahuan notifikasi"
        aria-expanded={isOpen}
        className="relative min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-[#FAFAFA] hover:bg-[#1A1A1A] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FAFAFA]"
      >
        <Bell className="w-5 h-5" />
        {totalNotif > 0 && (
          <span className="absolute top-2 right-2 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full bg-[#E88B8B] text-[#0A0A0A] animate-pulse">
            {totalNotif > 99 ? "99+" : totalNotif}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="fixed inset-x-4 top-[calc(4.5rem+env(safe-area-inset-top,0px))] sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96 rounded-2xl glass-dropdown z-50 overflow-hidden flex flex-col max-h-[480px] animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Header */}
          <div className="p-4 border-b border-white/[0.08] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-heading text-sm font-bold text-[#FAFAFA]">
                Pusat Notifikasi
              </h3>
              {totalNotif > 0 && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#E88B8B]/20 text-[#E88B8B] font-semibold border border-[#E88B8B]/30">
                  {totalNotif} Perhatian
                </span>
              )}
            </div>
          </div>

          {/* List Content */}
          <div className="overflow-y-auto p-3 space-y-4 flex-1">
            {/* Terlewat */}
            {overdueTasks.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-[#E88B8B] uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#E88B8B]" />
                  Tenggat Terlewat ({overdueTasks.length})
                </p>
                <div className="space-y-1.5">
                  {overdueTasks.map((task) => (
                    <NotifItem
                      key={task.id}
                      task={task}
                      type="terlewat"
                      kategori={getKategoriById(categories, task.kategoriId)}
                      onMarkDone={onMarkDone}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Hari Ini */}
            {todayTasks.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-[var(--theme-accent,#D97706)] uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--theme-accent,#D97706)]" />
                  Jatuh Tempo Hari Ini ({todayTasks.length})
                </p>
                <div className="space-y-1.5">
                  {todayTasks.map((task) => (
                    <NotifItem
                      key={task.id}
                      task={task}
                      type="hari-ini"
                      kategori={getKategoriById(categories, task.kategoriId)}
                      onMarkDone={onMarkDone}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Mendatang */}
            {upcomingTasks.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-[#A1A1AA] uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#A1A1AA]" />
                  Mendatang
                </p>
                <div className="space-y-1.5">
                  {upcomingTasks.slice(0, 3).map((task) => (
                    <NotifItem
                      key={task.id}
                      task={task}
                      type="akan-datang"
                      kategori={getKategoriById(categories, task.kategoriId)}
                      onMarkDone={onMarkDone}
                    />
                  ))}
                </div>
              </div>
            )}

            {totalNotif === 0 && upcomingTasks.length === 0 && (
              <div className="py-8 text-center space-y-1">
                <p className="text-xs text-[#FAFAFA] font-medium">Semua tugas beres! ✨</p>
                <p className="text-[11px] text-[#71717A]">
                  Tidak ada tenggat waktu mendesak saat ini.
                </p>
              </div>
            )}
          </div>

          {/* Footer Link */}
          <div className="p-3 border-t border-white/[0.08] bg-white/[0.02]">
            <Link
              href="/notifikasi"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-center gap-1.5 w-full py-2 text-xs font-semibold text-[#FAFAFA] hover:text-[#E4E4E7] transition-colors"
            >
              Lihat Semua Notifikasi
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
