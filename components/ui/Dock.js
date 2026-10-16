'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import './Dock.css';

const SIDES = ['bottom', 'top', 'left', 'right', 'sidebar'];
const EDGE = 12;
const HOP = 0.35;
const HOP_TIME = 0.35;
const MARGIN = 8;

const THEMES = {
  dark: {
    '--dock-panel': 'rgba(255, 255, 255, 0.04)',
    '--dock-panel-edge': 'rgba(255, 255, 255, 0.08)',
    '--dock-panel-highlight': 'rgba(255, 255, 255, 0.06)',
    '--dock-panel-shadow': '0 20px 40px -20px rgba(0, 0, 0, 0.7)',
    '--dock-tile': 'rgba(255, 255, 255, 0.05)',
    '--dock-tile-edge': 'rgba(255, 255, 255, 0.08)',
    '--dock-tile-highlight': 'rgba(255, 255, 255, 0.12)',
    '--dock-tile-shadow': '0 4px 12px -4px rgba(0, 0, 0, 0.5)',
    '--dock-ink': '#fafafa',
    '--dock-label': '#16110E',
    '--dock-label-ink': '#fafafa',
    '--dock-dot': '#fafafa',
    '--dock-separator': 'rgba(255, 255, 255, 0.08)',
    '--dock-press': 'brightness(0.85)'
  }
};

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

const hasBadge = badge => badge !== undefined && badge !== null && badge !== false;
const clamp = (value, min, max) => Math.min(Math.max(value, min), Math.max(min, max));

