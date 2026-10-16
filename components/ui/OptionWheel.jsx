'use client';

import { useRef, useState, useCallback, useEffect } from 'react';

export default function OptionWheel({
  items = [],
  selectedIndex = 0,
  onChange,
  onItemClick,
  textColor = '#71717A',
  activeColor = '#FAFAFA',
  side = 'center',
  fontSize = 1.05,
  spacing = 2.0,
  curve = 0.8,
  tilt = 9,
  blur = 1.8,
  fade = 0.4,
  minOpacity = 0.15,
  smoothing = 180,
  inset = 0,
  loop = false,
  draggable = true,
  className = '',
}) {
  const rootRef = useRef(null);
  const itemRefs = useRef([]);
  const posRef = useRef(selectedIndex);
  const targetRef = useRef(selectedIndex);
  const rafRef = useRef(null);
  const lastRef = useRef(0);
  const cfgRef = useRef({});
  const onChangeRef = useRef(onChange);
  const selectedRef = useRef(selectedIndex);
  const wheelTimerRef = useRef(null);
  const dragRef = useRef(null);
  const dragMovedRef = useRef(false);
  const [internalSelected, setInternalSelected] = useState(selectedIndex);
  const [isDragging, setIsDragging] = useState(false);

  // Sync prop changes
  useEffect(() => {
    if (selectedIndex !== selectedRef.current && selectedIndex >= 0 && selectedIndex < items.length) {
      selectedRef.current = selectedIndex;
      targetRef.current = selectedIndex;
      setInternalSelected(selectedIndex);
      startLoop();
    }
  }, [selectedIndex, items.length]);

  const remPx =
    typeof window !== 'undefined'
      ? parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
      : 16;

  onChangeRef.current = onChange;
  cfgRef.current = {
    count: items.length,
    items,
    rowH: Math.max(fontSize * spacing * remPx, 24),
    curve,
    tilt,
    blur,
    fade,
    minOpacity,
    side,
    loop,
    smoothing,
    draggable,
  };

  const runFrame = useCallback((now) => {
    const dt = Math.min((now - lastRef.current) / 1000, 0.05);
    lastRef.current = now;
    const cfg = cfgRef.current;
    if (cfg.count === 0) return;

    const tau = Math.max(cfg.smoothing, 1) / 1000;
    const k = 1 - Math.exp(-dt / tau);

    const target = targetRef.current;
    const cur = posRef.current;
    let next = cur + (target - cur) * k;
    const settled = Math.abs(target - next) < 0.001;
    if (settled) next = target;
    posRef.current = next;

    const els = itemRefs.current;
    const n = cfg.count;
    const mirror = cfg.side === 'right' ? -1 : cfg.side === 'left' ? 1 : 0;
    const tiltRad = (cfg.tilt * Math.PI) / 180;
    const R = tiltRad > 0.0005 ? cfg.rowH / tiltRad : 0;

    for (let i = 0; i < n; i++) {
      const el = els[i];
      if (!el) continue;
      let d = i - next;
      if (cfg.loop && n > 1) {
        d = ((d % n) + n) % n;
        if (d > n / 2) d -= n;
      }
      const dist = Math.abs(d);
      let x = 0;
      let y = d * cfg.rowH;
      let rot = 0;
      let rotX = 0;

      if (R > 0) {
        const ang = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, d * tiltRad));
        y = R * Math.sin(ang);
        rotX = (-ang * 180) / Math.PI;
        if (mirror !== 0) {
          x = -mirror * R * (1 - Math.cos(ang)) * cfg.curve;
          rot = (mirror * ang * 180) / Math.PI;
        }
      }

      const isCenter = cfg.side === 'center';
      const centerTranslateX = isCenter ? '-50%' : '0px';

      el.style.transform = `translate3d(calc(${centerTranslateX} + ${x.toFixed(
        2
      )}px), calc(${y.toFixed(2)}px - 50%), 0) perspective(600px) rotateX(${rotX.toFixed(
        2
      )}deg) rotate(${rot.toFixed(2)}deg)`;
      el.style.opacity = String(Math.max(cfg.minOpacity, 1 - dist * cfg.fade));
      el.style.filter =
        cfg.blur > 0 ? `blur(${(dist * cfg.blur).toFixed(2)}px)` : 'none';
      el.style.setProperty(
        '--ow-p',
        Math.max(0, 1 - Math.min(dist, 1)).toFixed(4)
      );
    }

    rafRef.current = settled ? null : requestAnimationFrame(runFrame);
  }, []);

  const startLoop = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
    }
    lastRef.current = performance.now();
    rafRef.current = requestAnimationFrame(runFrame);
  }, [runFrame]);

  const applyTarget = useCallback(
    (value, snap) => {
      const cfg = cfgRef.current;
      if (cfg.count === 0) return;
      let v = value;
      if (!cfg.loop) v = Math.min(Math.max(v, 0), Math.max(cfg.count - 1, 0));
      if (snap) v = Math.round(v);
      targetRef.current = v;
      const idx = ((Math.round(v) % cfg.count) + cfg.count) % cfg.count;
      if (idx !== selectedRef.current) {
        selectedRef.current = idx;
        setInternalSelected(idx);
        onChangeRef.current?.(idx, cfg.items[idx]);
      }
      startLoop();
    },
    [startLoop]
  );

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const onWheel = (e) => {
      e.preventDefault();
      const cfg = cfgRef.current;
      const delta = e.deltaMode === 1 ? e.deltaY * 24 : e.deltaY;
      const step = Math.max(-1, Math.min(1, delta / cfg.rowH));
      applyTarget(targetRef.current + step, false);
      if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current);
      wheelTimerRef.current = setTimeout(
        () => applyTarget(targetRef.current, true),
        120
      );
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
      if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current);
    };
  }, [applyTarget]);

  const handlePointerDown = useCallback((e) => {
    if (!cfgRef.current.draggable) return;
    dragRef.current = { y: e.clientY, start: targetRef.current, id: e.pointerId };
    dragMovedRef.current = false;
    setIsDragging(true);
  }, []);

  const handlePointerMove = useCallback(
    (e) => {
      const drag = dragRef.current;
      if (!drag) return;
      const dy = e.clientY - drag.y;
      if (!dragMovedRef.current && Math.abs(dy) > 4) {
        dragMovedRef.current = true;
        rootRef.current?.setPointerCapture(drag.id);
      }
      if (dragMovedRef.current) {
        applyTarget(drag.start - dy / cfgRef.current.rowH, false);
      }
    },
    [applyTarget]
  );

  const handlePointerEnd = useCallback(() => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setIsDragging(false);
    if (dragMovedRef.current) applyTarget(targetRef.current, true);
  }, [applyTarget]);

  const handleItemClick = useCallback(
    (index) => {
      if (dragMovedRef.current) return;
      applyTarget(index, true);
      onItemClick?.(index, cfgRef.current.items[index]);
    },
    [applyTarget, onItemClick]
  );

  const handleKeyDown = useCallback(
    (e) => {
      let delta = null;
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') delta = -1;
      else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') delta = 1;
      if (delta == null) return;
      e.preventDefault();
      applyTarget(Math.round(targetRef.current) + delta, true);
    },
    [applyTarget]
  );

  useEffect(() => {
    applyTarget(targetRef.current, false);
  }, [items, fontSize, spacing, curve, tilt, blur, fade, minOpacity, side, loop, smoothing, applyTarget]);

  useEffect(
    () => () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    },
    []
  );

  const isCenter = side === 'center';

  return (
    <div
      ref={rootRef}
      role="listbox"
      tabIndex={0}
      aria-label="Pemilih Opsi Roda 3D"
      className={`relative h-full w-full select-none overflow-hidden outline-none [touch-action:none] ${
        isDragging ? 'cursor-grabbing' : 'cursor-grab'
      }${className ? ` ${className}` : ''}`}
      style={{
        '--ow-text-color': textColor,
        '--ow-active-color': activeColor,
        '--ow-font-size': `${fontSize}rem`,
        '--ow-inset': `${inset}px`,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onKeyDown={handleKeyDown}
    >
      {/* Visual focal line / subtle glow in middle */}
      <div className="pointer-events-none absolute inset-x-3 top-1/2 -translate-y-1/2 h-9 rounded-lg bg-white/[0.04] border border-white/[0.08] shadow-[0_0_15px_rgba(255,255,255,0.03)]" />

      {items.map((item, index) => {
        const label = typeof item === 'object' && item !== null ? item.label : String(item);
        const isSelected = internalSelected === index;

        return (
          <div
            key={`${label}-${index}`}
            ref={(el) => {
              itemRefs.current[index] = el;
            }}
            role="option"
            aria-selected={isSelected}
            className={`absolute top-1/2 cursor-pointer whitespace-nowrap leading-none transition-colors will-change-[transform,opacity,filter] [font-size:var(--ow-font-size)] ${
              isCenter
                ? 'left-1/2 text-center'
                : side === 'right'
                ? 'right-[var(--ow-inset)] origin-right text-right'
                : 'left-[var(--ow-inset)] origin-left text-left'
            } ${
              isSelected
                ? 'font-semibold text-white scale-[1.03]'
                : 'font-normal text-zinc-400 hover:text-zinc-200'
            }`}
            onClick={() => handleItemClick(index)}
          >
            {label}
          </div>
        );
      })}
    </div>
  );
}

