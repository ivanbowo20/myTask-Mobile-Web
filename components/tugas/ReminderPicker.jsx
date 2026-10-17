'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, ChevronDown, Check } from 'lucide-react';
import OptionWheel from '@/components/ui/OptionWheel';
import { REMINDER_OPTIONS } from '@/lib/constants';

export default function ReminderPicker({
  value = '1h',
  onChange,
  id = 'task-reminder',
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Find index of current selected reminder
  const currentIndex = Math.max(
    0,
    REMINDER_OPTIONS.findIndex((opt) => opt.value === value)
  );

  const currentLabel =
    REMINDER_OPTIONS[currentIndex]?.label || 'Pilih Pengingat';

  // Handle outside click & escape key
  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        e.stopImmediatePropagation?.();
        setIsOpen(false);
        const triggerBtn = containerRef.current?.querySelector('button');
        triggerBtn?.focus();
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  function handleWheelChange(index) {
    const selected = REMINDER_OPTIONS[index];
    if (selected && onChange) {
      onChange(selected.value);
    }
  }

  return (
    <div ref={containerRef} className={`relative ${isOpen ? 'z-30' : 'z-10'} ${className}`}>
      {/* Trigger Button */}
      <button
        id={id}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white/[0.02] border transition-all duration-200 cursor-pointer backdrop-blur-sm flex items-center justify-between gap-2.5 text-left group ${
          isOpen
            ? 'border-[#FAFAFA] ring-1 ring-white/20 shadow-[0_0_15px_rgba(255,255,255,0.06)]'
            : 'border-white/[0.08] hover:border-white/[0.18]'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-zinc-400 group-hover:text-zinc-200 transition-colors shrink-0">
            <Bell className="w-3.5 h-3.5" />
          </div>
          <span className="text-base sm:text-sm font-medium text-[#FAFAFA] truncate">
            {currentLabel}
          </span>
        </div>

        <ChevronDown
          className={`w-4 h-4 text-zinc-400 transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-white' : 'group-hover:text-zinc-200'
          }`}
        />
      </button>

      {/* Floating 3D OptionWheel Popover */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-full left-0 right-0 w-full mt-2 z-50 rounded-2xl bg-[#0A0A0A] border border-white/[0.12] p-2.5 shadow-2xl backdrop-blur-xl overscroll-contain"
          >
            {/* Header info */}
            <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-white/[0.08] px-1">
              <span className="text-[10px] font-semibold tracking-wider uppercase text-zinc-400">
                Pilih Pengingat
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-[11px] px-2 py-0.5 rounded-md bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1 font-medium"
              >
                <Check className="w-3 h-3 text-emerald-400" /> Selesai
              </button>
            </div>

            {/* 3D Curved Dial Wheel Box (Compact h-24 / 96px) - Solid Pure Black */}
            <div className="relative h-24 w-full rounded-xl bg-black border border-white/[0.08] overflow-hidden">
              {/* Top & bottom depth fade gradients */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-7 bg-gradient-to-b from-black via-black/80 to-transparent z-10" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-7 bg-gradient-to-t from-black via-black/80 to-transparent z-10" />

              <OptionWheel
                items={REMINDER_OPTIONS}
                selectedIndex={currentIndex}
                onChange={handleWheelChange}
                onItemClick={(idx, item) => {
                  if (item && onChange) {
                    onChange(item.value);
                  }
                  setTimeout(() => setIsOpen(false), 120);
                }}
                side="center"
                fontSize={0.82}
                spacing={1.8}
                tilt={10}
                curve={0.5}
                fade={0.6}
                blur={1.2}
                minOpacity={0.12}
                smoothing={150}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

