'use client';

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
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
  } = useTasks();

  const [taskToDelete, setTaskToDelete] = useState(null);

  // Filter tasks with selesai === true
  const completedTasks = tasks.filter((t) => t.selesai);

  return (
    <div className="space-y-6">
      {/* Header */}
      <AnimatedContent delay={0}>
        <div className="border-b border-white/[0.08] pb-5 space-y-1">
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
    </div>
  );
}
