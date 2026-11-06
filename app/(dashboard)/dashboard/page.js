'use client';

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Star,
  ArrowRight,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  CheckSquareOffset,
  CalendarCheck,
  Star as StarPhosphor,
  CheckCircle as CheckCirclePhosphor,
} from "@phosphor-icons/react";
import TaskCard from "@/components/tugas/TaskCard";
import DesktopInteractiveCard from "@/components/ui/DesktopInteractiveCard";
import NumberTicker from "@/components/ui/NumberTicker";
import BlurText from "@/components/ui/BlurText";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";
import { getContextualGreeting } from "@/lib/greeting";
import AnimatedContent from "@/components/ui/AnimatedContent";
import NotificationBanner from "@/components/notifikasi/NotificationBanner";
import { useTasks } from "@/lib/task-context";
import { useSession } from "@/lib/auth-client";
import { toast } from "@/lib/use-toast";
import { useDesktopMotion } from "@/lib/use-desktop-motion";
import {
  formatTanggal,
  formatTanggalSederhana,
  hitungSisaWaktu,
  hitungStatusDeadline,
  getKategoriById,
  cn,
} from "@/lib/utils";

// 4 Stat Cards: Asymmetric Left-to-Right Cascade with Scale-Pop Spring
const statContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.04 },
  },
};

const statItemVariants = {
  hidden: { opacity: 0, y: 18, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 380,
      damping: 24,
      mass: 0.8,
    },
  },
};

