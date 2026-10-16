'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, Plus } from 'lucide-react';

export default function CustomSelect({
  value = '',
  onChange,
  categories = [],
  onOpenAddCategory,
  id = 'task-category',
  placeholder = 'Tanpa Kategori',
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredValue, setHoveredValue] = useState(null);
  const containerRef = useRef(null);

  // Normalize current category
  const selectedCategory = categories.find((c) => String(c.id) === String(value));

  // Outside click & keyboard dismiss
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

  function handleSelect(val) {
    if (val === '__new__') {
      setIsOpen(false);
      onOpenAddCategory?.();
    } else {
      onChange?.(val);
      setIsOpen(false);
    }
  }

  // Staggered variants
  const menuVariants = {
    hidden: { opacity: 0, y: 8, scale: 0.96 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.18,
        ease: [0.16, 1, 0.3, 1],
        staggerChildren: 0.03,
        delayChildren: 0.02,
      },
    },
    exit: {
      opacity: 0,
      y: 6,
      scale: 0.96,
      transition: { duration: 0.14 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -6 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { type: 'spring', stiffness: 400, damping: 28 },
    },
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
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
          {selectedCategory ? (
            <span
              className="w-3 h-3 rounded-full shrink-0 shadow-sm"
              style={{
                backgroundColor: selectedCategory.warna || '#A78BFA',
                boxShadow: `0 0 8px ${selectedCategory.warna || '#A78BFA'}66`,
              }}
            />
          ) : (
            <span className="w-3 h-3 rounded-full bg-zinc-600 border border-white/20 shrink-0" />
          )}

          <span className="text-base sm:text-sm font-medium text-[#FAFAFA] truncate">
            {selectedCategory ? selectedCategory.nama : placeholder}
          </span>
        </div>

        <ChevronDown
          className={`w-4 h-4 text-zinc-400 transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-white' : 'group-hover:text-zinc-200'
          }`}
        />
      </button>

      {/* Floating Glass Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            variants={menuVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="absolute top-full left-0 right-0 mt-2 z-50 rounded-2xl glass-dropdown p-1.5 shadow-2xl max-h-64 overflow-y-auto"
            onMouseLeave={() => setHoveredValue(null)}
          >
            {/* Opsi "Tanpa Kategori" */}
            <motion.div
              variants={itemVariants}
              className="relative"
              onMouseEnter={() => setHoveredValue('__none__')}
            >
              {hoveredValue === '__none__' && (
                <motion.div
                  layoutId="select-hover-pill"
                  className="absolute inset-0 rounded-xl bg-white/[0.08]"
                  transition={{ type: 'spring', bounce: 0.15, duration: 0.2 }}
                />
              )}
              <button
                type="button"
                onClick={() => handleSelect('')}
                className={`relative z-10 w-full px-3 py-2 rounded-xl flex items-center justify-between text-left text-sm transition-colors cursor-pointer ${
                  !value ? 'text-white font-semibold' : 'text-zinc-300'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-600 border border-white/20 shrink-0" />
                  <span>Tanpa Kategori</span>
                </div>
                {!value && <Check className="w-4 h-4 text-white shrink-0" />}
              </button>
            </motion.div>

            {/* List Kategori */}
            {categories.map((c) => {
              const isSelected = String(value) === String(c.id);
              const isHovered = hoveredValue === String(c.id);

              return (
                <motion.div
                  key={c.id}
                  variants={itemVariants}
                  className="relative"
                  onMouseEnter={() => setHoveredValue(String(c.id))}
                >
                  {isHovered && (
                    <motion.div
                      layoutId="select-hover-pill"
                      className="absolute inset-0 rounded-xl bg-white/[0.08]"
                      transition={{ type: 'spring', bounce: 0.15, duration: 0.2 }}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => handleSelect(String(c.id))}
                    className={`relative z-10 w-full px-3 py-2 rounded-xl flex items-center justify-between text-left text-sm transition-colors cursor-pointer ${
                      isSelected ? 'text-white font-semibold' : 'text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{
                          backgroundColor: c.warna || '#A78BFA',
                          boxShadow: `0 0 6px ${c.warna || '#A78BFA'}88`,
                        }}
                      />
                      <span className="truncate">{c.nama}</span>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    )}
                  </button>
                </motion.div>
              );
            })}

            {/* Divider & Aksi Tambah Kategori Baru */}
            <div className="my-1 border-t border-white/[0.08]" />

            <motion.div
              variants={itemVariants}
              className="relative"
              onMouseEnter={() => setHoveredValue('__new__')}
            >
              {hoveredValue === '__new__' && (
                <motion.div
                  layoutId="select-hover-pill"
                  className="absolute inset-0 rounded-xl bg-violet-500/15"
                  transition={{ type: 'spring', bounce: 0.15, duration: 0.2 }}
                />
              )}
              <button
                type="button"
                onClick={() => handleSelect('__new__')}
                className="relative z-10 w-full px-3 py-2 rounded-xl flex items-center gap-2 text-left text-sm font-medium text-violet-300 hover:text-violet-200 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4 text-violet-400 shrink-0" />
                <span>Tambah Kategori Baru...</span>
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

