'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import {
  FolderSimple,
  CheckSquare,
  Square,
  ArrowRight,
} from '@phosphor-icons/react';
import { motion } from 'framer-motion';
import { useNotebooks } from '@/lib/notebook-context';
import { cn, formatTanggal } from '@/lib/utils';

export default function AssignNotesModal({ isOpen, onClose, targetCategoryName }) {
  const { notebooks, assignNotesToCategory } = useNotebooks();

  const [selectedNoteIds, setSelectedNoteIds] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter out notes that are already in this target category
  const availableNotes = notebooks.filter(
    (n) => (n.kategori || '').toLowerCase() !== (targetCategoryName || '').toLowerCase()
  );

  function handleToggleNote(id) {
    setSelectedNoteIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  function handleSelectAll() {
    if (selectedNoteIds.length === availableNotes.length) {
      setSelectedNoteIds([]);
    } else {
      setSelectedNoteIds(availableNotes.map((n) => n.id));
    }
  }

  async function handleSubmit(e) {
    e?.preventDefault();
    if (selectedNoteIds.length === 0 || !targetCategoryName) return;

    setIsSubmitting(true);
    try {
      await assignNotesToCategory(selectedNoteIds, targetCategoryName);
      setSelectedNoteIds([]);
      onClose();
    } catch (err) {
      console.error('Gagal memindahkan catatan:', err);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Masukkan Catatan ke "${targetCategoryName}"`}
      description="Pilih catatan yang ingin dipindahkan ke kategori ini."
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {availableNotes.length === 0 ? (
          <div className="p-6 text-center rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
            <FolderSimple weight="duotone" className="w-8 h-8 mx-auto text-[var(--theme-accent,#0284C7)]" />
            <p className="text-xs text-zinc-400 [html[data-theme='celestial-sky']_&]:text-slate-600">
              Semua catatan yang ada sudah berada di dalam kategori ini.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-zinc-300 [html[data-theme='celestial-sky']_&]:text-slate-800">
              <span>Tersedia {availableNotes.length} Catatan:</span>
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-[11px] text-[var(--theme-accent,#0284C7)] hover:underline cursor-pointer"
              >
                {selectedNoteIds.length === availableNotes.length ? 'Batal Pilih Semua' : 'Pilih Semua'}
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 rounded-xl p-1.5 bg-white/[0.02] border border-white/[0.06] [html[data-theme='celestial-sky']_&]:bg-slate-50">
              {availableNotes.map((note) => {
                const isChecked = selectedNoteIds.includes(note.id);
                return (
                  <motion.div
                    key={note.id}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: 'spring', stiffness: 450, damping: 25 }}
                    onClick={() => handleToggleNote(note.id)}
                    className={cn(
                      'flex items-center justify-between p-2.5 rounded-lg text-xs cursor-pointer select-none transition-all duration-150',
                      isChecked
                        ? 'bg-[var(--theme-accent,#0284C7)]/15 border border-[var(--theme-accent,#0284C7)]/35 text-white font-medium shadow-[0_0_12px_rgba(2,132,199,0.12)]'
                        : 'bg-white/[0.03] hover:bg-white/[0.06] border border-transparent text-zinc-300 [html[data-theme="celestial-sky"]_&]:text-slate-700'
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
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
                      <div className="min-w-0">
                        <div className="truncate font-medium">{note.judul}</div>
                        <div className="text-[10px] text-zinc-500 truncate">
                          {note.kategori ? `Kategori: ${note.kategori}` : 'Tanpa Kategori'}
                        </div>
                      </div>
                    </div>

                    <span className="text-[10px] text-zinc-500 shrink-0 font-mono ml-2">
                      {formatTanggal(note.diperbaruiPada || note.dibuatPada)}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.08] [html[data-theme='celestial-sky']_&]:border-sky-100">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting || selectedNoteIds.length === 0}
            className="inline-flex items-center gap-1.5"
          >
            <span>Pindahkan ({selectedNoteIds.length}) Catatan</span>
            <ArrowRight weight="bold" className="w-3.5 h-3.5" />
          </Button>
        </div>
      </form>
    </Modal>
  );
}