export default function DashboardPage() {
  const {
    tasks,
    categories,
    stats,
    user: contextUser,
    toggleComplete,
    toggleImportant,
    openEditTask,
    deleteTask,
    clearCompletedTasks,
    openAddTask,
  } = useTasks();

  const { data: session } = useSession();
  const currentUser = session?.user || contextUser;

  const [taskToDelete, setTaskToDelete] = useState(null);
  const [isClearCompletedOpen, setIsClearCompletedOpen] = useState(false);
  const [seed, setSeed] = useState(0);

  // Variasi sapaan baru yang tenang setiap refresh / sesi dibuka
  useEffect(() => {
    setSeed(Math.floor(Math.random() * 10));
  }, []);

  // Passive dispatch trigger: periksa notifikasi tertunda secara tenang setelah halaman selesai dimuat (idle 4 detik)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const timer = setTimeout(() => {
      fetch("/api/notifications/dispatch", {
        method: "POST",
      }).catch((err) => {
        // Fire-and-forget: abaikan kesalahan jaringan latar belakang
        console.warn("[PASSIVE_DISPATCH] Gagal memicu dispatch pasif:", err);
      });
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  // Notifikasi sambutan login satu kali per sesi browser (stagger lembut 600ms agar halaman siap terlebih dahulu)
  useEffect(() => {
    if (!currentUser?.name || typeof window === "undefined") return;

    const welcomeKey = `welcomed_${currentUser.id || currentUser.email || currentUser.name}`;
    if (!sessionStorage.getItem(welcomeKey)) {
      sessionStorage.setItem(welcomeKey, "true");
      const timer = setTimeout(() => {
        toast.success(`Selamat datang kembali, ${currentUser.name}!`);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [currentUser]);

  // Alert (Toast) otomatis saat membuka dashboard jika ada tugas terlewat belum lama (< 30 menit)
  // Diringkas menjadi 1 digest toast dan diberi jeda (stagger 2400ms) agar tidak bertabrakan dengan sapaan
  useEffect(() => {
    if (typeof window === "undefined" || !stats?.overdueList || stats.overdueList.length === 0) return;

    const now = Date.now();
    const THIRTY_MINUTES_MS = 30 * 60 * 1000;

    // Filter tugas yang terlewat belum lama ini dan belum dialert di sesi ini
    const newlyOverdue = stats.overdueList.filter((task) => {
      if (!task?.deadline) return false;
      const deadlineTime = new Date(task.deadline).getTime();
      const diffMs = now - deadlineTime;
      if (diffMs >= 0 && diffMs <= THIRTY_MINUTES_MS) {
        const sessionKey = `overdue_alert_${task.id}`;
        return !sessionStorage.getItem(sessionKey);
      }
      return false;
    });

    if (newlyOverdue.length === 0) return;

    // Tandai seluruh tugas yang dialert di sessionStorage agar tidak berulang
    newlyOverdue.forEach((task) => {
      sessionStorage.setItem(`overdue_alert_${task.id}`, "true");
    });

    // Munculkan 1 toast ringkasan terorkestrasi setelah jeda 2.4 detik (setelah toast sapaan selesai)
    const timer = setTimeout(() => {
      if (newlyOverdue.length === 1) {
        toast.warning(`Tugas "${newlyOverdue[0].judul}" telah melewati batas waktu!`);
      } else {
        toast.warning(`Ada ${newlyOverdue.length} tugas yang telah melewati batas waktu!`);
      }
    }, 2400);

    return () => clearTimeout(timer);
  }, [stats?.overdueList]);

  const greeting = useMemo(() => {
    return getContextualGreeting({
      user: {
        name: currentUser?.name || "",
        nama: currentUser?.name || "",
      },
      stats,
      referenceDate: new Date(),
      seed,
    });
  }, [currentUser?.name, stats, seed]);

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
      (t) => !t.selesai && hitungStatusDeadline(t) === "hari-ini"
    );
  }, [tasks]);

  // Recent tasks (5 latest created active tasks)
  const recentTasksList = useMemo(() => {
    return tasks
      .filter((t) => !t.selesai)
      .sort((a, b) => new Date(b.dibuatPada) - new Date(a.dibuatPada))
      .slice(0, 5);
  }, [tasks]);

  const [mobileFilter, setMobileFilter] = useState("semua");

  // Mobile Unified Focus Agenda: Filtered and sorted by urgency
  const mobileAgendaTasks = useMemo(() => {
    let list = [...tasks];

    if (mobileFilter === "hari-ini") {
      list = list.filter(
        (t) => !t.selesai && hitungStatusDeadline(t) === "hari-ini"
      );
    } else if (mobileFilter === "penting") {
      list = list.filter((t) => (t.prioritas || t.penting) && !t.selesai);
    } else if (mobileFilter === "selesai") {
      list = list.filter((t) => t.selesai);
    } else {
      list = list.filter((t) => !t.selesai);
    }

    return list.sort((a, b) => {
      const statusA = hitungStatusDeadline(a);
      const statusB = hitungStatusDeadline(b);

      const rankA =
        statusA === "terlewat" ? 1 : statusA === "hari-ini" ? 2 : a.deadline ? 3 : 4;
      const rankB =
        statusB === "terlewat" ? 1 : statusB === "hari-ini" ? 2 : b.deadline ? 3 : 4;

      if (rankA !== rankB) {
        return rankA - rankB;
      }

      if (a.deadline && b.deadline) {
        return new Date(a.deadline) - new Date(b.deadline);
      }

      return new Date(b.dibuatPada) - new Date(a.dibuatPada);
    });
  }, [tasks, mobileFilter]);

  const mobileProgressPercent =
    stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  const pendingActiveCount = useMemo(() => {
    return tasks.filter((t) => !t.selesai).length;
  }, [tasks]);

  const mobileFilterChips = [
    { id: "semua", label: "Semua", count: pendingActiveCount },
    { id: "hari-ini", label: "Hari Ini", count: stats.today },
    { id: "penting", label: "Penting", count: stats.important },
    { id: "selesai", label: "Selesai", count: stats.completed },
  ];

  return (
    <div className="space-y-8">
      {/* Header Greeting Dinamis — SielloMita Frosted Hero Surface */}
      <AnimatedContent delay={0} blur={0}>
        <div className="glass-card p-5 sm:p-6 rounded-2xl relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Soft Ambient Light Shimmer Overlay (Contextual Time Glow) */}
          <div className="pointer-events-none absolute -inset-x-20 -inset-y-10 bg-gradient-to-r from-[var(--theme-accent,rgba(217,119,6,0.06))] via-transparent to-[var(--theme-accent,rgba(217,119,6,0.04))] opacity-70 blur-xl animate-pulse [animation-duration:8s]" />

          <div className="space-y-1.5 z-10">
            <motion.h1
              suppressHydrationWarning={true}
              key={greeting.headline}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold text-[var(--text-primary)] tracking-tight text-balance"
            >
              <BlurText text={greeting.headline} delay={0.06} />
            </motion.h1>
            <motion.p
              suppressHydrationWarning={true}
              key={greeting.subtext}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
              className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed"
            >
              {greeting.subtext}
            </motion.p>
          </div>
          <div
            suppressHydrationWarning={true}
            className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)] bg-[var(--glass-bg)] border border-[var(--glass-border)] px-3.5 py-2 rounded-xl shrink-0 self-start sm:self-auto z-10 backdrop-blur-md transition-all duration-200 hover:scale-[1.02] hover:border-[var(--glass-border-hover)]"
          >
            <Calendar className="w-4 h-4 text-[var(--theme-accent,#D97706)]" />
            <span suppressHydrationWarning={true}>
              {formatTanggalSederhana(new Date().toISOString())}
            </span>
          </div>
        </div>
      </AnimatedContent>

      {/* Smart Notification Permission & Test Banner */}
      <NotificationBanner dismissible={true} />

      {/* Mobile-First Progress & Unified Focus Agenda (< 1024px) */}
      <div className="lg:hidden space-y-4">
        {/* Sleek 1-Row Progress Card */}
        <div className="glass-card p-4 rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-[var(--theme-accent,#D97706)]/15 border border-[var(--theme-accent,#D97706)]/30 text-[var(--theme-accent,#D97706)] flex items-center justify-center">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-semibold text-[var(--text-primary)]">
                Progress Tugas
              </span>
            </div>
            <span className="text-xs font-bold text-[var(--text-secondary)]">
              <span className="text-[var(--theme-accent,#D97706)]">{stats.completed}</span> dari {stats.total} tugas ({mobileProgressPercent}%)
            </span>
          </div>

          {/* Progress Bar Track */}
          <div className="w-full h-2 rounded-full bg-[var(--glass-border)] overflow-hidden p-0.5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${mobileProgressPercent}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="h-full rounded-full bg-gradient-to-r from-[var(--theme-accent,#D97706)] to-[#8FB88F]"
            />
          </div>
        </div>

        {/* Horizontal Quick-Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {mobileFilterChips.map((chip) => {
            const isActive = mobileFilter === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => setMobileFilter(chip.id)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 border cursor-pointer active:scale-[0.96] select-none ${
                  isActive
                    ? "bg-[var(--theme-accent,#D97706)] text-black border-[var(--theme-accent,#D97706)] shadow-sm font-bold"
                    : "bg-[var(--glass-bg)] text-[var(--text-secondary)] border-[var(--glass-border)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]"
                }`}
              >
                <span>{chip.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    isActive
                      ? "bg-black/20 text-black"
                      : "bg-[var(--glass-border)] text-[var(--text-muted)]"
                  }`}
                >
                  {chip.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Unified Focus Agenda List */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[var(--theme-accent,#D97706)]" />
              <h2 className="font-heading text-sm font-bold text-[var(--text-primary)]">
                Agenda Fokus
              </h2>
              <span className="text-[11px] font-medium text-[var(--text-muted)]">
                ({mobileAgendaTasks.length})
              </span>
            </div>
            {mobileFilter === "selesai" && mobileAgendaTasks.length > 0 ? (
              <button
                type="button"
                onClick={() => setIsClearCompletedOpen(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-500 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/30 transition-all duration-200 cursor-pointer select-none active:scale-[0.97]"
                aria-label="Hapus semua tugas selesai"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Semua ({mobileAgendaTasks.length})</span>
              </button>
            ) : (
              <Link
                href="/tugas"
                prefetch={true}
                className="text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] inline-flex items-center gap-1 transition-colors"
              >
                Semua
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>

          {mobileAgendaTasks.length === 0 ? (
            <EmptyState
              icon={mobileFilter === "selesai" ? CheckCircle2 : CheckSquareOffset}
              title={
                mobileFilter === "selesai"
                  ? "Belum ada tugas selesai"
                  : mobileFilter === "hari-ini"
                  ? "Semua tugas hari ini selesai!"
                  : mobileFilter === "penting"
                  ? "Tidak ada tugas penting"
                  : "Belum ada tugas"
              }
              description={
                mobileFilter === "selesai"
                  ? "Tugas yang Anda selesaikan akan muncul di sini."
                  : mobileFilter === "hari-ini"
                  ? "Tidak ada tugas tertunda yang jatuh tempo hari ini."
                  : mobileFilter === "penting"
                  ? "Tandai tugas dengan bintang untuk melihatnya di sini."
                  : "Mulai hari produktif Anda dengan membuat tugas pertama."
              }
              actionLabel={mobileFilter === "semua" ? "Tambah Tugas" : undefined}
              onAction={mobileFilter === "semua" ? openAddTask : undefined}
            />
          ) : (
            <div className="space-y-2.5">
              {mobileAgendaTasks.map((task) => (
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
      </div>

      {/* 4 Stat Cards with 3D Tilt, Rim Glow, Slot Odometer & Micro-Icon Pop (Desktop Only) */}
      <motion.div
        variants={statContainerVariants}
        initial="hidden"
        animate="visible"
        className="hidden lg:grid lg:grid-cols-4 gap-4"
      >
        {/* Total Tugas */}
        <motion.div variants={statItemVariants} className="h-full">
          <DesktopInteractiveCard className="h-full p-3.5 sm:p-5 min-h-[44px]">
            <div className="flex items-center justify-between mb-2">
              <span className="font-heading text-xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight transition-transform duration-300 group-hover:translate-x-0.5">
                <NumberTicker value={stats.total} />
              </span>
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] flex items-center justify-center transition-all duration-300 group-hover:scale-115 group-hover:rotate-6 group-hover:shadow-sm">
                <CheckSquareOffset weight="fill" className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-[11px] sm:text-sm text-[var(--text-secondary)] font-medium">Total Tugas</p>
          </DesktopInteractiveCard>
        </motion.div>

        {/* Hari Ini */}
        <motion.div variants={statItemVariants} className="h-full">
          <DesktopInteractiveCard className="h-full p-3.5 sm:p-5 min-h-[44px]">
            <div className="flex items-center justify-between mb-2">
              <span className="font-heading text-xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight transition-transform duration-300 group-hover:translate-x-0.5">
                <NumberTicker value={stats.today} />
              </span>
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-[var(--theme-accent,#D97706)]/15 border border-[var(--theme-accent,#D97706)]/25 text-[var(--theme-accent,#D97706)] flex items-center justify-center transition-all duration-300 group-hover:scale-115 group-hover:rotate-6 group-hover:shadow-sm">
                <CalendarCheck weight="fill" className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-[11px] sm:text-sm text-[var(--text-secondary)] font-medium">Hari Ini</p>
          </DesktopInteractiveCard>
        </motion.div>

        {/* Penting */}
        <motion.div variants={statItemVariants} className="h-full">
          <DesktopInteractiveCard className="h-full p-3.5 sm:p-5 min-h-[44px]">
            <div className="flex items-center justify-between mb-2">
              <span className="font-heading text-xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight transition-transform duration-300 group-hover:translate-x-0.5">
                <NumberTicker value={stats.important} />
              </span>
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-[#F59E0B]/15 border border-[#F59E0B]/25 text-[#F59E0B] flex items-center justify-center transition-all duration-300 group-hover:scale-115 group-hover:rotate-6 group-hover:shadow-sm">
                <StarPhosphor weight="fill" className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-[11px] sm:text-sm text-[var(--text-secondary)] font-medium">Penting</p>
          </DesktopInteractiveCard>
        </motion.div>

        {/* Selesai */}
        <motion.div variants={statItemVariants} className="h-full">
          <DesktopInteractiveCard className="h-full p-3.5 sm:p-5 min-h-[44px]">
            <div className="flex items-center justify-between mb-2">
              <span className="font-heading text-xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight transition-transform duration-300 group-hover:translate-x-0.5">
                <NumberTicker value={stats.completed} />
              </span>
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-[#8FB88F]/15 border border-[#8FB88F]/25 text-[#8FB88F] flex items-center justify-center transition-all duration-300 group-hover:scale-115 group-hover:rotate-6 group-hover:shadow-sm">
                <CheckCirclePhosphor weight="fill" className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-[11px] sm:text-sm text-[var(--text-secondary)] font-medium">Selesai</p>
          </DesktopInteractiveCard>
        </motion.div>
      </motion.div>

      {/* Section: Tenggat Waktu Terdekat (Upcoming Deadlines Carousel / Grid - Desktop Only) */}
      <div className="hidden lg:block">
        <AnimatedContent delay={0.16} direction="up" distance={14}>
        <div className="glass-panel p-5 sm:p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[var(--theme-accent,#D97706)]" />
              <h2 className="font-heading text-base font-bold text-[var(--text-primary)]">
                Tenggat Waktu Terdekat
              </h2>
            </div>
            <span className="text-xs text-[var(--text-muted)]">
              Maksimal 5 tugas terdekat
            </span>
          </div>

          {upcomingDeadlines.length === 0 ? (
            <div className="py-8 text-center text-xs text-[var(--text-muted)]">
              Tidak ada deadline terdekat saat ini. ✨
            </div>
          ) : (
            <div className="flex overflow-x-auto snap-x snap-mandatory gap-3 -mx-4 px-4 pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 sm:gap-3 sm:overflow-visible sm:mx-0 sm:px-0 sm:pb-0">
              {upcomingDeadlines.map((task) => {
                const kat = getKategoriById(categories, task.kategoriId);
                const status = hitungStatusDeadline(task);
                const isOverdue = status === "terlewat";
                const isToday = status === "hari-ini";

                return (
                  <div
                    key={task.id}
                    className={`w-[85%] min-w-[85%] flex-shrink-0 snap-center sm:w-auto sm:min-w-0 sm:flex-shrink p-3.5 rounded-xl border flex flex-col justify-between gap-3 transition-all duration-200 sm:hover:-translate-y-0.5 glass-card ${
                      isOverdue
                        ? "border-l-4 border-l-[#E88B8B] bg-[#E88B8B]/10 hover:border-[var(--glass-border-hover)]"
                        : isToday
                        ? "border-l-4 border-l-[var(--theme-accent,#D97706)] bg-[var(--theme-accent,#D97706)]/10 hover:border-[var(--glass-border-hover)]"
                        : "hover:border-[var(--glass-border-hover)]"
                    }`}
                  >
                    <div className="space-y-1.5 min-w-0">
                      <p className="text-xs font-semibold text-[var(--text-primary)] truncate" title={task.judul}>
                        {task.judul}
                      </p>
                      <div className="flex items-center gap-1.5">
                        {kat && (
                          <span
                            className="text-[10px] px-2 py-0.5 rounded-full font-medium border border-[var(--glass-border)]"
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
                              : "text-[var(--text-secondary)]"
                          }`}
                        >
                          {hitungSisaWaktu(task.deadline)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[var(--glass-border)]">
                      <span className="text-[10px] text-[var(--text-muted)]">
                        {formatTanggal(task.deadline).split(",")[1] || ""}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleComplete(task.id)}
                        className="min-h-[44px] min-w-[44px] -mr-2 -my-2 inline-flex items-center justify-center text-xs font-semibold text-[#8FB88F] hover:text-[var(--text-primary)] transition-colors"
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
      </div>

      {/* Two Column Section: Tugas Hari Ini & Tugas Terbaru (Wave Lateral Slide) */}
      <div className="hidden lg:grid lg:grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Kolom Kiri: Tugas Hari Ini (Wave Slide from Left) */}
        <AnimatedContent delay={0.22} direction="horizontal" reverse={true} distance={14} className="h-full">
          <div className="glass-panel h-full p-5 sm:p-6 rounded-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--glass-border)]">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[var(--theme-accent,#D97706)]" />
                <h2 className="font-heading text-base font-bold text-[var(--text-primary)]">Tugas Hari Ini</h2>
                {todayTasksList.length > 0 && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[var(--theme-accent,#D97706)]/15 text-[var(--theme-accent,#D97706)] border border-[var(--theme-accent,#D97706)]/30">
                    {todayTasksList.length}
                  </span>
                )}
              </div>
              <Link
                href="/tugas/hari-ini"
                prefetch={true}
                className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] inline-flex items-center gap-1 transition-colors"
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

        {/* Kolom Kanan: Tugas Terbaru (Wave Slide from Right) */}
        <AnimatedContent delay={0.28} direction="horizontal" distance={14} className="h-full">
          <div className="glass-panel h-full p-5 sm:p-6 rounded-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--glass-border)]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[var(--theme-accent,#D97706)]" />
                <h2 className="font-heading text-base font-bold text-[var(--text-primary)]">Tugas Terbaru</h2>
              </div>
              <Link
                href="/tugas"
                prefetch={true}
                className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] inline-flex items-center gap-1 transition-colors"
              >
                Lihat Semua
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {recentTasksList.length === 0 ? (
              <EmptyState
                icon={CheckSquareOffset}
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

      {/* Bulk Delete Completed Tasks Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isClearCompletedOpen}
        onClose={() => setIsClearCompletedOpen(false)}
        onConfirm={async () => {
          setIsClearCompletedOpen(false);
          await clearCompletedTasks();
        }}
        title="Hapus Semua Tugas Selesai"
        message={`Apakah Anda yakin ingin menghapus seluruh (${mobileAgendaTasks.length}) tugas yang telah selesai? Data riwayat ini akan dihapus permanen dari cloud database dan tidak dapat dikembalikan.`}
        confirmLabel="Ya, Hapus Semua"
      />
    </div>
  );
}
