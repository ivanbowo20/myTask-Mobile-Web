'use client';

import { useEffect, useRef, useState } from "react";
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
  defaultMobileExpanded = false,
}) {
  const modalRef = useRef(null);
  const previousActiveElement = useRef(null);
  const [isMobileExpanded, setIsMobileExpanded] = useState(defaultMobileExpanded);
  const touchStartY = useRef(null);

  // Reset status ekspansi saat modal dibuka ulang
  useEffect(() => {
    if (isOpen) {
      setIsMobileExpanded(defaultMobileExpanded);
    }
  }, [isOpen, defaultMobileExpanded]);

  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    if (touchStartY.current === null) return;
    const touchEndY = e.changedTouches[0].clientY;
    const diff = touchEndY - touchStartY.current;
    // Geser ke atas (swipe up) -> Perluas ke atas
    if (diff < -40 && !isMobileExpanded) {
      setIsMobileExpanded(true);
    }
    // Geser ke bawah (swipe down) -> Perkecil jika sedang luas, atau tutup jika sudah kecil
    else if (diff > 40) {
      if (isMobileExpanded) {
        setIsMobileExpanded(false);
      } else {
        onClose();
      }
    }
    touchStartY.current = null;
  };

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

        // 0. If container has elements requesting delayed focus, yield focus to their handler
        if (modalRef.current.querySelector('[data-delayed-focus]')) {
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
          className="fixed inset-0 z-50 flex items-end lg:items-center justify-center p-0 sm:p-4 md:p-6 overflow-y-auto"
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

          {/* Modal Dialog Box (Fluid Responsive Bottom Sheet on Mobile, Centered Modal on Desktop) */}
          <motion.div
            key="modal-dialog"
            ref={modalRef}
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 30, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.22, ease: "easeOut" } }}
            exit={{ opacity: 0, y: 30, scale: 0.98, transition: { duration: 0.16, ease: "easeIn" } }}
            className={cn(
              "relative w-full rounded-t-3xl lg:rounded-2xl p-4 sm:p-5 lg:p-6 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] lg:pb-6 my-0 lg:my-8 z-10 space-y-3 lg:space-y-4 flex flex-col overflow-hidden shadow-2xl focus:outline-none transition-[height,max-height] duration-300 ease-out",
              isMobileExpanded
                ? "h-[92dvh] max-h-[95dvh]"
                : "h-[68dvh] max-h-[75dvh]",
              "lg:h-auto lg:max-h-[90vh]",
              "glass-modal",
              maxWidth,
              className
            )}
          >
            {/* Interactive Mobile Bottom Sheet Pull Pill Handle */}
            <button
              type="button"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              onClick={() => setIsMobileExpanded((prev) => !prev)}
              aria-label={isMobileExpanded ? "Kecilkan jendela" : "Perluas jendela ke atas"}
              className="w-full py-1.5 -mt-2 mb-0.5 lg:hidden flex flex-col items-center justify-center cursor-pointer select-none touch-none group focus:outline-none"
            >
              <div className="w-12 h-1.5 rounded-full bg-white/30 group-hover:bg-white/50 group-active:bg-white/70 transition-colors" />
              <span className="text-[10px] text-zinc-400 mt-1 font-medium group-hover:text-zinc-200 transition-colors">
                {isMobileExpanded ? "Tarik turun untuk perkecil" : "Tarik naik untuk perluas layar"}
              </span>
            </button>

            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-[rgba(255,255,255,0.08)] gap-4">
              <div className="space-y-1">
                {title && (
                  <h2 id="modal-title" className="font-heading text-lg font-bold text-[#FAFAFA]">
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
                className="min-h-[44px] min-w-[44px] -mr-2 -mt-2 inline-flex items-center justify-center rounded-lg text-[#71717A] hover:text-[#FAFAFA] hover:bg-[rgba(255,255,255,0.06)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FAFAFA]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="overflow-y-auto flex-1 pr-1 min-h-0">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
