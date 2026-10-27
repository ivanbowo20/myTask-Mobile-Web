'use client';

import React, { useEffect, useRef } from 'react';

/**
 * Palet warna kabut fluida laut dalam (Abyssal Teal & Emerald Palette)
 * Menggunakan variasi densitas dan transparansi multi-stop untuk kedalaman volumetrik
 */
const SMOKE_COLOR_PALETTES = [
  {
    // Bioluminescent Cyan-Teal (Pendaran utama terang bercahaya)
    stop0: 'rgba(45, 212, 191, 0.48)',
    stop1: 'rgba(20, 184, 166, 0.30)',
    stop2: 'rgba(13, 148, 136, 0.12)',
    stop3: 'rgba(2, 15, 18, 0)',
  },
  {
    // Oceanic Teal Glow (Biru kehijauan laut dalam bercahaya)
    stop0: 'rgba(13, 148, 136, 0.52)',
    stop1: 'rgba(15, 118, 110, 0.32)',
    stop2: 'rgba(6, 78, 82, 0.14)',
    stop3: 'rgba(2, 15, 18, 0)',
  },
  {
    // Luminous Emerald Surge (Zamrud bercahaya hidup)
    stop0: 'rgba(16, 185, 129, 0.42)',
    stop1: 'rgba(5, 150, 105, 0.24)',
    stop2: 'rgba(4, 120, 87, 0.10)',
    stop3: 'rgba(2, 15, 18, 0)',
  },
  {
    // Electric Aquamarine Highlight (Sentuhan pendaran aquamarine terang)
    stop0: 'rgba(94, 234, 212, 0.45)',
    stop1: 'rgba(45, 212, 191, 0.26)',
    stop2: 'rgba(13, 148, 136, 0.10)',
    stop3: 'rgba(2, 15, 18, 0)',
  },
];

/**
 * Menghasilkan kumpulan node gumpalan asap volumetrik (16-24 node)
 * dengan parameter gerak sinusoidal multi-harmonik dan responsivitas kursor
 */
function createSmokePuffs(count = 20) {
  const puffs = [];

  for (let i = 0; i < count; i++) {
    // Distribusi posisi proporsional dengan persebaran organik
    const normX = 0.05 + Math.random() * 0.9;
    const normY = 0.05 + Math.random() * 0.9;

    // Radius besar (180px hingga 420px) sesuai spesifikasi volumetrik
    const baseRadius = 190 + Math.random() * 230;
    const radiusPulse = 25 + Math.random() * 55;

    // Frekuensi osilasi berbeda agar tidak bergerak seragam/kaku
    const freqX1 = 0.18 + Math.random() * 0.22;
    const freqX2 = 0.35 + Math.random() * 0.3;
    const freqY1 = 0.15 + Math.random() * 0.25;
    const freqY2 = 0.28 + Math.random() * 0.26;
    const pulseSpeed = 0.25 + Math.random() * 0.35;

    // Amplitudo gelombang gerak mengambang
    const ampX = 45 + Math.random() * 75;
    const ampY = 40 + Math.random() * 65;

    // Fase offset acak
    const phaseX = Math.random() * Math.PI * 2;
    const phaseY = Math.random() * Math.PI * 2;
    const phaseR = Math.random() * Math.PI * 2;

    const palette = SMOKE_COLOR_PALETTES[i % SMOKE_COLOR_PALETTES.length];

    puffs.push({
      normX,
      normY,
      baseRadius,
      radiusPulse,
      freqX1,
      freqX2,
      freqY1,
      freqY2,
      pulseSpeed,
      ampX,
      ampY,
      phaseX,
      phaseY,
      phaseR,
      palette,
      dispX: 0,
      dispY: 0,
      targetDispX: 0,
      targetDispY: 0,
    });
  }

  return puffs;
}

