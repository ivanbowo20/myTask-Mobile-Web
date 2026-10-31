'use client';

import { useEffect, useRef } from 'react';

export default function SoftAuroraBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let isRunning = true;
    let width = 0;
    let height = 0;
    let time = 0;
    let lastTime = performance.now();
    let isMobile = typeof window !== 'undefined' ? window.innerWidth < 768 : false;
    let isScrolling = false;
    let scrollTimer = null;

    // Check reduced motion
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Mouse coordinates for gentle interactive sway (desktop only)
    let targetMouseX = 0.5;
    let currentMouseX = 0.5;

    const handleMouseMove = (e) => {
      if (isMobile) return;
      targetMouseX = e.clientX / window.innerWidth;
    };

    if (!isMobile) {
      window.addEventListener('mousemove', handleMouseMove, { passive: true });
    }

    // Aurora band configurations with dual-sided soft fading ribbons
    const bands = [
      {
        baseY: 0.28,
        amplitude: 45,
        thickness: 95,
        speed: 0.0006,
        colorStops: [
          { stop: 0, color: 'rgba(6, 182, 212, 0)' },
          { stop: 0.2, color: 'rgba(6, 182, 212, 0.12)' },
          { stop: 0.45, color: 'rgba(6, 182, 212, 0.40)' },
          { stop: 0.7, color: 'rgba(45, 212, 191, 0.22)' },
          { stop: 0.9, color: 'rgba(6, 182, 212, 0.06)' },
          { stop: 1, color: 'rgba(6, 182, 212, 0)' },
        ],
      },
      {
        baseY: 0.38,
        amplitude: 55,
        thickness: 115,
        speed: 0.00045,
        colorStops: [
          { stop: 0, color: 'rgba(99, 102, 241, 0)' },
          { stop: 0.2, color: 'rgba(99, 102, 241, 0.10)' },
          { stop: 0.45, color: 'rgba(99, 102, 241, 0.38)' },
          { stop: 0.72, color: 'rgba(139, 92, 246, 0.22)' },
          { stop: 0.9, color: 'rgba(99, 102, 241, 0.05)' },
          { stop: 1, color: 'rgba(99, 102, 241, 0)' },
        ],
      },
      {
        baseY: 0.48,
        amplitude: 65,
        thickness: 125,
        speed: 0.0007,
        colorStops: [
          { stop: 0, color: 'rgba(232, 121, 249, 0)' },
          { stop: 0.2, color: 'rgba(232, 121, 249, 0.10)' },
          { stop: 0.45, color: 'rgba(232, 121, 249, 0.36)' },
          { stop: 0.7, color: 'rgba(244, 114, 182, 0.20)' },
          { stop: 0.9, color: 'rgba(232, 121, 249, 0.05)' },
          { stop: 1, color: 'rgba(232, 121, 249, 0)' },
        ],
      },
      {
        baseY: 0.22,
        amplitude: 38,
        thickness: 80,
        speed: 0.0009,
        colorStops: [
          { stop: 0, color: 'rgba(34, 211, 238, 0)' },
          { stop: 0.25, color: 'rgba(34, 211, 238, 0.12)' },
          { stop: 0.45, color: 'rgba(34, 211, 238, 0.32)' },
          { stop: 0.75, color: 'rgba(6, 182, 212, 0.16)' },
          { stop: 1, color: 'rgba(34, 211, 238, 0)' },
        ],
      },
    ];

    function drawAurora(t) {
      if (!width || width <= 0 || !height || height <= 0) return;

      ctx.clearRect(0, 0, width, height);

      // Smooth mouse easing (desktop only)
      if (!isMobile) {
        currentMouseX += (targetMouseX - currentMouseX) * 0.04;
      }
      const mouseOffset = (currentMouseX - 0.5) * 40;

      // Draw each organic glowing aurora wave ribbon
      bands.forEach((band, index) => {
        const yCenter = height * band.baseY;
        const waveTime = t * band.speed + index * 1.5;
        const ribbonThickness = band.thickness || band.amplitude * 1.8;

        const topY = yCenter - ribbonThickness * 0.8;
        const bottomY = yCenter + ribbonThickness * 1.2;

        const gradient = ctx.createLinearGradient(0, topY, 0, bottomY);
        band.colorStops.forEach((cs) => {
          gradient.addColorStop(cs.stop, cs.color);
        });

        ctx.fillStyle = gradient;
        ctx.beginPath();

        const step = Math.max(isMobile ? 6 : 8, Math.floor(width / (isMobile ? 36 : 48)));

        // Trace top boundary wave
        for (let x = 0; x <= width + step; x += step) {
          const normX = width > 0 ? x / width : 0;
          const wave1 = Math.sin(normX * 4 + waveTime) * band.amplitude;
          const wave2 = Math.cos(normX * 7 - waveTime * 0.8) * (band.amplitude * 0.4);
          const wave3 = Math.sin(normX * 2 + waveTime * 1.3) * (band.amplitude * 0.3);
          const yTop = yCenter + wave1 + wave2 + wave3 + mouseOffset * (index % 2 === 0 ? 1 : -1) - ribbonThickness * 0.5;

          if (x === 0) {
            ctx.moveTo(x, yTop);
          } else {
            ctx.lineTo(x, yTop);
          }
        }

        // Trace bottom boundary wave in reverse
        for (let x = width + step; x >= 0; x -= step) {
          const normX = width > 0 ? x / width : 0;
          const wave1 = Math.sin(normX * 4 + waveTime) * band.amplitude;
          const wave2 = Math.cos(normX * 7 - waveTime * 0.8) * (band.amplitude * 0.4);
          const wave3 = Math.sin(normX * 2 + waveTime * 1.3) * (band.amplitude * 0.3);
          const yBottom = yCenter + wave1 + wave2 + wave3 + mouseOffset * (index % 2 === 0 ? 1 : -1) + ribbonThickness * 0.5;

          ctx.lineTo(x, yBottom);
        }

        ctx.closePath();
        ctx.fill();
      });
    }

    // Handle resize with downscaled internal resolution for optimal battery & GPU efficiency
    const handleResize = () => {
      if (!canvas) return;
      isMobile = window.innerWidth < 768;
      const dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 0.8 : 1.5);
      const scale = isMobile ? 0.35 : 0.6;
      width = Math.floor(window.innerWidth * scale * dpr);
      height = Math.floor(window.innerHeight * scale * dpr);
      canvas.width = width;
      canvas.height = height;

      if (prefersReducedMotion) {
        drawAurora(1000);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize, { passive: true });

    // Auto-pause rendering loop saat pengguna aktif menggulir layar sentuh di HP
    const handleScroll = () => {
      if (window.innerWidth >= 768) return;
      isScrolling = true;
      if (scrollTimer) clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        isScrolling = false;
        if (isRunning && !animationFrameId && !prefersReducedMotion && !document.hidden) {
          lastTime = performance.now();
          render();
        }
      }, 180);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Handle tab visibility to pause when inactive
    const handleVisibilityChange = () => {
      if (document.hidden) {
        isRunning = false;
        cancelAnimationFrame(animationFrameId);
      } else {
        cancelAnimationFrame(animationFrameId);
        if (prefersReducedMotion) return;
        isRunning = true;
        lastTime = performance.now();
        render();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const render = () => {
      if (!isRunning) return;

      // Yield 100% GPU ke touch scrolling di HP low-end (Infinix Smart 6)
      if (isScrolling && isMobile) {
        animationFrameId = 0;
        return;
      }

      const now = performance.now();
      const delta = now - lastTime;
      // Cap at ~27 FPS on mobile (delta > 36ms) and ~45 FPS on desktop for battery & GPU friendliness
      const targetDelta = isMobile ? 36 : 22;
      if (delta > targetDelta) {
        lastTime = now;
        time += delta;
        drawAurora(time);
      }

      if (!prefersReducedMotion) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    // Initial render
    drawAurora(1000);

    if (!prefersReducedMotion) {
      animationFrameId = requestAnimationFrame(render);
    }

    return () => {
      isRunning = false;
      cancelAnimationFrame(animationFrameId);
      if (scrollTimer) clearTimeout(scrollTimer);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
      {/* Deep Midnight Navy Backdrop */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#060810] via-[#091122] to-[#0D162B]" />

      {/* Soft Aurora Canvas: Di mobile menggunakan perbauran gradien kanvas murni tanpa filter CSS berat */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full sm:filter sm:blur-[36px] opacity-85 transform-gpu"
        style={{ mixBlendMode: 'screen' }}
      />

      {/* Gentle ambient glow accents (Desktop only, hemat 100% GPU fillrate di HP kentang) */}
      <div
        className="hidden sm:block absolute -top-24 left-1/4 w-[500px] h-[350px] rounded-full opacity-35 filter blur-[100px] pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.4) 0%, rgba(99,102,241,0.1) 70%, transparent 100%)' }}
      />
      <div
        className="hidden sm:block absolute top-1/3 -right-20 w-[450px] h-[400px] rounded-full opacity-30 filter blur-[110px] pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(232,121,249,0.35) 0%, rgba(139,92,246,0.1) 70%, transparent 100%)' }}
      />
    </div>
  );
}
