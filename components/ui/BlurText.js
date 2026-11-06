'use client';

import { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useDesktopMotion } from '@/lib/use-desktop-motion';
import { cn } from '@/lib/utils';

/**
 * BlurText (React Bits Standard)
 * 
 * Text starts blurred then crisply resolves for a soft-focus reveal effect.
 * 
 * Features:
 * - Word-by-word staggered soft-focus reveal.
 * - Directional rise (y: 12px -> 0) with Apple WWDC spring physics.
 * - transitionEnd filter: 'none' ensures typography remains razor-sharp without GPU filter fuzziness.
 * - Desktop-only activation; falls back to static text on mobile (< 1024px) and reduced-motion.
 */
export default function BlurText({
  text = '',
  delay = 0.06,
  direction = 'bottom',
  className = '',
}) {
  const shouldReduceMotion = useReducedMotion();
  const isDesktop = useDesktopMotion();

  const words = useMemo(() => {
    return text ? text.split(' ') : [];
  }, [text]);

  // Mobile / Reduced Motion: render standard clean text without overhead
  if (shouldReduceMotion || !isDesktop) {
    return <span className={className}>{text}</span>;
  }

  const initialY = direction === 'top' ? -12 : 12;

  return (
    <span className={cn("inline-flex flex-wrap gap-x-[0.28em]", className)}>
      {words.map((word, index) => (
        <motion.span
          key={`${word}-${index}`}
          initial={{
            opacity: 0,
            y: initialY,
            filter: 'blur(8px)',
          }}
          animate={{
            opacity: 1,
            y: 0,
            filter: 'blur(0px)',
            transitionEnd: {
              filter: 'none',
            },
          }}
          transition={{
            duration: 0.42,
            delay: index * delay,
            ease: [0.16, 1, 0.3, 1], // WWDC fluid spring curve
          }}
          className="inline-block will-change-transform"
        >
          {word}
        </motion.span>
      ))}
    </span>
  );
}
