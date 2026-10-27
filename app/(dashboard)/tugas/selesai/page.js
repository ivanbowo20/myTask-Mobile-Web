'use client';

import { useState } from "react";
import { CheckCircle2, Trash2 } from "lucide-react";
import TaskCard from "@/components/tugas/TaskCard";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";
import AnimatedList from "@/components/ui/AnimatedList";
import AnimatedContent from "@/components/ui/AnimatedContent";
import { useTasks } from "@/lib/task-context";
import { getKategoriById } from "@/lib/utils";

export default function CompletedTasksPage() {
  const {
    tasks,
    categories,
    toggleComplete,
    toggleImportant,
    openEditTask,
    deleteTask,
    clearCompletedTasks,
  } = useTasks();

  const [taskToDelete, setTaskToDelete] = useState(null);
  const [isClearCompletedOpen, setIsClearCompletedOpen] = useState(false);

  // Filter tasks with selesai === true
  const completedTasks = tasks.filter((t) => t.selesai);

  return (
    <div className="space-y-6">
      {/* Header */}
      <AnimatedContent delay={0}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#8FB88F]/15 border border-[#8FB88F]/30 flex items-center justify-center text-[#8FB88F]">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <h1 className="font-heading text-xl sm:text-2xl font-bold text-[#FAFAFA] tracking-tight">
                Tugas Selesai
              </h1>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#8FB88F]/15 border border-[#8FB88F]/30 text-[#8FB88F]">
                {completedTasks.length} tugas tuntas
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#A1A1AA]">
              Riwayat keberhasilan dan produktivitas yang telah Anda capai.
            </p>
          </div>
          {completedTasks.length > 0 && (
            <button
              type="button"
              onClick={() => setIsClearCompletedOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-rose-400 dark:text-rose-400 [html[data-theme='celestial-sky']_&]:text-rose-600 bg-rose-500/10 hover:bg-rose-500/20 [html[data-theme='celestial-sky']_&]:bg-rose-50 [html[data-theme='celestial-sky']_&]:hover:bg-rose-100 border border-rose-500/20 hover:border-rose-500/30 [html[data-theme='celestial-sky']_&]:border-rose-200 transition-all duration-200 cursor-pointer select-none active:scale-[0.97] self-start sm:self-auto"
              aria-label="Hapus semua tugas selesai"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus Semua ({completedTasks.length})</span>
            </button>
          )}
        </div>
      </AnimatedContent>

      {/* Task List or Empty State */}
      <AnimatedContent delay={0.08}>
        {completedTasks.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="Belum ada tugas selesai"
            description="Centang tugas yang telah Anda kerjakan untuk memindahkannya ke arsip tugas selesai ini."
          />
        ) : (
          <AnimatedList
            items={completedTasks}
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

      {/* Bulk Delete Completed Tasks Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isClearCompletedOpen}
        onClose={() => setIsClearCompletedOpen(false)}
        onConfirm={async () => {
          setIsClearCompletedOpen(false);
          await clearCompletedTasks();
        }}
        title="Hapus Semua Tugas Selesai"
        message={`Apakah Anda yakin ingin menghapus seluruh (${completedTasks.length}) tugas yang telah selesai? Tindakan ini akan menghapus data riwayat dari cloud database secara permanen.`}
        confirmLabel="Ya, Hapus Semua"
      />
    </div>
  );
}
