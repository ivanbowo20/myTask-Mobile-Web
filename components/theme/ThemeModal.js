'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Shirt, Sparkles } from 'lucide-react';
import { useTheme } from '@/lib/theme-context';
import { cn, lockBodyScroll, unlockBodyScroll } from '@/lib/utils';

export default function ThemeModal() {
  const { isThemeModalOpen, closeThemeModal, theme, setTheme, themes } = useTheme();
  const modalRef = useRef(null);
  const previousActiveElement = useRef(null);

  // Focus trap & ESC key handling
  useEffect(() => {
    if (!isThemeModalOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeThemeModal();
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusables = Array.from(
          modalRef.current.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          )
        ).filter((el) => !el.hasAttribute('disabled') && (el.offsetParent !== null || el.getClientRects().length > 0));

        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }

        const firstElement = focusables[0];
        const lastElement = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (
            document.activeElement === firstElement ||
            document.activeElement === modalRef.current ||
            !modalRef.current.contains(document.activeElement)
          ) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (
            document.activeElement === lastElement ||
            document.activeElement === modalRef.current ||
            !modalRef.current.contains(document.activeElement)
          ) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isThemeModalOpen, closeThemeModal]);

  // Focus restoration & initial focus
  useEffect(() => {
    if (!isThemeModalOpen) return;

    previousActiveElement.current = document.activeElement;

    const timer = setTimeout(() => {
      if (modalRef.current) {
        // Do not steal focus if an element inside is already focused
        if (
          document.activeElement &&
          modalRef.current.contains(document.activeElement) &&
          document.activeElement !== modalRef.current
        ) {
          return;
        }

        // Prioritize focusing currently active theme card for accessible context
        const activeThemeBtn = modalRef.current.querySelector('button[aria-pressed="true"]');
        if (activeThemeBtn && typeof activeThemeBtn.focus === 'function') {
          activeThemeBtn.focus();
          return;
        }

        const focusables = Array.from(
          modalRef.current.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          )
        ).filter((el) => !el.hasAttribute('disabled') && (el.offsetParent !== null || el.getClientRects().length > 0));

        if (focusables.length > 0) {
          focusables[0].focus();
        } else {
          modalRef.current.focus();
        }
      }
    }, 50);

    return () => {
      clearTimeout(timer);
      if (previousActiveElement.current && typeof previousActiveElement.current.focus === 'function') {
        previousActiveElement.current.focus();
      }
    };
  }, [isThemeModalOpen]);

  // Lock body scroll using global ref counter
  useEffect(() => {
    if (isThemeModalOpen) {
      lockBodyScroll();
      return () => {
        unlockBodyScroll();
      };
    }
  }, [isThemeModalOpen]);

  return (
    <AnimatePresence>
      {isThemeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/65 backdrop-blur-[6px]"
            onClick={closeThemeModal}
            aria-hidden="true"
          />

          {/* Modal / Bottom Sheet Container */}
          <motion.div
            ref={modalRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="theme-modal-title"
            initial={{ opacity: 0, scale: 0.95, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ type: 'spring', damping: 28, stiffness: 350 }}
            className="relative w-full max-w-4xl glass-modal rounded-t-3xl sm:rounded-3xl p-5 sm:p-7 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] sm:pb-7 z-10 border-t sm:border border-white/[0.12] shadow-[0_24px_64px_-12px_rgba(0,0,0,0.85)] max-h-[92vh] sm:max-h-[90vh] overflow-y-auto focus:outline-none"
          >
            {/* Mobile Bottom Sheet Grab Handle */}
            <div className="w-12 h-1 rounded-full bg-white/20 mx-auto mb-4 sm:hidden theme-modal-handle" aria-hidden="true" />
            {/* Header */}
            <div className="flex items-start justify-between pb-5 border-b border-white/[0.08]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/[0.12] flex items-center justify-center text-[var(--theme-accent,#D97706)] shadow-inner">
                  <Shirt className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2
                      id="theme-modal-title"
                      className="font-heading text-lg sm:text-xl font-bold text-[#FAFAFA] tracking-tight"
                    >
                      Pilih Tema Tampilan
                    </h2>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--theme-accent,#D97706)]/15 text-[var(--theme-accent,#D97706)] border border-[var(--theme-accent,#D97706)]/30">
                      PRO
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-[#A1A1AA] mt-0.5">
                    Ubah atmosfer visual workspace sesuai suasana fokus Anda.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeThemeModal}
                aria-label="Tutup pemilih tema"
                className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl text-[#71717A] hover:text-[#FAFAFA] hover:bg-white/[0.08] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Theme Swatch Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-5 pb-2">
              {themes.map((t) => {
                const isActive = theme === t.id;

                return (
                  <motion.button
                    key={t.id}
                    type="button"
                    onClick={() => setTheme(t.id)}
                    aria-pressed={isActive}
                    whileHover={{ y: -3, scale: 1.015 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    className={cn(
                      'relative flex flex-col text-left rounded-2xl p-4 transition-all duration-200 cursor-pointer group',
                      isActive
                        ? 'border-2 border-[var(--theme-accent,#D97706)] bg-[var(--theme-glow-subtle,rgba(217,119,6,0.12))] shadow-[0_0_24px_rgba(0,0,0,0.5),0_0_12px_var(--theme-glow,rgba(217,119,6,0.3))]'
                        : 'border border-white/[0.08] bg-white/[0.02] hover:border-white/[0.2] hover:bg-white/[0.05]'
                    )}
                  >
                    {/* Active Checkmark Badge */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#A1A1AA]">
                        {t.badge}
                      </span>
                      {isActive ? (
                        <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-[var(--theme-accent,#D97706)] text-white shadow-sm theme-active-badge">
                          <Check className="w-3 h-3 stroke-[3]" />
                          Aktif
                        </span>
                      ) : (
                        <span className="text-[10px] text-[#71717A] opacity-0 group-hover:opacity-100 transition-opacity">
                          Klik untuk aktifkan
                        </span>
                      )}
                    </div>

                    {/* Interactive Swatch Preview Window */}
                    <div className="relative w-full h-24 rounded-xl overflow-hidden mb-3.5 border border-white/[0.1] shadow-inner flex items-center justify-center">
                      {t.id === 'dark-chocolate' && (
                        <div className="absolute inset-0 bg-gradient-to-br from-[#0C0A09] via-[#140E0B] to-[#1C130D]">
                          <div className="absolute -top-4 -left-4 w-20 h-20 rounded-full bg-[#D97706]/35 filter blur-[14px]" />
                          <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full bg-[#78350F]/45 filter blur-[16px]" />
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-[#B45309]/30 filter blur-[10px]" />
                        </div>
                      )}

                      {t.id === 'soft-aurora' && (
                        <div className="absolute inset-0 bg-gradient-to-br from-[#060810] via-[#091122] to-[#0D162B]">
                          <div className="absolute top-1/4 -left-2 w-32 h-12 rounded-full bg-[#06B6D4]/45 filter blur-[14px] -rotate-12" />
                          <div className="absolute top-1/2 -right-2 w-32 h-12 rounded-full bg-[#E879F9]/40 filter blur-[16px] rotate-12" />
                          <div className="absolute bottom-1 left-1/4 w-28 h-10 rounded-full bg-[#6366F1]/35 filter blur-[12px]" />
                        </div>
                      )}

                      {t.id === 'abyssal-teal' && (
                        <div className="absolute inset-0 bg-gradient-to-br from-[#021013] via-[#04282E] to-[#0A4A4E] overflow-hidden">
                          <div className="absolute top-1/4 -right-2 w-28 h-20 rounded-full bg-[#0D9488]/55 filter blur-[14px]" />
                          <div className="absolute -bottom-2 -left-2 w-28 h-18 rounded-full bg-[#2DD4BF]/45 filter blur-[16px]" />
                          <div className="absolute top-1/2 left-1/3 w-20 h-20 rounded-full bg-[#10B981]/35 filter blur-[12px]" />
                        </div>
                      )}

                      {t.id === 'celestial-sky' && (
                        <div className="absolute inset-0 bg-gradient-to-b from-[#3172B8] via-[#60A5FA] to-[#BAE6FD] overflow-hidden">
                          <div className="absolute top-1 left-2 w-20 h-10 rounded-full bg-white/75 filter blur-[7px]" />
                          <div className="absolute top-6 right-1 w-24 h-12 rounded-full bg-white/85 filter blur-[8px]" />
                          <div className="absolute -bottom-2 left-1/3 w-28 h-14 rounded-full bg-white/70 filter blur-[8px]" />
                        </div>
                      )}

                      {/* Floating glass preview card mockup */}
                      <div className="relative z-10 px-3 py-1.5 rounded-lg bg-black/40 backdrop-blur-md border border-white/[0.12] flex items-center gap-2 shadow-md">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: t.accentColor }}
                        />
                        <span
                          className="text-[10px] font-semibold tracking-wide theme-preview-tagline"
                          style={{ color: '#FAFAFA' }}
                        >
                          {t.tagline}
                        </span>
                      </div>
                    </div>

                    {/* Theme Info */}
                    <div className="space-y-1 flex-1">
                      <h3 className="font-heading text-sm font-bold text-[#FAFAFA] flex items-center justify-between">
                        {t.name}
                        {t.isDefault && (
                          <span className="text-[9px] font-normal text-[#71717A]">
                            (Bawaan)
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-[#A1A1AA] line-clamp-2 leading-relaxed">
                        {t.description}
                      </p>
                    </div>

                    {/* Palette Swatches */}
                    <div className="flex items-center gap-1.5 pt-3 mt-3 border-t border-white/[0.06]">
                      {t.swatchColors.map((color, idx) => (
                        <span
                          key={idx}
                          className="w-3.5 h-3.5 rounded-full border border-white/[0.12] shadow-sm"
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Footer / Contrast Guarantee Notice */}
            <div className="pt-4 mt-4 border-t border-white/[0.08] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-[#71717A]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-[var(--theme-accent,#D97706)] shrink-0" />
                <span>
                  Tersimpan otomatis • Dilengkapi proteksi kontras teks WCAG AA.
                </span>
              </div>
              <button
                type="button"
                onClick={closeThemeModal}
                className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-[#FAFAFA] font-medium transition-colors cursor-pointer self-end sm:self-auto"
              >
                Selesai
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

