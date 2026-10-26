'use client';

import { forwardRef, useRef, useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/**
 * Hook to safely detect mobile viewport (< 640px) matching Tailwind `sm:` breakpoint.
 * Compatible with React 19 and SSR hydration (zero hydration mismatch).
 */
function subscribeMobile(callback) {
  if (typeof window === 'undefined') return () => {};
  const mql = window.matchMedia('(max-width: 639px)');
  mql.addEventListener('change', callback);
  return () => mql.removeEventListener('change', callback);
}

function getMobileSnapshot() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(max-width: 639px)').matches;
}

function getServerSnapshot() {
  return false;
}

/**
 * AnimatedContent
 *
 * Inspired by React Bits "Animated Content" concept, powered by Framer Motion.
 * Features:
 * - Native React 19 compatibility with zero memory leaks
 * - Container auto-detection (locates nearest scrollable ancestor when autoDetectContainer=true)
 * - Optimized desktop defaults: distance 20px, blur 6px -> 0px, duration 0.35s, ease [0.23, 1, 0.32, 1]
 * - Optimized mobile defaults (< 640px): distance 12px, blur 0px (pure transform/opacity for 60 FPS), duration 0.28s, early trigger threshold 0.05
 * - Full prefers-reduced-motion accessibility support via useReducedMotion()
 * - Clean transitionEnd to ensure zero residual GPU filter overhead and crystal-sharp typography
 * - Supports directional keywords ('vertical', 'horizontal', 'up', 'down', 'left', 'right')
 */
const AnimatedContent = forwardRef(function AnimatedContent(
  {
    children,
    distance,
    direction = 'vertical',
    reverse = false,
    duration,
    delay = 0,
    ease = [0.23, 1, 0.32, 1],
    blur,
    threshold,
    initialOpacity = 0,
    animateOpacity = true,
    scale = 1,
    once = true,
    className = '',
    tag = 'div',
    root = null,
    autoDetectContainer = false,
    ...rest
  },
  forwardedRef
) {
  const internalRef = useRef(null);
  const [scrollContainer, setScrollContainer] = useState(null);
  const [mounted, setMounted] = useState(false);
  const scrollContainerRef = useRef(null);
  const isMobile = useSyncExternalStore(subscribeMobile, getMobileSnapshot, getServerSnapshot);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Container auto-detection: find nearest scrollable parent if autoDetectContainer is requested
  useEffect(() => {
    if (!autoDetectContainer || !internalRef.current) return;
    let parent = internalRef.current.parentElement;
    while (parent && parent !== document.body && parent !== document.documentElement) {
      const style = window.getComputedStyle(parent);
      if (
        (style.overflowY === 'auto' || style.overflowY === 'scroll') &&
        parent.scrollHeight > parent.clientHeight
      ) {
        setScrollContainer(parent);
        break;
      }
      parent = parent.parentElement;
    }
  }, [autoDetectContainer]);

  if (scrollContainer) {
    scrollContainerRef.current = scrollContainer;
  }

  // Desktop vs Mobile parameter defaults
  const activeDistance =
    distance !== undefined
      ? distance
      : isMobile
      ? 12
      : 20;

  const activeBlur =
    blur !== undefined
      ? blur
      : isMobile
      ? 0
      : 6;

  const activeDuration =
    duration !== undefined
      ? duration
      : isMobile
      ? 0.28
      : 0.35;

  const activeThreshold =
    threshold !== undefined
      ? threshold
      : isMobile
      ? 0.05
      : 0.1;

  // Calculate axis offsets supporting both axis ('vertical'/'horizontal' with reverse)
  // and directional keywords ('up', 'down', 'left', 'right')
  let xOffset = 0;
  let yOffset = 0;

  if (direction === 'horizontal') {
    xOffset = reverse ? -activeDistance : activeDistance;
  } else if (direction === 'vertical') {
    yOffset = reverse ? -activeDistance : activeDistance;
  } else if (direction === 'up') {
    yOffset = activeDistance;
  } else if (direction === 'down') {
    yOffset = -activeDistance;
  } else if (direction === 'left') {
    xOffset = activeDistance;
  } else if (direction === 'right') {
    xOffset = -activeDistance;
  }

  // Determine if CSS filter blur is needed.
  // CRITICAL:
  // 1. On SSR (before mounted), blur is disabled to prevent hydration mismatch and stuck blur.
  // 2. On mobile (< 640px) or when reduced motion is on, hasBlur is false for 60 FPS.
  const hasBlur = mounted && !shouldReduceMotion && Boolean(activeBlur) && activeBlur > 0;

  // Animation variants
  const variants = {
    hidden: {
      opacity: animateOpacity ? initialOpacity : 1,
      scale: shouldReduceMotion ? 1 : scale,
      x: shouldReduceMotion ? 0 : xOffset,
      y: shouldReduceMotion ? 0 : yOffset,
      ...(hasBlur ? { filter: `blur(${activeBlur}px)` } : {}),
    },
    visible: {
      opacity: 1,
      scale: 1,
      x: 0,
      y: 0,
      ...(hasBlur
        ? {
            filter: 'blur(0px)',
            transitionEnd: { filter: 'none' },
          }
        : {
            filter: 'none',
          }),
      transition: {
        duration: shouldReduceMotion ? 0.05 : activeDuration,
        delay: shouldReduceMotion ? 0 : delay,
        ease: ease,
      },
    },
  };

  const MotionComponent = motion[tag] || motion.div;
  const effectiveRoot = root || (autoDetectContainer && scrollContainer ? scrollContainerRef : undefined);

  // Dual ref handler with stable callback
  const handleRef = useCallback(
    (node) => {
      internalRef.current = node;
      if (forwardedRef) {
        if (typeof forwardedRef === 'function') {
          forwardedRef(node);
        } else if (typeof forwardedRef === 'object' && forwardedRef !== null && 'current' in forwardedRef) {
          forwardedRef.current = node;
        }
      }
    },
    [forwardedRef]
  );

  return (
    <MotionComponent
      ref={handleRef}
      initial="hidden"
      whileInView="visible"
      viewport={{
        once,
        amount: activeThreshold,
        ...(effectiveRoot ? { root: effectiveRoot } : {}),
      }}
      variants={variants}
      className={className}
      {...rest}
    >
      {children}
    </MotionComponent>
  );
});

export default AnimatedContent;
export { AnimatedContent };