export default function AbyssalTealBackground({
  children,
  className = '',
  puffCount = 20,
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // Mouse tracking state menggunakan Ref untuk performa tanpa re-render React
  const mouseRef = useRef({
    x: -9999,
    y: -9999,
    smoothX: -9999,
    smoothY: -9999,
    isActive: false,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationFrameId = null;
    let isRunning = true;
    let width = 0;
    let height = 0;
    let lastTime = performance.now();
    let isMobile = typeof window !== 'undefined' ? (window.innerWidth < 768 || 'ontouchstart' in window) : false;

    // Deteksi mode 'prefers-reduced-motion'
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let prefersReducedMotion = motionQuery.matches;

    const handleMotionChange = (e) => {
      prefersReducedMotion = e.matches;
      if (prefersReducedMotion) {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        renderFrame(0); // Gambar satu frame statis
      } else {
        animationFrameId = requestAnimationFrame(loop);
      }
    };

    motionQuery.addEventListener?.('change', handleMotionChange);

    // Inisialisasi gumpalan asap: 7 node di mobile untuk hemat CPU/RAM, 20 node di desktop
    const activePuffCount = isMobile ? Math.min(puffCount, 7) : puffCount;
    const puffs = createSmokePuffs(activePuffCount);

    const handleResize = () => {
      if (!canvas) return;
      isMobile = window.innerWidth < 768 || 'ontouchstart' in window;
      const rect = canvas.parentElement?.getBoundingClientRect() || {
        width: window.innerWidth,
        height: window.innerHeight,
      };

      width = Math.max(300, rect.width);
      height = Math.max(300, rect.height);

      // Batasi DPR maksimal 1.0 di mobile & 1.5 di desktop untuk efisiensi GPU PowerVR & baterai ponsel
      const dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.0 : 1.5);

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);

      // Sinkronkan styling ukuran fisik canvas
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.scale(dpr, dpr);

      if (prefersReducedMotion) {
        renderFrame(0);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const handleMouseMove = (e) => {
      if (isMobile) return;
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
      mouseRef.current.isActive = true;
    };

    const handleMouseLeave = () => {
      mouseRef.current.isActive = false;
    };

    // Pasang listener mouse hanya di desktop agar touch event loop di mobile 100% bebas hambatan saat pindah tab
    if (!isMobile) {
      window.addEventListener('mousemove', handleMouseMove, { passive: true });
      window.addEventListener('mouseleave', handleMouseLeave);
    }

    const renderFrame = (timestamp) => {
      const timeSec = timestamp * 0.001;

      // Bersihkan canvas
      ctx.clearRect(0, 0, width, height);

      // Perbarui interpolasi kursor (lerp: current += (target - current) * 0.05)
      const mouse = mouseRef.current;
      if (mouse.isActive) {
        if (mouse.smoothX < -1000) {
          mouse.smoothX = mouse.x;
          mouse.smoothY = mouse.y;
        } else {
          mouse.smoothX += (mouse.x - mouse.smoothX) * 0.05;
          mouse.smoothY += (mouse.y - mouse.smoothY) * 0.05;
        }
      }

      // Loop rendering setiap gumpalan asap
      for (let i = 0; i < puffs.length; i++) {
        const p = puffs[i];

        // 1. Gerakan bergelombang sinusoidal multi-harmonik
        const driftX =
          Math.sin(timeSec * p.freqX1 + p.phaseX) * p.ampX +
          Math.cos(timeSec * p.freqX2 + p.phaseY) * (p.ampX * 0.35);

        const driftY =
          Math.cos(timeSec * p.freqY1 + p.phaseY) * p.ampY +
          Math.sin(timeSec * p.freqY2 + p.phaseX) * (p.ampY * 0.35);

        // Radius dinamis (mengembang dan menyusut lembut)
        const currentRadius = Math.max(
          60,
          p.baseRadius +
            Math.sin(timeSec * p.pulseSpeed + p.phaseR) * p.radiusPulse
        );

        // Posisi dasar mengambang
        let posX = p.normX * width + driftX;
        let posY = p.normY * height + driftY;

        // 2. Interaksi kursor (Displacement Repulsion)
        if (mouse.isActive) {
          const dx = posX + p.dispX - mouse.smoothX;
          const dy = posY + p.dispY - mouse.smoothY;
          const distSq = dx * dx + dy * dy;
          const repelRadius = 320; // Radius pengaruh kursor
          const repelRadiusSq = repelRadius * repelRadius;

          if (distSq < repelRadiusSq && distSq > 0.001) {
            const dist = Math.sqrt(distSq);
            // Daya tolak invers proporsional (semakin dekat semakin kuat membelah)
            const force = (1 - dist / repelRadius) * 60;
            p.targetDispX = (dx / dist) * force;
            p.targetDispY = (dy / dist) * force;
          } else {
            p.targetDispX = 0;
            p.targetDispY = 0;
          }
        } else {
          p.targetDispX = 0;
          p.targetDispY = 0;
        }

        // Meredam displacement kembali perlahan ke asal (spring easing)
        p.dispX += (p.targetDispX - p.dispX) * 0.04;
        p.dispY += (p.targetDispY - p.dispY) * 0.04;

        const finalX = posX + p.dispX;
        const finalY = posY + p.dispY;

        // 3. Render Volumetrik Menggunakan Radial Gradient Eksponensial
        const gradient = ctx.createRadialGradient(
          finalX,
          finalY,
          0,
          finalX,
          finalY,
          currentRadius
        );

        gradient.addColorStop(0.0, p.palette.stop0);
        gradient.addColorStop(0.35, p.palette.stop1);
        gradient.addColorStop(0.7, p.palette.stop2);
        gradient.addColorStop(1.0, p.palette.stop3);

        ctx.beginPath();
        ctx.arc(finalX, finalY, currentRadius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      }
    };

    const loop = (timestamp) => {
      if (!isRunning) return;

      const now = performance.now();
      const delta = now - lastTime;
      // Batasi ~30 FPS di mobile (delta > 32ms) dan ~45 FPS di desktop untuk hemat baterai & GPU
      const targetDelta = isMobile ? 32 : 20;
      if (delta > targetDelta) {
        lastTime = now;
        renderFrame(timestamp);
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    // Mulai animasi jika tidak dalam mode reduced-motion
    if (!prefersReducedMotion) {
      animationFrameId = requestAnimationFrame(loop);
    } else {
      renderFrame(0);
    }

    // Manajemen visibilitas tab untuk menghemat baterai & daya CPU saat tab diminimalkan
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
          animationFrameId = null;
        }
      } else {
        if (!prefersReducedMotion && !animationFrameId) {
          lastTime = performance.now();
          animationFrameId = requestAnimationFrame(loop);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isRunning = false;
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      window.removeEventListener('resize', handleResize);
      if (!isMobile) {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseleave', handleMouseLeave);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      motionQuery.removeEventListener?.('change', handleMotionChange);
    };
  }, [puffCount]);

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 overflow-hidden pointer-events-none select-none ${className}`}
      style={{
        // Latar Belakang Dasar: Deep abyssal gradient dari kiri-bawah gelap (#020F12) ke kanan-atas bercahaya (#062E30 - #0D5C5E)
        background: `
          radial-gradient(circle at 85% 15%, rgba(13, 148, 136, 0.45) 0%, rgba(6, 78, 82, 0.35) 28%, rgba(3, 27, 31, 0.85) 65%, rgba(2, 15, 18, 1) 100%),
          linear-gradient(135deg, #020F12 0%, #03181C 40%, #052F33 75%, #0D696C 100%)
        `,
      }}
    >
      {/* 
        Lapisan Canvas Asap Fluida:
        Di desktop menggunakan CSS blur halus (24px) & scale(1.05).
        Di mobile (HP kentang): blur CSS dihilangkan (sm:filter sm:blur-[24px]),
        mengandalkan gradien radial canvas bawaan yang secara native berbaur halus ke alpha 0
        tanpa membebani GPU PowerVR sama sekali sehingga tab switching instan!
      */}
      <div
        className="absolute inset-0 w-full h-full sm:filter sm:blur-[24px] sm:scale-105"
      >
        <canvas
          ref={canvasRef}
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
            mixBlendMode: 'screen',
          }}
        />
      </div>

      {/* 
        Vignette & Ethereal Grain Overlay:
        Mempertegas kedalaman abyssal di tepi layar serta menyatukan pendaran cahaya
      */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(2, 15, 18, 0.45) 100%)',
        }}
      />

      {/* Konten Opsional Anak (Children) */}
      {children && (
        <div className="relative z-10 w-full h-full pointer-events-auto">
          {children}
        </div>
      )}
    </div>
  );
}

