'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ChevronLeft, ChevronRight, Check, X, Clock } from 'lucide-react';
import OptionWheel from '@/components/ui/OptionWheel';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
];

const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

function formatDisplayDate(val) {
  if (!val) return '';
  const d = new Date(val);
  if (isNaN(d.getTime())) return '';
  const day = d.getDate();
  const month = MONTH_SHORT[d.getMonth()];
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${month} ${year}, ${hours}:${minutes}`;
}

export default function DateTimePicker({
  value = '',
  onChange,
  id = 'task-deadline',
  placeholder = 'Pilih tenggat waktu...',
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Selected state when opening
  const initialDate = useMemo(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) return d;
    }
    // Default to tomorrow 12:00 if empty
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(12, 0, 0, 0);
    return tomorrow;
  }, [value]);

  const [selectedDay, setSelectedDay] = useState(initialDate.getDate());
  const [selectedMonth, setSelectedMonth] = useState(initialDate.getMonth());
  const [selectedYear, setSelectedYear] = useState(initialDate.getFullYear());
  const [selectedHour, setSelectedHour] = useState(initialDate.getHours());
  const [selectedMinute, setSelectedMinute] = useState(initialDate.getMinutes());

  // Month navigation in calendar
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());

  // Sync internal state when opened
  useEffect(() => {
    if (isOpen) {
      const d = value ? new Date(value) : initialDate;
      const validDate = isNaN(d.getTime()) ? initialDate : d;
      setSelectedDay(validDate.getDate());
      setSelectedMonth(validDate.getMonth());
      setSelectedYear(validDate.getFullYear());
      setSelectedHour(validDate.getHours());
      setSelectedMinute(validDate.getMinutes());
      setViewMonth(validDate.getMonth());
      setViewYear(validDate.getFullYear());
    }
  }, [isOpen, value, initialDate]);

  // Outside click & escape listener
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

  // Calendar calculations
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
  const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();

  function handlePrevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function handleNextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  function handleSelectDay(day) {
    setSelectedDay(day);
    setSelectedMonth(viewMonth);
    setSelectedYear(viewYear);
  }

  function handleApply() {
    const y = selectedYear;
    const m = String(selectedMonth + 1).padStart(2, '0');
    const d = String(selectedDay).padStart(2, '0');
    const h = String(selectedHour).padStart(2, '0');
    const min = String(selectedMinute).padStart(2, '0');
    const resultString = `${y}-${m}-${d}T${h}:${min}`;
    onChange?.(resultString);
    setIsOpen(false);
  }

  function handleClear() {
    onChange?.('');
    setIsOpen(false);
  }

  const today = new Date();
  const isToday = (day) =>
    today.getDate() === day &&
    today.getMonth() === viewMonth &&
    today.getFullYear() === viewYear;

  const isCurrentSelection = (day) =>
    selectedDay === day &&
    selectedMonth === viewMonth &&
    selectedYear === viewYear;

  const displayString = formatDisplayDate(value);

  return (
    <div ref={containerRef} className={`relative ${isOpen ? 'z-30' : 'z-10'} ${className}`}>
      {/* Trigger Button */}
      <button
        id={id}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white/[0.02] border transition-all duration-200 cursor-pointer backdrop-blur-sm flex items-center justify-between gap-2.5 text-left group ${
          isOpen
            ? 'border-[#FAFAFA] ring-1 ring-white/20 shadow-[0_0_15px_rgba(255,255,255,0.06)]'
            : 'border-white/[0.08] hover:border-white/[0.18]'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-zinc-400 group-hover:text-zinc-200 transition-colors shrink-0">
            <Calendar className="w-3.5 h-3.5" />
          </div>
          <span
            className={`text-base sm:text-sm truncate ${
              displayString ? 'font-medium text-[#FAFAFA]' : 'text-zinc-400'
            }`}
          >
            {displayString || placeholder}
          </span>
        </div>

        <Clock
          className={`w-4 h-4 text-zinc-400 transition-colors shrink-0 ${
            isOpen ? 'text-white' : 'group-hover:text-zinc-200'
          }`}
        />
      </button>

      {/* Floating Glass DateTime Popover */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-full left-0 mt-2 z-50 w-full sm:w-[470px] max-w-[calc(100vw-2rem)] rounded-2xl glass-dropdown p-3.5 sm:p-4 shadow-2xl backdrop-blur-2xl overscroll-contain"
          >
            {/* Header Dialog */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-zinc-300" />
                <span className="text-xs font-semibold text-[#FAFAFA] tracking-wide">
                  Atur Tenggat Waktu
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-6 h-6 rounded-md hover:bg-white/[0.08] flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
                aria-label="Tutup"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Responsive Content: Split View (Calendar Left, Dual OptionWheel Right) */}
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Left Column: Calendar */}
              <div className="flex-1 min-w-[210px]">
                {/* Month Navigation */}
                <div className="flex items-center justify-between mb-2.5 px-1">
                  <span className="text-xs font-semibold text-[#FAFAFA]">
                    {MONTH_NAMES[viewMonth]} {viewYear}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handlePrevMonth}
                      className="w-6 h-6 rounded-md hover:bg-white/[0.08] flex items-center justify-center text-zinc-300 hover:text-white transition-colors cursor-pointer"
                      aria-label="Bulan sebelumnya"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleNextMonth}
                      className="w-6 h-6 rounded-md hover:bg-white/[0.08] flex items-center justify-center text-zinc-300 hover:text-white transition-colors cursor-pointer"
                      aria-label="Bulan berikutnya"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Day Names Header */}
                <div className="grid grid-cols-7 gap-1 text-center mb-1">
                  {DAY_NAMES.map((dn, idx) => (
                    <span
                      key={dn}
                      className={`text-[10px] font-semibold tracking-wider ${
                        idx === 0 ? 'text-red-400/80' : 'text-zinc-400'
                      }`}
                    >
                      {dn}
                    </span>
                  ))}
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 gap-1 text-center">
                  {/* Previous Month Padding Days */}
                  {Array.from({ length: firstDayIndex }).map((_, i) => {
                    const prevDay = prevMonthDays - firstDayIndex + i + 1;
                    return (
                      <span
                        key={`prev-${prevDay}`}
                        className="h-7 flex items-center justify-center text-xs text-zinc-600 select-none"
                      >
                        {prevDay}
                      </span>
                    );
                  })}

                  {/* Current Month Days */}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const selected = isCurrentSelection(day);
                    const todayDay = isToday(day);

                    return (
                      <button
                        key={`day-${day}`}
                        type="button"
                        onClick={() => handleSelectDay(day)}
                        className={`h-7 w-full rounded-lg text-xs transition-all duration-150 cursor-pointer flex items-center justify-center select-none ${
                          selected
                            ? 'bg-white text-black font-bold shadow-md scale-105'
                            : todayDay
                            ? 'border border-white/30 text-white font-semibold hover:bg-white/[0.08]'
                            : 'text-zinc-300 hover:bg-white/[0.08] hover:text-white'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Center Divider */}
              <div className="hidden sm:block w-[1px] bg-white/[0.08] self-stretch" />
              <div className="block sm:hidden h-[1px] w-full bg-white/[0.08]" />

              {/* Right Column: Time Wheel (24 Jam) */}
              <div className="w-full sm:w-44 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 mb-2 px-1">
                    <Clock className="w-3.5 h-3.5 text-zinc-400" />
                    <span className="text-xs font-semibold text-[#FAFAFA]">
                      Waktu (24 Jam)
                    </span>
                  </div>

                  {/* Dual OptionWheel Box */}
                  <div className="flex items-center justify-center gap-2 pt-1">
                    {/* Hour Wheel */}
                    <div className="flex-1 text-center">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                        Jam
                      </div>
                      <div className="relative h-32 w-full rounded-xl bg-black border border-white/[0.08] overflow-hidden">
                        <div className="pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-black via-black/80 to-transparent z-10" />
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black via-black/80 to-transparent z-10" />
                        <OptionWheel
                          items={HOURS}
                          selectedIndex={selectedHour}
                          onChange={(idx) => setSelectedHour(idx)}
                          side="center"
                          fontSize={0.88}
                          spacing={1.8}
                          tilt={10}
                          curve={0.5}
                          fade={0.6}
                          blur={1.2}
                          minOpacity={0.12}
                          smoothing={150}
                        />
                      </div>
                    </div>

                    <span className="text-lg font-bold text-zinc-500 mt-5">:</span>

                    {/* Minute Wheel */}
                    <div className="flex-1 text-center">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                        Menit
                      </div>
                      <div className="relative h-32 w-full rounded-xl bg-black border border-white/[0.08] overflow-hidden">
                        <div className="pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-black via-black/80 to-transparent z-10" />
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black via-black/80 to-transparent z-10" />
                        <OptionWheel
                          items={MINUTES}
                          selectedIndex={selectedMinute}
                          onChange={(idx) => setSelectedMinute(idx)}
                          side="center"
                          fontSize={0.88}
                          spacing={1.8}
                          tilt={10}
                          curve={0.5}
                          fade={0.6}
                          blur={1.2}
                          minOpacity={0.12}
                          smoothing={150}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Selected Time Preview Note */}
                <div className="mt-2 text-center text-[11px] text-zinc-400 font-mono py-1 rounded bg-white/[0.02] border border-white/[0.04]">
                  {String(selectedHour).padStart(2, '0')}:
                  {String(selectedMinute).padStart(2, '0')} WIB
                </div>
              </div>
            </div>

            {/* Bottom Actions Footer */}
            <div className="pt-3 mt-3 border-t border-white/[0.08] flex items-center justify-between gap-2">
              <div>
                {value && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="text-xs text-red-400 hover:text-red-300 hover:underline transition-colors cursor-pointer font-medium"
                  >
                    Hapus Tenggat
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white text-black hover:bg-zinc-200 transition-colors cursor-pointer shadow-sm flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5 text-black" />
                  Terapkan
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

