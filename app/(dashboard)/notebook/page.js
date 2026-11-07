'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Plus,
  Search,
  Calendar,
  ArrowUpDown,
  X,
  FileText,
  Star,
  Sparkles,
} from 'lucide-react';
import { BookBookmark } from '@phosphor-icons/react';
import Button from '@/components/ui/Button';
import SpecularButton from '@/components/ui/SpecularButton';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import NotebookCard from '@/components/notebook/NotebookCard';
import NotebookSortDropdown from '@/components/notebook/NotebookSortDropdown';
import MotionContainer from '@/components/ui/MotionContainer';
import { useNotebooks } from '@/lib/notebook-context';
import { useDesktopMotion } from '@/lib/use-desktop-motion';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const DATE_FILTER_OPTIONS = [
  { label: 'Semua', value: 'all' },
  { label: 'Hari Ini', value: 'today' },
  { label: 'Minggu Ini', value: 'week' },
  { label: 'Bulan Ini', value: 'month' },
];

const cascadeContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.02,
    },
  },
};

const cascadeItemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.38,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

export default function NotebookPage() {
  const {
    notebooks,
    filteredNotebooks,
    pinnedNotebooks,
    otherNotebooks,
    stats,
    isLoading,
    openAddNotebook,
    deletingNotebook,
    closeDeleteConfirm,
    confirmDelete,
    searchQuery,
    setSearchQuery,
    dateFilter,
    setDateFilter,
    sortBy,
    setSortBy,
  } = useNotebooks();

  const searchInputRef = useRef(null);
  const isDesktop = useDesktopMotion();
  const [localSearch, setLocalSearch] = useState(searchQuery);

  // Sinkronkan input lokal saat searchQuery di context berubah (misal tombol reset filter ditekan)
  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  // Debounce filter teks sebesar 200ms agar keyboard HP (Infinix Smart 6) 100% responsif tanpa jank
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== searchQuery) {
        setSearchQuery(localSearch);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [localSearch, searchQuery, setSearchQuery]);

  // Keyboard shortcut Ctrl+K / Cmd+K to focus search input
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const hasActiveFilters = Boolean(searchQuery.trim()) || dateFilter !== 'all';

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Section (Hero Glass Banner — SielloMita Anti-Washout Standard) */}
      <MotionContainer delay={0} className="rounded-2xl">
        <div className="glass-card p-4 sm:p-6 rounded-2xl relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5 z-10">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="p-2 rounded-xl bg-[var(--theme-accent,#0284C7)]/15 border border-[var(--theme-accent,#0284C7)]/30 text-[var(--theme-accent,#0284C7)] shadow-sm shrink-0">
                <BookBookmark weight="fill" className="w-5 h-5" />
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-zinc-100 [html[data-theme='celestial-sky']_&]:text-[#0F172A]">
                Catatan Materi
              </h1>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white/[0.08] text-zinc-300 border border-white/[0.06] [html[data-theme='celestial-sky']_&]:bg-white/80 [html[data-theme='celestial-sky']_&]:text-slate-800 [html[data-theme='celestial-sky']_&]:border-sky-200/60 shadow-sm">
                {stats.total} Catatan
              </span>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400 [html[data-theme='celestial-sky']_&]:text-[#334155] [html[data-theme='celestial-sky']_&]:font-medium max-w-2xl leading-relaxed">
              Pusat catatan kuliah, ringkasan materi, dan referensi belajar terstruktur dengan Markdown.
            </p>
          </div>

          {/* Primary CTA */}
          <div className="shrink-0 z-10">
            <SpecularButton
              onClick={openAddNotebook}
              className="w-full sm:w-auto cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Catatan Baru</span>
            </SpecularButton>
          </div>
        </div>
      </MotionContainer>

      {/* Filter & Search Bar */}
      <MotionContainer delay={1} className="rounded-2xl">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search input with Ctrl+K shortcut */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-zinc-400 [html[data-theme='celestial-sky']_&]:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Cari materi atau topik... (Ctrl+K)"
              className={cn(
                'w-full pl-10 pr-16 py-2.5 rounded-xl text-xs sm:text-sm font-medium glass-card',
                'bg-white/[0.04] border border-white/[0.08] text-zinc-100 placeholder:text-zinc-500',
                '[html[data-theme="celestial-sky"]_&]:bg-white/80 [html[data-theme="celestial-sky"]_&]:text-slate-900 [html[data-theme="celestial-sky"]_&]:placeholder:text-slate-500 [html[data-theme="celestial-sky"]_&]:border-sky-200/70',
                'focus:outline-none focus:border-[var(--theme-accent,#0284C7)] focus:ring-1 focus:ring-[var(--theme-accent,#0284C7)]/50',
                'transition-all duration-150 shadow-sm'
              )}
            />
            {localSearch ? (
              <button
                type="button"
                onClick={() => {
                  setLocalSearch('');
                  setSearchQuery('');
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] text-[10px] font-mono text-zinc-400 [html[data-theme='celestial-sky']_&]:bg-slate-100 [html[data-theme='celestial-sky']_&]:text-slate-600 [html[data-theme='celestial-sky']_&]:border-slate-300 pointer-events-none">
                Ctrl+K
              </kbd>
            )}
          </div>

          {/* Date Filter Pills & Sort Selector */}
          <div className="flex items-center flex-wrap gap-2">
            {/* Date Filter Pills with Apple Sliding Pill */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.08] glass-card [html[data-theme='celestial-sky']_&]:bg-white/80 [html[data-theme='celestial-sky']_&]:border-sky-200/60 shadow-sm">
              {DATE_FILTER_OPTIONS.map((opt) => {
                const isSelected = dateFilter === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setDateFilter(opt.value)}
                    className={cn(
                      'relative px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer active:scale-[0.97] select-none',
                      isSelected
                        ? 'text-white [html[data-theme="abyssal-teal"]_&]:text-slate-950 [html[data-theme="soft-aurora"]_&]:text-slate-950 [html[data-theme="dark-chocolate"]_&]:text-slate-950 font-semibold shadow-sm'
                        : 'text-zinc-400 [html[data-theme="celestial-sky"]_&]:text-slate-600 hover:text-zinc-200 [html[data-theme="celestial-sky"]_&]:hover:text-slate-900'
                    )}
                  >
                    {isSelected && (
                      <motion.div
                        layoutId="notebook-date-filter-pill"
                        className="absolute inset-0 bg-[var(--theme-accent,#0284C7)] rounded-lg pointer-events-none z-0"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10">{opt.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Custom Apple Glass Sort Dropdown */}
            <NotebookSortDropdown value={sortBy} onChange={setSortBy} />
          </div>
        </div>
      </MotionContainer>

      {/* Main Content Area */}
      {filteredNotebooks.length === 0 ? (
        <MotionContainer delay={1}>
          {/* Actionable Empty State (SielloMita Protocol: Never lazy empty text) */}
          <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl bg-white/[0.02] border border-white/[0.06] [html[data-theme='celestial-sky']_&]:bg-white/80 [html[data-theme='celestial-sky']_&]:border-sky-200/60 space-y-4 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-[var(--theme-accent,#0284C7)]/15 border border-[var(--theme-accent,#0284C7)]/30 flex items-center justify-center text-[var(--theme-accent,#0284C7)] shadow-inner">
              <BookBookmark weight="duotone" className="w-7 h-7" />
            </div>

            <div className="space-y-1.5 max-w-sm">
              <h3 className="text-base sm:text-lg font-bold text-zinc-100 [html[data-theme='celestial-sky']_&]:text-[#0F172A]">
                {hasActiveFilters
                  ? 'Tidak ada catatan materi yang cocok'
                  : 'Belum ada catatan materi'}
              </h3>
              <p className="text-xs sm:text-sm text-zinc-400 [html[data-theme='celestial-sky']_&]:text-slate-600 leading-relaxed">
                {hasActiveFilters
                  ? 'Coba ganti kata kunci pencarian atau reset filter tanggal Anda.'
                  : 'Mulai tulis ringkasan materi kuliah, belajar, atau catatan penting Anda di sini.'}
              </p>
            </div>

            <div className="pt-2">
              {hasActiveFilters ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setLocalSearch('');
                    setSearchQuery('');
                    setDateFilter('all');
                  }}
                >
                  Reset Filter Pencarian
                </Button>
              ) : (
                <SpecularButton onClick={openAddNotebook}>
                  <Plus className="w-4 h-4 mr-1.5 stroke-[2.5]" />
                  <span>Tulis Materi Pertama</span>
                </SpecularButton>
              )}
            </div>
          </div>
        </MotionContainer>
      ) : (
        <div className="space-y-8">
          {/* Section 1: Pinned / Important Notebooks (If any) */}
          {pinnedNotebooks.length > 0 && (
            <section className="space-y-3.5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--theme-accent,#0284C7)]">
                <Star className="w-3.5 h-3.5 fill-[var(--theme-accent,#0284C7)]" />
                <span>Materi Penting Dipin ({pinnedNotebooks.length})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {pinnedNotebooks.map((nb, idx) => (
                  <motion.div
                    key={nb.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.38,
                      delay: Math.min(0.15 + idx * 0.08, 0.65),
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className="h-full relative rounded-2xl overflow-hidden"
                  >
                    {/* Subtle Ambient Accent Glow (SielloMita Standard) */}
                    <div
                      className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[var(--theme-glow-subtle,transparent)] via-transparent to-transparent opacity-25 z-0"
                      aria-hidden="true"
                    />
                    <div className="relative z-10 h-full">
                      <NotebookCard notebook={nb} />
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          {/* Section 2: Other / All Notebooks */}
          {otherNotebooks.length > 0 && (
            <section className="space-y-3.5">
              {pinnedNotebooks.length > 0 && (
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-500">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Catatan Lainnya ({otherNotebooks.length})</span>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {otherNotebooks.map((nb, idx) => (
                  <motion.div
                    key={nb.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.38,
                      delay: Math.min(0.15 + idx * 0.08, 0.65),
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className="h-full relative rounded-2xl overflow-hidden"
                  >
                    {/* Subtle Ambient Accent Glow (SielloMita Standard) */}
                    <div
                      className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[var(--theme-glow-subtle,transparent)] via-transparent to-transparent opacity-25 z-0"
                      aria-hidden="true"
                    />
                    <div className="relative z-10 h-full">
                      <NotebookCard notebook={nb} />
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Confirmation Dialog for Delete (Aegis Standard) */}
      <ConfirmDialog
        isOpen={Boolean(deletingNotebook)}
        onClose={closeDeleteConfirm}
        onConfirm={confirmDelete}
        title="Hapus Catatan Materi?"
        message={`Apakah kamu yakin ingin menghapus catatan "${deletingNotebook?.judul || ''}"? Seluruh isi materi catatan ini akan dihapus permanen.`}
        confirmLabel="Ya, Hapus Catatan"
        cancelLabel="Batal"
        isDanger={true}
      />
    </div>
  );
}
