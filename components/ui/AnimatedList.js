'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import './AnimatedList.css';

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

const THEMES = {
  dark: {
    '--al-frame': 'transparent',
    '--al-frame-edge': 'rgba(255, 255, 255, 0.08)',
    '--al-frame-highlight': 'rgba(255, 255, 255, 0.05)',
    '--al-frame-shadow': 'none',
    '--al-tile': 'transparent',
    '--al-tile-edge': 'transparent',
    '--al-tile-highlight': 'transparent',
    '--al-tile-shadow': 'none',
    '--al-well': 'rgba(255, 255, 255, 0.06)',
    '--al-ink': '#FAFAFA',
    '--al-muted': '#A1A1AA',
    '--al-thumb': 'rgba(255, 255, 255, 0.15)',
    '--al-ring': 'rgba(255, 255, 255, 0.2)',
    '--al-ring-fill': 'rgba(255, 255, 255, 0.03)',
    '--al-hover': 'brightness(1.05)',
    '--al-press': 'brightness(0.92)',
    '--al-active': 'brightness(1.08)'
  }
};

const HIDDEN = {
  pop: { above: 'translate3d(0, -20px, 0) scale(0.95)', below: 'translate3d(0, 24px, 0) scale(0.95)' },
  slide: { above: 'translate3d(0, -32px, 0) scale(0.98)', below: 'translate3d(0, 32px, 0) scale(0.98)' },
  fade: { above: 'translate3d(0, -10px, 0)', below: 'translate3d(0, 10px, 0)' }
};

const SPRING =
  'linear(0, 0.0603, 0.2033, 0.3821, 0.5633, 0.7258, 0.8584, 0.9574, 1.0242, 1.0634, 1.0809, 1.0828, 1.0747, 1.0613, 1.046, 1.0313, 1.0186, 1.0085, 1.0012, 0.9965, 0.994, 0.9931, 0.9933, 0.9941, 0.9953, 0.9966, 0.9978, 0.9988, 1)';

const smootherstep = t => t * t * t * (t * (t * 6 - 15) + 10);

const FADE_MASK = (() => {
  const steps = [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1];
  const top = steps.map(t => `rgba(0, 0, 0, ${smootherstep(t).toFixed(3)}) calc(var(--al-fade-top) * ${t})`);
  const bottom = [...steps]
    .reverse()
    .map(t => `rgba(0, 0, 0, ${smootherstep(t).toFixed(3)}) calc(100% - var(--al-fade-bottom) * ${t})`);
  return `linear-gradient(to bottom, ${[...top, ...bottom].join(', ')})`;
})();

const size = value => (typeof value === 'number' ? `${value}px` : value);

