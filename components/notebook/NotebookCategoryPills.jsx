'use client';

import { useState } from 'react';
import {
  SquaresFour,
  Plus,
  FolderSimple,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useNotebooks } from '@/lib/notebook-context';
import AddNotebookCategoryModal from './AddNotebookCategoryModal';

export default function NotebookCategoryPills({ className }) {
  const {
    allCategories,
    selectedCategory,
    setSelectedCategory,
    stats,
  } = useNotebooks();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  return (
    <>
      <div className={cn('w-full', className)}>
        {/* Single Ultra-Clean Horizontal Pill Row (Zero-Clutter Mobile Design) */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 px-0.5 select-none touch-pan-x">
          {/* '+ Kategori' Primary Action Button (Selalu tampak di depan) */}
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            aria-label="Tambah atau kelola kategori materi"
            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold shrink-0 bg-[var(--theme-accent,#0284C7)] text-white shadow-sm hover:opacity-90 active:scale-[0.96] transition-all cursor-pointer"
          >
            <Plus weight="bold" className="w-3.5 h-3.5" />
            <span>Kategori</span>
          </button>

          {/* 'Semua' Pill */}
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium shrink-0 cursor-pointer transition-all active:scale-[0.96]',
              selectedCategory === 'all'
                ? 'bg-white/[0.18] text-white border border-white/30 font-semibold shadow-sm [html[data-theme="celestial-sky"]_&]:bg-sky-100 [html[data-theme="celestial-sky"]_&]:text-sky-900 [html[data-theme="celestial-sky"]_&]:border-sky-300'
                : 'glass-card bg-[var(--glass-bg,rgba(22,17,14,0.85))] border border-white/[0.12] text-zinc-300 [html[data-theme="celestial-sky"]_&]:bg-white/90 [html[data-theme="celestial-sky"]_&]:text-slate-800 [html[data-theme="celestial-sky"]_&]:border-sky-200'
            )}
          >
            <SquaresFour
              weight={selectedCategory === 'all' ? 'fill' : 'regular'}
              className="w-3.5 h-3.5"
            />
            <span>Semua ({stats.total})</span>
          </button>

          {/* Dynamic Category Pills */}
          {allCategories.map((cat) => {
            const isSelected = selectedCategory.toLowerCase() === cat.name.toLowerCase();

            return (
              <button
                key={cat.name}
                type="button"
                onClick={() => setSelectedCategory(cat.name)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium shrink-0 cursor-pointer transition-all active:scale-[0.96]',
                  isSelected
                    ? 'bg-white/[0.18] text-white border border-white/30 font-semibold shadow-sm [html[data-theme="celestial-sky"]_&]:bg-sky-100 [html[data-theme="celestial-sky"]_&]:text-sky-900 [html[data-theme="celestial-sky"]_&]:border-sky-300'
                    : 'glass-card bg-[var(--glass-bg,rgba(22,17,14,0.85))] border border-white/[0.10] text-zinc-300 [html[data-theme="celestial-sky"]_&]:bg-white/90 [html[data-theme="celestial-sky"]_&]:text-slate-700 [html[data-theme="celestial-sky"]_&]:border-sky-200'
                )}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0 shadow-sm"
                  style={{ backgroundColor: cat.color || '#0284C7' }}
                />
                <span className="truncate max-w-[120px]">{cat.name}</span>
                <span className="text-[10px] font-mono opacity-75">
                  ({cat.count})
                </span>
              </button>
            );
          })}

          {/* Tanpa Kategori (jika ada) */}
          {stats.uncategorized > 0 && (
            <button
              type="button"
              onClick={() => setSelectedCategory('_uncategorized')}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium shrink-0 cursor-pointer transition-all active:scale-[0.96]',
                selectedCategory === '_uncategorized'
                  ? 'bg-amber-500/25 text-amber-200 border border-amber-500/40 font-semibold shadow-sm'
                  : 'glass-card bg-[var(--glass-bg,rgba(22,17,14,0.85))] border border-white/[0.10] text-zinc-400'
              )}
            >
              <span>Tanpa Kategori ({stats.uncategorized})</span>
            </button>
          )}
        </div>
      </div>

      {/* Category Creation & Management Modal for Mobile */}
      <AddNotebookCategoryModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
    </>
  );
}
