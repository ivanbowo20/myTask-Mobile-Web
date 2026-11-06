'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useDesktopMotion } from '@/lib/use-desktop-motion';
import { cn } from '@/lib/utils';

/**
 * Single Digit Reel that rolls from 0 to targetDigit (0..9).
 */
function DigitReel({ digit, delay = 0, isDesktop = true }) {
  const targetDigit = Math.min(Math.max(Number(digit) || 0, 0), 9);

  if (!isDesktop) {
    return <span>{targetDigit}</span>;
  }

  // 10 digits stacked vertically from 0 to 9
  const digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

  return (
    <span className="relative inline-flex h-[1.12em] w-[0.62em] overflow-hidden leading-none justify-center">
      <motion.span
        initial={{ y: "0%" }}
        animate={{ y: `-${targetDigit * 10}%` }}
        transition={{
          duration: 0.85,
          delay: delay,
          ease: [0.16, 1, 0.3, 1], // Apple WWDC fluid spring curve
        }}
        className="flex flex-col absolute top-0 inset-x-0 items-center will-change-transform"
      >
        {digits.map((d) => (
          <span
            key={d}
            className="h-[1.12em] flex items-center justify-center select-none"
          >
            {d}
          </span>
        ))}
      </motion.span>
    </span>
  );
}

/**
 * NumberTicker (Vertical Rolling Odometer)
 * 
 * Inspired by Magic UI Number Ticker & Apple iOS Odometer.
 * Rolls digits vertically from 0 up to target number with silky spring physics.
 * 
 * Features:
 * - Handles numbers of any length (0..999+) with individual digit reels.
 * - Desktop-only spring motion; instant paint on mobile (< 1024px) & reduced motion.
 * - Stable SSR hydration with suppressHydrationWarning.
 */
export default function NumberTicker({ value = 0, className = "" }) {
  const shouldReduceMotion = useReducedMotion();
  const isDesktop = useDesktopMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const numValue = Math.max(0, Math.round(Number(value) || 0));
  const digitChars = useMemo(() => String(numValue).split(""), [numValue]);

  // SSR or reduced motion or mobile fallback
  if (!mounted || shouldReduceMotion || !isDesktop) {
    return (
      <span className={cn("inline-flex font-variant-numeric tabular-nums", className)}>
        {numValue}
      </span>
    );
  }

  return (
    <span className={cn("inline-flex items-center font-variant-numeric tabular-nums", className)}>
      {digitChars.map((char, index) => {
        // Handle non-digit characters if any (like commas or dots)
        if (isNaN(Number(char))) {
          return <span key={`char-${index}`}>{char}</span>;
        }

        // Slight stagger between adjacent digits (e.g. tens vs ones)
        const digitDelay = index * 0.08;

        return (
          <DigitReel
            key={`digit-${index}-${char}`}
            digit={Number(char)}
            delay={digitDelay}
            isDesktop={isDesktop}
          />
        );
      })}
    </span>
  );
}