export default function AnimatedList({
  items = [],
  onItemSelect,
  renderItem,
  initialSelectedIndex = -1,
  selectOnHover = false,
  enableArrowNavigation = true,
  loop = false,
  animation = 'pop',
  animateOnce = true,
  stagger = 0.05,
  showGradients = false,
  fadeSize = 40,
  displayScrollbar = true,
  frame = false,
  theme = 'dark',
  accentColor,
  radius = 12,
  gap = 12,
  width = '100%',
  maxHeight = 'none',
  className = '',
  itemClassName = '',
  trackClassName = '',
  style,
  role = 'feed',
  itemRole = 'article',
}) {
  const rootRef = useRef(null);
  const viewportRef = useRef(null);
  const trackRef = useRef(null);
  const indicatorRef = useRef(null);
  const ringRef = useRef(null);
  const itemRefs = useRef([]);
  const engineRef = useRef(null);
  const keyboardRef = useRef(false);
  const navigatingRef = useRef(false);
  const [selected, setSelected] = useState(initialSelectedIndex);
  const baseId = useId();
  const settings = {
    items,
    onItemSelect,
    selected,
    selectOnHover,
    enableArrowNavigation,
    loop,
    animation,
    animateOnce,
    stagger,
    showGradients,
    fadeSize
  };
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useIsomorphicLayoutEffect(() => {
    const root = rootRef.current;
    const viewport = viewportRef.current;
    const track = trackRef.current;
    const indicator = indicatorRef.current;
    const ring = ringRef.current;
    if (!root || !viewport || !track || !indicator || !ring) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches;
    const springEase = CSS.supports?.('transition-timing-function', 'linear(0, 1)')
      ? SPRING
      : 'cubic-bezier(0.34, 1.4, 0.64, 1)';
    const transition = `transform 550ms ${springEase}, opacity 250ms cubic-bezier(0.22, 1, 0.36, 1), filter 200ms ease`;
    const motion = { y: 0, h: 0, vy: 0, vh: 0, ty: 0, th: 0, ready: false };
    const fades = { top: '', bottom: '' };
    let boxes = [];
    let current = null;
    let entered = false;
    let engaged = false;
    let pointer = [0, 0];
    let raf = 0;
    let last = 0;

    const mode = () => {
      if (isMobile()) return 'none';
      const chosen = settingsRef.current.animation;
      if (chosen === 'none' || !HIDDEN[chosen]) return 'none';
      return reduced ? 'fade' : chosen;
    };

    const apply = (element, state) => {
      element.dataset.state = state;
      const pose = current && current !== 'none' && state !== 'in' ? HIDDEN[current][state] : '';
      element.style.transform = pose;
      element.style.opacity = pose ? '0' : '';
    };

    const syncRing = () => {
      const item = itemRefs.current[settingsRef.current.selected];
      if (!item) return;
      const state = item.dataset.state || 'in';
      if (state === ring.dataset.state) return;
      ring.style.transitionDelay = item.style.transitionDelay;
      apply(ring, state);
    };

    const write = () => {
      indicator.style.transform = `translate3d(0, ${motion.y.toFixed(2)}px, 0)`;
      indicator.style.height = `${motion.h.toFixed(2)}px`;
    };

    const frame = now => {
      raf = 0;
      const dt = Math.min(0.05, (now - last) / 1000 || 0);
      last = now;
      const omega = 30;
      const zeta = 0.78;
      const steps = Math.max(1, Math.ceil(dt / (1 / 240)));
      const h = dt / steps;
      for (let i = 0; i < steps; i++) {
        motion.vy += (omega * omega * (motion.ty - motion.y) - 2 * zeta * omega * motion.vy) * h;
        motion.vh += (omega * omega * (motion.th - motion.h) - 2 * zeta * omega * motion.vh) * h;
        motion.y += motion.vy * h;
        motion.h += motion.vh * h;
      }
      const moving =
        Math.abs(motion.ty - motion.y) > 0.05 ||
        Math.abs(motion.th - motion.h) > 0.05 ||
        Math.abs(motion.vy) + Math.abs(motion.vh) > 0.5;
      if (!moving) {
        motion.y = motion.ty;
        motion.h = motion.th;
        motion.vy = motion.vh = 0;
      }
      write();
      if (moving) raf = requestAnimationFrame(frame);
    };

    const place = snap => {
      const item = itemRefs.current[settingsRef.current.selected];
      if (!item || isMobile()) {
        indicator.style.opacity = '0';
        motion.ready = false;
        return;
      }
      indicator.style.opacity = '1';
      motion.ty = item.offsetTop;
      motion.th = item.offsetHeight;
      if (snap || reduced || !motion.ready) {
        motion.y = motion.ty;
        motion.h = motion.th;
        motion.vy = motion.vh = 0;
        motion.ready = true;
        write();
        return;
      }
      if (!raf) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };

    const updateFades = () => {
      const s = settingsRef.current;
      const span = Math.max(1, s.fadeSize);
      const { scrollTop, scrollHeight, clientHeight } = viewport;
      const top = s.showGradients ? Math.min(span, Math.max(0, scrollTop)) : 0;
      const bottom = s.showGradients ? Math.min(span, Math.max(0, scrollHeight - clientHeight - scrollTop)) : 0;
      const nextTop = `${top.toFixed(1)}px`;
      const nextBottom = `${bottom.toFixed(1)}px`;
      if (nextTop !== fades.top) {
        fades.top = nextTop;
        viewport.style.setProperty('--al-fade-top', nextTop);
      }
      if (nextBottom !== fades.bottom) {
        fades.bottom = nextBottom;
        viewport.style.setProperty('--al-fade-bottom', nextBottom);
      }
    };

    const isWindowScroll = maxHeight === 'none';

    const measure = () => {
      if (isWindowScroll) {
        const rootTop = root.getBoundingClientRect().top + (typeof window !== 'undefined' ? window.scrollY : 0);
        boxes = itemRefs.current.map(item => (item ? [rootTop + item.offsetTop, item.offsetHeight] : null));
      } else {
        const offset = track.offsetTop;
        boxes = itemRefs.current.map(item => (item ? [offset + item.offsetTop, item.offsetHeight] : null));
      }
    };

    const reveal = entrance => {
      if (!entered) return;
      const s = settingsRef.current;
      const top = isWindowScroll && typeof window !== 'undefined' ? window.scrollY : viewport.scrollTop;
      const view = isWindowScroll && typeof window !== 'undefined' ? window.innerHeight : viewport.clientHeight;
      let order = 0;
      itemRefs.current.forEach((item, index) => {
        const box = boxes[index];
        if (!item || !box) return;
        const start = box[0] - top;
        const overlap = Math.min(view, start + box[1]) - Math.max(0, start);
        const hidden =
          current !== 'none' && overlap < Math.min(box[1], view) * 0.35 && !(s.animateOnce && item.dataset.seen);
        const state = hidden ? (start + box[1] / 2 < view / 2 ? 'above' : 'below') : 'in';
        if (state === item.dataset.state) return;
        const delay = entrance && !hidden ? (order++ * Math.max(0, s.stagger)).toFixed(3) : 0;
        item.style.transitionDelay = delay ? `${delay}s, ${delay}s, 0s` : '';
        if (!hidden) item.dataset.seen = 'true';
        apply(item, state);
      });
      syncRing();
    };

    const sync = (forceEntrance = false) => {
      const s = settingsRef.current;
      itemRefs.current.length = s.items.length;
      const curItems = itemRefs.current.filter(Boolean);
      const next = mode();
      const changed = next !== current || forceEntrance;
      const restyle = changed ? curItems : curItems.filter(item => !item.dataset.state);
      current = next;
      if (current === 'none') entered = true;
      if (restyle.length) {
        const elements = changed ? [...restyle, ring] : restyle;
        for (const element of elements) element.style.transition = 'none';
        for (const item of restyle) {
          delete item.dataset.seen;
          apply(item, current === 'none' ? 'in' : 'below');
        }
        if (changed) apply(ring, itemRefs.current[s.selected]?.dataset.state || 'in');
        if (current !== 'none' && !isMobile()) {
          void root.offsetHeight;
        }
        for (const element of elements) element.style.transition = transition;
      }
      measure();
      if (entered) {
        requestAnimationFrame(() => {
          reveal(restyle.length > 0 || forceEntrance);
        });
      }
    };

    sync();

    const gate =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(
            (entries, observer) => {
              if (!entries.some(entry => entry.isIntersecting)) return;
              observer.disconnect();
              if (entered) return;
              entered = true;
              measure();
              requestAnimationFrame(() => {
                reveal(true);
              });
            },
            { rootMargin: '0px 0px -5% 0px' }
          );

    const checkInitialVisibility = () => {
      if (typeof window === 'undefined') return;
      const rect = root.getBoundingClientRect();
      const inView = rect.top < (window.innerHeight || 800) && rect.bottom > 0;
      if (inView) {
        entered = true;
        measure();
        requestAnimationFrame(() => {
          reveal(true);
        });
      } else if (gate) {
        gate.observe(root);
      } else {
        entered = true;
        reveal(true);
      }
    };

    if (!entered) {
      checkInitialVisibility();
    }

    const resizeObserver = new ResizeObserver(() => {
      if (isMobile()) {
        indicator.style.opacity = '0';
        return;
      }
      place(true);
      updateFades();
      measure();
      reveal(false);
    });
    resizeObserver.observe(viewport);
    resizeObserver.observe(track);

    const onScroll = () => {
      if (isMobile()) return;
      updateFades();
      reveal(false);
    };

    const onKey = event => {
      if (isMobile()) return;
      const s = settingsRef.current;
      if (!s.enableArrowNavigation || event.defaultPrevented) return;
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const active = document.activeElement;
      const focused = active === viewport;
      const idle = !active || active === document.body || active === document.documentElement;
      if (!focused && !(engaged && idle)) return;
      const count = s.items.length;
      if (!count) return;
      const index = s.selected;
      let next = null;
      if (event.key === 'ArrowDown') next = index < 0 ? 0 : index + 1;
      else if (event.key === 'ArrowUp') next = index < 0 ? count - 1 : index - 1;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = count - 1;
      else if ((event.key === 'Enter' || (focused && event.key === ' ')) && index >= 0 && index < count) {
        event.preventDefault();
        s.onItemSelect?.(s.items[index], index);
        return;
      }
      if (next === null) return;
      event.preventDefault();
      next = s.loop ? (next + count) % count : Math.min(count - 1, Math.max(0, next));
      keyboardRef.current = true;
      navigatingRef.current = true;
      setSelected(next);
    };

    const onPointerMove = event => {
      if (isMobile()) return;
      const moved = event.clientX !== pointer[0] || event.clientY !== pointer[1];
      pointer = [event.clientX, event.clientY];
      if (!navigatingRef.current || !moved) return;
      navigatingRef.current = false;
      const item = event.target instanceof Element ? event.target.closest('[data-index]') : null;
      if (item && root.contains(item) && settingsRef.current.selectOnHover) setSelected(Number(item.dataset.index));
    };

    const onEnter = () => {
      if (isMobile()) return;
      engaged = true;
    };
    const onLeave = () => {
      if (isMobile()) return;
      engaged = false;
    };

    const scrollTarget = isWindowScroll && typeof window !== 'undefined' ? window : viewport;
    scrollTarget.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('keydown', onKey);
    root.addEventListener('pointerenter', onEnter);
    root.addEventListener('pointerleave', onLeave);
    root.addEventListener('pointermove', onPointerMove);

    updateFades();
    place(true);
    syncRing();

    engineRef.current = { place, syncRing, updateFades, sync };

    return () => {
      cancelAnimationFrame(raf);
      gate?.disconnect();
      resizeObserver.disconnect();
      scrollTarget.removeEventListener('scroll', onScroll);
      window.removeEventListener('keydown', onKey);
      root.removeEventListener('pointerenter', onEnter);
      root.removeEventListener('pointerleave', onLeave);
      root.removeEventListener('pointermove', onPointerMove);
      engineRef.current = null;
    };
  }, []);

  useIsomorphicLayoutEffect(() => {
    engineRef.current?.sync(true);
  }, [items, animation]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.place(false);
    engine.syncRing();
    if (!keyboardRef.current) return;
    keyboardRef.current = false;
    const viewport = viewportRef.current;
    const track = trackRef.current;
    const item = itemRefs.current[selected];
    if (!viewport || !track || !item) return;
    const top = track.offsetTop + item.offsetTop;
    const bottom = top + item.offsetHeight;
    const room = Math.max(0, (viewport.clientHeight - item.offsetHeight) / 2);
    const margin = Math.min(showGradients ? Math.max(12, fadeSize) : 12, room);
    if (top < viewport.scrollTop + margin) {
      viewport.scrollTo({ top: Math.max(0, top - margin), behavior: 'smooth' });
    } else if (bottom > viewport.scrollTop + viewport.clientHeight - margin) {
      viewport.scrollTo({ top: bottom - viewport.clientHeight + margin, behavior: 'smooth' });
    }
  }, [selected, fadeSize, showGradients]);

  useEffect(() => {
    engineRef.current?.updateFades();
  }, [showGradients, fadeSize, maxHeight, gap]);

  const hover = index => {
    if (!navigatingRef.current && selectOnHover) setSelected(index);
  };

  const choose = (item, index) => {
    setSelected(index);
    onItemSelect?.(item, index);
  };

  return (
    <div
      ref={rootRef}
      className={`animated-list${frame ? ' animated-list--framed' : ''} ${className}`.trim()}
      data-animated={animation !== 'none' ? '' : undefined}
      data-bounded={maxHeight !== 'none' ? '' : undefined}
      style={{
        ...(THEMES[theme] ?? THEMES.dark),
        '--al-radius': `${Math.max(0, radius)}px`,
        '--al-gap': `${Math.max(0, gap)}px`,
        '--al-width': size(width),
        '--al-accent': accentColor || 'var(--al-ink)',
        ...(accentColor
          ? { '--al-ring': accentColor, '--al-ring-fill': `color-mix(in srgb, ${accentColor} 8%, transparent)` }
          : {}),
        ...style
      }}
    >
      <div
        ref={viewportRef}
        className={`animated-list__viewport${displayScrollbar ? '' : ' animated-list__viewport--bare'}`}
        role={role}
        tabIndex={0}
        aria-activedescendant={role === 'listbox' && selected >= 0 && selected < items.length ? `${baseId}-${selected}` : undefined}
        style={{
          maxHeight: size(maxHeight),
          maskImage: showGradients ? FADE_MASK : undefined,
          WebkitMaskImage: showGradients ? FADE_MASK : undefined
        }}
      >
        <div ref={trackRef} className={`animated-list__track ${trackClassName}`.trim()}>
          {items.map((item, index) => {
            const entry = item !== null && typeof item === 'object' ? item : { title: String(item) };
            const isSelected = index === selected;
            return (
              <div
                key={entry.id ?? index}
                ref={element => {
                  itemRefs.current[index] = element;
                }}
                id={`${baseId}-${index}`}
                className={`animated-list__item ${itemClassName}`.trim()}
                role={itemRole}
                aria-selected={itemRole === 'option' ? isSelected : undefined}
                data-index={index}
                data-selected={isSelected ? '' : undefined}
                onPointerEnter={() => hover(index)}
                onClick={() => choose(item, index)}
              >
                {renderItem ? (
                  renderItem(item, index, isSelected)
                ) : (
                  <>
                    {entry.icon && (
                      <span className="animated-list__lead">
                        {entry.icon}
                      </span>
                    )}
                    <span className="animated-list__text">
                      <span className="animated-list__title">{entry.title}</span>
                      {entry.description && <span className="animated-list__description">{entry.description}</span>}
                    </span>
                    {entry.meta && <span className="animated-list__meta">{entry.meta}</span>}
                  </>
                )}
                <span className="animated-list__rim" aria-hidden="true" />
              </div>
            );
          })}
          <span ref={indicatorRef} className="animated-list__indicator" aria-hidden="true">
            <span ref={ringRef} className="animated-list__ring" />
          </span>
        </div>
      </div>
      {frame && <span className="animated-list__frame-rim" aria-hidden="true" />}
    </div>
  );
}
