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
        // Do not steal focus if React autoFocus already focused an element inside
        if (
          document.activeElement &&
          modalRef.current.contains(document.activeElement) &&
          document.activeElement !== modalRef.current
        ) {
          return;
        }

        // 1. Check for explicit autofocus attribute
        const autoFocusEl = modalRef.current.querySelector('[autofocus], [data-autofocus]');
        if (autoFocusEl && typeof autoFocusEl.focus === 'function') {
          autoFocusEl.focus();
          return;
        }

        // 2. Check for primary interactive content form control (input, textarea, select)
        const formControl = modalRef.current.querySelector(
          'input:not([disabled]), textarea:not([disabled]), select:not([disabled])'
        );
        if (formControl && typeof formControl.focus === 'function') {
          formControl.focus();
          return;
        }

        // 3. Fallback to first focusable element or modal container
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
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          {/* Overlay with subtle blur */}
          <motion.div
            key="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-[4px]"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Modal Dialog Box with 20px blur and scale(0.98 -> 1) */}
          <motion.div
            key="modal-dialog"
            ref={modalRef}
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1, transition: { duration: 0.2, ease: "easeOut" } }}
            exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.15, ease: "easeIn" } }}
            className={cn(
              "relative w-full rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] sm:pb-6 my-0 sm:my-8 z-10 space-y-4 max-h-[95vh] sm:max-h-[90vh] flex flex-col shadow-2xl focus:outline-none",
              "glass-modal",
              maxWidth,
              className
            )}
          >
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-[rgba(255,255,255,0.08)] gap-4">
              <div className="space-y-1">
                {title && (
                  <h2 id="modal-title" className="font-heading text-lg font-bold text-[#FAFAFA]">
                    {title}
                  </h2>
                )}
                {description && (
                  <p className="text-xs text-[#A1A1AA]">{description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Tutup jendela modal"
                className="min-h-[44px] min-w-[44px] -mr-2 -mt-2 inline-flex items-center justify-center rounded-lg text-[#71717A] hover:text-[#FAFAFA] hover:bg-[rgba(255,255,255,0.06)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FAFAFA]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="overflow-y-auto flex-1 pr-1">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
