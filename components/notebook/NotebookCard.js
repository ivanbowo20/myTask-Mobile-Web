'use client';

import { useState, useMemo, memo } from 'react';
import {
  Star,
  MoreVertical,
  Edit3,
  Trash2,
  Copy,
  Check,
  Clock,
} from 'lucide-react';
import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';
import { toast } from '@/lib/use-toast';
import { useNotebooks } from '@/lib/notebook-context';
import { cn, formatTanggal, htmlToChatFormattedText } from '@/lib/utils';

function NotebookCard({ notebook }) {
  const { openEditNotebook, openDeleteConfirm, toggleImportant } = useNotebooks();
  const [isCopied, setIsCopied] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Extract clean chat-formatted text (no &nbsp;, bold to *bold*, etc.)
  const formattedText = useMemo(() => {
    return htmlToChatFormattedText(notebook?.konten || '');
  }, [notebook?.konten]);

  // Compute word & char count from clean plain text
  const { wordCount, charCount } = useMemo(() => {
    if (!formattedText) return { wordCount: 0, charCount: 0 };
    const plain = formattedText.replace(/[*_•]/g, ' ').replace(/\s+/g, ' ').trim();
    const words = plain.split(/\s+/).filter(Boolean);
    return {
      wordCount: words.length,
      charCount: plain.length,
    };
  }, [formattedText]);

  // Generate safe HTML excerpt (handles both rich HTML and legacy Markdown)
  // Fast slice to 350 chars first to save 95% CPU DOMPurify/marked time on mobile
  const previewHtml = useMemo(() => {
    const raw = (notebook?.konten || '').trim();
    if (!raw) return '<p class="italic text-zinc-500">Belum ada isi materi...</p>';

    const slice = raw.length > 350 ? raw.slice(0, 350) + '...' : raw;

    // Clean any &nbsp; or non-breaking spaces and rogue font tags
    const cleanRaw = slice
      .replace(/&nbsp;/gi, ' ')
      .replace(/\u00A0/g, ' ')
      .replace(/<font[^>]*>/gi, '')
      .replace(/<\/font>/gi, '');

    // If it's already HTML (from WYSIWYG)
    if (/<[a-z][\s\S]*>/i.test(cleanRaw)) {
      return DOMPurify.sanitize(cleanRaw);
    }

    // Fallback: parse Markdown for older notes
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

  // Copy clean formatted text to clipboard
  async function handleCopy(e) {
    e.stopPropagation();
    try {
      const fullText = `${notebook.judul}\n\n${formattedText}`.trim();
      await navigator.clipboard.writeText(fullText);
      setIsCopied(true);
      toast.success('Catatan berhasil disalin (format teks tebal WhatsApp/chat)!');
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Gagal menyalin catatan:', err);
      toast.error('Gagal menyalin catatan.');
    }
  }

  function handleTogglePin(e) {
    e.stopPropagation();
    toggleImportant(notebook.id);
  }

  function handleOpenEdit(e) {
    e.stopPropagation();
    setIsMenuOpen(false);
    openEditNotebook(notebook);
  }

  function handleDelete(e) {
    e.stopPropagation();
    setIsMenuOpen(false);
    openDeleteConfirm(notebook);
  }

  const accentColor = notebook.warna || '#D97706';

  return (
    <article
      onClick={() => openEditNotebook(notebook)}
      className={cn(
        'group relative flex flex-col justify-between rounded-2xl p-5 cursor-pointer glass-card',
        'bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.08] hover:border-white/[0.16]',
        '[html[data-theme="celestial-sky"]_&]:bg-white/85 [html[data-theme="celestial-sky"]_&]:hover:bg-white/95 [html[data-theme="celestial-sky"]_&]:border-sky-200/60',
        'sm:backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.18)] [html[data-theme="celestial-sky"]_&]:shadow-[0_8px_24px_rgba(2,132,199,0.12)]',
        'transition-all duration-200 active:scale-[0.985] will-change-transform select-none',
        notebook.penting && 'ring-1 ring-amber-500/30 border-amber-500/20 bg-amber-500/[0.02] [html[data-theme="celestial-sky"]_&]:bg-amber-50/70 [html[data-theme="celestial-sky"]_&]:border-amber-300'
      )}
    >
      {/* Top Bar: Accent Tag + Quick Actions */}
      <div className="flex items-center justify-between gap-2 mb-3">
        {/* Accent indicator & category pill */}
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-2 h-2 rounded-full shrink-0 shadow-sm"
            style={{ backgroundColor: accentColor }}
            aria-hidden="true"
          />
          <span className="text-[11px] font-semibold text-zinc-400 [html[data-theme='celestial-sky']_&]:text-slate-700 bg-white/[0.04] [html[data-theme='celestial-sky']_&]:bg-slate-100/80 px-2 py-0.5 rounded-md border border-white/[0.06] [html[data-theme='celestial-sky']_&]:border-slate-200/60 truncate">
            {notebook.penting ? '📌 Penting' : 'Materi'}
          </span>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          {/* Quick Copy Clean Text Button */}
          <button
            type="button"
            onClick={handleCopy}
            title="Salin sebagai teks bersih"
            aria-label="Salin isi catatan sebagai teks bersih"
            className="p-1.5 rounded-lg text-zinc-400 [html[data-theme='celestial-sky']_&]:text-slate-600 hover:text-white [html[data-theme='celestial-sky']_&]:hover:text-slate-900 hover:bg-white/[0.08] [html[data-theme='celestial-sky']_&]:hover:bg-slate-200/60 active:scale-90 transition-all cursor-pointer"
          >
            {isCopied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Pin/Star Button */}
          <button
            type="button"
            onClick={handleTogglePin}
            title={notebook.penting ? 'Lepas sematan' : 'Sematkan ke atas'}
            aria-label={notebook.penting ? 'Lepas sematan' : 'Sematkan ke atas'}
            className={cn(
              'p-1.5 rounded-lg active:scale-90 transition-all cursor-pointer',
              notebook.penting
                ? 'text-amber-400 bg-amber-400/10 hover:bg-amber-400/20'
                : 'text-zinc-400 [html[data-theme="celestial-sky"]_&]:text-slate-600 hover:text-amber-300 [html[data-theme="celestial-sky"]_&]:hover:text-amber-600 hover:bg-white/[0.08] [html[data-theme="celestial-sky"]_&]:hover:bg-slate-200/60'
            )}
          >
            <Star
              className={cn(
                'w-3.5 h-3.5 transition-transform duration-200',
                notebook.penting && 'fill-amber-400 stroke-amber-400 scale-105'
              )}
            />
          </button>

          {/* More options menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              title="Opsi lainnya"
              aria-label="Opsi lainnya"
              className="p-1.5 rounded-lg text-zinc-400 [html[data-theme='celestial-sky']_&]:text-slate-600 hover:text-white [html[data-theme='celestial-sky']_&]:hover:text-slate-900 hover:bg-white/[0.08] [html[data-theme='celestial-sky']_&]:hover:bg-slate-200/60 active:scale-90 transition-all cursor-pointer"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>

            {isMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setIsMenuOpen(false)}
                />
                <div className="absolute right-0 top-8 z-30 w-36 rounded-xl bg-[var(--theme-nav-bg,#1A130E)] border border-white/10 [html[data-theme='celestial-sky']_&]:bg-white/95 [html[data-theme='celestial-sky']_&]:border-slate-200 shadow-2xl p-1 space-y-0.5 animate-in fade-in duration-100">
                  <button
                    type="button"
                    onClick={handleOpenEdit}
                    className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-200 [html[data-theme='celestial-sky']_&]:text-slate-700 hover:bg-white/[0.08] [html[data-theme='celestial-sky']_&]:hover:bg-slate-100 transition-colors text-left cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-zinc-400 [html[data-theme='celestial-sky']_&]:text-slate-500" />
                    <span>Edit Catatan</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-400 [html[data-theme='celestial-sky']_&]:text-rose-600 hover:bg-rose-500/10 [html[data-theme='celestial-sky']_&]:hover:bg-rose-50 transition-colors text-left cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400 [html[data-theme='celestial-sky']_&]:text-rose-600" />
                    <span>Hapus</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Card Body: Judul & Content Preview */}
      <div className="flex-1 min-w-0 space-y-2 mb-4">
        <h3 className="text-base font-bold text-zinc-100 [html[data-theme='celestial-sky']_&]:text-[#0F172A] group-hover:text-amber-400/95 [html[data-theme='celestial-sky']_&]:group-hover:text-amber-600 transition-colors line-clamp-1 tracking-tight">
          {notebook.judul}
        </h3>

        {/* Formatted Content with Dynamic Contrast Styling */}
        <div
          className={cn(
            'text-xs text-[#E4E4E7] [html[data-theme="celestial-sky"]_&]:text-[#334155] leading-relaxed font-normal line-clamp-3 overflow-hidden',
            '[&_p]:mb-1 [&_p:last-child]:mb-0',
            '[&_strong]:!text-[#FFFFFF] [html[data-theme="celestial-sky"]_&]:[&_strong]:!text-[#0F172A] [&_strong]:!font-extrabold',
            '[&_b]:!text-[#FFFFFF] [html[data-theme="celestial-sky"]_&]:[&_b]:!text-[#0F172A] [&_b]:!font-extrabold',
            '[&_u]:underline [&_em]:italic',
            '[&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4',
            '[&_font]:!text-inherit'
          )}
          dangerouslySetInnerHTML={{ __html: previewHtml }}
        />
      </div>

      {/* Card Footer: Metadata (Timestamp + Word Count) */}
      <div className="pt-3 border-t border-white/[0.06] [html[data-theme='celestial-sky']_&]:border-slate-200/60 flex items-center justify-between text-[11px] text-zinc-500 [html[data-theme='celestial-sky']_&]:text-slate-500 font-medium">
        <div className="flex items-center gap-1.5 truncate">
          <Clock className="w-3 h-3 text-zinc-500 [html[data-theme='celestial-sky']_&]:text-slate-500 shrink-0" />
          <time className="truncate">
            {formatTanggal(notebook.diperbaruiPada || notebook.dibuatPada)}
          </time>
        </div>

        <div className="shrink-0 pl-2 text-zinc-500 [html[data-theme='celestial-sky']_&]:text-slate-500">
          {wordCount} kata
        </div>
      </div>
    </article>
  );
}

// React.memo guard: Mencegah re-render massal seluruh kartu materi di latar belakang
// saat user sedang mengetik atau auto-save berjalan di modal edit
export default memo(NotebookCard, (prevProps, nextProps) => {
  return (
    prevProps.notebook.id === nextProps.notebook.id &&
    prevProps.notebook.judul === nextProps.notebook.judul &&
    prevProps.notebook.konten === nextProps.notebook.konten &&
    prevProps.notebook.penting === nextProps.notebook.penting &&
    prevProps.notebook.warna === nextProps.notebook.warna &&
    prevProps.notebook.diperbaruiPada === nextProps.notebook.diperbaruiPada
  );
});
