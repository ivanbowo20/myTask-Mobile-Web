'use client';

import { useState } from "react";
import { Calendar, CheckCircle2 } from "lucide-react";
import TaskCard from "@/components/tugas/TaskCard";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";
import MotionContainer from "@/components/ui/MotionContainer";
import { useTasks } from "@/lib/task-context";
import {
  formatTanggalSederhana,
  hitungStatusDeadline,
  getKategoriById,
} from "@/lib/utils";

export default function TodayTasksPage() {
  const {
    tasks,
    categories,
    toggleComplete,
    toggleImportant,
    openEditTask,
    deleteTask,
    openAddTask,
  } = useTasks();

  const [taskToDelete, setTaskToDelete] = useState(null);

  // Filter tasks with deadline today (pending only)
  const todayTasks = tasks.filter(
    (t) => !t.selesai && hitungStatusDeadline(t) === "hari-ini"
  );

  const pendingCount = todayTasks.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <MotionContainer delay={0} className="rounded-2xl">
        <div className="glass-card p-4 sm:p-6 rounded-2xl relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5 z-10">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[var(--theme-accent,#D97706)]/15 border border-[var(--theme-accent,#D97706)]/30 flex items-center justify-center text-[var(--theme-accent,#D97706)]">
                <Calendar className="w-4 h-4" />
              </div>
              <h1 className="font-heading text-xl sm:text-2xl font-bold text-[var(--text-primary)] tracking-tight">
                Tugas Hari Ini
              </h1>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[var(--theme-accent,#D97706)]/15 border border-[var(--theme-accent,#D97706)]/30 text-[var(--theme-accent,#D97706)]">
                {pendingCount} belum selesai
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
              {formatTanggalSederhana(new Date().toISOString())} — Fokus selesaikan target hari ini.
            </p>
          </div>
        </div>
      </MotionContainer>

      {/* Task List or Empty State */}
      {todayTasks.length === 0 ? (
        <MotionContainer delay={1}>
          <EmptyState
            icon={CheckCircle2}
            title="Bebas tugas untuk hari ini!"
            description="Tidak ada tugas tertunda yang memiliki tenggat waktu hari ini. Nikmati waktu luang Anda!"
            actionLabel="Tambah Tugas Baru"
            onAction={openAddTask}
          />
        </MotionContainer>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {todayTasks.map((task, index) => (
            <div key={task.id} className="h-full w-full">
              <TaskCard
                index={index}
                task={task}
                kategori={getKategoriById(categories, task.kategoriId)}
                onToggleSelesai={toggleComplete}
                onTogglePrioritas={toggleImportant}
                onEdit={openEditTask}
                onDelete={(t) => setTaskToDelete(t)}
              />
            </div>
          ))}
        </div>
      )}

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
