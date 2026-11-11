'use client';

import { useState } from "react";
import { Bell, AlertTriangle, Calendar, Clock } from "lucide-react";
import TaskCard from "@/components/tugas/TaskCard";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import MotionContainer from "@/components/ui/MotionContainer";
import NotificationBanner from "@/components/notifikasi/NotificationBanner";
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
      <MotionContainer delay={0} className="rounded-2xl">
        <div className="border-b border-[var(--glass-border)] pb-5 space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] flex items-center justify-center text-[var(--theme-accent)] shadow-sm">
              <Bell className="w-4 h-4" />
            </div>
            <h1 className="font-heading text-xl sm:text-2xl font-bold text-[var(--text-primary)] tracking-tight">
              Pusat Notifikasi
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-secondary)] shadow-sm">
              {overdueList.length + todayList.length + upcomingList.length} jadwal aktif
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
            Ringkasan seluruh pengingat tenggat waktu tugas, terbagi dalam tiga tingkatan urgensi.
          </p>
        </div>
      </MotionContainer>

      {/* Interactive Web Push Notification Status & Control Banner */}
      <MotionContainer delay={1} className="rounded-2xl">
        <NotificationBanner dismissible={false} />
      </MotionContainer>

      {/* Section 1: Tenggat Terlewat */}
      <MotionContainer delay={2} className="rounded-2xl">
        <section className="p-5 sm:p-6 rounded-2xl glass-panel shadow-sm space-y-4">
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
            <p className="text-xs text-[var(--text-muted)] py-2">
              Tidak ada deadline yang terlewat. Kerja bagus!
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
              {overdueList.map((task, idx) => (
                <TaskCard
                  key={task.id}
                  index={idx}
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
      </MotionContainer>

      {/* Section 2: Tenggat Hari Ini */}
      <MotionContainer delay={3} className="rounded-2xl">
        <section className="p-5 sm:p-6 rounded-2xl glass-panel shadow-sm space-y-4">
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
            <p className="text-xs text-[var(--text-muted)] py-2">
              Tidak ada tugas yang jatuh tempo hari ini.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
              {todayList.map((task, idx) => (
                <TaskCard
                  key={task.id}
                  index={idx}
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
      </MotionContainer>

      {/* Section 3: Tenggat Mendatang */}
      <MotionContainer delay={4} className="rounded-2xl">
        <section className="p-5 sm:p-6 rounded-2xl glass-panel shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--text-muted)]" />
              <h2 className="text-sm sm:text-base font-bold text-[var(--text-secondary)] flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Tenggat Waktu Mendatang ({upcomingList.length})
              </h2>
            </div>
          </div>

          {upcomingList.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] py-2">
              Tidak ada tugas mendatang.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
              {upcomingList.map((task, idx) => (
                <TaskCard
                  key={task.id}
                  index={idx}
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
      </MotionContainer>

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
