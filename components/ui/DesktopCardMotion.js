'use client';

import { useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
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
 * DesktopStaggerGroup
 *
 * Orkestrator GSAP + ScrollTrigger khusus desktop (>= 1024px):
 * - Memutar animasi masuk berurutan (opacity 0->1, y 18->0, scale 0.97->1, jeda 55ms, durasi 0.35s).
 * - Kartu yang sudah masuk viewport langsung beranimasi instan; kartu di bawah fold memakai
 *   ScrollTrigger.batch (once: true) saat discroll masuk layar.
 * - replayKey memutar ulang stagger halus saat filter / kategori / paginasi berubah.
 * - clearProps: 'transform,opacity' membersihkan inline style GSAP setelah selesai agar
 *   Framer Motion whileHover tidak pernah bentrok koordinat transform.
 * - Mobile (< 1024px): 100% passthrough <div> statis tanpa GSAP & tanpa listener.
 */
export function DesktopStaggerGroup({
  children,
  className = '',
  replayKey = 'default',
  stagger = 0.055,
  duration = 0.35,
  yOffset = 18,
  initialScale = 0.97,
  delay = 0,
  itemSelector = ':scope > [data-card-reveal]',
  ...rest
}) {
  const isDesktop = useDesktopMotion();
  const containerRef = useRef(null);

  useIsomorphicLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || !isDesktop) return undefined;

    let safetyTimer = null;
    let rafId = null;
    const mm = gsap.matchMedia();

    mm.add(DESKTOP_MEDIA_QUERY, () => {
      const items = Array.from(container.querySelectorAll(itemSelector));
      if (items.length === 0) return undefined;

      const viewportH = window.innerHeight || 900;
      const aboveFold = [];
      const belowFold = [];

      for (const el of items) {
        const rect = el.getBoundingClientRect();
        if (rect.bottom > 0 && rect.top < viewportH * 0.96) {
          aboveFold.push(el);
        } else if (rect.top >= viewportH * 0.96) {
          belowFold.push(el);
        }
      }

      if (aboveFold.length > 0) {
        gsap.fromTo(
          aboveFold,
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
            delay,
            stagger: { each: stagger, from: 'start' },
            ease: 'power3.out',
            overwrite: 'auto',
            clearProps: 'transform,opacity,visibility,willChange',
          }
        );
      }

      if (belowFold.length > 0) {
        gsap.set(belowFold, {
          autoAlpha: 0,
          y: yOffset,
          scale: initialScale,
        });

        ScrollTrigger.batch(belowFold, {
          once: true,
          start: 'top 92%',
          onEnter: (batch) => {
            gsap.to(batch, {
              autoAlpha: 1,
              y: 0,
              scale: 1,
              duration,
              stagger: { each: stagger, from: 'start' },
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

      // Anti-blank safety watchdog: pastikan elemen dalam layar tidak pernah macet di opacity 0
      safetyTimer = window.setTimeout(() => {
        const currentViewportH = window.innerHeight || 900;
        const stuckItems = items.filter((el) => {
          const rect = el.getBoundingClientRect();
          if (rect.top > currentViewportH + 40) return false;
          const computedOpacity = parseFloat(window.getComputedStyle(el).opacity);
          return Number.isFinite(computedOpacity) && computedOpacity < 0.5;
        });

        if (stuckItems.length > 0) {
          gsap.to(stuckItems, {
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
  }, [isDesktop, replayKey, stagger, duration, yOffset, initialScale, delay, itemSelector]);

  return (
    <div ref={containerRef} className={className} {...rest}>
      {children}
    </div>
  );
}

/**
 * DesktopCardHover
 *
 * Pembungkus kartu hybrid khusus desktop (>= 1024px):
 * - Lapisan luar membawa atribut [data-card-reveal] untuk GSAP stagger entrance.
 * - Lapisan dalam memakai Framer Motion whileHover={{ y: -5 }} + pendaran rim glow 1px
 *   mengikuti kursor berwarna aksen tema (--theme-accent / --theme-glow).
 * - Mobile (< 1024px): langsung merender kontainer statis tanpa motion wrapper maupun
 *   event listener mouse, sehingga 0% menyentuh performa HP.
 */
export function DesktopCardHover({
  children,
  className = '',
  innerClassName = '',
  hoverY = -5,
  roundedClass = 'rounded-2xl',
  enableGlow = true,
  enableHover = true,
  enableReveal = true,
  ...rest
}) {
  const isDesktop = useDesktopMotion();
  const cardRef = useRef(null);

  const handleMouseMove = useCallback(
    (e) => {
      if (!isDesktop || !enableGlow || !cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      cardRef.current.style.setProperty('--mx', `${e.clientX - rect.left}px`);
      cardRef.current.style.setProperty('--my', `${e.clientY - rect.top}px`);
    },
    [isDesktop, enableGlow]
  );

  if (!isDesktop) {
    return (
      <div className={cn('h-full w-full', className)} {...rest}>
        {children}
      </div>
    );
  }

  return (
    <div
      data-card-reveal={enableReveal ? '' : undefined}
      className={cn('h-full w-full', className)}
      {...rest}
    >
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        whileHover={enableHover ? { y: hoverY } : undefined}
        transition={{
          type: 'spring',
          stiffness: 420,
          damping: 28,
          mass: 0.7,
        }}
        className={cn('group/card relative h-full w-full', roundedClass, innerClassName)}
      >
        {/* 1.5px Cursor-Following Theme Accent Rim Glow (0 React re-renders via CSS custom properties) */}
        {enableGlow && (
          <div
            aria-hidden="true"
            className={cn(
              'pointer-events-none absolute inset-0 z-30 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300',
              roundedClass
            )}
            style={{
              padding: '1.5px',
              background:
                'radial-gradient(240px circle at var(--mx, 50%) var(--my, 50%), var(--theme-accent, #D97706), var(--theme-glow, rgba(217,119,6,0.35)) 42%, transparent 72%)',
              WebkitMask:
                'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              WebkitMaskComposite: 'xor',
              maskComposite: 'exclude',
            }}
          />
        )}

        {/* Ambient Soft Outer Glow on Hover */}
        {enableGlow && (
          <div
            aria-hidden="true"
            className={cn(
              'pointer-events-none absolute -inset-px z-0 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300',
              roundedClass
            )}
            style={{
              boxShadow:
                '0 14px 32px -10px rgba(0, 0, 0, 0.35), 0 0 22px -6px var(--theme-glow, rgba(217,119,6,0.4))',
            }}
          />
        )}

        <div className="relative z-10 h-full w-full">{children}</div>
      </motion.div>
    </div>
  );
}
