'use client';

import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import BottomNav from "@/components/layout/BottomNav";
import AddTaskModal from "@/components/tugas/AddTaskModal";
import EditTaskModal from "@/components/tugas/EditTaskModal";
import AddCategoryModal from "@/components/kategori/AddCategoryModal";
import EditCategoryModal from "@/components/kategori/EditCategoryModal";
import TopProgressBar from "@/components/ui/TopProgressBar";
import PwaInstallPrompt from "@/components/pwa/PwaInstallPrompt";
import { useTasks } from "@/lib/task-context";

export default function DashboardShell({ children }) {
  const {
    tasks,
    categories,
    stats,
    user,
    addTask,
    updateTask,
    addCategory,
    updateCategory,
    isAddTaskOpen,
    closeAddTask,
    openAddTask,
    editingTask,
    closeEditTask,
    isAddCategoryOpen,
    closeAddCategory,
    openAddCategory,
    editingCategory,
    closeEditCategory,
    toggleComplete,
  } = useTasks();

  return (
    <div className="min-h-[100dvh] flex flex-col overflow-x-clip">
      {/* Top Global Navigation Progress Bar */}
      <TopProgressBar />

      {/* Top Navbar */}
      <Navbar
        user={user}
        onOpenAddTask={openAddTask}
        overdueTasks={stats.overdueList}
        todayTasks={stats.todayList}
        upcomingTasks={stats.upcomingList}
        categories={categories}
        onMarkDone={toggleComplete}
      />

      <div className="flex-1 flex pt-[calc(4rem+env(safe-area-inset-top,0px))]">
        {/* Left Sidebar (Desktop Only) */}
        <Sidebar
          badges={{
            total: stats.total,
            hariIni: stats.today,
            penting: stats.important,
            selesai: stats.completed,
            kategori: categories.length,
            notifikasi: stats.overdue + stats.today,
          }}
        />

        {/* Main Workspace Content */}
        <main className="flex-1 lg:ml-64 min-w-0 p-4 sm:p-6 lg:p-8 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] lg:pb-8 overflow-y-auto">
          <div className="max-w-6xl mx-auto space-y-8">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (5 slots with prominent center add) */}
      <BottomNav onOpenAddTask={openAddTask} />

      {/* Global Modals */}
      <AddTaskModal
        isOpen={isAddTaskOpen}
        onClose={closeAddTask}
        categories={categories}
        onAddTask={addTask}
        onOpenAddCategory={openAddCategory}
      />

      <EditTaskModal
        isOpen={Boolean(editingTask)}
        onClose={closeEditTask}
        task={editingTask}
        categories={categories}
        onUpdateTask={updateTask}
        onOpenAddCategory={openAddCategory}
      />

      <AddCategoryModal
        isOpen={isAddCategoryOpen}
        onClose={closeAddCategory}
        onAdd={addCategory}
      />

      <EditCategoryModal
        isOpen={Boolean(editingCategory)}
        onClose={closeEditCategory}
        kategori={editingCategory}
        onUpdate={updateCategory}
      />

      {/* Floating In-App PWA Install Prompt (Android & iOS) */}
      <PwaInstallPrompt />
    </div>
  );
}
