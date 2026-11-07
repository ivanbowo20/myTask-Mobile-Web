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
  duration = 0.4,
  className = '',
  gradient = true,
  yOffset = 18,
  ...props
}) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: yOffset }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: shouldReduceMotion ? 0 : duration,
        delay: shouldReduceMotion ? 0 : delay * 0.1,
        ease: [0.16, 1, 0.3, 1], // Apple WWDC fluid spring curve
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
