'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * MotionContainer
 * 
 * Reusable Framer Motion container inspired by code.xr (Admin Dashboard V5).
 * - Enforces pure React & Framer Motion execution (zero layout thrashing, pure GPU transforms).
 * - Delivers rhythmic cascading entrance via delay * 0.1s.
 * - Integrates subtle ambient accent gradient overlay.
 * - 100% accessible with useReducedMotion support.
 */
export default function MotionContainer({
  children,
  delay = 0,
  duration = 0.45,
  className = '',
  gradient = true,
  yOffset = 28,
  ...props
}) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { y: yOffset }}
      animate={{ y: 0 }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 30,
        delay: shouldReduceMotion ? 0 : delay * 0.12,
      }}
      className={cn('relative overflow-hidden', className)}
      {...props}
    >
      {/* Subtle Ambient Accent Gradient (code.xr standard) */}
      {gradient && (
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[var(--theme-glow-subtle,rgba(255,255,255,0.06))] via-transparent to-transparent opacity-20 z-0"
          aria-hidden="true"
        />
      )}
      <div className="relative z-10 h-full">{children}</div>
    </motion.div>
  );
}
