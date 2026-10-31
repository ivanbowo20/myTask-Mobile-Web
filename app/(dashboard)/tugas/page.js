'use client';

import { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  ListTodo,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from "lucide-react";
import TaskCard from "@/components/tugas/TaskCard";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";
import Button from "@/components/ui/Button";
import AnimatedList from "@/components/ui/AnimatedList";
import AnimatedContent from "@/components/ui/AnimatedContent";
import CustomSelect from "@/components/ui/CustomSelect";
import { useTasks } from "@/lib/task-context";
import { getKategoriById, cn } from "@/lib/utils";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import DashboardSkeleton from "@/components/ui/DashboardSkeleton";

function AllTasksContent() {
  const searchParams = useSearchParams();
  const cariQuery = searchParams.get("cari") || "";

  const {
    tasks,
    categories,
    toggleComplete,
    toggleImportant,
    openEditTask,
    deleteTask,
    clearCompletedTasks,
    openAddTask,
  } = useTasks();

  const [search, setSearch] = useState(cariQuery);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("pending");
  const [currentPage, setCurrentPage] = useState(1);
  const [direction, setDirection] = useState(0);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [isClearCompletedOpen, setIsClearCompletedOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const ITEMS_PER_PAGE = 6;

  // Viewport mobile check (< 640px)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(max-width: 639px)");
    setIsMobile(mql.matches);
    const handler = (e) => setIsMobile(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  // Sync with URL query parameter
  useEffect(() => {
    if (cariQuery) {
      setSearch(cariQuery);
    }
  }, [cariQuery]);

  // Filter tasks based on search, category, and status
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Search
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchTitle = task.judul.toLowerCase().includes(query);
        const matchDesc = task.deskripsi?.toLowerCase().includes(query);
        if (!matchTitle && !matchDesc) return false;
      }

      // Category
      if (selectedCategory !== "all") {
        if (selectedCategory === "none") {
          if (task.kategoriId) return false;
        } else if (task.kategoriId !== Number(selectedCategory)) {
          return false;
        }
      }

      // Status
      if (selectedStatus === "completed" && !task.selesai) return false;
      if (selectedStatus === "pending" && task.selesai) return false;
      if (selectedStatus === "important" && (!task.prioritas || task.selesai)) return false;

      return true;
    });
  }, [tasks, search, selectedCategory, selectedStatus]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredTasks.length / ITEMS_PER_PAGE) || 1;
  const paginatedTasks = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredTasks.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredTasks, currentPage]);

  // Reset to page 1 if filter changes
  useEffect(() => {
    setDirection(0);
    setCurrentPage(1);
  }, [search, selectedCategory, selectedStatus]);

  const hasActiveFilters = search || selectedCategory !== "all" || selectedStatus !== "pending";

  function handleResetFilters() {
    setSearch("");
    setSelectedCategory("all");
    setSelectedStatus("pending");
    setDirection(0);
    setCurrentPage(1);
  }

  const SNAPPY_EASING = [0.23, 1, 0.32, 1];

  return (
    <div className="space-y-6">
      {/* Header (Hero Glass Banner — SielloMita Anti-Washout Standard) */}
      <AnimatedContent delay={0}>
        <div className="glass-card p-4 sm:p-6 rounded-2xl relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5 z-10">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/[0.08] [html[data-theme='celestial-sky']_&]:bg-sky-100/80 [html[data-theme='celestial-sky']_&]:border-sky-200/60 [html[data-theme='celestial-sky']_&]:text-sky-700 flex items-center justify-center text-[#FAFAFA] shadow-sm shrink-0">
                <ListTodo className="w-4 h-4" />
              </div>
              <h1 className="font-heading text-xl sm:text-2xl font-bold text-[#FAFAFA] [html[data-theme='celestial-sky']_&]:text-[#0F172A] tracking-tight">
                Semua Tugas
              </h1>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.08] [html[data-theme='celestial-sky']_&]:bg-white/80 [html[data-theme='celestial-sky']_&]:border-sky-200/60 [html[data-theme='celestial-sky']_&]:text-slate-800 text-zinc-300 shadow-sm">
                {filteredTasks.length} tugas
              </span>
            </div>
            <p className="text-xs sm:text-sm text-zinc-300 [html[data-theme='celestial-sky']_&]:text-[#334155] [html[data-theme='celestial-sky']_&]:font-medium leading-relaxed">
              Kelola seluruh daftar tugas, filter kategori, dan atur prioritas kerja Anda.
            </p>
          </div>
        </div>
      </AnimatedContent>

      {/* Status Filter Tabs with Arc UI Sliding Pill */}
      <AnimatedContent delay={0.08}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-sm sm:backdrop-blur-[16px] overflow-x-auto scrollbar-none w-full sm:w-fit">
          {[
            { id: "pending", label: "Belum Selesai", count: tasks.filter((t) => !t.selesai).length },
            { id: "important", label: "Penting", count: tasks.filter((t) => t.prioritas && !t.selesai).length },
            { id: "completed", label: "Selesai", count: tasks.filter((t) => t.selesai).length },
            { id: "all", label: "Semua", count: tasks.length },
          ].map((tab) => {
            const isSelected = selectedStatus === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setSelectedStatus(tab.id);
                  setDirection(0);
                  setCurrentPage(1);
                }}
                className={cn(
                  "relative min-h-[44px] px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors duration-200 shrink-0 flex items-center gap-2 select-none",
                  isSelected
                    ? "text-[#FAFAFA] font-semibold"
                    : "text-zinc-300 hover:text-[#FAFAFA]"
                )}
              >
                {isSelected && (
                  <motion.div
                    layoutId="task-status-filter-pill"
                    className="absolute inset-0 bg-white/[0.08] border border-white/[0.14] rounded-lg shadow-sm pointer-events-none"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
                <span
                  className={cn(
                    "relative z-10 text-[10px] px-1.5 py-0.5 rounded-full font-bold transition-colors duration-200",
                    isSelected
                      ? "bg-white/[0.12] text-[#FAFAFA]"
                      : "bg-white/[0.08] text-zinc-300"
                  )}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {selectedStatus === "completed" && tasks.some((t) => t.selesai) && (
          <button
            type="button"
            onClick={() => setIsClearCompletedOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-rose-400 dark:text-rose-400 [html[data-theme='celestial-sky']_&]:text-rose-600 bg-rose-500/10 hover:bg-rose-500/20 [html[data-theme='celestial-sky']_&]:bg-rose-50 [html[data-theme='celestial-sky']_&]:hover:bg-rose-100 border border-rose-500/20 hover:border-rose-500/30 [html[data-theme='celestial-sky']_&]:border-rose-200 transition-all duration-200 cursor-pointer select-none active:scale-[0.97] self-start sm:self-auto"
            aria-label="Hapus semua tugas selesai"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Hapus Semua ({tasks.filter((t) => t.selesai).length})</span>
          </button>
        )}
      </div>
    </AnimatedContent>


      {/* Filter and Search Bar */}
      <AnimatedContent delay={0.16} className="relative z-20">
        <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-sm sm:backdrop-blur-[16px] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.3)] flex flex-col md:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari berdasarkan judul atau catatan tugas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full min-h-[44px] pl-10 pr-4 py-2 rounded-xl bg-white/[0.02] border border-white/[0.08] hover:border-white/[0.16] focus:border-[#FAFAFA] focus:outline-none focus:ring-1 focus:ring-white/20 text-base sm:text-sm text-[#FAFAFA] placeholder:text-zinc-400 transition-all duration-200 backdrop-blur-sm"
            />
          </div>

          {/* Category Filter */}
          <div className="w-full md:w-56 shrink-0">
            <CustomSelect
              isFilter
              id="filter-category"
              value={selectedCategory}
              onChange={(val) => {
                setSelectedCategory(val);
                setDirection(0);
                setCurrentPage(1);
              }}
              categories={categories}
              className="w-full"
            />
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              onClick={handleResetFilters}
              className="w-full md:w-auto text-xs shrink-0"
            >
              <X className="w-4 h-4 mr-1" />
              Reset Filter
            </Button>
          )}
        </div>
      </AnimatedContent>

      {/* Task List or Empty State */}
      <AnimatedContent delay={0.24}>
        {paginatedTasks.length === 0 ? (
          <EmptyState
            icon={ListTodo}
            title="Tidak ada tugas yang sesuai"
            description={
              hasActiveFilters
                ? "Coba sesuaikan kata kunci pencarian atau ubah filter kategori/status."
                : "Belum ada tugas yang tersimpan. Mulai dengan membuat tugas baru!"
            }
            actionLabel={hasActiveFilters ? "Reset Filter" : "Tambah Tugas"}
            onAction={hasActiveFilters ? handleResetFilters : openAddTask}
          />
        ) : (
          <div className="space-y-6">
            <AnimatePresence mode="wait" custom={direction}>
              <div key={`${currentPage}-${selectedStatus}-${selectedCategory}`}>
                {isMobile ? (
                  <div className="grid grid-cols-1 gap-4">
                    {paginatedTasks.map((task) => (
                      <div key={task.id} className="h-full w-full">
                        <TaskCard
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
                ) : (
                  <AnimatedList
                    items={paginatedTasks}
                    gap={16}
                    animation="pop"
                    stagger={0.05}
                    trackClassName="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                    enableArrowNavigation={true}
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
              </div>
            </AnimatePresence>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/[0.08] text-xs text-[#A1A1AA]">
                <span>
                  Menampilkan {(currentPage - 1) * ITEMS_PER_PAGE + 1} -{" "}
                  {Math.min(currentPage * ITEMS_PER_PAGE, filteredTasks.length)} dari{" "}
                  {filteredTasks.length} tugas
                </span>

                <div className="flex items-center gap-1.5">
                  <motion.button
                    type="button"
                    onClick={() => {
                      setDirection(-1);
                      setCurrentPage((p) => Math.max(p - 1, 1));
                    }}
                    disabled={currentPage === 1}
                    whileHover={shouldReduceMotion || currentPage === 1 ? undefined : { scale: 1.02 }}
                    whileTap={shouldReduceMotion || currentPage === 1 ? undefined : { scale: 0.96 }}
                    transition={{ duration: 0.15, ease: SNAPPY_EASING }}
                    aria-label="Halaman sebelumnya"
                    className="inline-flex items-center justify-center font-medium rounded-lg min-h-[46px] px-3.5 py-2 text-xs gap-1.5 bg-[rgba(255,255,255,0.04)] text-[#FAFAFA] border border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.16)] disabled:opacity-50 disabled:pointer-events-none select-none cursor-pointer backdrop-blur-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FAFAFA]"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Sebelumnya
                  </motion.button>

                  <div className="flex items-center gap-1.5 px-2 font-medium text-[#FAFAFA]">
                    <span>Halaman</span>
                    <div className="relative inline-flex items-center justify-center overflow-hidden min-w-[1.25rem] h-5">
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.span
                          key={currentPage}
                          initial={{
                            y: shouldReduceMotion ? 0 : direction * 8,
                            opacity: 0,
                          }}
                          animate={{
                            y: 0,
                            opacity: 1,
                          }}
                          exit={{
                            y: shouldReduceMotion ? 0 : direction * -8,
                            opacity: 0,
                          }}
                          transition={{
                            duration: shouldReduceMotion ? 0.1 : 0.18,
                            ease: SNAPPY_EASING,
                          }}
                          className="font-bold block"
                        >
                          {currentPage}
                        </motion.span>
                      </AnimatePresence>
                    </div>
                    <span>dari</span>
                    <span>{totalPages}</span>
                  </div>

                  <motion.button
                    type="button"
                    onClick={() => {
                      setDirection(1);
                      setCurrentPage((p) => Math.min(p + 1, totalPages));
                    }}
                    disabled={currentPage === totalPages}
                    whileHover={shouldReduceMotion || currentPage === totalPages ? undefined : { scale: 1.02 }}
                    whileTap={shouldReduceMotion || currentPage === totalPages ? undefined : { scale: 0.96 }}
                    transition={{ duration: 0.15, ease: SNAPPY_EASING }}
                    aria-label="Halaman selanjutnya"
                    className="inline-flex items-center justify-center font-medium rounded-lg min-h-[46px] px-3.5 py-2 text-xs gap-1.5 bg-[rgba(255,255,255,0.04)] text-[#FAFAFA] border border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.16)] disabled:opacity-50 disabled:pointer-events-none select-none cursor-pointer backdrop-blur-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FAFAFA]"
                  >
                    Selanjutnya
                    <ChevronRight className="w-4 h-4" />
                  </motion.button>
                </div>
              </div>
            )}
          </div>
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
        message={`Apakah Anda yakin ingin menghapus seluruh (${tasks.filter((t) => t.selesai).length}) tugas yang telah selesai? Tindakan ini akan menghapus data riwayat dari cloud database secara permanen.`}
        confirmLabel="Ya, Hapus Semua"
      />
    </div>
  );
}

export default function AllTasksPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <AllTasksContent />
    </Suspense>
  );
}
