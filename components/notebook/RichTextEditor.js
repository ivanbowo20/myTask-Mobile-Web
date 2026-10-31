'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Heading2,
  List,
  ListOrdered,
  Quote,
  RemoveFormatting,
} from 'lucide-react';
import DOMPurify from 'isomorphic-dompurify';
import { cn } from '@/lib/utils';

export default function RichTextEditor({
  value = '',
  onChange,
  placeholder = 'Tulis ringkasan materi di sini...',
  className,
}) {
  const editorRef = useRef(null);
  const isTypingRef = useRef(false);
  const activeStatesRafRef = useRef(null);

  // Active command states (for highlighting buttons when cursor is on bold/italic/etc.)
  const [activeStates, setActiveStates] = useState({
    bold: false,
    italic: false,
    underline: false,
    unorderedList: false,
    orderedList: false,
  });

  // Update active state on selection change with requestAnimationFrame throttle
  const updateActiveStates = useCallback(() => {
    if (typeof document === 'undefined') return;
    if (activeStatesRafRef.current) return;

    activeStatesRafRef.current = requestAnimationFrame(() => {
      activeStatesRafRef.current = null;
      try {
        setActiveStates({
          bold: document.queryCommandState('bold'),
          italic: document.queryCommandState('italic'),
          underline: document.queryCommandState('underline'),
          unorderedList: document.queryCommandState('insertUnorderedList'),
          orderedList: document.queryCommandState('insertOrderedList'),
        });
      } catch {
        // Ignore if document not active
      }
    });
  }, []);

  // Cleanup pending rAF on unmount
  useEffect(() => {
    return () => {
      if (activeStatesRafRef.current) {
        cancelAnimationFrame(activeStatesRafRef.current);
      }
    };
  }, []);

  // Sync value from prop to DOM when not typing (e.g. initial load or external reset)
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;

    if (!isTypingRef.current && el.innerHTML !== value) {
      // Clean any rogue font tags from older pastes before rendering
      const cleaned = (value || '').replace(/<font[^>]*>/gi, '').replace(/<\/font>/gi, '');
      el.innerHTML = DOMPurify.sanitize(cleaned);
    }
  }, [value]);

  // Execute formatting command without losing selection/focus
  const execCmd = useCallback(
    (command, arg = null) => {
      const el = editorRef.current;
      if (!el) return;

      el.focus();
      try {
        document.execCommand(command, false, arg);
      } catch (err) {
        console.warn('execCommand error:', err);
      }

      // Notify change
      if (onChange) {
        onChange(el.innerHTML);
      }
      updateActiveStates();
    },
    [onChange, updateActiveStates]
  );

  function handleInput() {
    isTypingRef.current = true;
    const el = editorRef.current;
    if (!el) return;

    if (onChange) {
      onChange(el.innerHTML);
    }
    updateActiveStates();

    // Reset typing flag shortly after
    setTimeout(() => {
      isTypingRef.current = false;
    }, 100);
  }

  // Intercept Paste: auto-clean foreign colors, font tags, and inline background colors
  function handlePaste(e) {
    e.preventDefault();
    const clipboardData = e.clipboardData || window.clipboardData;
    if (!clipboardData) return;

    // Get plain text from clipboard (guarantees zero foreign font colors or messy styles)
    const text = clipboardData.getData('text/plain');
    if (text) {
      document.execCommand('insertText', false, text);
      handleInput();
    }
  }

  function handleKeyDown(e) {
    updateActiveStates();
  }

  function handleKeyUp() {
    updateActiveStates();
  }

  function handleMouseUp() {
    updateActiveStates();
  }

  // Helper for button onMouseDown: e.preventDefault() prevents editor from losing selection!
  const preventFocusLoss = (e) => {
    e.preventDefault();
  };

  return (
    <div
      className={cn(
        'rounded-xl border border-white/[0.10] overflow-hidden bg-white/[0.03]',
        '[html[data-theme="celestial-sky"]_&]:bg-white [html[data-theme="celestial-sky"]_&]:border-sky-200/80 [html[data-theme="celestial-sky"]_&]:shadow-sm',
        className
      )}
    >
      {/* Visual Toolbar (Apple Notes & Notion Inspired) */}
      <div className="flex items-center flex-wrap gap-1 p-1.5 bg-white/[0.04] [html[data-theme='celestial-sky']_&]:bg-sky-50/70 border-b border-white/[0.08] [html[data-theme='celestial-sky']_&]:border-sky-100">
        {/* Bold Button */}
        <button
          type="button"
          onMouseDown={preventFocusLoss}
          onClick={() => execCmd('bold')}
          title="Tebal (Ctrl+B)"
          aria-label="Format teks tebal"
          className={cn(
            'p-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer active:scale-95',
            activeStates.bold
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm [html[data-theme="celestial-sky"]_&]:bg-amber-100 [html[data-theme="celestial-sky"]_&]:text-amber-800 [html[data-theme="celestial-sky"]_&]:border-amber-300'
              : 'text-zinc-400 [html[data-theme="celestial-sky"]_&]:text-slate-600 hover:text-white [html[data-theme="celestial-sky"]_&]:hover:text-slate-900 hover:bg-white/[0.08] [html[data-theme="celestial-sky"]_&]:hover:bg-slate-200/60'
          )}
        >
          <Bold className="w-3.5 h-3.5" />
        </button>

        {/* Italic Button */}
        <button
          type="button"
          onMouseDown={preventFocusLoss}
          onClick={() => execCmd('italic')}
          title="Miring (Ctrl+I)"
          aria-label="Format teks miring"
          className={cn(
            'p-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer active:scale-95',
            activeStates.italic
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm [html[data-theme="celestial-sky"]_&]:bg-amber-100 [html[data-theme="celestial-sky"]_&]:text-amber-800 [html[data-theme="celestial-sky"]_&]:border-amber-300'
              : 'text-zinc-400 [html[data-theme="celestial-sky"]_&]:text-slate-600 hover:text-white [html[data-theme="celestial-sky"]_&]:hover:text-slate-900 hover:bg-white/[0.08] [html[data-theme="celestial-sky"]_&]:hover:bg-slate-200/60'
          )}
        >
          <Italic className="w-3.5 h-3.5" />
        </button>

        {/* Underline Button */}
        <button
          type="button"
          onMouseDown={preventFocusLoss}
          onClick={() => execCmd('underline')}
          title="Garis Bawah (Ctrl+U)"
          aria-label="Format teks garis bawah"
          className={cn(
            'p-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer active:scale-95',
            activeStates.underline
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm [html[data-theme="celestial-sky"]_&]:bg-amber-100 [html[data-theme="celestial-sky"]_&]:text-amber-800 [html[data-theme="celestial-sky"]_&]:border-amber-300'
              : 'text-zinc-400 [html[data-theme="celestial-sky"]_&]:text-slate-600 hover:text-white [html[data-theme="celestial-sky"]_&]:hover:text-slate-900 hover:bg-white/[0.08] [html[data-theme="celestial-sky"]_&]:hover:bg-slate-200/60'
          )}
        >
          <Underline className="w-3.5 h-3.5" />
        </button>

        <span className="w-px h-4 bg-white/[0.1] [html[data-theme='celestial-sky']_&]:bg-slate-300 mx-0.5" />

        {/* Heading Button */}
        <button
          type="button"
          onMouseDown={preventFocusLoss}
          onClick={() => execCmd('formatBlock', '<h2>')}
          title="Judul Bagian (H2)"
          aria-label="Format judul bab"
          className="p-1.5 rounded-lg text-zinc-400 [html[data-theme='celestial-sky']_&]:text-slate-600 hover:text-white [html[data-theme='celestial-sky']_&]:hover:text-slate-900 hover:bg-white/[0.08] [html[data-theme='celestial-sky']_&]:hover:bg-slate-200/60 active:scale-95 transition-all cursor-pointer"
        >
          <Heading2 className="w-3.5 h-3.5" />
        </button>

        {/* Bullet List Button */}
        <button
          type="button"
          onMouseDown={preventFocusLoss}
          onClick={() => execCmd('insertUnorderedList')}
          title="Daftar Poin"
          aria-label="Format daftar poin"
          className={cn(
            'p-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer active:scale-95',
            activeStates.unorderedList
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm [html[data-theme="celestial-sky"]_&]:bg-amber-100 [html[data-theme="celestial-sky"]_&]:text-amber-800 [html[data-theme="celestial-sky"]_&]:border-amber-300'
              : 'text-zinc-400 [html[data-theme="celestial-sky"]_&]:text-slate-600 hover:text-white [html[data-theme="celestial-sky"]_&]:hover:text-slate-900 hover:bg-white/[0.08] [html[data-theme="celestial-sky"]_&]:hover:bg-slate-200/60'
          )}
        >
          <List className="w-3.5 h-3.5" />
        </button>

        {/* Numbered List Button */}
        <button
          type="button"
          onMouseDown={preventFocusLoss}
          onClick={() => execCmd('insertOrderedList')}
          title="Daftar Angka (1, 2, 3)"
          aria-label="Format daftar angka"
          className={cn(
            'p-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer active:scale-95',
            activeStates.orderedList
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm [html[data-theme="celestial-sky"]_&]:bg-amber-100 [html[data-theme="celestial-sky"]_&]:text-amber-800 [html[data-theme="celestial-sky"]_&]:border-amber-300'
              : 'text-zinc-400 [html[data-theme="celestial-sky"]_&]:text-slate-600 hover:text-white [html[data-theme="celestial-sky"]_&]:hover:text-slate-900 hover:bg-white/[0.08] [html[data-theme="celestial-sky"]_&]:hover:bg-slate-200/60'
          )}
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </button>

        {/* Quote Button */}
        <button
          type="button"
          onMouseDown={preventFocusLoss}
          onClick={() => execCmd('formatBlock', '<blockquote>')}
          title="Kutipan (Quote)"
          aria-label="Format kutipan"
          className="p-1.5 rounded-lg text-zinc-400 [html[data-theme='celestial-sky']_&]:text-slate-600 hover:text-white [html[data-theme='celestial-sky']_&]:hover:text-slate-900 hover:bg-white/[0.08] [html[data-theme='celestial-sky']_&]:hover:bg-slate-200/60 active:scale-95 transition-all cursor-pointer"
        >
          <Quote className="w-3.5 h-3.5" />
        </button>

        {/* Remove Format Button */}
        <button
          type="button"
          onMouseDown={preventFocusLoss}
          onClick={() => execCmd('removeFormat')}
          title="Hapus Format (Kembali Teks Biasa)"
          aria-label="Hapus format terpilih"
          className="p-1.5 rounded-lg text-zinc-400 [html[data-theme='celestial-sky']_&]:text-slate-600 hover:text-rose-400 [html[data-theme='celestial-sky']_&]:hover:text-rose-600 hover:bg-white/[0.08] [html[data-theme='celestial-sky']_&]:hover:bg-rose-50 active:scale-95 transition-all cursor-pointer"
        >
          <RemoveFormatting className="w-3.5 h-3.5" />
        </button>

        <div className="ml-auto text-[10px] text-zinc-500 [html[data-theme='celestial-sky']_&]:text-slate-500 pr-1 hidden sm:block">
          Format Visual Aktif
        </div>
      </div>

      {/* Visual ContentEditable Surface (Theme-Adaptive High Contrast Typography) */}
      <div
        ref={editorRef}
        contentEditable={true}
        suppressContentEditableWarning={true}
        onInput={handleInput}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onMouseUp={handleMouseUp}
        data-placeholder={placeholder}
        className={cn(
          'w-full px-4 py-3 min-h-[200px] max-h-[420px] overflow-y-auto text-sm leading-relaxed',
          'text-[#F4F4F5] [html[data-theme="celestial-sky"]_&]:text-[#0F172A] bg-transparent focus:outline-none focus:ring-0',
          'empty:before:content-[attr(data-placeholder)] empty:before:text-zinc-500 [html[data-theme="celestial-sky"]_&]:empty:before:text-slate-400 empty:before:pointer-events-none',
          // High-contrast clean typography overrides
          '[&_h2]:text-base [&_h2]:font-bold [&_h2]:!text-[#FFFFFF] [html[data-theme="celestial-sky"]_&]:[&_h2]:!text-[#0F172A] [&_h2]:my-2',
          '[&_strong]:!text-[#FFFFFF] [html[data-theme="celestial-sky"]_&]:[&_strong]:!text-[#0F172A] [&_strong]:!font-extrabold',
          '[&_b]:!text-[#FFFFFF] [html[data-theme="celestial-sky"]_&]:[&_b]:!text-[#0F172A] [&_b]:!font-extrabold',
          '[&_em]:!text-[#E4E4E7] [html[data-theme="celestial-sky"]_&]:[&_em]:!text-[#1E293B] [&_em]:italic',
          '[&_i]:!text-[#E4E4E7] [html[data-theme="celestial-sky"]_&]:[&_i]:!text-[#1E293B] [&_i]:italic',
          '[&_u]:!text-[#FFFFFF] [html[data-theme="celestial-sky"]_&]:[&_u]:!text-[#0F172A] [&_u]:underline [&_u]:decoration-white/60 [html[data-theme="celestial-sky"]_&]:[&_u]:decoration-slate-400',
          '[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1.5 [&_ul]:!text-[#F4F4F5] [html[data-theme="celestial-sky"]_&]:[&_ul]:!text-[#0F172A]',
          '[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1.5 [&_ol]:!text-[#F4F4F5] [html[data-theme="celestial-sky"]_&]:[&_ol]:!text-[#0F172A]',
          '[&_li]:!text-[#F4F4F5] [html[data-theme="celestial-sky"]_&]:[&_li]:!text-[#0F172A]',
          '[&_blockquote]:border-l-2 [&_blockquote]:border-white/40 [html[data-theme="celestial-sky"]_&]:[&_blockquote]:border-sky-300 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:my-1.5 [&_blockquote]:!text-[#E4E4E7] [html[data-theme="celestial-sky"]_&]:[&_blockquote]:!text-[#334155]',
          // Overrule any rogue font color attributes or inline styles
          '[&_font]:!text-[#F4F4F5] [html[data-theme="celestial-sky"]_&]:[&_font]:!text-[#0F172A]',
          '[&_*[style]]:!color-[#F4F4F5] [html[data-theme="celestial-sky"]_&]:[&_*[style]]:!color-[#0F172A]'
        )}
      />
    </div>
  );
}
