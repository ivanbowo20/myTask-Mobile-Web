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
} from 'lucide-react';
import { useNotebooks } from '@/lib/notebook-context';
import { cn } from '@/lib/utils';

const COLOR_OPTIONS = [
  { label: 'Amber', value: '#D97706', ring: 'ring-amber-500' },
  { label: 'Emerald', value: '#059669', ring: 'ring-emerald-500' },
  { label: 'Indigo', value: '#4F46E5', ring: 'ring-indigo-500' },
  { label: 'Rose', value: '#E11D48', ring: 'ring-rose-500' },
  { label: 'Sky', value: '#0284C7', ring: 'ring-sky-500' },
  { label: 'Slate', value: '#64748B', ring: 'ring-slate-500' },
];

const DRAFT_KEY = 'taskflow_notebook_add_draft';

export default function AddNotebookModal({ isOpen, onClose }) {
  const { addNotebook } = useNotebooks();

  const [judul, setJudul] = useState('');
  const [konten, setKonten] = useState('');
  const [penting, setPenting] = useState(false);
  const [warna, setWarna] = useState('#D97706');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorJudul, setErrorJudul] = useState('');
  const [autoSaveStatus, setAutoSaveStatus] = useState('idle'); // 'idle' | 'saving' | 'saved'

  const autoSaveTimerRef = useRef(null);

  // Restore draft when modal opens
  useEffect(() => {
    if (isOpen) {
      setErrorJudul('');
      try {
        const savedDraft = localStorage.getItem(DRAFT_KEY);
        if (savedDraft) {
          const parsed = JSON.parse(savedDraft);
          if (parsed.judul || parsed.konten) {
            setJudul(parsed.judul || '');
            setKonten(parsed.konten || '');
            setPenting(Boolean(parsed.penting));
            setWarna(parsed.warna || '#D97706');
            setAutoSaveStatus('saved');
          }
        }
      } catch (err) {
        console.warn('Gagal memulihkan draf notebook:', err);
      }

      const timer = setTimeout(() => {
        document.getElementById('notebook-title-input')?.focus();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Debounced LocalStorage Auto-save (1.5s)
  useEffect(() => {
    if (!isOpen) return;
    if (!judul.trim() && !konten.trim()) {
      setAutoSaveStatus('idle');
      return;
    }

    setAutoSaveStatus('saving');
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({ judul, konten, penting, warna })
        );
        setAutoSaveStatus('saved');
      } catch (e) {
        console.warn('Gagal menyimpan draf otomatis:', e);
      }
    }, 1500);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [judul, konten, penting, warna, isOpen]);

  // Handle Form Submit
  const handleSubmit = useCallback(async (e) => {
    if (e) e.preventDefault();

    if (!judul.trim()) {
      setErrorJudul('Judul catatan materi wajib diisi');
      document.getElementById('notebook-title-input')?.focus();
      return;
    }

    setIsSubmitting(true);
    setErrorJudul('');

    try {
      await addNotebook({
        judul: judul.trim(),
        konten: konten.trim(),
        penting,
        warna,
      });

      // Clear draft on successful creation
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {}

      // Reset form
      setJudul('');
      setKonten('');
      setPenting(false);
      setWarna('#D97706');
      onClose();
    } catch (err) {
      console.error('Submit error:', err);
    } finally {
      setIsSubmitting(false);
    }
  }, [judul, konten, penting, warna, addNotebook, onClose]);

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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Catat Materi Baru"
      description="Tulis catatan atau ringkasan materi kuliah secara visual langsung tanpa kode."
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {/* Title Input & Status */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="notebook-title-input"
              className="text-xs font-semibold text-zinc-300"
            >
              Judul Catatan Materi <span className="text-amber-500">*</span>
            </label>

            {/* Auto-save status indicator */}
            <span className="text-[11px] text-zinc-500 flex items-center gap-1">
              {autoSaveStatus === 'saving' && (
                <>
                  <Loader2 className="w-3 h-3 animate-spin text-amber-500" />
                  <span>Menyimpan draf...</span>
                </>
              )}
              {autoSaveStatus === 'saved' && (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span>Draf tersimpan</span>
                </>
              )}
            </span>
          </div>

          <input
            id="notebook-title-input"
            type="text"
            value={judul}
            onChange={(e) => {
              setJudul(e.target.value);
              if (errorJudul) setErrorJudul('');
            }}
            placeholder="Contoh: Pertemuan 3 - Arsitektur MVC & API"
            maxLength={255}
            className={cn(
              'w-full px-3.5 py-2.5 rounded-xl text-sm font-medium',
              'bg-white/[0.04] border border-white/[0.1] text-zinc-100 placeholder:text-zinc-500',
              'focus:outline-none focus:border-amber-500/70 focus:ring-1 focus:ring-amber-500/50',
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
          <label className="text-xs font-semibold text-zinc-300 [html[data-theme='celestial-sky']_&]:text-slate-800">
            Isi Materi Catatan
          </label>

          <RichTextEditor
            value={konten}
            onChange={setKonten}
            placeholder="Tulis ringkasan materi di sini... Anda bisa langsung menebalkan teks dengan tombol B atau Ctrl+B tanpa muncul simbol bintang."
          />
        </div>

        {/* Options Row: Aksen Warna & Important Pin Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-white/[0.08] [html[data-theme='celestial-sky']_&]:border-sky-100">
          {/* Color palette options */}
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

          {/* Important Switch Toggle */}
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

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-white/[0.08]">
          <span className="text-[11px] text-zinc-500 hidden sm:inline-block">
            Tekan <kbd className="px-1.5 py-0.5 rounded bg-white/[0.08] text-zinc-400 font-mono text-[10px]">Ctrl+S</kbd> untuk menyimpan
          </span>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Batal
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
                  <span>Simpan Catatan</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