export default function Dock({
  items = [],
  position = 'bottom',
  theme = 'dark',
  baseItemSize = 44,
  magnification = 58,
  distance = 140,
  panelHeight = 56,
  gap = 8,
  roundness = 0.5,
  spring = { mass: 0.1, stiffness: 160, damping: 14 },
  bounce = true,
  autoHide = false,
  tiles = true,
  showLabels = true,
  showIndicators = true,
  showBadges = true,
  badgeColor = '#E88B8B',
  accentColor = '#fafafa',
  className = '',
  style
}) {
  const rootRef = useRef(null);
  const itemRefs = useRef([]);
  const wakeRef = useRef(null);
  const actionsRef = useRef(null);
  const [fit, setFit] = useState(1);
  const side = SIDES.includes(position) ? position : 'bottom';
  const vertical = side === 'left' || side === 'right' || side === 'sidebar';
  const rawBase = Math.max(16, baseItemSize);
  const rawPeak = Math.max(rawBase, magnification);
  const rawThickness = Math.max(rawBase, panelHeight);
  const rawGap = Math.max(0, gap);
  const length =
    items.reduce((sum, item) => sum + (item?.separator ? 1 : rawBase), 0) +
    rawGap * Math.max(0, items.length - 1) +
    rawThickness -
    rawBase;
  const base = rawBase * fit;
  const peak = rawPeak * fit;
  const thickness = rawThickness * fit;
  const tokens = { ...(THEMES[theme] ?? THEMES.dark), '--dock-accent': accentColor, '--dock-badge': badgeColor };

  const settings = {
    items,
    side,
    vertical,
    length: length + rawPeak - rawBase,
    base,
    peak,
    thickness,
    gap: rawGap * fit,
    distance: Math.max(1, distance) * fit,
    mass: Math.max(0.01, spring?.mass ?? 0.1),
    stiffness: Math.max(1, spring?.stiffness ?? 160),
    damping: Math.max(0, spring?.damping ?? 14),
    bounce,
    autoHide
  };
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => {
    wakeRef.current?.();
  });

  useIsomorphicLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const host = root.offsetParent ?? (typeof document !== 'undefined' ? document.documentElement : null);
    if (!host) return undefined;
    const measure = () => {
      const s = settingsRef.current;
      const room = (s.vertical ? host.clientHeight : host.clientWidth) - EDGE * 2;
      const next = s.length > 0 ? Math.min(1, Math.max(0.5, room / s.length)) : 1;
      setFit(Math.round(next * 1000) / 1000);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    return () => observer.disconnect();
  }, [length, vertical, rawPeak, rawBase]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const reduce = typeof window !== 'undefined' ? (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false) : false;
    const motion = new Map();
    const pointer = { x: 0, y: 0, inside: false };
    let focused = -1;
    let held = null;
    let lastFocus = null;
    let lastRest = [];
    let lastBase = settingsRef.current.base;
    let raf = 0;
    let last = 0;
    let alive = true;

    const entry = index => {
      let state = motion.get(index);
      if (!state) {
        state = {
          size: settingsRef.current.base,
          velocity: 0,
          lift: 0,
          rise: 0,
          launch: 0,
          gravity: 0,
          hopping: false,
          drawn: '',
          node: null
        };
        motion.set(index, state);
      }
      return state;
    };

    const tick = now => {
      raf = 0;
      if (!alive) return;
      const s = settingsRef.current;
      const dt = Math.min(1 / 30, Math.max(0.001, (now - last) / 1000));
      last = now;
      if (s.base !== lastBase) {
        const ratio = s.base / lastBase;
        motion.forEach(state => {
          state.size *= ratio;
          state.velocity *= ratio;
        });
        lastBase = s.base;
      }
      const rect = root.getBoundingClientRect();
      const center = s.vertical ? rect.top + rect.height / 2 : rect.left + rect.width / 2;
      const spans = s.items.map(item => (item?.separator ? 1 : s.base));
      let cursor = -(spans.reduce((sum, span) => sum + span, 0) + s.gap * Math.max(0, spans.length - 1)) / 2;
      const rest = spans.map(span => {
        const middle = cursor + span / 2;
        cursor += span + s.gap;
        return middle;
      });
      let focus = null;
      if (held !== null) focus = held;
      else if (pointer.inside) focus = (s.vertical ? pointer.y : pointer.x) - center;
      else if (rest[focused] !== undefined) focus = rest[focused];
      lastFocus = focus;
      lastRest = rest;
      const steps = Math.max(1, Math.ceil(dt * 240));
      const h = dt / steps;
      const k = s.stiffness / s.mass;
      const c = s.damping / s.mass;
      let moving = false;

      s.items.forEach((item, index) => {
        const node = itemRefs.current[index];
        if (!node || item?.separator) return;
        const state = entry(index);
        const reach = focus === null ? 1 : Math.abs(focus - rest[index]) / s.distance;
        const target = s.base + (s.peak - s.base) * (reach < 1 ? Math.cos((reach * Math.PI) / 2) ** 2 : 0);
        if (reduce) {
          state.size = target;
          state.velocity = 0;
        } else {
          for (let i = 0; i < steps; i++) {
            state.velocity = (state.velocity + h * k * (target - state.size)) / (1 + h * c + h * h * k);
            state.size += state.velocity * h;
            if (!state.hopping) continue;
            state.rise -= state.gravity * h;
            state.lift += state.rise * h;
            if (state.lift > 0) continue;
            state.lift = 0;
            state.rise *= -0.36;
            if (state.rise < state.launch * 0.2) {
              state.rise = 0;
              state.hopping = false;
              node.removeAttribute('data-hop');
            }
          }
        }
        if (Math.abs(state.velocity) < 0.01 && Math.abs(target - state.size) < 0.01) {
          state.size = target;
          state.velocity = 0;
        } else {
          moving = true;
        }
        if (state.hopping) moving = true;
        const size = Math.max(1, state.size);
        const drawn = `${size.toFixed(2)} ${state.lift.toFixed(2)} ${s.side}`;
        if (drawn === state.drawn && node === state.node) return;
        state.drawn = drawn;
        state.node = node;
        const lift = s.side === 'bottom' || s.side === 'right' ? -state.lift : state.lift;
        const tile = node.firstElementChild;
        node.style.width = `${size}px`;
        node.style.height = `${size}px`;
        if (tile)
          tile.style.transform = `translate(${s.vertical ? `${lift}px, 0` : `0, ${lift}px`}) scale(${size / s.base})`;
      });

      if (moving) raf = requestAnimationFrame(tick);
    };

    const wake = () => {
      if (raf || !alive) return;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };

    actionsRef.current = {
      hop: index => {
        const node = itemRefs.current[index];
        if (reduce || !settingsRef.current.bounce || !node) return;
        const state = entry(index);
        if (state.hopping) return;
        const height = state.size * HOP;
        state.gravity = (8 * height) / (HOP_TIME * HOP_TIME);
        state.launch = (state.gravity * HOP_TIME) / 2;
        state.rise = state.launch;
        state.hopping = true;
        node.setAttribute('data-hop', '');
        wake();
      },
      focus: index => {
        focused = index;
        wake();
      }
    };

    const onMove = event => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.inside = true;
      wake();
    };
    const onLeave = () => {
      pointer.inside = false;
      wake();
    };

    root.addEventListener('pointermove', onMove);
    root.addEventListener('pointerdown', onMove);
    root.addEventListener('pointerleave', onLeave);
    root.addEventListener('pointercancel', onLeave);
    wake();

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      root.removeEventListener('pointermove', onMove);
      root.removeEventListener('pointerdown', onMove);
      root.removeEventListener('pointerleave', onLeave);
      root.removeEventListener('pointercancel', onLeave);
      wakeRef.current = null;
      actionsRef.current = null;
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className={`dock dock--${side}${tiles ? '' : ' dock--bare'}${className ? ` ${className}` : ''}`}
      role="toolbar"
      aria-label="Dock"
      aria-orientation={vertical ? 'vertical' : 'horizontal'}
      style={{
        ...tokens,
        '--dock-base': `${base}px`,
        '--dock-thickness': `${thickness}px`,
        '--dock-gap': `${rawGap * fit}px`,
        '--dock-pad': `${(thickness - base) / 2}px`,
        '--dock-reach': `${peak - base}px`,
        '--dock-round': clamp(roundness, 0, 1),
        ...style
      }}
    >
      {items.map((item, index) =>
        item?.separator ? (
          <span key={index} className="dock-separator" aria-hidden="true" />
        ) : (
          <button
            key={index}
            ref={node => {
              itemRefs.current[index] = node;
            }}
            type="button"
            className={`dock-item${item.className ? ` ${item.className}` : ''}`}
            aria-label={item.label}
            onClick={() => {
              actionsRef.current?.hop(index);
              item.onClick?.();
            }}
            onFocus={event => {
              if (event.currentTarget.matches(':focus-visible')) actionsRef.current?.focus(index);
            }}
            onBlur={() => actionsRef.current?.focus(-1)}
          >
            <span className="dock-tile">
              <span className="dock-face">{item.icon}</span>
              {showBadges && hasBadge(item.badge) ? (
                <span className="dock-badge">{item.badge === true ? null : item.badge}</span>
              ) : null}
            </span>
            {showIndicators && item.active ? <span className="dock-dot" aria-hidden="true" /> : null}
            {showLabels && item.label ? (
              <span className="dock-label" aria-hidden="true">
                {item.label}
              </span>
            ) : null}
          </button>
        )
      )}
    </div>
  );
}

