'use client';

import { motion, AnimatePresence } from 'framer-motion';

/**
 * AnimatedCheckbox - SielloMita Design System standard
 * Tactile spring checkbox with SVG stroke-path drawing animation
 * Compliant with mobile-first touch targets and keyboard accessibility
 */
export default function AnimatedCheckbox({
  id,
  checked = false,
  onChange,
  label,
  className = '',
  disabled = false,
}) {
  const handleClick = () => {
    if (disabled) return;
    onChange?.(!checked);
  };

  const handleKeyDown = (e) => {
    if (disabled) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onChange?.(!checked);
    }
  };

  return (
    <div
      role="checkbox"
      id={id}
      aria-checked={checked}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`group inline-flex items-center gap-3 select-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-accent,#0284C7)]/50 rounded-lg py-1 px-1 -mx-1 transition-all ${
        disabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''
      } ${className}`}
    >
      <motion.div
        whileTap={{ scale: 0.92 }}
        whileHover={{ scale: 1.05 }}
        transition={{ type: 'spring', stiffness: 450, damping: 25 }}
        className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors duration-200 shrink-0 ${
          checked
            ? 'bg-[var(--theme-accent,#0284C7)] border-[var(--theme-accent,#0284C7)] text-white shadow-sm shadow-[var(--theme-glow,rgba(2,132,199,0.35))]'
            : 'bg-white/[0.04] border-white/[0.22] group-hover:border-white/[0.4] text-transparent'
        }`}
      >
        <AnimatePresence mode="wait">
          {checked && (
            <motion.svg
              key="check-icon"
              viewBox="0 0 16 16"
              className="w-3.5 h-3.5 text-white"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.4, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            >
              <motion.path
                d="M3.5 8.2L6.5 11.2L12.5 4.8"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{
                  duration: 0.18,
                  ease: 'easeOut',
                }}
              />
            </motion.svg>
          )}
        </AnimatePresence>
      </motion.div>

      {label && (
        <span className="text-sm font-medium text-[#FAFAFA] group-hover:text-white transition-colors">
          {label}
        </span>
      )}
    </div>
  );
}
