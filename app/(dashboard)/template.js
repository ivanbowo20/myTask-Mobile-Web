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

  // Di mobile (< 1024px) atau reduced-motion: bypass 100% Framer Motion agar HP bebas lag & 60-120 FPS instan
  if (shouldReduceMotion || !isDesktop) {
    return <div className="w-full">{children}</div>;
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
