'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowUpDown,
  Clock,
  Calendar,
  ArrowDownAZ,
  Check,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const SORT_OPTIONS = [
  {
    id: 'newest',
    label: 'Terbaru',
    desc: 'Catatan terakhir diedit',
    icon: Clock,
  },
  {
    id: 'oldest',
    label: 'Terlama',
    desc: 'Berdasarkan waktu dibuat',
    icon: Calendar,
  },
  {
    id: 'title',
    label: 'Judul (A-Z)',
    desc: 'Urutan abjad judul materi',
    icon: ArrowDownAZ,
  },
];

export default function NotebookSortDropdown({ value = 'newest', onChange, className }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const activeOption = SORT_OPTIONS.find((opt) => opt.id === value) || SORT_OPTIONS[0];
  const ActiveIcon = activeOption.icon;

  // Handle outside click & escape key
  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setIsOpen(false);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  function handleSelect(id) {
    onChange?.(id);
    setIsOpen(false);
  }

  return (
    <div ref={containerRef} className={cn('relative inline-block text-left', className)}>
      {/* Trigger Button with Apple Glass Aesthetic */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Urutkan catatan materi. Saat ini: ${activeOption.label}`}
        className={cn(
          'inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold select-none cursor-pointer',
          'bg-white/[0.04] border border-white/[0.08] glass-card',
          'text-zinc-200 hover:text-white hover:bg-white/[0.08]',
          '[html[data-theme="celestial-sky"]_&]:bg-white/85 [html[data-theme="celestial-sky"]_&]:border-sky-200/70',
          '[html[data-theme="celestial-sky"]_&]:text-slate-800 [html[data-theme="celestial-sky"]_&]:hover:bg-white',
          '[html[data-theme="celestial-sky"]_&]:shadow-sm',
          'active:scale-[0.98] transition-all duration-150',
          isOpen && 'ring-1 ring-amber-500/50 border-amber-500/40 [html[data-theme="celestial-sky"]_&]:ring-sky-400 [html[data-theme="celestial-sky"]_&]:border-sky-400'
        )}
      >
        <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400 [html[data-theme='celestial-sky']_&]:text-slate-600 shrink-0" />
        <span className="truncate">{activeOption.label}</span>
        <ChevronDown
          className={cn(
            'w-3.5 h-3.5 text-zinc-400 [html[data-theme="celestial-sky"]_&]:text-slate-600 shrink-0 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Floating Popover Glass Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            role="listbox"
            aria-label="Pilihan urutan catatan materi"
            className={cn(
              'absolute left-0 sm:right-0 sm:left-auto top-full mt-1.5 z-40',
              'min-w-[200px] p-1.5 rounded-xl space-y-0.5',
              'bg-[var(--theme-nav-bg,#16110E)]/95 border border-white/12 shadow-[0_16px_40px_-8px_rgba(0,0,0,0.6)] backdrop-blur-xl',
              '[html[data-theme="celestial-sky"]_&]:bg-white/95 [html[data-theme="celestial-sky"]_&]:border-sky-200',
              '[html[data-theme="celestial-sky"]_&]:shadow-[0_16px_36px_-6px_rgba(2,132,199,0.22)]'
            )}
          >
            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 [html[data-theme='celestial-sky']_&]:text-slate-500 border-b border-white/[0.06] [html[data-theme='celestial-sky']_&]:border-slate-100 mb-1">
              Urutkan Berdasarkan
            </div>

            {SORT_OPTIONS.map((opt) => {
              const isSelected = opt.id === value;
              const Icon = opt.icon;

              return (
                <button
                  key={opt.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(opt.id)}
                  className={cn(
                    'w-full flex items-center justify-between gap-3 px-2.5 py-2 rounded-lg text-xs font-medium text-left cursor-pointer select-none transition-colors duration-150',
                    isSelected
                      ? 'bg-amber-500/15 text-amber-300 font-semibold [html[data-theme="celestial-sky"]_&]:bg-sky-100 [html[data-theme="celestial-sky"]_&]:text-sky-900'
                      : 'text-zinc-300 [html[data-theme="celestial-sky"]_&]:text-slate-700 hover:bg-white/[0.08] [html[data-theme="celestial-sky"]_&]:hover:bg-slate-100'
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon
                      className={cn(
                        'w-4 h-4 shrink-0',
                        isSelected
                          ? 'text-amber-400 [html[data-theme="celestial-sky"]_&]:text-sky-600'
                          : 'text-zinc-400 [html[data-theme="celestial-sky"]_&]:text-slate-500'
                      )}
                    />
                    <div className="min-w-0">
                      <div className="truncate">{opt.label}</div>
                      <div className="text-[10px] text-zinc-500 [html[data-theme='celestial-sky']_&]:text-slate-400 truncate">
                        {opt.desc}
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-amber-400 [html[data-theme='celestial-sky']_&]:text-sky-600 shrink-0" />
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
