'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import {
  Star,
  Edit3,
  Copy,
  Check,
  Clock,
  Trash2,
} from 'lucide-react';
import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';
import { toast } from '@/lib/use-toast';
import { useNotebooks } from '@/lib/notebook-context';
import { cn, formatTanggal, htmlToChatFormattedText } from '@/lib/utils';

export default function NotebookPreviewModal({
  isOpen,
  onClose,
  notebook,
  onEdit,
}) {
  const { toggleImportant, openDeleteConfirm } = useNotebooks();
  const [isCopied, setIsCopied] = useState(false);

  // Extract clean chat-formatted text for clipboard
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

  // Copy clean text to clipboard
  const handleCopy = useCallback(async () => {
    if (!notebook) return;
    try {
      const fullText = `${notebook.judul}\n\n${formattedText}`.trim();
      await navigator.clipboard.writeText(fullText);
      setIsCopied(true);
      toast.success('Catatan berhasil disalin (format teks tebal WhatsApp/chat)!');
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      toast.error('Gagal menyalin catatan.');
    }
  }, [notebook, formattedText]);

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
      className="p-0"
    >
      <div className="flex flex-col h-full min-h-0">
        {/* Custom Header: Title, Metadata & Action Icons */}
        <div className="shrink-0 p-4 sm:p-6 pb-3 border-b border-white/[0.08] [html[data-theme='celestial-sky']_&]:border-sky-100 bg-white/[0.02] [html[data-theme='celestial-sky']_&]:bg-sky-50/50">
          <div className="flex items-start justify-between gap-3">
            {/* Title & Metadata Badges */}
            <div className="space-y-2 min-w-0 flex-1">
              {/* Category, Date & Word Count Badges */}
              <div className="flex items-center gap-2 flex-wrap text-xs">
                {/* Accent Tag */}
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/[0.06] [html[data-theme='celestial-sky']_&]:bg-white border border-white/[0.08] [html[data-theme='celestial-sky']_&]:border-sky-200/80 shadow-sm font-semibold">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: accentColor }}
                    aria-hidden="true"
                  />
                  <span className="text-[11px] text-zinc-300 [html[data-theme='celestial-sky']_&]:text-slate-700">
                    {notebook.penting ? '📌 Penting' : 'Materi'}
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
              </div>

              {/* Note Title */}
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100 [html[data-theme='celestial-sky']_&]:text-[#0F172A] leading-tight break-words">
                {notebook.judul}
              </h2>
            </div>

            {/* Header Action Buttons (Quick Edit, Pin, Copy) */}
            <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
              {/* Copy Clean Text */}
              <button
                type="button"
                onClick={handleCopy}
                title="Salin sebagai teks bersih (WhatsApp/Chat)"
                aria-label="Salin teks bersih"
                className="p-2 rounded-xl text-zinc-400 [html[data-theme='celestial-sky']_&]:text-slate-600 hover:text-white [html[data-theme='celestial-sky']_&]:hover:text-slate-900 hover:bg-white/[0.08] [html[data-theme='celestial-sky']_&]:hover:bg-slate-200/60 active:scale-95 transition-all cursor-pointer"
              >
                {isCopied ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>

              {/* Pin / Star Toggle */}
              <button
                type="button"
                onClick={() => toggleImportant(notebook.id)}
                title={notebook.penting ? 'Lepas sematan' : 'Sematkan ke atas'}
                aria-label={notebook.penting ? 'Lepas sematan' : 'Sematkan ke atas'}
                className={cn(
                  'p-2 rounded-xl active:scale-95 transition-all cursor-pointer',
                  notebook.penting
                    ? 'text-[var(--theme-accent)] bg-[var(--theme-accent)]/15'
                    : 'text-zinc-400 [html[data-theme="celestial-sky"]_&]:text-slate-600 hover:text-[var(--theme-accent)] hover:bg-white/[0.08] [html[data-theme="celestial-sky"]_&]:hover:bg-slate-200/60'
                )}
              >
                <Star
                  className={cn(
                    'w-4 h-4 transition-transform duration-200',
                    notebook.penting && 'fill-[var(--theme-accent)] stroke-[var(--theme-accent)] scale-105'
                  )}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Reading Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 sm:py-5 min-h-[240px] max-h-[calc(100dvh-180px)] lg:max-h-[60vh] select-text">
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

        {/* Sticky Footer Actions (Always reachable by thumb on mobile & desktop) */}
        <div className="shrink-0 p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] border-t border-white/10 [html[data-theme='celestial-sky']_&]:border-sky-100 bg-[var(--theme-nav-bg,#0C0A09)]/95 lg:bg-white/[0.02] [html[data-theme='celestial-sky']_&]:bg-white/95 backdrop-blur-md flex items-center justify-between gap-3">
          {/* Delete action button */}
          <button
            type="button"
            onClick={handleDeleteClick}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 active:scale-95 transition-all cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Hapus Catatan</span>
            <span className="sm:hidden">Hapus</span>
          </button>

          {/* Close & Edit Buttons */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="text-xs sm:text-sm"
            >
              Tutup
            </Button>

            <button
              type="button"
              onClick={handleEditClick}
              className={cn(
                "min-h-[42px] inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 active:scale-[0.97] shadow-md cursor-pointer select-none",
                "bg-[var(--theme-accent,#0284C7)] hover:opacity-90 text-white",
                "[html[data-theme='celestial-sky']_&]:text-white",
                "[html[data-theme='abyssal-teal']_&]:text-slate-950",
                "[html[data-theme='soft-aurora']_&]:text-slate-950",
                "[html[data-theme='dark-chocolate']_&]:text-slate-950"
              )}
            >
              <Edit3 className="w-4 h-4 stroke-[2.5]" />
              <span>Edit Catatan</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
