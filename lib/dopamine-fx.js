/**
 * dopamine-fx.js
 * 
 * Lightweight, zero-dependency micro-confetti & sparkle burst utility for desktop.
 * Pure canvas-based physics animation (zero DOM layout-thrashing).
 * 
 * Features:
 * - Desktop-only (>= 1024px) & respects prefers-reduced-motion.
 * - Automatically cleans up canvas & animation loops within 650ms.
 * - Renders 14-18 vibrant particles with gravity, air resistance, and wobble.
 */

function shouldSkipMotion() {
  if (typeof window === 'undefined') return true;
  if (window.innerWidth < 1024) return true;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

const CELEBRATION_COLORS = [
  '#38BDF8', // Sky blue
  '#F59E0B', // Amber
  '#10B981', // Emerald
  '#EC4899', // Pink
  '#8B5CF6', // Purple
  '#F97316', // Orange
];

/**
 * Triggers a micro-confetti burst from the given element or (x, y) coordinates.
 * @param {HTMLElement | { clientX: number, clientY: number }} source 
 */
export function triggerConfettiBurst(source) {
  if (shouldSkipMotion()) return;

  let x = window.innerWidth / 2;
  let y = window.innerHeight / 2;

  if (source) {
    if (source.getBoundingClientRect && typeof source.getBoundingClientRect === 'function') {
      const rect = source.getBoundingClientRect();
      x = rect.left + rect.width / 2;
      y = rect.top + rect.height / 2;
    } else if (typeof source.clientX === 'number' && typeof source.clientY === 'number') {
      x = source.clientX;
      y = source.clientY;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '99999';

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(dpr, dpr);

  document.body.appendChild(canvas);

  const particleCount = 16;
  const particles = [];

  for (let i = 0; i < particleCount; i++) {
    const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.5;
    const speed = 3.5 + Math.random() * 4.5;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2.5, // slight upward pop
      size: 3 + Math.random() * 3.5,
      color: CELEBRATION_COLORS[i % CELEBRATION_COLORS.length],
      rotation: Math.random() * 360,
      vRotation: (Math.random() - 0.5) * 12,
      opacity: 1,
      shape: Math.random() > 0.5 ? 'circle' : 'rect',
    });
  }

  const startTime = performance.now();
  const DURATION = 650; // ms

  function render(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / DURATION, 1);

    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

    const fadeOut = 1 - Math.pow(progress, 1.8);

    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.22; // gravity
      p.vx *= 0.96; // air drag
      p.rotation += p.vRotation;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.globalAlpha = Math.max(0, fadeOut);
      ctx.fillStyle = p.color;

      if (p.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
      }

      ctx.restore();
    });

    if (progress < 1) {
      requestAnimationFrame(render);
    } else {
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
    }
  }

  requestAnimationFrame(render);
}

/**
 * Triggers a warm golden star burst ripple around an element.
 * @param {HTMLElement | { clientX: number, clientY: number }} source 
 */
export function triggerStarBurst(source) {
  if (shouldSkipMotion()) return;

  let x = window.innerWidth / 2;
  let y = window.innerHeight / 2;

  if (source) {
    if (source.getBoundingClientRect && typeof source.getBoundingClientRect === 'function') {
      const rect = source.getBoundingClientRect();
      x = rect.left + rect.width / 2;
      y = rect.top + rect.height / 2;
    } else if (typeof source.clientX === 'number' && typeof source.clientY === 'number') {
      x = source.clientX;
      y = source.clientY;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '99999';

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(dpr, dpr);

  document.body.appendChild(canvas);

  const particleCount = 8;
  const particles = [];
  const GOLD_COLORS = ['#F59E0B', '#FBBF24', '#FDE68A', '#FEF3C7'];

  for (let i = 0; i < particleCount; i++) {
    const angle = (Math.PI * 2 * i) / particleCount;
    const speed = 2.5 + Math.random() * 2;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 2.5 + Math.random() * 2,
      color: GOLD_COLORS[i % GOLD_COLORS.length],
    });
  }

  const startTime = performance.now();
  const DURATION = 450;

  function render(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / DURATION, 1);

    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

    const fadeOut = 1 - progress;

    // Center expanding glow ring
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, 6 + progress * 24, 0, Math.PI * 2);
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = Math.max(0, fadeOut * 0.6);
    ctx.stroke();
    ctx.restore();

    // Outward sparkle dots
    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.94;
      p.vy *= 0.94;

      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1 - progress * 0.5), 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, fadeOut);
      ctx.fill();
      ctx.restore();
    });

    if (progress < 1) {
      requestAnimationFrame(render);
    } else {
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
    }
  }

  requestAnimationFrame(render);
}
