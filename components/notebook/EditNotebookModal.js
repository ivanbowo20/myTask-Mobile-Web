'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import RichTextEditor from './RichTextEditor';
import {
  Star,
  Check,
  Save,
  Loader2,
  Trash2,
  Copy,
} from 'lucide-react';
import { toast } from '@/lib/use-toast';
import { useNotebooks } from '@/lib/notebook-context';
import { cn, htmlToChatFormattedText } from '@/lib/utils';

const COLOR_OPTIONS = [
  { label: 'Amber', value: '#D97706', ring: 'ring-amber-500' },
  { label: 'Emerald', value: '#059669', ring: 'ring-emerald-500' },
  { label: 'Indigo', value: '#4F46E5', ring: 'ring-indigo-500' },
  { label: 'Rose', value: '#E11D48', ring: 'ring-rose-500' },
  { label: 'Sky', value: '#0284C7', ring: 'ring-sky-500' },
  { label: 'Slate', value: '#64748B', ring: 'ring-slate-500' },
];

export default function EditNotebookModal({ isOpen, onClose, notebook }) {
  const { updateNotebook, openDeleteConfirm } = useNotebooks();

  const [judul, setJudul] = useState('');
  const [konten, setKonten] = useState('');
  const [penting, setPenting] = useState(false);
  const [warna, setWarna] = useState('#D97706');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorJudul, setErrorJudul] = useState('');
  const [autoSaveStatus, setAutoSaveStatus] = useState('idle'); // 'idle' | 'saving' | 'saved'

  const autoSaveTimerRef = useRef(null);
  const isInitialLoadRef = useRef(true);

  // Synchronize state when notebook prop changes or modal opens
  useEffect(() => {
    if (isOpen && notebook) {
      setJudul(notebook.judul || '');
      setKonten(notebook.konten || '');
      setPenting(Boolean(notebook.penting));
      setWarna(notebook.warna || '#D97706');
      setErrorJudul('');
      setAutoSaveStatus('idle');
      isInitialLoadRef.current = true;
    }
  }, [isOpen, notebook]);

  // Debounced Cloud Auto-save (1.5s after user stops typing)
  useEffect(() => {
    if (!isOpen || !notebook?.id) return;

    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      return;
    }

    if (!judul.trim()) return;

    setAutoSaveStatus('saving');
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        await updateNotebook(
          notebook.id,
          {
            judul: judul.trim(),
            konten: konten.trim(),
            penting,
            warna,
          },
          true // Silent update
        );
        setAutoSaveStatus('saved');
      } catch (e) {
        console.warn('Auto-save gagal:', e);
        setAutoSaveStatus('idle');
      }
    }, 1500);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [judul, konten, penting, warna, isOpen, notebook?.id, updateNotebook]);

  // Handle Manual Save
  const handleSubmit = useCallback(async (e) => {
    if (e) e.preventDefault();

    if (!judul.trim()) {
      setErrorJudul('Judul catatan materi wajib diisi');
      document.getElementById('edit-notebook-title-input')?.focus();
      return;
    }

    setIsSubmitting(true);
    setErrorJudul('');

    try {
      await updateNotebook(
        notebook.id,
        {
          judul: judul.trim(),
          konten: konten.trim(),
          penting,
          warna,
        },
        false // Show toast
      );
      onClose();
    } catch (err) {
      console.error('Submit edit error:', err);
    } finally {
      setIsSubmitting(false);
    }
  }, [judul, konten, penting, warna, notebook?.id, updateNotebook, onClose]);

  // Handle Copy Clean Text to Clipboard (WhatsApp/Chat friendly)
  async function handleCopy() {
    try {
      const formattedText = htmlToChatFormattedText(konten || '');
      const fullText = `${judul}\n\n${formattedText}`.trim();
      await navigator.clipboard.writeText(fullText);
      toast.success('Catatan berhasil disalin (format teks tebal WhatsApp/chat)!');
    } catch {
      toast.error('Gagal menyalin catatan.');
    }
  }

  // Keyboard shortcut Ctrl+S / Cmd+S inside modal
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSubmit();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleSubmit]);

  if (!notebook) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Catatan Materi"
      description="Ubah materi atau ringkasan belajar Anda. Perubahan tersimpan secara otomatis."
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {/* Title Input & Cloud Sync Status */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="edit-notebook-title-input"
              className="text-xs font-semibold text-zinc-300 [html[data-theme='celestial-sky']_&]:text-slate-800"
            >
              Judul Catatan Materi <span className="text-amber-500">*</span>
            </label>

            {/* Cloud Auto-save Status Indicator */}
            <span className="text-[11px] text-zinc-500 flex items-center gap-1">
              {autoSaveStatus === 'saving' && (
                <>
                  <Loader2 className="w-3 h-3 animate-spin text-amber-500" />
                  <span>Menyimpan ke cloud...</span>
                </>
              )}
              {autoSaveStatus === 'saved' && (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span>Semua perubahan tersimpan</span>
                </>
              )}
            </span>
          </div>

          <input
            id="edit-notebook-title-input"
            type="text"
            value={judul}
            onChange={(e) => {
              setJudul(e.target.value);
              if (errorJudul) setErrorJudul('');
            }}
            placeholder="Judul materi..."
            maxLength={255}
            className={cn(
              'w-full px-3.5 py-2.5 rounded-xl text-sm font-medium',
              'bg-white/[0.04] [html[data-theme="celestial-sky"]_&]:bg-white/90 border border-white/[0.12] [html[data-theme="celestial-sky"]_&]:border-sky-200/80 text-zinc-100 [html[data-theme="celestial-sky"]_&]:text-slate-900 placeholder:text-zinc-500 [html[data-theme="celestial-sky"]_&]:placeholder:text-slate-500',
              'focus:outline-none focus:border-amber-500/70 focus:ring-1 focus:ring-amber-500/50 [html[data-theme="celestial-sky"]_&]:focus:border-sky-500',
              'transition-all duration-150',
              errorJudul && 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/50'
            )}
          />
          {errorJudul && (
            <p className="text-xs text-rose-400">{errorJudul}</p>
          )}
        </div>

        {/* Visual WYSIWYG Editor */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-zinc-300">
              Isi Materi Catatan
            </label>

            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1 text-[11px] text-zinc-400 [html[data-theme='celestial-sky']_&]:text-slate-600 hover:text-white [html[data-theme='celestial-sky']_&]:hover:text-slate-900 transition-colors cursor-pointer"
              title="Salin sebagai teks bersih"
            >
              <Copy className="w-3 h-3" />
              <span>Salin Teks Bersih</span>
            </button>
          </div>

          <RichTextEditor
            value={konten}
            onChange={setKonten}
            placeholder="Tulis ringkasan materi di sini..."
          />
        </div>

        {/* Options Row: Aksen Warna & Important Pin Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-white/[0.08] [html[data-theme='celestial-sky']_&]:border-sky-100">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-zinc-400 [html[data-theme='celestial-sky']_&]:text-slate-700">Aksen Warna</span>
            <div className="flex items-center gap-1.5">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setWarna(c.value)}
                  title={c.label}
                  aria-label={`Pilih warna aksen ${c.label}`}
                  className={cn(
                    'color-picker-btn w-6 h-6 rounded-full transition-transform active:scale-90 cursor-pointer',
                    warna === c.value
                      ? 'scale-110 ring-2 ring-white/60 [html[data-theme="celestial-sky"]_&]:ring-slate-900/60 shadow-md'
                      : 'opacity-70 hover:opacity-100'
                  )}
                  style={{ backgroundColor: c.value }}
                />
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={penting}
              onChange={(e) => setPenting(e.target.checked)}
              className="sr-only"
            />
            <div
              className={cn(
                'w-9 h-5 rounded-full transition-colors relative',
                penting ? 'bg-amber-500' : 'bg-white/[0.12] [html[data-theme="celestial-sky"]_&]:bg-slate-200'
              )}
            >
              <div
                className={cn(
                  'w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-transform shadow-sm',
                  penting ? 'left-4.5' : 'left-0.5'
                )}
              />
            </div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-300 [html[data-theme='celestial-sky']_&]:text-slate-800">
              <Star
                className={cn(
                  'w-3.5 h-3.5',
                  penting ? 'text-amber-400 fill-amber-400' : 'text-zinc-500 [html[data-theme="celestial-sky"]_&]:text-slate-400'
                )}
              />
              <span>Catatan Penting (Pin ke Atas)</span>
            </div>
          </label>
        </div>

        {/* Sticky Footer Actions (Stays anchored at bottom of screen / adapts above keyboard) */}
        <div className="sticky bottom-0 z-10 bg-[var(--theme-nav-bg,#0C0A09)]/95 lg:bg-transparent backdrop-blur-md lg:backdrop-blur-none p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] lg:p-0 lg:pt-3 border-t border-white/10 lg:border-white/[0.08] flex items-center justify-between -mx-4 lg:-mx-0 mt-auto">
          {/* Delete action button */}
          <button
            type="button"
            onClick={() => {
              onClose();
              openDeleteConfirm(notebook);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 active:scale-95 transition-all cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Hapus Catatan</span>
          </button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Tutup
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              className="min-w-[120px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-1.5" />
                  <span>Selesai Edit</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
