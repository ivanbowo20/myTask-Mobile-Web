'use client';

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn, lockBodyScroll, unlockBodyScroll } from "@/lib/utils";

export default function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = "max-w-lg",
  className,
}) {
  const modalRef = useRef(null);
  const previousActiveElement = useRef(null);

  // Focus trap & ESC key handling
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e) {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (e.key === "Tab" && modalRef.current) {
        const focusables = Array.from(
          modalRef.current.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          )
        ).filter((el) => !el.hasAttribute("disabled") && (el.offsetParent !== null || el.getClientRects().length > 0));

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
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Focus restoration & initial focus
  useEffect(() => {
    if (!isOpen) return;

    previousActiveElement.current = document.activeElement;

    const timer = setTimeout(() => {
      if (modalRef.current) {
        if (
          document.activeElement &&
          modalRef.current.contains(document.activeElement) &&
          document.activeElement !== modalRef.current
        ) {
          return;
        }

        if (modalRef.current.querySelector('[data-delayed-focus]')) {
          return;
        }

        const autoFocusEl = modalRef.current.querySelector('[autofocus], [data-autofocus]');
        if (autoFocusEl && typeof autoFocusEl.focus === 'function') {
          autoFocusEl.focus();
          return;
        }

        const formControl = modalRef.current.querySelector(
          'input:not([disabled]), textarea:not([disabled]), select:not([disabled])'
        );
        if (formControl && typeof formControl.focus === 'function') {
          formControl.focus();
          return;
        }

        const focusables = Array.from(
          modalRef.current.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          )
        ).filter((el) => !el.hasAttribute("disabled") && (el.offsetParent !== null || el.getClientRects().length > 0));

        if (focusables.length > 0) {
          focusables[0].focus();
        } else {
          modalRef.current.focus();
        }
      }
    }, 50);

    return () => {
      clearTimeout(timer);
      if (previousActiveElement.current && typeof previousActiveElement.current.focus === "function") {
        previousActiveElement.current.focus();
      }
    };
  }, [isOpen]);

  // Lock body scroll using global ref counter
  useEffect(() => {
    if (isOpen) {
      lockBodyScroll();
      return () => {
        unlockBodyScroll();
      };
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          key="modal-container"
          className="fixed inset-0 z-50 flex items-stretch lg:items-center justify-center p-0 lg:p-6 overflow-hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          {/* Overlay with subtle blur (Desktop only, mobile adalah layar penuh native) */}
          <motion.div
            key="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="hidden lg:block fixed inset-0 bg-black/60 backdrop-blur-[4px] z-0"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Modal Dialog Box: Fullscreen Native Screen di Mobile (< lg), Centered Box di Desktop (lg+) */}
          <motion.div
            key="modal-dialog"
            ref={modalRef}
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } }}
            exit={{ opacity: 0, y: 16, transition: { duration: 0.15, ease: "easeIn" } }}
            className={cn(
              // Mobile: Fullscreen Native App Screen (100dvh, adaptif otomatis saat keyboard muncul)
              "relative z-10 w-full h-[100dvh] flex flex-col glass-modal text-[#FAFAFA] overflow-hidden focus:outline-none rounded-none border-0",
              // Desktop: Centered Rounded Glass Box
              "lg:h-auto lg:max-h-[90vh] lg:rounded-2xl lg:p-6 lg:my-8 lg:shadow-2xl",
              maxWidth,
              className
            )}
          >
            {/* Header: Safe-area aware di HP */}
            <div className="shrink-0 flex items-center justify-between px-4 py-3.5 lg:px-0 lg:py-0 lg:pb-3 border-b border-white/[0.08] bg-[var(--theme-nav-bg,#0C0A09)]/95 lg:bg-transparent backdrop-blur-md lg:backdrop-blur-none pt-[calc(0.85rem+env(safe-area-inset-top,0px))] lg:pt-0">
              <div className="space-y-0.5">
                {title && (
                  <h2 id="modal-title" className="font-heading text-lg font-bold text-[#FAFAFA] tracking-tight">
                    {title}
                  </h2>
                )}
                {description && (
                  <p className="text-xs text-[#A1A1AA] hidden lg:block">{description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Tutup jendela modal"
                className="w-10 h-10 -mr-1 inline-flex items-center justify-center rounded-xl text-[#71717A] hover:text-[#FAFAFA] hover:bg-white/[0.08] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FAFAFA] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Content Body */}
            <div className="overflow-y-auto flex-1 px-4 py-3.5 lg:px-0 lg:py-0 lg:pr-1 min-h-0">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
