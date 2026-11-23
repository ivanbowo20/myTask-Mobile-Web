'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import Modal from '@/components/ui/Modal';
import {
  Star,
  Edit3,
  Copy,
  Check,
  Clock,
  Trash2,
  X,
} from 'lucide-react';
import { PushPin, FolderSimple } from '@phosphor-icons/react';
import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';
import { toast } from '@/lib/use-toast';
import { useNotebooks } from '@/lib/notebook-context';
import {
  cn,
  formatTanggal,
  htmlToChatFormattedText,
  copyNotebookContentToClipboard,
} from '@/lib/utils';

export default function NotebookPreviewModal({
  isOpen,
  onClose,
  notebook,
  onEdit,
}) {
  const { toggleImportant, openDeleteConfirm } = useNotebooks();
  const [isCopied, setIsCopied] = useState(false);
  const copyTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  // Reset copied visual state when switching note or closing modal
  useEffect(() => {
    setIsCopied(false);
    if (copyTimerRef.current) {
      clearTimeout(copyTimerRef.current);
      copyTimerRef.current = null;
    }
  }, [notebook?.id, isOpen]);

  // Extract clean chat-formatted text for word count & reading time
  const formattedText = useMemo(() => {
    return htmlToChatFormattedText(notebook?.konten || '');
  }, [notebook?.konten]);

  // Compute word count & estimated reading time
  const { wordCount, readTimeMinutes } = useMemo(() => {
    if (!formattedText) return { wordCount: 0, readTimeMinutes: 1 };
    const plain = formattedText.replace(/[*_•]/g, ' ').replace(/\s+/g, ' ').trim();
    const words = plain.split(/\s+/).filter(Boolean);
    const count = words.length;
    const minutes = Math.max(1, Math.ceil(count / 200));
    return {
      wordCount: count,
      readTimeMinutes: minutes,
    };
  }, [formattedText]);

  // Parse safe full HTML content for reading
  const cleanHtml = useMemo(() => {
    const raw = (notebook?.konten || '').trim();
    if (!raw) return '<p class="italic text-zinc-500">Belum ada isi materi catatan...</p>';

    // Clean rogue font tags from external pastes
    const cleanRaw = raw
      .replace(/<font[^>]*>/gi, '')
      .replace(/<\/font>/gi, '');

    // If it's already HTML from RichTextEditor
    if (/<[a-z][\s\S]*>/i.test(cleanRaw)) {
      return DOMPurify.sanitize(cleanRaw);
    }

    // Fallback: parse Markdown for legacy notes
    try {
      const parsed = marked.parse(cleanRaw, {
        breaks: true,
        gfm: true,
      });
      return DOMPurify.sanitize(parsed);
    } catch {
      return DOMPurify.sanitize(cleanRaw);
    }
  }, [notebook?.konten]);

  // Copy note content only (without title) to clipboard
  const handleCopy = useCallback(async () => {
    if (!notebook) return;
    const result = await copyNotebookContentToClipboard(notebook.konten || '');

    if (result.status === 'empty') {
      toast.info('Isi catatan masih kosong.');
      return;
    }

    if (result.status === 'copied') {
      setIsCopied(true);
      toast.success('Isi catatan berhasil disalin!');
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = setTimeout(() => {
        setIsCopied(false);
        copyTimerRef.current = null;
      }, 2000);
      return;
    }

    toast.error('Gagal menyalin isi catatan.');
  }, [notebook]);

  // Handle Switch to Edit Mode
  const handleEditClick = useCallback(() => {
    if (onEdit && notebook) {
      onEdit(notebook);
    }
  }, [onEdit, notebook]);

  // Handle Delete Confirmation from Preview
  const handleDeleteClick = useCallback(() => {
    if (!notebook) return;
    onClose();
    openDeleteConfirm(notebook);
  }, [notebook, onClose, openDeleteConfirm]);

  // Keyboard shortcut Ctrl+E / Cmd+E to jump directly to Edit
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        handleEditClick();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleEditClick]);

  if (!notebook) return null;

  const accentColor = notebook.warna || 'var(--theme-accent, #0284C7)';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      maxWidth="max-w-3xl"
      hideHeader
      noPadding
    >
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Single Fixed Top Action Bar (Safe-area aware di HP, langsung terjangkau tanpa scroll) */}
        <div
          className={cn(
            'shrink-0 flex items-center justify-between gap-2 px-3 sm:px-6 py-2.5 sm:py-3.5',
            'pt-[calc(0.65rem+env(safe-area-inset-top,0px))] lg:pt-3.5',
            'border-b border-white/[0.08] [html[data-theme="celestial-sky"]_&]:border-sky-200/80',
            'bg-[var(--theme-nav-bg,#0C0A09)]/95 lg:bg-white/[0.02] [html[data-theme="celestial-sky"]_&]:bg-white/95'
          )}
        >
          {/* Primary Action: Edit Catatan (selalu jelas di atas untuk HP & desktop) */}
          <button
            type="button"
            onClick={handleEditClick}
            title="Edit catatan (Ctrl+E)"
            aria-label="Edit catatan"
            className={cn(
              'min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition-all duration-150 active:scale-[0.97] shadow-sm cursor-pointer select-none shrink-0',
              'bg-[var(--theme-accent,#0284C7)] hover:opacity-90 text-white',
              "[html[data-theme='celestial-sky']_&]:text-white",
              "[html[data-theme='abyssal-teal']_&]:text-slate-950",
              "[html[data-theme='cosmic-galaxy']_&]:text-slate-950",
              "[html[data-theme='dark-chocolate']_&]:text-slate-950"
            )}
          >
            <Edit3 className="w-4 h-4 stroke-[2.5] shrink-0" />
            <span>Edit</span>
          </button>

          {/* Secondary Action Icons: Salin Isi, Pin, Hapus, Tutup */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handleCopy}
              title="Salin isi catatan (format teks chat)"
              aria-label="Salin isi catatan"
              className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-xl text-zinc-400 [html[data-theme='celestial-sky']_&]:text-slate-600 hover:text-white [html[data-theme='celestial-sky']_&]:hover:text-slate-900 hover:bg-white/[0.08] [html[data-theme='celestial-sky']_&]:hover:bg-slate-100 active:scale-95 transition-all cursor-pointer"
            >
              {isCopied ? (
                <Check className="w-4 h-4 text-emerald-400 [html[data-theme='celestial-sky']_&]:text-emerald-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>

            <button
              type="button"
              onClick={() => toggleImportant(notebook.id)}
              title={notebook.penting ? 'Lepas sematan' : 'Sematkan ke atas'}
              aria-label={notebook.penting ? 'Lepas sematan' : 'Sematkan ke atas'}
              className={cn(
                'min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-xl active:scale-95 transition-all cursor-pointer',
                notebook.penting
                  ? 'text-[var(--theme-accent,#0284C7)] bg-[var(--theme-accent,#0284C7)]/15'
                  : 'text-zinc-400 [html[data-theme="celestial-sky"]_&]:text-slate-600 hover:text-[var(--theme-accent,#0284C7)] hover:bg-white/[0.08] [html[data-theme="celestial-sky"]_&]:hover:bg-slate-100'
              )}
            >
              <Star
                className={cn(
                  'w-4 h-4 transition-transform duration-200',
                  notebook.penting && 'fill-[var(--theme-accent,#0284C7)] stroke-[var(--theme-accent,#0284C7)] scale-105'
                )}
              />
            </button>

            <button
              type="button"
              onClick={handleDeleteClick}
              title="Hapus catatan"
              aria-label="Hapus catatan"
              className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-xl text-rose-400 [html[data-theme='celestial-sky']_&]:text-rose-600 hover:bg-rose-500/10 [html[data-theme='celestial-sky']_&]:hover:bg-rose-50 active:scale-95 transition-all cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <span
              className="w-px h-5 mx-0.5 bg-white/[0.1] [html[data-theme='celestial-sky']_&]:bg-slate-200 shrink-0"
              aria-hidden="true"
            />

            <button
              type="button"
              onClick={onClose}
              title="Tutup pratinjau (Esc)"
              aria-label="Tutup jendela pratinjau"
              className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-xl text-zinc-400 [html[data-theme='celestial-sky']_&]:text-slate-600 hover:text-white [html[data-theme='celestial-sky']_&]:hover:text-slate-900 hover:bg-white/[0.08] [html[data-theme='celestial-sky']_&]:hover:bg-slate-100 active:scale-95 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Full-Height Scrollable Reading Surface (Title + Metadata + Content) */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 pt-4 sm:pt-5 pb-[calc(1.75rem+env(safe-area-inset-bottom,0px))] lg:pb-6 select-text">
          {/* Note Metadata & Title */}
          <div className="space-y-2.5 pb-4 mb-4 border-b border-white/[0.08] [html[data-theme='celestial-sky']_&]:border-sky-100">
            <div className="flex items-center gap-2 flex-wrap text-xs">
              {/* Accent Tag */}
              <div
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border shadow-sm font-semibold transition-colors',
                  notebook.penting
                    ? 'text-[var(--theme-accent,#0284C7)] bg-[var(--theme-accent,#0284C7)]/10 border-[var(--theme-accent,#0284C7)]/25 [html[data-theme="celestial-sky"]_&]:bg-sky-50 [html[data-theme="celestial-sky"]_&]:border-sky-300 [html[data-theme="celestial-sky"]_&]:text-sky-800'
                    : 'text-zinc-300 bg-white/[0.06] border-white/[0.08] [html[data-theme="celestial-sky"]_&]:bg-white [html[data-theme="celestial-sky"]_&]:border-sky-200/80 [html[data-theme="celestial-sky"]_&]:text-slate-700'
                )}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: accentColor }}
                  aria-hidden="true"
                />
                <span className="text-[11px] inline-flex items-center gap-1">
                  {notebook.penting ? (
                    <>
                      <PushPin weight="fill" className="w-3 h-3 shrink-0 text-[var(--theme-accent,#0284C7)] [html[data-theme='celestial-sky']_&]:text-sky-700" />
                      <span>Penting</span>
                    </>
                  ) : (
                    <span>Materi</span>
                  )}
                </span>
              </div>

              {/* Timestamp */}
              <div className="flex items-center gap-1 text-[11px] text-zinc-400 [html[data-theme='celestial-sky']_&]:text-slate-600">
                <Clock className="w-3 h-3 text-zinc-500 [html[data-theme='celestial-sky']_&]:text-slate-500 shrink-0" />
                <span>{formatTanggal(notebook.diperbaruiPada || notebook.dibuatPada)}</span>
              </div>

              <span className="text-zinc-600 [html[data-theme='celestial-sky']_&]:text-slate-400">•</span>

              {/* Word & Reading time estimate */}
              <span className="text-[11px] text-zinc-400 [html[data-theme='celestial-sky']_&]:text-slate-600">
                {wordCount} kata (~{readTimeMinutes} mnt baca)
              </span>

              {/* Category Badge if assigned */}
              {notebook.kategori && (
                <>
                  <span className="text-zinc-600 [html[data-theme='celestial-sky']_&]:text-slate-400">•</span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-white/[0.08] text-zinc-200 border border-white/10 [html[data-theme='celestial-sky']_&]:bg-sky-100 [html[data-theme='celestial-sky']_&]:text-sky-900 [html[data-theme='celestial-sky']_&]:border-sky-300">
                    <FolderSimple weight="fill" className="w-3 h-3 text-[var(--theme-accent,#0284C7)]" />
                    <span>{notebook.kategori}</span>
                  </span>
                </>
              )}
            </div>

            {/* Note Title */}
            <h2
              id="modal-title"
              className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100 [html[data-theme='celestial-sky']_&]:text-[#0F172A] leading-tight break-words"
            >
              {notebook.judul}
            </h2>
          </div>

          {/* Reading Content Body */}
          <div
            className={cn(
              'text-sm sm:text-base leading-relaxed text-[#F4F4F5] [html[data-theme="celestial-sky"]_&]:text-[#0F172A]',
              'whitespace-pre-wrap break-words font-sans space-y-3',
              // High contrast typography for readability
              '[&_h1]:text-xl sm:[&_h1]:text-2xl [&_h1]:font-extrabold [&_h1]:my-3.5 [&_h1]:!text-[#FFFFFF] [html[data-theme="celestial-sky"]_&]:[&_h1]:!text-[#0F172A]',
              '[&_h2]:text-lg sm:[&_h2]:text-xl [&_h2]:font-bold [&_h2]:my-3 [&_h2]:!text-[#FFFFFF] [html[data-theme="celestial-sky"]_&]:[&_h2]:!text-[#0F172A]',
              '[&_h3]:text-base sm:[&_h3]:text-lg [&_h3]:font-bold [&_h3]:my-2 [&_h3]:!text-[#FFFFFF] [html[data-theme="celestial-sky"]_&]:[&_h3]:!text-[#0F172A]',
              '[&_strong]:font-extrabold [&_strong]:!text-[#FFFFFF] [html[data-theme="celestial-sky"]_&]:[&_strong]:!text-[#0F172A]',
              '[&_b]:font-extrabold [&_b]:!text-[#FFFFFF] [html[data-theme="celestial-sky"]_&]:[&_b]:!text-[#0F172A]',
              '[&_u]:underline [&_u]:decoration-white/60 [html[data-theme="celestial-sky"]_&]:[&_u]:decoration-slate-400',
              '[&_em]:italic [&_em]:!text-[#E4E4E7] [html[data-theme="celestial-sky"]_&]:[&_em]:!text-[#1E293B]',
              '[&_i]:italic [&_i]:!text-[#E4E4E7] [html[data-theme="celestial-sky"]_&]:[&_i]:!text-[#1E293B]',
              '[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2 [&_ul]:space-y-1',
              '[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2 [&_ol]:space-y-1',
              '[&_li]:!text-[#F4F4F5] [html[data-theme="celestial-sky"]_&]:[&_li]:!text-[#0F172A]',
              '[&_blockquote]:border-l-3 [&_blockquote]:border-[var(--theme-accent,#0284C7)] [&_blockquote]:pl-3.5 [&_blockquote]:italic [&_blockquote]:my-3 [&_blockquote]:bg-[var(--theme-accent,#0284C7)]/10 [&_blockquote]:py-1.5 [&_blockquote]:rounded-r-xl [&_blockquote]:!text-[#E4E4E7] [html[data-theme="celestial-sky"]_&]:[&_blockquote]:!text-[#334155]',
              // Monospace & ASCII preservation
              '[&_pre]:bg-black/50 [html[data-theme="celestial-sky"]_&]:[&_pre]:bg-slate-100 [&_pre]:p-4 [&_pre]:rounded-xl [&_pre]:overflow-x-auto [&_pre]:font-mono [&_pre]:text-xs sm:[&_pre]:text-sm [&_pre]:border [&_pre]:border-white/[0.08] [html[data-theme="celestial-sky"]_&]:[&_pre]:border-slate-300',
              '[&_code]:font-mono [&_code]:text-xs [&_code]:bg-white/[0.08] [html[data-theme="celestial-sky"]_&]:[&_code]:bg-slate-200/70 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded',
              // Force clean color inheritance over any pasted inline color slop
              '[&_font]:!text-inherit',
              '[&_*[style]]:!color-inherit'
            )}
            dangerouslySetInnerHTML={{ __html: cleanHtml }}
          />
        </div>
      </div>
    </Modal>
  );
}
