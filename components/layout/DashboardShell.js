'use client';

import dynamic from "next/dynamic";
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
import { useNotebooks } from "@/lib/notebook-context";

// Lazy-load modal notebook & rich-text editor secara on-demand (hemat bundle awal di HP low-end)
const AddNotebookModal = dynamic(
  () => import("@/components/notebook/AddNotebookModal"),
  { ssr: false }
);
const EditNotebookModal = dynamic(
  () => import("@/components/notebook/EditNotebookModal"),
  { ssr: false }
);
const NotebookWhatsNewModal = dynamic(
  () => import("@/components/notebook/NotebookWhatsNewModal"),
  { ssr: false }
);

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

  let notebookContext = null;
  try {
    notebookContext = useNotebooks();
  } catch (e) {
    // Graceful fallback if rendered outside NotebookProvider
  }

  const isAddNotebookOpen = notebookContext?.isAddOpen;
  const closeAddNotebook = notebookContext?.closeAddNotebook;
  const editingNotebook = notebookContext?.editingNotebook;
  const closeEditNotebook = notebookContext?.closeEditNotebook;
  const notebookTotal = notebookContext?.stats?.total || 0;

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
            notebook: notebookTotal,
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

      {/* Global Task & Category Modals */}
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

      {/* Global Notebook Modals (Mounted only on-demand) */}
      {Boolean(isAddNotebookOpen) && (
        <AddNotebookModal
          isOpen={Boolean(isAddNotebookOpen)}
          onClose={closeAddNotebook || (() => {})}
        />
      )}

      {Boolean(editingNotebook) && (
        <EditNotebookModal
          isOpen={Boolean(editingNotebook)}
          onClose={closeEditNotebook || (() => {})}
          notebook={editingNotebook}
        />
      )}

      {/* One-Time Feature Announcement Modal (v1.3.0 Notebook) */}
      <NotebookWhatsNewModal />

      {/* Floating In-App PWA Install Prompt (Android & iOS) */}
      <PwaInstallPrompt />
    </div>
  );
}
