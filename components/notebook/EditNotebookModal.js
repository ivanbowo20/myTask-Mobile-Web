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
  ChevronDown,
  X,
  Plus,
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
  const { updateNotebook, openDeleteConfirm, allCategories } = useNotebooks();

  const [judul, setJudul] = useState('');
  const [konten, setKonten] = useState('');
  const [penting, setPenting] = useState(false);
  const [warna, setWarna] = useState('#D97706');
  const [kategori, setKategori] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorJudul, setErrorJudul] = useState('');
  const [autoSaveStatus, setAutoSaveStatus] = useState('idle'); // 'idle' | 'saving' | 'saved'
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const autoSaveTimerRef = useRef(null);
  const isInitialLoadRef = useRef(true);
  const categoryContainerRef = useRef(null);

  // Close category dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (categoryContainerRef.current && !categoryContainerRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Synchronize state when notebook prop changes or modal opens
  useEffect(() => {
    if (isOpen && notebook) {
      setJudul(notebook.judul || '');
      setKonten(notebook.konten || '');
      setPenting(Boolean(notebook.penting));
      setWarna(notebook.warna || '#D97706');
      setKategori(notebook.kategori || '');
      setErrorJudul('');
      setAutoSaveStatus('idle');
      setIsDropdownOpen(false);
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
            kategori: kategori.trim(),
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
  }, [judul, konten, penting, warna, kategori, isOpen, notebook?.id, updateNotebook]);

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
          kategori: kategori.trim(),
        },
        false // Show toast
      );
      onClose();
    } catch (err) {
      console.error('Submit edit error:', err);
    } finally {
      setIsSubmitting(false);
    }
  }, [judul, konten, penting, warna, kategori, notebook?.id, updateNotebook, onClose]);

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

  const trimmedKategori = (kategori || '').trim();
  const filteredCategories = (allCategories || []).filter((cat) =>
    cat.name.toLowerCase().includes(trimmedKategori.toLowerCase())
  );
  const exactMatchExists = (allCategories || []).some(
    (cat) => cat.name.toLowerCase() === trimmedKategori.toLowerCase()
  );

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
              Judul Catatan Materi <span className="text-[var(--theme-accent,#D97706)]">*</span>
            </label>

            {/* Cloud Auto-save Status Indicator */}
            <span className="text-[11px] text-zinc-500 flex items-center gap-1">
              {autoSaveStatus === 'saving' && (
                <>
                  <Loader2 className="w-3 h-3 animate-spin text-[var(--theme-accent,#D97706)]" />
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
              'bg-white/[0.04] [html[data-theme="celestial-sky"]_&]:bg-white/90 border border-white/[0.12] hover:border-[var(--glass-border-hover,rgba(255,255,255,0.22))] [html[data-theme="celestial-sky"]_&]:border-sky-200/80 text-zinc-100 [html[data-theme="celestial-sky"]_&]:text-slate-900 placeholder:text-zinc-500 [html[data-theme="celestial-sky"]_&]:placeholder:text-slate-500',
              'focus:outline-none focus:border-[var(--theme-accent,#D97706)] focus:ring-1 focus:ring-[var(--theme-glow,rgba(217,119,6,0.4))]',
              'transition-all duration-150',
              errorJudul && 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/50'
            )}
          />
          {errorJudul && (
            <p className="text-xs text-rose-400">{errorJudul}</p>
          )}
        </div>

        {/* Category Combobox Input & Quick Chips */}
        <div ref={categoryContainerRef} className="relative z-20 space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="edit-notebook-category-input"
              className="text-xs font-semibold text-zinc-300 [html[data-theme='celestial-sky']_&]:text-slate-800"
            >
              Kategori Materi
            </label>
            <span className="text-[11px] text-zinc-500">
              Opsional (Pilih atau ketik kategori)
            </span>
          </div>

          <div className="relative">
            <input
              id="edit-notebook-category-input"
              type="text"
              value={kategori}
              onChange={(e) => {
                setKategori(e.target.value);
                if (!isDropdownOpen) setIsDropdownOpen(true);
              }}
              onFocus={() => setIsDropdownOpen(true)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setIsDropdownOpen(false);
              }}
              placeholder="Pilih dari daftar atau ketik kategori..."
              maxLength={50}
              autoComplete="off"
              className={cn(
                'w-full pl-3.5 pr-16 py-2.5 rounded-xl text-xs sm:text-sm font-medium',
                'bg-white/[0.04] [html[data-theme="celestial-sky"]_&]:bg-white/90 border border-white/[0.12] text-zinc-100 [html[data-theme="celestial-sky"]_&]:text-slate-900 placeholder:text-zinc-500',
                'focus:outline-none focus:border-[var(--theme-accent,#D97706)] focus:ring-1 focus:ring-[var(--theme-glow,rgba(217,119,6,0.4))]',
                'transition-all duration-150'
              )}
            />

            {/* Right side controls: Clear button + Toggle Dropdown Chevron */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {kategori && (
                <button
                  type="button"
                  onClick={() => {
                    setKategori('');
                  }}
                  title="Hapus pilihan kategori"
                  className="p-1 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                title="Buka daftar kategori"
                className="p-1 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
              >
                <ChevronDown
                  className={cn(
                    'w-4 h-4 transition-transform duration-200',
                    isDropdownOpen ? 'rotate-180 text-[var(--theme-accent,#0284C7)]' : ''
                  )}
                />
              </button>
            </div>

            {/* Floating Dropdown Popover */}
            {isDropdownOpen && (
              <div
                className={cn(
                  'absolute left-0 right-0 top-full mt-1.5 z-50',
                  'rounded-xl border border-white/[0.14] shadow-2xl overflow-hidden',
                  'bg-zinc-900/98 [html[data-theme="celestial-sky"]_&]:bg-white [html[data-theme="celestial-sky"]_&]:border-sky-200',
                  '[html[data-theme="emerald-zen"]_&]:bg-[#0d1f1a] [html[data-theme="nordic-frost"]_&]:bg-[#0f172a] [html[data-theme="sunset-horizon"]_&]:bg-[#1a0f1e]',
                  'backdrop-blur-xl animate-in fade-in-0 zoom-in-95 duration-150'
                )}
              >
                <div className="p-1.5 max-h-48 overflow-y-auto space-y-0.5 custom-scrollbar">
                  {/* Category items matching search */}
                  {filteredCategories.length > 0 ? (
                    filteredCategories.map((cat) => {
                      const isSelected = (kategori || '').toLowerCase() === cat.name.toLowerCase();
                      return (
                        <button
                          key={cat.id || cat.name}
                          type="button"
                          onClick={() => {
                            setKategori(cat.name);
                            setIsDropdownOpen(false);
                          }}
                          className={cn(
                            'w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-left transition-all cursor-pointer select-none',
                            'active:scale-[0.98]',
                            isSelected
                              ? 'bg-[var(--theme-accent,#0284C7)] text-white shadow-sm font-semibold'
                              : 'text-zinc-200 hover:bg-white/[0.08] [html[data-theme="celestial-sky"]_&]:text-slate-800 [html[data-theme="celestial-sky"]_&]:hover:bg-slate-100'
                          )}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: cat.color || 'var(--theme-accent, #0284C7)' }}
                            />
                            <span className="truncate">{cat.name}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            {cat.count !== undefined && (
                              <span
                                className={cn(
                                  'text-[10px] px-1.5 py-0.5 rounded-md font-normal',
                                  isSelected
                                    ? 'bg-white/20 text-white'
                                    : 'bg-white/[0.06] text-zinc-400 [html[data-theme="celestial-sky"]_&]:bg-slate-200 [html[data-theme="celestial-sky"]_&]:text-slate-600'
                                )}
                              >
                                {cat.count} materi
                              </span>
                            )}
                            {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                          </div>
                        </button>
                      );
                    })
                  ) : null}

                  {/* Option to create / use new category if typed text doesn't match exactly */}
                  {trimmedKategori && !exactMatchExists && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsDropdownOpen(false);
                      }}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-left transition-all cursor-pointer select-none',
                        'bg-white/[0.04] hover:bg-white/[0.08] text-[var(--theme-accent,#0284C7)] [html[data-theme="celestial-sky"]_&]:bg-blue-50 [html[data-theme="celestial-sky"]_&]:hover:bg-blue-100'
                      )}
                    >
                      <Plus className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">
                        Gunakan kategori baru: <strong>"{trimmedKategori}"</strong>
                      </span>
                    </button>
                  )}

                  {/* Empty state if no categories exist and user hasn't typed */}
                  {filteredCategories.length === 0 && !trimmedKategori && (
                    <div className="px-3 py-2.5 text-center text-xs text-zinc-400">
                      Belum ada kategori tersimpan. Ketik nama kategori baru di atas.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Quick Category Chips: limited to top 4 */}
          {allCategories && allCategories.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[10px] text-zinc-500">Pilih cepat:</span>
              {allCategories.slice(0, 4).map((cat) => {
                const isSelected = (kategori || '').toLowerCase() === cat.name.toLowerCase();
                return (
                  <button
                    key={cat.name}
                    type="button"
                    onClick={() => {
                      setKategori(isSelected ? '' : cat.name);
                    }}
                    className={cn(
                      'px-2 py-0.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer select-none active:scale-95',
                      isSelected
                        ? 'bg-[var(--theme-accent,#0284C7)] text-white font-semibold shadow-sm'
                        : 'bg-white/[0.06] hover:bg-white/[0.10] text-zinc-300 [html[data-theme="celestial-sky"]_&]:bg-slate-100 [html[data-theme="celestial-sky"]_&]:text-slate-700'
                    )}
                  >
                    {cat.name}
                  </button>
                );
              })}
              {allCategories.length > 4 && (
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen((prev) => !prev)}
                  className="px-2 py-0.5 rounded-lg text-[11px] font-semibold text-[var(--theme-accent,#0284C7)] hover:bg-white/[0.06] transition-all cursor-pointer active:scale-95"
                >
                  +{allCategories.length - 4} lainnya
                </button>
              )}
            </div>
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
                penting ? 'bg-[var(--theme-accent,#0284C7)]' : 'bg-white/[0.12] [html[data-theme="celestial-sky"]_&]:bg-slate-200'
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
                  penting ? 'text-[var(--theme-accent,#0284C7)] fill-[var(--theme-accent,#0284C7)]' : 'text-zinc-500 [html[data-theme="celestial-sky"]_&]:text-slate-400'
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
