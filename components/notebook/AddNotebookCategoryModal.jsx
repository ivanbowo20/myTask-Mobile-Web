'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import {
  FolderSimple,
  Check,
  CheckSquare,
  Square,
  Trash,
} from '@phosphor-icons/react';
import { motion } from 'framer-motion';
import { useNotebooks } from '@/lib/notebook-context';
import { cn, formatTanggal } from '@/lib/utils';

const CATEGORY_COLOR_PRESETS = [
  { name: 'Sky', value: '#0284C7' },
  { name: 'Emerald', value: '#10B981' },
  { name: 'Amber', value: '#F59E0B' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Rose', value: '#F43F5E' },
  { name: 'Orange', value: '#EA580C' },
];

export default function AddNotebookCategoryModal({ isOpen, onClose }) {
  const {
    createCategoryWithNotes,
    notebooks,
    uncategorizedNotebooks,
    allCategories,
    deleteCustomCategory,
  } = useNotebooks();

  const [activeTab, setActiveTab] = useState('create'); // 'create' | 'manage'
  const [nama, setNama] = useState('');
  const [warna, setWarna] = useState(CATEGORY_COLOR_PRESETS[0].value);
  const [selectedNoteIds, setSelectedNoteIds] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorNama, setErrorNama] = useState('');

  // Default checklist candidates: catatan tanpa kategori diutamakan, atau seluruh catatan jika tidak ada yang tanpa kategori
  const candidateNotes = uncategorizedNotebooks.length > 0 ? uncategorizedNotebooks : notebooks;

  function handleToggleNote(id) {
    setSelectedNoteIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  function handleSelectAll() {
    if (selectedNoteIds.length === candidateNotes.length) {
      setSelectedNoteIds([]);
    } else {
      setSelectedNoteIds(candidateNotes.map((n) => n.id));
    }
  }

  async function handleSubmit(e) {
    e?.preventDefault();
    const cleanNama = nama.trim();
    if (!cleanNama) {
      setErrorNama('Nama kategori materi wajib diisi');
      return;
    }

    setIsSubmitting(true);
    setErrorNama('');

    try {
      await createCategoryWithNotes({
        nama: cleanNama,
        warna,
        icon: 'FolderSimple',
        noteIds: selectedNoteIds,
      });

      setNama('');
      setSelectedNoteIds([]);
      onClose();
    } catch (err) {
      console.error('Gagal membuat kategori:', err);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={activeTab === 'manage' ? 'Kelola Kategori Materi' : 'Kategori Materi'}
      description={
        activeTab === 'manage'
          ? 'Lihat dan kelola kategori topik catatan materi Anda.'
          : 'Kelompokkan catatan materi Anda ke dalam topik spesifik.'
      }
      maxWidth="max-w-xl"
    >
      {/* Segmented Tab Toggle (jika ada kategori) */}
      {allCategories && allCategories.length > 0 && (
        <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.08] mb-3 [html[data-theme='celestial-sky']_&]:bg-slate-100">
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={cn(
              'flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center',
              activeTab === 'create'
                ? 'bg-[var(--theme-accent,#0284C7)] text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 [html[data-theme="celestial-sky"]_&]:text-slate-600'
            )}
          >
            + Buat Kategori
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('manage')}
            className={cn(
              'flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center',
              activeTab === 'manage'
                ? 'bg-[var(--theme-accent,#0284C7)] text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 [html[data-theme="celestial-sky"]_&]:text-slate-600'
            )}
          >
            Daftar & Hapus ({allCategories.length})
          </button>
        </div>
      )}

      {activeTab === 'manage' ? (
        <div className="space-y-3 py-1">
          <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
            {allCategories.map((cat) => (
              <div
                key={cat.name}
                className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs [html[data-theme='celestial-sky']_&]:bg-white/90 shadow-sm"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: cat.color || '#0284C7' }}
                  />
                  <FolderSimple weight="fill" className="w-4 h-4 text-zinc-400 shrink-0" />
                  <span className="font-semibold text-zinc-100 [html[data-theme='celestial-sky']_&]:text-slate-900 truncate">
                    {cat.name}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-white/[0.06] text-zinc-400 shrink-0">
                    {cat.count} Catatan
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Hapus kategori "${cat.name}"? Catatan di dalamnya akan dialihkan menjadi Tanpa Kategori.`)) {
                      deleteCustomCategory(cat);
                    }
                  }}
                  className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg text-rose-400 hover:text-white hover:bg-rose-500/20 transition-colors cursor-pointer shrink-0"
                >
                  <Trash weight="bold" className="w-3.5 h-3.5" />
                  <span>Hapus</span>
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-3 border-t border-white/[0.08] [html[data-theme='celestial-sky']_&]:border-sky-100">
            <Button type="button" variant="secondary" onClick={onClose}>
              Selesai
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {/* Nama Kategori */}
        <div className="space-y-1.5">
          <label
            htmlFor="cat-name-input"
            className="text-xs font-semibold text-zinc-300 [html[data-theme='celestial-sky']_&]:text-slate-800"
          >
            Nama Kategori <span className="text-[var(--theme-accent,#0284C7)]">*</span>
          </label>
          <input
            id="cat-name-input"
            type="text"
            autoFocus
            value={nama}
            onChange={(e) => {
              setNama(e.target.value);
              if (errorNama) setErrorNama('');
            }}
            placeholder="Contoh: Coding, Presentasi, Panduan..."
            maxLength={50}
            className={cn(
              'w-full px-3.5 py-2.5 rounded-xl text-sm font-medium',
              'bg-white/[0.04] [html[data-theme="celestial-sky"]_&]:bg-white/90 border border-white/[0.12] text-zinc-100 [html[data-theme="celestial-sky"]_&]:text-slate-900 placeholder:text-zinc-500',
              'focus:outline-none focus:border-[var(--theme-accent,#0284C7)] focus:ring-1 focus:ring-[var(--theme-accent,#0284C7)]/50',
              'transition-all duration-150',
              errorNama && 'border-rose-500'
            )}
          />
          {errorNama && <p className="text-xs text-rose-400">{errorNama}</p>}
        </div>

        {/* Pilihan Warna */}
        <div className="space-y-1.5">
          <span className="text-xs font-semibold text-zinc-300 [html[data-theme='celestial-sky']_&]:text-slate-800">
            Aksen Warna
          </span>
          <div className="flex items-center gap-2">
            {CATEGORY_COLOR_PRESETS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setWarna(c.value)}
                className="w-7 h-7 rounded-full relative flex items-center justify-center transition-transform active:scale-90 cursor-pointer"
                style={{ backgroundColor: c.value }}
              >
                {warna === c.value && (
                  <Check weight="bold" className="w-3.5 h-3.5 text-white drop-shadow" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Deteksi Catatan Otomatis Section */}
        {candidateNotes.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-white/[0.08] [html[data-theme='celestial-sky']_&]:border-sky-100">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-zinc-200 [html[data-theme='celestial-sky']_&]:text-slate-900">
                  Masukkan Catatan yang Sudah Ada
                </span>
                <p className="text-[11px] text-zinc-400 [html[data-theme='celestial-sky']_&]:text-slate-600">
                  {uncategorizedNotebooks.length > 0
                    ? `Ditemukan ${uncategorizedNotebooks.length} catatan tanpa kategori`
                    : `Ditemukan ${notebooks.length} catatan materi`}
                </p>
              </div>

              <button
                type="button"
                onClick={handleSelectAll}
                className="text-[11px] font-semibold text-[var(--theme-accent,#0284C7)] hover:underline cursor-pointer"
              >
                {selectedNoteIds.length === candidateNotes.length ? 'Batal Pilih Semua' : 'Pilih Semua'}
              </button>
            </div>

            {/* List candidate notes */}
            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 rounded-xl p-1 bg-white/[0.02] border border-white/[0.06] [html[data-theme='celestial-sky']_&]:bg-slate-50">
              {candidateNotes.map((note) => {
                const isChecked = selectedNoteIds.includes(note.id);
                return (
                  <motion.div
                    key={note.id}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: 'spring', stiffness: 450, damping: 25 }}
                    onClick={() => handleToggleNote(note.id)}
                    className={cn(
                      'flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer select-none transition-all duration-150',
                      isChecked
                        ? 'bg-[var(--theme-accent,#0284C7)]/15 border border-[var(--theme-accent,#0284C7)]/35 text-white font-medium shadow-[0_0_12px_rgba(2,132,199,0.12)]'
                        : 'bg-white/[0.03] hover:bg-white/[0.06] border border-transparent text-zinc-300 [html[data-theme="celestial-sky"]_&]:text-slate-700'
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <motion.div
                        animate={isChecked ? { scale: [0.8, 1.18, 1] } : { scale: 1 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                        className="shrink-0"
                      >
                        {isChecked ? (
                          <motion.div
                            initial={{ scale: 0, rotate: -30 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                          >
                            <CheckSquare weight="fill" className="w-4 h-4 text-[var(--theme-accent,#0284C7)]" />
                          </motion.div>
                        ) : (
                          <Square weight="regular" className="w-4 h-4 text-zinc-500" />
                        )}
                      </motion.div>
                      <span className="truncate">{note.judul}</span>
                    </div>

                    <span className="text-[10px] text-zinc-500 shrink-0 font-mono">
                      {formatTanggal(note.diperbaruiPada || note.dibuatPada)}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.08] [html[data-theme='celestial-sky']_&]:border-sky-100">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting || !nama.trim()}>
            {selectedNoteIds.length > 0
              ? `Simpan & Masukkan (${selectedNoteIds.length}) Catatan`
              : 'Simpan Kategori'}
          </Button>
        </div>
      </form>
    )}
  </Modal>
);
}
