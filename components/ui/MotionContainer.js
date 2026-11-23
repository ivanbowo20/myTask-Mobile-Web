'use client';

import { useRef, useEffect, useLayoutEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useDesktopMotion } from '@/lib/use-desktop-motion';
import { cn } from '@/lib/utils';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const DESKTOP_MEDIA_QUERY =
  '(min-width: 1024px) and (prefers-reduced-motion: no-preference)';

/**
 * MotionContainer
 *
 * Pembungkus section/panel khusus desktop (>= 1024px) berbasis GSAP:
 * - Desktop: Fade-in (opacity 0->1) + naik lembut (y 18->0) + scale tipis (0.97->1),
 *   durasi 0.35s, jeda bertahap 55ms, plus ScrollTrigger once untuk elemen di bawah fold.
 * - Mobile (< 1024px) / prefers-reduced-motion: 100% kontainer <div> statis murni tanpa
 *   animasi geser maupun beban CPU/GPU.
 */
export default function MotionContainer({
  children,
  delay = 0,
  duration = 0.35,
  className = '',
  gradient = true,
  yOffset = 18,
  initialScale = 0.97,
  overflowVisible = false,
  animateEntrance = true,
  ...props
}) {
  const isDesktop = useDesktopMotion();
  const containerRef = useRef(null);
  const isOverflowVisible = overflowVisible || className.includes('overflow-visible');

  useIsomorphicLayoutEffect(() => {
    const el = containerRef.current;
    if (!el || !isDesktop || !animateEntrance) return undefined;

    let safetyTimer = null;
    let rafId = null;
    const mm = gsap.matchMedia();

    mm.add(DESKTOP_MEDIA_QUERY, () => {
      const rect = el.getBoundingClientRect();
      const viewportH = window.innerHeight || 900;
      const computedDelay = Math.min(Math.max(delay, 0) * 0.055, 0.28);

      if (rect.bottom > 0 && rect.top < viewportH * 0.96) {
        gsap.fromTo(
          el,
          {
            autoAlpha: 0,
            y: yOffset,
            scale: initialScale,
            willChange: 'transform, opacity',
          },
          {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            duration,
            delay: computedDelay,
            ease: 'power3.out',
            overwrite: 'auto',
            clearProps: 'transform,opacity,visibility,willChange',
          }
        );
      } else if (rect.top >= viewportH * 0.96) {
        gsap.set(el, {
          autoAlpha: 0,
          y: yOffset,
          scale: initialScale,
        });

        ScrollTrigger.create({
          trigger: el,
          start: 'top 92%',
          once: true,
          onEnter: () => {
            gsap.to(el, {
              autoAlpha: 1,
              y: 0,
              scale: 1,
              duration,
              ease: 'power3.out',
              overwrite: 'auto',
              clearProps: 'transform,opacity,visibility,willChange',
            });
          },
        });

        rafId = requestAnimationFrame(() => {
          ScrollTrigger.refresh();
        });
      }

      safetyTimer = window.setTimeout(() => {
        const currentRect = el.getBoundingClientRect();
        if (currentRect.top > (window.innerHeight || 900) + 40) return;
        const computedOpacity = parseFloat(window.getComputedStyle(el).opacity);
        if (Number.isFinite(computedOpacity) && computedOpacity < 0.5) {
          gsap.to(el, {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            duration: 0.25,
            ease: 'power2.out',
            overwrite: 'auto',
            clearProps: 'transform,opacity,visibility,willChange',
          });
        }
      }, 950);

      return () => {
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
        if (safetyTimer) {
          window.clearTimeout(safetyTimer);
          safetyTimer = null;
        }
      };
    });

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      if (safetyTimer) {
        window.clearTimeout(safetyTimer);
      }
      mm.revert();
    };
  }, [isDesktop, animateEntrance, delay, duration, yOffset, initialScale]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative',
        isOverflowVisible ? 'overflow-visible' : 'overflow-hidden',
        className
      )}
      {...props}
    >
      {/* Subtle Ambient Accent Gradient (Desktop only) */}
      {isDesktop && gradient && (
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[var(--theme-glow-subtle,rgba(255,255,255,0.06))] via-transparent to-transparent opacity-20 z-0"
          aria-hidden="true"
        />
      )}
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
}
