'use client';

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  ListTodo,
  Star,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import TaskCard from "@/components/tugas/TaskCard";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";
import { getContextualGreeting } from "@/lib/greeting";
import AnimatedContent from "@/components/ui/AnimatedContent";
import { useTasks } from "@/lib/task-context";
import { DUMMY_USER } from "@/lib/mock-data";
import {
  formatTanggal,
  formatTanggalSederhana,
  hitungSisaWaktu,
  hitungStatusDeadline,
  getKategoriById,
  WAKTU_ACUAN,
} from "@/lib/utils";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.04 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.23, 1, 0.32, 1] },
  },
};

function AnimatedCounter({ value }) {
  const shouldReduceMotion = useReducedMotion();
  const [count, setCount] = useState(0);
  const prevRef = useRef(0);

  useEffect(() => {
    const target = Number(value) || 0;
    const startVal = prevRef.current;
    prevRef.current = target;

    if (shouldReduceMotion || target === startVal) {
      setCount(target);
      return;
    }
    let frameId;
    let startTime = null;
    const duration = 650;

    function step(currentTime) {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setCount(Math.round(startVal + (target - startVal) * ease));

      if (progress < 1) {
        frameId = requestAnimationFrame(step);
      }
    }

    frameId = requestAnimationFrame(step);
    return () => {
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [value, shouldReduceMotion]);

  return <span>{count}</span>;
}

export default function DashboardPage() {
  const {
    tasks,
    categories,
    stats,
    toggleComplete,
    toggleImportant,
    openEditTask,
    deleteTask,
    openAddTask,
  } = useTasks();

  const [taskToDelete, setTaskToDelete] = useState(null);
  const [seed, setSeed] = useState(0);

  // Variasi sapaan baru yang tenang setiap refresh / sesi dibuka
  useEffect(() => {
    setSeed(Math.floor(Math.random() * 10));
  }, []);

  const greeting = useMemo(() => {
    return getContextualGreeting({
      user: DUMMY_USER,
      stats,
      referenceDate: new Date(),
      seed,
    });
  }, [stats, seed]);

  // 5 upcoming closest deadlines (pending with due date)
  const upcomingDeadlines = useMemo(() => {
    return tasks
      .filter((t) => !t.selesai && t.deadline)
      .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
      .slice(0, 5);
  }, [tasks]);

  // Today's tasks (active pending tasks only)
  const todayTasksList = useMemo(() => {
    return tasks.filter(
      (t) => !t.selesai && hitungStatusDeadline(t, WAKTU_ACUAN) === "hari-ini"
    );
  }, [tasks]);

  // Recent tasks (5 latest created active tasks)
  const recentTasksList = useMemo(() => {
    return tasks
      .filter((t) => !t.selesai)
      .sort((a, b) => new Date(b.dibuatPada) - new Date(a.dibuatPada))
      .slice(0, 5);
  }, [tasks]);

  return (
    <div className="space-y-8">
      {/* Header Greeting Dinamis Anti-Slop */}
      <AnimatedContent delay={0}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.08] pb-5">
          <div className="space-y-1">
            <motion.h1
              key={greeting.headline}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="font-heading text-2xl sm:text-3xl font-bold text-[#FAFAFA] tracking-tight"
            >
              {greeting.headline}
            </motion.h1>
            <motion.p
              key={greeting.subtext}
              initial={{ opacity: 0, y: 2 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.04, ease: "easeOut" }}
              className="text-xs sm:text-sm text-zinc-300"
            >
              {greeting.subtext}
            </motion.p>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-zinc-300 bg-white/[0.04] border border-white/[0.08] backdrop-blur-md px-3.5 py-2 rounded-xl self-start sm:self-auto">
            <Calendar className="w-4 h-4 text-[var(--theme-accent,#D97706)]" />
            <span>{formatTanggalSederhana(new Date().toISOString())}</span>
          </div>
        </div>
      </AnimatedContent>

      {/* 4 Stat Cards */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4"
      >
        {/* Total Tugas */}
        <motion.div variants={itemVariants} className="h-full">
          <motion.div
            whileHover={{ y: -3, scale: 1.01, transition: { type: "spring", stiffness: 400, damping: 25 } }}
            className="glass-card h-full p-3.5 sm:p-5 rounded-xl sm:rounded-2xl min-h-[44px]"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-heading text-xl sm:text-3xl font-bold text-[#FAFAFA] tracking-tight">
                <AnimatedCounter value={stats.total} />
              </span>
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-white/[0.06] border border-white/[0.08] text-[#FAFAFA] flex items-center justify-center">
                <ListTodo className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-[11px] sm:text-sm text-zinc-300 font-medium">Total Tugas</p>
          </motion.div>
        </motion.div>

        {/* Hari Ini */}
        <motion.div variants={itemVariants} className="h-full">
          <motion.div
            whileHover={{ y: -3, scale: 1.01, transition: { type: "spring", stiffness: 400, damping: 25 } }}
            className="glass-card h-full p-3.5 sm:p-5 rounded-xl sm:rounded-2xl min-h-[44px]"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-heading text-xl sm:text-3xl font-bold text-[#FAFAFA] tracking-tight">
                <AnimatedCounter value={stats.today} />
              </span>
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-[var(--theme-accent,#D97706)]/15 border border-[var(--theme-accent,#D97706)]/25 text-[var(--theme-accent,#D97706)] flex items-center justify-center">
                <Calendar className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-[11px] sm:text-sm text-zinc-300 font-medium">Hari Ini</p>
          </motion.div>
        </motion.div>

        {/* Penting */}
        <motion.div variants={itemVariants} className="h-full">
          <motion.div
            whileHover={{ y: -3, scale: 1.01, transition: { type: "spring", stiffness: 400, damping: 25 } }}
            className="glass-card h-full p-3.5 sm:p-5 rounded-xl sm:rounded-2xl min-h-[44px]"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-heading text-xl sm:text-3xl font-bold text-[#FAFAFA] tracking-tight">
                <AnimatedCounter value={stats.important} />
              </span>
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-[#F59E0B]/15 border border-[#F59E0B]/25 text-[#F59E0B] flex items-center justify-center">
                <Star className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-[11px] sm:text-sm text-zinc-300 font-medium">Penting</p>
          </motion.div>
        </motion.div>

        {/* Selesai */}
        <motion.div variants={itemVariants} className="h-full">
          <motion.div
            whileHover={{ y: -3, scale: 1.01, transition: { type: "spring", stiffness: 400, damping: 25 } }}
            className="glass-card h-full p-3.5 sm:p-5 rounded-xl sm:rounded-2xl min-h-[44px]"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-heading text-xl sm:text-3xl font-bold text-[#FAFAFA] tracking-tight">
                <AnimatedCounter value={stats.completed} />
              </span>
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-[#8FB88F]/15 border border-[#8FB88F]/25 text-[#8FB88F] flex items-center justify-center">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-[11px] sm:text-sm text-zinc-300 font-medium">Selesai</p>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Section: Tenggat Waktu Terdekat (Upcoming Deadlines Carousel / Grid) */}
      <AnimatedContent delay={0.22}>
        <div className="glass-panel p-5 sm:p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[var(--theme-accent,#D97706)]" />
              <h2 className="font-heading text-base font-bold text-[#FAFAFA]">
                Tenggat Waktu Terdekat
              </h2>
            </div>
            <span className="text-xs text-zinc-400">
              Maksimal 5 tugas terdekat
            </span>
          </div>

          {upcomingDeadlines.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-400">
              Tidak ada deadline terdekat saat ini. ✨
            </div>
          ) : (
            <div className="flex overflow-x-auto snap-x snap-mandatory gap-3 -mx-4 px-4 pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 sm:gap-3 sm:overflow-visible sm:mx-0 sm:px-0 sm:pb-0">
              {upcomingDeadlines.map((task) => {
                const kat = getKategoriById(categories, task.kategoriId);
                const status = hitungStatusDeadline(task, WAKTU_ACUAN);
                const isOverdue = status === "terlewat";
                const isToday = status === "hari-ini";

                return (
                  <div
                    key={task.id}
                    className={`w-[85%] min-w-[85%] flex-shrink-0 snap-center sm:w-auto sm:min-w-0 sm:flex-shrink p-3.5 rounded-xl border flex flex-col justify-between gap-3 transition-all duration-200 hover:-translate-y-0.5 backdrop-blur-md glass-card ${
                      isOverdue
                        ? "border-l-4 border-l-[#E88B8B] bg-[#E88B8B]/10 hover:border-white/[0.2]"
                        : isToday
                        ? "border-l-4 border-l-[var(--theme-accent,#D97706)] bg-[var(--theme-accent,#D97706)]/10 hover:border-white/[0.2]"
                        : "hover:border-white/[0.2]"
                    }`}
                  >
                    <div className="space-y-1.5 min-w-0">
                      <p className="text-xs font-semibold text-[#FAFAFA] truncate" title={task.judul}>
                        {task.judul}
                      </p>
                      <div className="flex items-center gap-1.5">
                        {kat && (
                          <span
                            className="text-[10px] px-2 py-0.5 rounded-full font-medium border border-white/[0.06]"
                            style={{
                              backgroundColor: `${kat.warna}20`,
                              color: kat.warna,
                            }}
                          >
                            {kat.nama}
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            isOverdue
                              ? "text-[#E88B8B]"
                              : isToday
                              ? "text-[var(--theme-accent,#D97706)]"
                              : "text-zinc-300"
                          }`}
                        >
                          {hitungSisaWaktu(task.deadline, WAKTU_ACUAN)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
                      <span className="text-[10px] text-zinc-400">
                        {formatTanggal(task.deadline).split(",")[1] || ""}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleComplete(task.id)}
                        className="min-h-[44px] min-w-[44px] -mr-2 -my-2 inline-flex items-center justify-center text-xs font-semibold text-[#8FB88F] hover:text-[#FAFAFA] transition-colors"
                        title="Tandai Selesai"
                      >
                        <Check className="w-3.5 h-3.5 mr-1" />
                        Selesai
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </AnimatedContent>

      {/* Two Column Section: Tugas Hari Ini & Tugas Terbaru */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Kolom Kiri: Tugas Hari Ini */}
        <AnimatedContent delay={0.28} className="h-full">
          <div className="glass-panel h-full p-5 sm:p-6 rounded-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[var(--theme-accent,#D97706)]" />
                <h2 className="font-heading text-base font-bold text-[#FAFAFA]">Tugas Hari Ini</h2>
                {todayTasksList.length > 0 && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[var(--theme-accent,#D97706)]/15 text-[var(--theme-accent,#D97706)] border border-[var(--theme-accent,#D97706)]/30">
                    {todayTasksList.length}
                  </span>
                )}
              </div>
              <Link
                href="/tugas/hari-ini"
                className="text-xs font-semibold text-zinc-300 hover:text-[#FAFAFA] inline-flex items-center gap-1 transition-colors"
              >
                Lihat Semua
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {todayTasksList.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title="Semua tugas hari ini selesai!"
                description="Tidak ada tugas tertunda yang jatuh tempo hari ini. Istirahat sejenak! 🎉"
              />
            ) : (
              <div className="space-y-3">
                {todayTasksList.map((task) => (
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
          </div>
        </AnimatedContent>

        {/* Kolom Kanan: Tugas Terbaru */}
        <AnimatedContent delay={0.34} className="h-full">
          <div className="glass-panel h-full p-5 sm:p-6 rounded-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#FAFAFA]" />
                <h2 className="font-heading text-base font-bold text-[#FAFAFA]">Tugas Terbaru</h2>
              </div>
              <Link
                href="/tugas"
                className="text-xs font-semibold text-zinc-300 hover:text-[#FAFAFA] inline-flex items-center gap-1 transition-colors"
              >
                Lihat Semua
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {recentTasksList.length === 0 ? (
              <EmptyState
                icon={ListTodo}
                title="Belum ada tugas"
                description="Mulai hari produktif Anda dengan membuat tugas pertama."
                actionLabel="Tambah Tugas"
                onAction={openAddTask}
              />
            ) : (
              <div className="space-y-3">
                {recentTasksList.map((task) => (
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
          </div>
        </AnimatedContent>
      </div>

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
