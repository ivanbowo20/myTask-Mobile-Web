'use client';

import { useState } from 'react';
import {
  FolderSimple,
  SquaresFour,
  Plus,
  Trash,
  FolderDashed,
  Check,
  X,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useNotebooks } from '@/lib/notebook-context';
import AddNotebookCategoryModal from './AddNotebookCategoryModal';

export default function NotebookCategorySidebar({ className }) {
  const {
    allCategories,
    selectedCategory,
    setSelectedCategory,
    deleteCustomCategory,
    stats,
  } = useNotebooks();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deletingCat, setDeletingCat] = useState(null);

  function handleConfirmDelete(e, cat) {
    e.stopPropagation();
    deleteCustomCategory(cat);
    setDeletingCat(null);
  }

  return (
    <>
      <aside
        className={cn(
          'w-full lg:w-64 shrink-0 flex flex-col gap-3',
          className
        )}
      >
        {/* Sidebar Header Card */}
        <div className="glass-card p-3.5 rounded-2xl border border-white/[0.08] [html[data-theme='celestial-sky']_&]:bg-white/80 [html[data-theme='celestial-sky']_&]:border-sky-200/70 shadow-sm">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-[var(--theme-accent,#0284C7)]/15 text-[var(--theme-accent,#0284C7)]">
                <FolderSimple weight="fill" className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 [html[data-theme='celestial-sky']_&]:text-slate-800">
                Kategori
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              aria-label="Tambah kategori baru"
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 [html[data-theme='celestial-sky']_&]:bg-sky-100 [html[data-theme='celestial-sky']_&]:text-sky-800 border border-white/[0.08] transition-all duration-150 cursor-pointer select-none active:scale-[0.96]"
            >
              <Plus weight="bold" className="w-3 h-3" />
              <span>Baru</span>
            </button>
          </div>

          {/* Categories Navigation List */}
          <nav className="space-y-1" aria-label="Daftar Kategori Materi">
            {/* Semua Catatan Option */}
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={cn(
                'w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-left transition-all duration-150 cursor-pointer select-none relative group',
                selectedCategory === 'all'
                  ? 'bg-[var(--theme-accent,#0284C7)]/15 text-white [html[data-theme="celestial-sky"]_&]:text-slate-900 font-semibold border border-[var(--theme-accent,#0284C7)]/30'
                  : 'text-zinc-300 [html[data-theme="celestial-sky"]_&]:text-slate-700 hover:bg-white/[0.06] [html[data-theme="celestial-sky"]_&]:hover:bg-slate-100'
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <SquaresFour
                  weight={selectedCategory === 'all' ? 'fill' : 'regular'}
                  className={cn(
                    'w-4 h-4 shrink-0 transition-colors',
                    selectedCategory === 'all'
                      ? 'text-[var(--theme-accent,#0284C7)]'
                      : 'text-zinc-400 group-hover:text-zinc-200 [html[data-theme="celestial-sky"]_&]:text-slate-500'
                  )}
                />
                <span className="truncate">Semua Catatan</span>
              </div>

              <span
                className={cn(
                  'text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md shrink-0 transition-colors',
                  selectedCategory === 'all'
                    ? 'bg-[var(--theme-accent,#0284C7)] text-white'
                    : 'bg-white/[0.06] text-zinc-400 [html[data-theme="celestial-sky"]_&]:bg-slate-200 [html[data-theme="celestial-sky"]_&]:text-slate-700'
                )}
              >
                {stats.total}
              </span>
            </button>

            {/* List of Custom Categories */}
            {allCategories.map((cat) => {
              const isSelected = selectedCategory.toLowerCase() === cat.name.toLowerCase();

              return (
                <div
                  key={cat.name}
                  onClick={() => setSelectedCategory(cat.name)}
                  className={cn(
                    'w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-medium text-left transition-all duration-150 cursor-pointer select-none group relative',
                    isSelected
                      ? 'bg-white/[0.08] text-white [html[data-theme="celestial-sky"]_&]:bg-sky-50 [html[data-theme="celestial-sky"]_&]:text-slate-900 font-semibold border border-white/15 [html[data-theme="celestial-sky"]_&]:border-sky-300'
                      : 'text-zinc-300 [html[data-theme="celestial-sky"]_&]:text-slate-700 hover:bg-white/[0.05] [html[data-theme="celestial-sky"]_&]:hover:bg-slate-100'
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: cat.color || '#0284C7' }}
                    />
                    <FolderSimple
                      weight={isSelected ? 'fill' : 'regular'}
                      className={cn(
                        'w-4 h-4 shrink-0 transition-colors',
                        isSelected
                          ? 'text-white [html[data-theme="celestial-sky"]_&]:text-sky-700'
                          : 'text-zinc-400 group-hover:text-zinc-200 [html[data-theme="celestial-sky"]_&]:text-slate-500'
                      )}
                    />
                    <span className="truncate">{cat.name}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={cn(
                        'text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md transition-colors',
                        isSelected
                          ? 'bg-white/20 text-white [html[data-theme="celestial-sky"]_&]:bg-sky-200 [html[data-theme="celestial-sky"]_&]:text-sky-900'
                          : 'bg-white/[0.06] text-zinc-400 [html[data-theme="celestial-sky"]_&]:bg-slate-200 [html[data-theme="celestial-sky"]_&]:text-slate-700'
                      )}
                    >
                      {cat.count}
                    </span>

                    {/* Delete category trigger */}
                    {deletingCat?.name === cat.name ? (
                      <div className="flex items-center gap-1 bg-red-950/90 p-0.5 rounded border border-red-500/40 z-20">
                        <button
                          type="button"
                          title="Hapus kategori ini"
                          onClick={(e) => handleConfirmDelete(e, cat)}
                          className="p-1 text-red-400 hover:text-red-200"
                        >
                          <Check weight="bold" className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          title="Batal"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingCat(null);
                          }}
                          className="p-1 text-zinc-400 hover:text-white"
                        >
                          <X weight="bold" className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        title={`Hapus kategori "${cat.name}"`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingCat(cat);
                        }}
                        className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 text-zinc-500 hover:text-red-400 transition-opacity"
                      >
                        <Trash weight="regular" className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Uncategorized notes option (if any) */}
            {stats.uncategorized > 0 && (
              <button
                type="button"
                onClick={() => setSelectedCategory('_uncategorized')}
                className={cn(
                  'w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-medium text-left transition-all duration-150 cursor-pointer select-none group',
                  selectedCategory === '_uncategorized'
                    ? 'bg-amber-500/15 text-amber-200 font-semibold border border-amber-500/30'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <FolderDashed
                    weight={selectedCategory === '_uncategorized' ? 'fill' : 'regular'}
                    className="w-4 h-4 shrink-0 text-amber-400/80"
                  />
                  <span className="truncate italic">Tanpa Kategori</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/[0.06] text-zinc-400">
                  {stats.uncategorized}
                </span>
              </button>
            )}

            {/* Actionable Empty state if no categories exist yet */}
            {allCategories.length === 0 && (
              <div className="p-3 text-center rounded-xl bg-white/[0.02] border border-dashed border-white/10 space-y-1.5 mt-2">
                <FolderDashed weight="duotone" className="w-5 h-5 mx-auto text-[var(--theme-accent,#0284C7)]" />
                <p className="text-[11px] text-zinc-400 [html[data-theme='celestial-sky']_&]:text-slate-600 leading-snug">
                  Belum ada kategori. Buat kategori untuk memisahkan Coding, Presentasi, atau Panduan!
                </p>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(true)}
                  className="text-[11px] font-semibold text-[var(--theme-accent,#0284C7)] hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus weight="bold" className="w-3 h-3" />
                  Tambah Kategori Sekarang
                </button>
              </div>
            )}
          </nav>
        </div>
      </aside>

      {/* Dedicated Category Creation Modal with Auto-Detection */}
      <AddNotebookCategoryModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
    </>
  );
}
