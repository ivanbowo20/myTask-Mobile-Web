'use client';

import { useState } from "react";
import { Calendar, CheckCircle2 } from "lucide-react";
import TaskCard from "@/components/tugas/TaskCard";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";
import AnimatedList from "@/components/ui/AnimatedList";
import AnimatedContent from "@/components/ui/AnimatedContent";
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
      <AnimatedContent delay={0}>
        <div className="glass-card p-4 sm:p-6 rounded-2xl relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--theme-accent,#D97706)]/15 border border-[var(--theme-accent,#D97706)]/30 flex items-center justify-center text-[var(--theme-accent,#D97706)]">
              <Calendar className="w-4 h-4" />
            </div>
            <h1 className="font-heading text-xl sm:text-2xl font-bold text-[#FAFAFA] [html[data-theme='celestial-sky']_&]:text-[#0F172A] tracking-tight">
              Tugas Hari Ini
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[var(--theme-accent,#D97706)]/15 border border-[var(--theme-accent,#D97706)]/30 text-[var(--theme-accent,#D97706)]">
              {pendingCount} belum selesai
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#A1A1AA] [html[data-theme='celestial-sky']_&]:text-[#334155] [html[data-theme='celestial-sky']_&]:font-medium leading-relaxed">
            {formatTanggalSederhana(new Date().toISOString())} — Fokus selesaikan target hari ini.
          </p>
          </div>
        </div>
      </AnimatedContent>

      {/* Task List or Empty State */}
      <AnimatedContent delay={0.08}>
        {todayTasks.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="Bebas tugas untuk hari ini! 🎉"
            description="Tidak ada tugas tertunda yang memiliki tenggat waktu hari ini. Nikmati waktu luang Anda!"
            actionLabel="Tambah Tugas Baru"
            onAction={openAddTask}
          />
        ) : (
          <AnimatedList
            items={todayTasks}
            gap={16}
            animation="pop"
            stagger={0.05}
            trackClassName="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            renderItem={(task) => (
              <div className="h-full w-full">
                <TaskCard
                  task={task}
                  kategori={getKategoriById(categories, task.kategoriId)}
                  onToggleSelesai={toggleComplete}
                  onTogglePrioritas={toggleImportant}
                  onEdit={openEditTask}
                  onDelete={(t) => setTaskToDelete(t)}
                />
              </div>
            )}
          />
        )}
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
