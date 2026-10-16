'use client';

import { useEffect, useRef, useState } from 'react';

const DEFAULT_SPRING = { stiffness: 180, damping: 15, mass: 0.8 };

const smoothstep = (edge0, edge1, value) => {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

export default function Magnet({
  children,
  padding = 60,
  disabled = false,
  magnetStrength = 2.5,
  maxOffset = 10,
  axis = 'both',
  tilt = 2,
  scale = 1.02,
  spring = DEFAULT_SPRING,
  wrapperClassName = '',
  innerClassName = '',
  className = '',
  ...props
}) {
  const wrapperRef = useRef(null);
  const innerRef = useRef(null);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const inner = innerRef.current;
    if (!wrapper || !inner || disabled) return;

    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;

    const current = { x: 0, y: 0, tiltX: 0, tiltY: 0, scale: 1 };
    const velocity = { x: 0, y: 0, tiltX: 0, tiltY: 0, scale: 0 };
    let target = { x: 0, y: 0, tiltX: 0, tiltY: 0, scale: 1 };
    let raf = null;
    let last = 0;
    let engaged = false;

    const stiffness = spring?.stiffness ?? DEFAULT_SPRING.stiffness;
    const damping = spring?.damping ?? DEFAULT_SPRING.damping;
    const mass = spring?.mass ?? DEFAULT_SPRING.mass;

    const solve = (dt) => {
      let resting = true;
      ['x', 'y', 'tiltX', 'tiltY', 'scale'].forEach((key) => {
        const force = stiffness * (target[key] - current[key]) - damping * velocity[key];
        velocity[key] += (force / mass) * dt;
        current[key] += velocity[key] * dt;
        const epsilon = key === 'scale' ? 0.001 : 0.02;
        if (
          Math.abs(target[key] - current[key]) > epsilon ||
          Math.abs(velocity[key]) > epsilon
        ) {
          resting = false;
        }
      });
      return resting;
    };

    const apply = () => {
      inner.style.transform = `translate3d(${current.x.toFixed(2)}px, ${current.y.toFixed(
        2
      )}px, 0) perspective(700px) rotateX(${current.tiltX.toFixed(
        2
      )}deg) rotateY(${current.tiltY.toFixed(2)}deg) scale(${current.scale.toFixed(3)})`;
    };

    const frame = (now) => {
      raf = null;
      const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
      last = now;

      const resting = solve(dt);
      apply();

      if (!resting || engaged) {
        raf = requestAnimationFrame(frame);
      } else {
        last = 0;
        current.x = 0;
        current.y = 0;
        current.tiltX = 0;
        current.tiltY = 0;
        current.scale = 1;
        apply();
      }
    };

    const startAnimation = () => {
      if (!raf) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };

    const handlePointerMove = (e) => {
      if (e.pointerType === 'touch') return;
      const rect = wrapper.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;

      const outsideX = Math.max(0, Math.abs(dx) - rect.width / 2);
      const outsideY = Math.max(0, Math.abs(dy) - rect.height / 2);
      const outside = Math.hypot(outsideX, outsideY);

      if (outside > padding) {
        if (engaged) {
          engaged = false;
          setIsActive(false);
          target = { x: 0, y: 0, tiltX: 0, tiltY: 0, scale: 1 };
          startAnimation();
        }
        return;
      }

      if (!engaged) {
        engaged = true;
        setIsActive(true);
      }

      const pull = padding > 0 ? 1 - smoothstep(padding * 0.4, padding, outside) : 1;
      let tx = axis === 'y' ? 0 : (dx / magnetStrength) * pull;
      let ty = axis === 'x' ? 0 : (dy / magnetStrength) * pull;

      if (maxOffset != null) {
        const len = Math.hypot(tx, ty);
        if (len > maxOffset) {
          tx = (tx / len) * maxOffset;
          ty = (ty / len) * maxOffset;
        }
      }

      const nx = Math.max(-1, Math.min(1, dx / (rect.width / 2 || 1)));
      const ny = Math.max(-1, Math.min(1, dy / (rect.height / 2 || 1)));

      target = {
        x: tx,
        y: ty,
        tiltX: -ny * tilt * pull,
        tiltY: nx * tilt * pull,
        scale: 1 + (scale - 1) * pull,
      };

      startAnimation();
    };

    const handlePointerLeave = () => {
      if (engaged) {
        engaged = false;
        setIsActive(false);
        target = { x: 0, y: 0, tiltX: 0, tiltY: 0, scale: 1 };
        startAnimation();
      }
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', handlePointerLeave);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      document.documentElement.removeEventListener('pointerleave', handlePointerLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [disabled, padding, magnetStrength, maxOffset, axis, tilt, scale, spring]);

  return (
    <div
      ref={wrapperRef}
      className={`inline-block ${wrapperClassName} ${className}`}
      data-magnet-active={isActive ? 'true' : undefined}
      {...props}
    >
      <div
        ref={innerRef}
        className={`will-change-transform ${innerClassName}`}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {children}
      </div>
    </div>
  );
}

