'use client';

import { useRef, useState, useCallback } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useDesktopMotion } from '@/lib/use-desktop-motion';
import { cn } from '@/lib/utils';

/**
 * DesktopInteractiveCard
 * 
 * Kartu interaktif berbasis Apple WWDC Springs & 3D Tilt:
 * - Struktur DOM 100% stabil (zero hydration flash / unmount).
 * - Di desktop (>= 1024px): Tactile elevation (y: -4px) + Subtle 3D tilt (<= 4deg)
 *   + 1px cursor-following rim glow + active tap compression.
 * - Di mobile (< 1024px): Listener otomatis dinonaktifkan, berjalan sebagai
 *   kartu statis murni tanpa beban CPU.
 */
export default function DesktopInteractiveCard({
  children,
  className = '',
  maxTilt = 4,
  ...props
}) {
  const isDesktop = useDesktopMotion();
  const cardRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  const springConfig = { damping: 28, stiffness: 380, mass: 0.5 };
  const smoothMouseX = useSpring(mouseX, springConfig);
  const smoothMouseY = useSpring(mouseY, springConfig);

  const rotateY = useTransform(smoothMouseX, [0, 1], [-maxTilt, maxTilt]);
  const rotateX = useTransform(smoothMouseY, [0, 1], [maxTilt, -maxTilt]);

  const handleMouseMove = useCallback((e) => {
    if (!cardRef.current || !isDesktop) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    mouseX.set(x);
    mouseY.set(y);
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, [isDesktop, mouseX, mouseY]);

  const handleMouseEnter = useCallback(() => {
    if (!isDesktop) return;
    setIsHovered(true);
  }, [isDesktop]);

  const handleMouseLeave = useCallback(() => {
    if (!isDesktop) return;
    setIsHovered(false);
    mouseX.set(0.5);
    mouseY.set(0.5);
  }, [isDesktop, mouseX, mouseY]);

  return (
    <div
      style={{ perspective: isDesktop ? 1000 : undefined }}
      className="h-full w-full"
    >
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX: isDesktop && isHovered ? rotateX : 0,
          rotateY: isDesktop && isHovered ? rotateY : 0,
          y: isDesktop && isHovered ? -4 : 0,
          transformStyle: isDesktop ? 'preserve-3d' : undefined,
        }}
        whileTap={isDesktop ? { scale: 0.985 } : undefined}
        transition={{
          y: { type: 'spring', stiffness: 420, damping: 30 },
          scale: { duration: 0.1 },
        }}
        className={cn(
          'group relative glass-card rounded-xl sm:rounded-2xl transition-shadow duration-300 select-none h-full',
          isDesktop && isHovered ? 'shadow-[0_12px_28px_rgba(0,0,0,0.18)]' : '',
          className
        )}
        {...props}
      >
        {/* Subtle Radial Rim Glow Mask Following Cursor (Desktop Only) */}
        {isDesktop && (
          <div
            className="pointer-events-none absolute -inset-px rounded-xl sm:rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 overflow-hidden"
            style={{
              background: `radial-gradient(240px circle at ${mousePos.x}px ${mousePos.y}px, var(--theme-accent, rgba(217,119,6,0.18)), transparent 80%)`,
            }}
          />
        )}

        {/* Card Content */}
        <div className="relative z-20 h-full">{children}</div>
      </motion.div>
    </div>
  );
}
