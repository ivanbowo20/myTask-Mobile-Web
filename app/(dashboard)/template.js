'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { useDesktopMotion } from '@/lib/use-desktop-motion';

/**
 * Next.js App Router Template untuk rute (dashboard).
 * 
 * Apple Spatial Cascade:
 * - Desktop: Smooth slide up (14px -> 0) + Blur-to-Focus (4px -> 0px) dengan Apple WWDC fluid spring.
 * - Mobile (< 1024px) / Reduced Motion: Instant lightweight paint tanpa filter blur untuk performa 60-120fps.
 * - Me-mount instance baru pada setiap perpindahan rute (Dashboard -> Tugas -> Notebook, dll).
 * - Tanpa AnimatePresence mode="wait", sehingga 100% BEBAS DARI BUG LAYAR KOSONG / STUCK EXIT.
 */
export default function DashboardTemplate({ children }) {
  const shouldReduceMotion = useReducedMotion();
  const isDesktop = useDesktopMotion();

  if (shouldReduceMotion) {
    return <div className="w-full">{children}</div>;
  }

  // Di mobile, gunakan transisi ringan tanpa filter blur
  if (!isDesktop) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.2,
          ease: [0.23, 1, 0.32, 1],
        }}
        className="w-full"
      >
        {children}
      </motion.div>
    );
  }

  // Desktop Apple Spatial Cascade
  return (
    <motion.div
      initial={{ opacity: 0, y: 14, filter: 'blur(4px)' }}
      animate={{
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        transitionEnd: { filter: 'none' },
      }}
      transition={{
        duration: 0.32,
        ease: [0.16, 1, 0.3, 1], // Apple WWDC fluid spring curve
      }}
      className="w-full"
    >
      {children}
    </motion.div>
  );
}
