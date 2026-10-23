'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ChevronLeft, ChevronRight, Check, X, Clock, ArrowRight, ArrowLeft } from 'lucide-react';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
];

const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

const QUICK_TIMES = [
  { label: '09:00', desc: 'Pagi', h: 9, m: 0 },
  { label: '12:00', desc: 'Siang', h: 12, m: 0 },
  { label: '17:00', desc: 'Sore', h: 17, m: 0 },
  { label: '20:00', desc: 'Malam', h: 20, m: 0 },
];

function getPresetDate(type) {
  const now = new Date();
  if (type === "today-17") {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 17, 0, 0);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T17:00`;
  }
  if (type === "tomorrow-09") {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 9, 0, 0);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T09:00`;
  }
  if (type === "tomorrow-17") {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 17, 0, 0);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T17:00`;
  }
  if (type === "next-day-09") {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2, 9, 0, 0);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T09:00`;
  }
  return '';
}

function toDatetimeLocalString(val) {
  if (!val) return '';
  const d = new Date(val);
  if (isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day}T${h}:${min}`;
}

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
  const [mobileTab, setMobileTab] = useState('date'); // 'date' | 'time'
  const containerRef = useRef(null);
  const timeInputRef = useRef(null);
  const dateInputRef = useRef(null);

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
      setMobileTab('date');
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
    if (isPrevMonthDisabled) return;
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
    if (isDayInPast(day)) return;
    setSelectedDay(day);
    setSelectedMonth(viewMonth);
    setSelectedYear(viewYear);

    // Jika memilih hari ini dan waktu terpilih saat ini sudah lewat, geser otomatis ke jam berikutnya
    if (viewYear === currentYear && viewMonth === currentMonth && day === currentDate) {
      if (selectedHour < currentHour || (selectedHour === currentHour && selectedMinute <= currentMinute)) {
        const nextHour = Math.min(23, currentHour + 1);
        setSelectedHour(nextHour);
        setSelectedMinute(0);
      }
    }
  }

  function handleNativeDateChange(e) {
    const val = e.target.value;
    if (val) {
      const parts = val.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
          if (isDayInPast(d, m, y)) {
            return;
          }
          setSelectedYear(y);
          setSelectedMonth(m);
          setSelectedDay(d);
          setViewYear(y);
          setViewMonth(m);

          if (y === currentYear && m === currentMonth && d === currentDate) {
            if (selectedHour < currentHour || (selectedHour === currentHour && selectedMinute <= currentMinute)) {
              const nextHour = Math.min(23, currentHour + 1);
              setSelectedHour(nextHour);
              setSelectedMinute(0);
            }
          }
        }
      }
    }
  }

  function handleDateCardClick() {
    if (dateInputRef.current) {
      try {
        if (typeof dateInputRef.current.showPicker === 'function') {
          dateInputRef.current.showPicker();
        } else {
          dateInputRef.current.focus();
        }
      } catch {
        dateInputRef.current.focus();
      }
    }
  }

  function handleNativeTimeChange(e) {
    const val = e.target.value;
    if (val) {
      const parts = val.split(':');
      if (parts.length >= 2) {
        const h = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        if (!isNaN(h) && !isNaN(m)) {
          setSelectedHour(h);
          setSelectedMinute(m);
        }
      }
    }
  }

  function handleTimeCardClick() {
    if (timeInputRef.current) {
      try {
        if (typeof timeInputRef.current.showPicker === 'function') {
          timeInputRef.current.showPicker();
        } else {
          timeInputRef.current.focus();
        }
      } catch {
        timeInputRef.current.focus();
      }
    }
  }

  function handleApply() {
    if (isSelectedTimePast) return;
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

  const today = useMemo(() => new Date(), [isOpen]);
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const currentDate = today.getDate();
  const currentHour = today.getHours();
  const currentMinute = today.getMinutes();
  const minDateString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(currentDate).padStart(2, '0')}`;

  const isPrevMonthDisabled =
    viewYear < currentYear ||
    (viewYear === currentYear && viewMonth <= currentMonth);

  function isDayInPast(day, m = viewMonth, y = viewYear) {
    if (y < currentYear) return true;
    if (y === currentYear && m < currentMonth) return true;
    if (y === currentYear && m === currentMonth && day < currentDate) return true;
    return false;
  }

  const isSelectedTimePast = useMemo(() => {
    if (
      selectedYear < currentYear ||
      (selectedYear === currentYear && selectedMonth < currentMonth) ||
      (selectedYear === currentYear && selectedMonth === currentMonth && selectedDay < currentDate)
    ) {
      return true;
    }
    if (
      selectedYear === currentYear &&
      selectedMonth === currentMonth &&
      selectedDay === currentDate
    ) {
      if (selectedHour < currentHour) return true;
      if (selectedHour === currentHour && selectedMinute <= currentMinute) return true;
    }
    return false;
  }, [selectedYear, selectedMonth, selectedDay, selectedHour, selectedMinute, currentYear, currentMonth, currentDate, currentHour, currentMinute]);

  const isToday = (day) =>
    currentDate === day &&
    currentMonth === viewMonth &&
    currentYear === viewYear;

  const isCurrentSelection = (day) =>
    selectedDay === day &&
    selectedMonth === viewMonth &&
    selectedYear === viewYear;

  const displayString = formatDisplayDate(value);
  const timeValueString = `${String(selectedHour).padStart(2, '0')}:${String(selectedMinute).padStart(2, '0')}`;
  const dateValueString = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;

  // Reusable Calendar Content
  const renderCalendar = (isMobile = false) => (
    <div className="w-full">
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-2.5 px-1">
        <span className="text-xs font-bold text-zinc-900 dark:text-[#FAFAFA] tracking-wide">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePrevMonth}
            disabled={isPrevMonthDisabled}
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
              isPrevMonthDisabled
                ? 'opacity-30 cursor-not-allowed text-zinc-400 dark:text-zinc-600 pointer-events-none'
                : 'hover:bg-zinc-100 dark:hover:bg-white/[0.08] active:scale-95 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white cursor-pointer'
            }`}
            aria-label="Bulan sebelumnya"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="w-7 h-7 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/[0.08] active:scale-95 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-all cursor-pointer"
            aria-label="Bulan berikutnya"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Day Names Header */}
      <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
        {DAY_NAMES.map((dn, idx) => (
          <span
            key={dn}
            className={`text-[10px] font-semibold tracking-wider ${
              idx === 0 ? 'text-red-500 dark:text-red-400' : 'text-zinc-500 dark:text-zinc-400'
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
              className={`${
                isMobile ? 'h-9 text-xs' : 'h-7 text-xs'
              } flex items-center justify-center text-zinc-400 dark:text-zinc-600 select-none`}
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
          const isPast = isDayInPast(day);

          return (
            <button
              key={`day-${day}`}
              type="button"
              disabled={isPast}
              onClick={() => !isPast && handleSelectDay(day)}
              className={`${
                isMobile ? 'h-9 text-xs' : 'h-7 text-xs'
              } w-full rounded-lg transition-all duration-150 flex items-center justify-center select-none ${
                isPast
                  ? 'opacity-25 text-zinc-400 dark:text-zinc-600 cursor-not-allowed pointer-events-none'
                  : selected
                  ? 'bg-[var(--theme-accent,#0284C7)] text-white font-bold shadow-md scale-105 ring-2 ring-[var(--theme-glow,rgba(2,132,199,0.3))] active:scale-95 cursor-pointer'
                  : todayDay
                  ? 'border border-[var(--theme-accent,#0284C7)] text-[var(--theme-accent,#0284C7)] font-bold hover:bg-zinc-100 dark:hover:bg-white/[0.08] active:scale-95 cursor-pointer'
                  : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.08] hover:text-zinc-900 dark:hover:text-white active:scale-95 cursor-pointer'
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* Mobile Footnote / Quick Switch to Time */}
      {isMobile && (
        <div className="mt-3 pt-2.5 border-t border-zinc-200 dark:border-white/[0.06] flex items-center justify-between">
          <span className="text-[11px] text-zinc-600 dark:text-zinc-400">
            Terpilih: <strong className="text-zinc-900 dark:text-white">{selectedDay} {MONTH_SHORT[selectedMonth]} {selectedYear}</strong>
          </span>
          <button
            type="button"
            onClick={() => setMobileTab('time')}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--theme-accent,#0284C7)] hover:underline cursor-pointer"
          >
            <span>Atur Jam</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );

  // Mobile Native Android Date Picker Card
  const renderMobileDatePicker = () => (
    <div className="w-full space-y-4">
      <div>
        <div className="flex items-center justify-between mb-2.5 px-1">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-[var(--theme-accent,#0284C7)]" />
            <span className="text-xs font-semibold text-zinc-800 dark:text-[#FAFAFA]">
              Tanggal Tenggat
            </span>
          </div>
          <span className="text-xs font-mono font-bold text-zinc-700 dark:text-white bg-zinc-100 dark:bg-white/[0.08] border border-zinc-200 dark:border-white/[0.08] px-2 py-0.5 rounded-md">
            {selectedDay} {MONTH_SHORT[selectedMonth]} {selectedYear}
          </span>
        </div>

        {/* Big Clean Interactive Date Card (Opens Native OS Date Picker on Mobile) */}
        <div
          onClick={handleDateCardClick}
          className="relative flex flex-col items-center justify-center py-6 px-4 rounded-2xl bg-zinc-100/90 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.1] hover:border-[var(--theme-accent,#0284C7)] hover:shadow-md transition-all cursor-pointer group active:scale-[0.99]"
        >
          <div className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight group-hover:text-[var(--theme-accent,#0284C7)] transition-colors flex items-baseline gap-2 text-center">
            <span>{selectedDay} {MONTH_NAMES[selectedMonth]} {selectedYear}</span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-white/[0.08] border border-zinc-200/90 dark:border-white/[0.1] text-xs font-medium text-zinc-700 dark:text-zinc-200 shadow-xs mt-3 group-hover:bg-[var(--theme-accent,#0284C7)] group-hover:text-white transition-all">
            <Calendar className="w-3.5 h-3.5 text-[var(--theme-accent,#0284C7)] group-hover:text-white" />
            <span>Sentuh untuk buka kalender Android</span>
          </div>

          {/* Invisible Native Input Overlaid on the Card for Instant Tap Detection */}
          <input
            ref={dateInputRef}
            type="date"
            min={minDateString}
            value={dateValueString}
            onChange={handleNativeDateChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            aria-label="Pilih Tanggal"
          />
        </div>

        {/* Quick Date Presets */}
        <div className="mt-4">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400 block mb-1.5 px-0.5">
            Pilihan Hari Cepat:
          </span>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Hari Ini', offset: 0 },
              { label: 'Besok', offset: 1 },
              { label: 'Lusa', offset: 2 },
            ].map((p) => {
              const target = new Date();
              target.setDate(target.getDate() + p.offset);
              const isSelectedDay =
                selectedDay === target.getDate() &&
                selectedMonth === target.getMonth() &&
                selectedYear === target.getFullYear();

              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    const tDay = target.getDate();
                    const tMonth = target.getMonth();
                    const tYear = target.getFullYear();
                    setSelectedDay(tDay);
                    setSelectedMonth(tMonth);
                    setSelectedYear(tYear);
                    setViewMonth(tMonth);
                    setViewYear(tYear);

                    if (tYear === currentYear && tMonth === currentMonth && tDay === currentDate) {
                      if (selectedHour < currentHour || (selectedHour === currentHour && selectedMinute <= currentMinute)) {
                        const nextHour = Math.min(23, currentHour + 1);
                        setSelectedHour(nextHour);
                        setSelectedMinute(0);
                      }
                    }
                  }}
                  className={`py-2 px-1 rounded-xl text-center border transition-all cursor-pointer active:scale-95 flex flex-col items-center justify-center ${
                    isSelectedDay
                      ? 'bg-[var(--theme-accent,#0284C7)] text-white border-[var(--theme-accent,#0284C7)] font-bold shadow-md shadow-[var(--theme-glow,rgba(2,132,199,0.3))]'
                      : 'bg-zinc-100/90 dark:bg-white/[0.04] text-zinc-700 dark:text-zinc-300 border-zinc-200/90 dark:border-white/[0.08] hover:bg-zinc-200 dark:hover:bg-white/[0.08]'
                  }`}
                >
                  <span className="text-xs font-bold leading-tight">{p.label}</span>
                  <span className={`text-[10px] mt-0.5 leading-tight ${isSelectedDay ? 'text-white/90' : 'text-zinc-500 dark:text-zinc-400'}`}>
                    {target.getDate()} {MONTH_SHORT[target.getMonth()]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="pt-3 flex items-center justify-between border-t border-zinc-200/80 dark:border-white/[0.06]">
        <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
          Kalender bawaan HP Android
        </span>
        <button
          type="button"
          onClick={() => setMobileTab('time')}
          className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--theme-accent,#0284C7)] hover:underline cursor-pointer"
        >
          <span>Atur Jam</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );

  // Reusable Time Picker Content (Clean Native Clock & 4 Quick Presets)
  const renderTimePicker = (isMobile = false) => (
    <div className={`w-full ${isMobile ? 'space-y-4' : 'flex flex-col justify-between'}`}>
      <div>
        <div className="flex items-center justify-between mb-2.5 px-1">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[var(--theme-accent,#0284C7)]" />
            <span className="text-xs font-semibold text-zinc-800 dark:text-[#FAFAFA]">
              Atur Jam Tenggat
            </span>
          </div>
          <span className="text-xs font-mono font-bold text-zinc-700 dark:text-white bg-zinc-100 dark:bg-white/[0.08] border border-zinc-200 dark:border-white/[0.08] px-2 py-0.5 rounded-md">
            {timeValueString} WIB
          </span>
        </div>

        {/* Big Clean Interactive Time Card (Opens Native OS Clock Picker on Mobile & Desktop) */}
        <div
          onClick={handleTimeCardClick}
          className="relative flex flex-col items-center justify-center py-6 px-4 rounded-2xl bg-zinc-100/90 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.1] hover:border-[var(--theme-accent,#0284C7)] hover:shadow-md transition-all cursor-pointer group active:scale-[0.99]"
        >
          <div className="text-4xl sm:text-5xl font-extrabold font-mono text-zinc-900 dark:text-white tracking-tight group-hover:text-[var(--theme-accent,#0284C7)] transition-colors flex items-baseline gap-2">
            <span>{timeValueString}</span>
            <span className="text-xs font-semibold font-sans text-zinc-500 dark:text-zinc-400">WIB</span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-white/[0.08] border border-zinc-200/90 dark:border-white/[0.1] text-xs font-medium text-zinc-700 dark:text-zinc-200 shadow-xs mt-3 group-hover:bg-[var(--theme-accent,#0284C7)] group-hover:text-white transition-all">
            <Clock className="w-3.5 h-3.5 text-[var(--theme-accent,#0284C7)] group-hover:text-white" />
            <span>Sentuh untuk ganti jam</span>
          </div>

          {/* Invisible Native Input Overlaid on the Card for Instant Tap Detection */}
          <input
            ref={timeInputRef}
            type="time"
            value={timeValueString}
            onChange={handleNativeTimeChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            aria-label="Pilih Jam dan Menit"
          />
        </div>

        {/* 4 Clean Quick Presets (1-Tap Selection) */}
        <div className="mt-4">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400 block mb-1.5 px-0.5">
            Pilihan Jam Cepat:
          </span>
          <div className="grid grid-cols-4 gap-2">
            {QUICK_TIMES.map((t) => {
              const isActive = selectedHour === t.h && selectedMinute === t.m;
              const isTimePast =
                selectedYear === currentYear &&
                selectedMonth === currentMonth &&
                selectedDay === currentDate &&
                (t.h < currentHour || (t.h === currentHour && t.m <= currentMinute));

              return (
                <button
                  key={t.label}
                  type="button"
                  disabled={isTimePast}
                  onClick={() => {
                    if (isTimePast) return;
                    setSelectedHour(t.h);
                    setSelectedMinute(t.m);
                  }}
                  className={`py-2 px-1 rounded-xl text-center border transition-all flex flex-col items-center justify-center ${
                    isTimePast
                      ? 'opacity-30 cursor-not-allowed bg-zinc-100/50 dark:bg-white/[0.02] text-zinc-400 dark:text-zinc-600 border-zinc-200/50 dark:border-white/[0.04] pointer-events-none'
                      : isActive
                      ? 'bg-[var(--theme-accent,#0284C7)] text-white border-[var(--theme-accent,#0284C7)] font-bold shadow-md shadow-[var(--theme-glow,rgba(2,132,199,0.3))] active:scale-95 cursor-pointer'
                      : 'bg-zinc-100/90 dark:bg-white/[0.04] text-zinc-700 dark:text-zinc-300 border-zinc-200/90 dark:border-white/[0.08] hover:bg-zinc-200 dark:hover:bg-white/[0.08] active:scale-95 cursor-pointer'
                  }`}
                  title={isTimePast ? 'Waktu sudah lewat hari ini' : undefined}
                >
                  <span className="text-xs font-mono font-bold leading-tight">{t.label}</span>
                  <span className={`text-[10px] mt-0.5 leading-tight ${isActive ? 'text-white/90' : 'text-zinc-500 dark:text-zinc-400'}`}>
                    {t.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {isMobile ? (
        <div className="pt-3 flex items-center justify-between border-t border-zinc-200/80 dark:border-white/[0.06]">
          <button
            type="button"
            onClick={() => setMobileTab('date')}
            className="inline-flex items-center gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Pilih Tanggal</span>
          </button>
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
            Jam bawaan HP Android
          </span>
        </div>
      ) : (
        <div className="mt-3 text-center text-[11px] text-zinc-500 dark:text-zinc-400 font-mono py-1 rounded bg-zinc-100/80 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/[0.04]">
          {timeValueString} WIB
        </div>
      )}
    </div>
  );

  return (
    <div ref={containerRef} className={`relative ${isOpen ? 'z-30' : 'z-10'} ${className}`}>
      {/* Trigger Button */}
      <button
        id={id}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white/[0.02] border transition-all duration-200 cursor-pointer backdrop-blur-sm flex items-center justify-between gap-2.5 text-left group active:scale-[0.99] ${
          isOpen
            ? 'border-[var(--theme-accent,#0284C7)] ring-1 ring-[var(--theme-accent,#0284C7)]'
            : 'border-zinc-200 dark:border-white/[0.08] hover:border-zinc-300 dark:hover:border-white/[0.18]'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-zinc-100 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.06] flex items-center justify-center text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-800 dark:group-hover:text-zinc-200 transition-colors shrink-0">
            <Calendar className="w-3.5 h-3.5" />
          </div>
          <span
            className={`text-base sm:text-sm truncate ${
              displayString ? 'font-medium text-zinc-900 dark:text-[#FAFAFA]' : 'text-zinc-500 dark:text-zinc-400'
            }`}
          >
            {displayString || placeholder}
          </span>
        </div>

        <Clock
          className={`w-4 h-4 text-zinc-400 transition-colors shrink-0 ${
            isOpen ? 'text-[var(--theme-accent,#0284C7)]' : 'group-hover:text-zinc-600 dark:group-hover:text-zinc-200'
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
            className="absolute top-full left-0 mt-2 z-50 w-full sm:w-[490px] max-w-[calc(100vw-2rem)] rounded-2xl glass-dropdown p-3.5 sm:p-4 shadow-2xl backdrop-blur-2xl overscroll-contain"
          >
            {/* Header Dialog */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-200 dark:border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
                <span className="text-xs font-semibold text-zinc-900 dark:text-[#FAFAFA] tracking-wide">
                  Atur Tenggat Waktu
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/[0.08] active:scale-95 flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
                aria-label="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Preset Shortcuts (1-Tap Selection) */}
            <div className="mb-3 pb-3 border-b border-zinc-200 dark:border-white/[0.08]">
              <div className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5 flex items-center justify-between">
                <span>Pilihan Cepat (1-Tap):</span>
                {value && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="text-[11px] text-red-500 dark:text-red-400 hover:underline cursor-pointer"
                  >
                    Hapus Tenggat
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {[
                  { id: 'today-17', label: 'Hari Ini 17:00' },
                  { id: 'tomorrow-09', label: 'Besok 09:00' },
                  { id: 'tomorrow-17', label: 'Besok 17:00' },
                  { id: 'next-day-09', label: 'Lusa 09:00' },
                ].map((preset) => {
                  const presetDate = getPresetDate(preset.id);
                  const isCurrent = value && toDatetimeLocalString(value) === presetDate;
                  const isPassed = preset.id === 'today-17' && currentHour >= 17;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      disabled={isPassed}
                      onClick={() => {
                        if (isPassed) return;
                        onChange?.(presetDate);
                        setIsOpen(false);
                      }}
                      className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all text-center border ${
                        isPassed
                          ? 'opacity-30 cursor-not-allowed bg-zinc-100/50 dark:bg-white/[0.02] text-zinc-400 dark:text-zinc-600 border-zinc-200/50 dark:border-white/[0.04] pointer-events-none'
                          : isCurrent
                          ? 'bg-[var(--theme-accent,#0284C7)] text-white border-[var(--theme-accent,#0284C7)] font-semibold shadow-sm active:scale-95 cursor-pointer'
                          : 'bg-zinc-100/90 dark:bg-white/[0.04] text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-white/[0.08] hover:bg-zinc-200 dark:hover:bg-white/[0.1] hover:text-zinc-900 dark:hover:text-white active:scale-95 cursor-pointer'
                      }`}
                      title={isPassed ? 'Sudah lewat jam 17:00 hari ini' : undefined}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mobile Segmented Control Tab Switcher (sm:hidden) */}
            <div className="block sm:hidden mb-3">
              <div className="flex items-center p-1 rounded-xl bg-zinc-100 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setMobileTab('date')}
                  className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all duration-150 cursor-pointer active:scale-98 ${
                    mobileTab === 'date'
                      ? 'bg-white text-zinc-900 dark:text-black shadow-sm font-bold'
                      : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{selectedDay} {MONTH_SHORT[selectedMonth]} {selectedYear}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMobileTab('time')}
                  className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all duration-150 cursor-pointer active:scale-98 ${
                    mobileTab === 'time'
                      ? 'bg-white text-zinc-900 dark:text-black shadow-sm font-bold'
                      : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>{String(selectedHour).padStart(2, '0')}:{String(selectedMinute).padStart(2, '0')} WIB</span>
                </button>
              </div>
            </div>

            {/* Mobile Tab Content (sm:hidden) */}
            <div className="block sm:hidden">
              {mobileTab === 'date' ? renderMobileDatePicker() : renderTimePicker(true)}
            </div>

            {/* Desktop Split View (hidden sm:flex) */}
            <div className="hidden sm:flex flex-row gap-4">
              <div className="flex-1 min-w-[210px]">
                {renderCalendar(false)}
              </div>
              <div className="w-[1px] bg-zinc-200 dark:bg-white/[0.08] self-stretch" />
              <div className="w-48 flex flex-col justify-between">
                {renderTimePicker(false)}
              </div>
            </div>

            {/* Warning notice when selected time is in past */}
            {isSelectedTimePast && (
              <div className="pt-2 px-1">
                <span className="text-[11px] text-amber-500 dark:text-amber-400 font-medium flex items-center gap-1.5">
                  <span>⚠️</span>
                  <span>Waktu tenggat yang dipilih sudah terlewat dari saat ini.</span>
                </span>
              </div>
            )}

            {/* Bottom Actions Footer */}
            <div className="pt-3 mt-3 border-t border-zinc-200 dark:border-white/[0.08] flex items-center justify-between gap-2">
              <div>
                {value && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="text-xs text-red-500 dark:text-red-400 hover:underline transition-colors cursor-pointer font-medium"
                  >
                    Hapus Tenggat
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer active:scale-95"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  disabled={isSelectedTimePast}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-colors ${
                    isSelectedTimePast
                      ? 'opacity-40 cursor-not-allowed bg-zinc-400 text-white dark:bg-zinc-800 dark:text-zinc-500 pointer-events-none'
                      : 'bg-zinc-900 text-white dark:bg-white dark:text-black hover:opacity-90 active:scale-95 cursor-pointer'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
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
