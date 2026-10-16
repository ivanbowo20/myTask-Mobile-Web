'use client';

import { useState } from "react";
import { Bell, AlertTriangle, Calendar, Clock } from "lucide-react";
import TaskCard from "@/components/tugas/TaskCard";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import AnimatedContent from "@/components/ui/AnimatedContent";
import { useTasks } from "@/lib/task-context";
import { getKategoriById } from "@/lib/utils";

export default function NotificationsPage() {
  const {
    categories,
    stats,
    toggleComplete,
    toggleImportant,
    openEditTask,
    deleteTask,
  } = useTasks();

  const [taskToDelete, setTaskToDelete] = useState(null);

  const { overdueList, todayList, upcomingList } = stats;

  return (
    <div className="space-y-8">
      {/* Header */}
      <AnimatedContent delay={0}>
        <div className="border-b border-white/[0.08] pb-5 space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-[#FAFAFA]">
              <Bell className="w-4 h-4" />
            </div>
            <h1 className="font-heading text-xl sm:text-2xl font-bold text-[#FAFAFA] tracking-tight">
              Pusat Notifikasi
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-[#A1A1AA]">
              {overdueList.length + todayList.length + upcomingList.length} jadwal aktif
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#A1A1AA]">
            Ringkasan seluruh pengingat tenggat waktu tugas, terbagi dalam tiga tingkatan urgensi.
          </p>
        </div>
      </AnimatedContent>

      {/* Section 1: Tenggat Terlewat */}
      <AnimatedContent delay={0.08}>
        <section className="p-5 sm:p-6 rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-[16px] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.3)] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E88B8B] opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#E88B8B]" />
              </span>
              <h2 className="text-sm sm:text-base font-bold text-[#E88B8B] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Tenggat Waktu Terlewat ({overdueList.length})
              </h2>
            </div>
          </div>

          {overdueList.length === 0 ? (
            <p className="text-xs text-[#71717A] py-2">
              Tidak ada deadline yang terlewat. Kerja bagus! 🎉
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
              {overdueList.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  kategori={getKategoriById(categories, task.kategoriId)}
                  onToggleSelesai={toggleComplete}
                  onTogglePrioritas={toggleImportant}
                  onEdit={openEditTask}
                  onDelete={(t) => setTaskToDelete(t)}
                />
              ))}
            </div>
          )}
        </section>
      </AnimatedContent>

      {/* Section 2: Tenggat Hari Ini */}
      <AnimatedContent delay={0.16}>
        <section className="p-5 sm:p-6 rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-[16px] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.3)] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--theme-accent,#D97706)]" />
              <h2 className="text-sm sm:text-base font-bold text-[var(--theme-accent,#D97706)] flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Jatuh Tempo Hari Ini ({todayList.length})
              </h2>
            </div>
          </div>

          {todayList.length === 0 ? (
            <p className="text-xs text-[#71717A] py-2">
              Tidak ada tugas yang jatuh tempo hari ini.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
              {todayList.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  kategori={getKategoriById(categories, task.kategoriId)}
                  onToggleSelesai={toggleComplete}
                  onTogglePrioritas={toggleImportant}
                  onEdit={openEditTask}
                  onDelete={(t) => setTaskToDelete(t)}
                />
              ))}
            </div>
          )}
        </section>
      </AnimatedContent>

      {/* Section 3: Tenggat Mendatang */}
      <AnimatedContent delay={0.24}>
        <section className="p-5 sm:p-6 rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-[16px] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.3)] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#A1A1AA]" />
              <h2 className="text-sm sm:text-base font-bold text-[#A1A1AA] flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Tenggat Waktu Mendatang ({upcomingList.length})
              </h2>
            </div>
          </div>

          {upcomingList.length === 0 ? (
            <p className="text-xs text-[#71717A] py-2">
              Tidak ada tugas mendatang.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
              {upcomingList.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  kategori={getKategoriById(categories, task.kategoriId)}
                  onToggleSelesai={toggleComplete}
                  onTogglePrioritas={toggleImportant}
                  onEdit={openEditTask}
                  onDelete={(t) => setTaskToDelete(t)}
                />
              ))}
            </div>
          )}
        </section>
      </AnimatedContent>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(taskToDelete)}
        onClose={() => setTaskToDelete(null)}
        onConfirm={() => {
          if (taskToDelete) {
            deleteTask(taskToDelete.id);
            setTaskToDelete(null);
          }
        }}
        title="Hapus Tugas"
        message={`Apakah Anda yakin ingin menghapus tugas "${taskToDelete?.judul}"? Tindakan ini tidak dapat dibatalkan.`}
      />
    </div>
  );
}
