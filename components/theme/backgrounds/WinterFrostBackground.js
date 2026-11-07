'use client';

import React, { useMemo, useState, useEffect, useRef, createContext, useContext } from 'react';

/**
 * ============================================================================
 * REMOTION-COMPATIBLE RUNTIME & CONSTANTS (60FPS SEAMLESS 1800-FRAME LOOP)
 * Built-in context & hooks agar kompatibel dengan Remotion Player & Next.js.
 * ============================================================================
 */
const LOOP_FRAMES = 1800; // 30 detik @ 60fps

const RemotionPreviewContext = createContext(null);

export const AbsoluteFill = ({ children, style, className = '', ...rest }) => (
  <div
    className={className}
    style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      ...style,
    }}
    {...rest}
  >
    {children}
  </div>
);

export const useCurrentFrame = () => {
  const ctx = useContext(RemotionPreviewContext);
  const [standaloneFrame, setStandaloneFrame] = useState(0);

  useEffect(() => {
    if (ctx !== null) return undefined;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      setStandaloneFrame(0);
      return undefined;
    }

    let rafId;
    let isPaused = false;
    let lastTime = performance.now();
    let accumulatedTime = 0;

    const isMobileDevice =
      typeof window !== 'undefined' ? window.innerWidth < 768 : false;
    // Pada HP kentang (Infinix Smart 6): throttle ke ~30 FPS (interval >= 32ms) untuk memangkas beban CPU & baterai hingga 50%
    // Pada desktop: berjalan penuh 60 FPS (interval >= 16ms)
    const minFrameInterval = isMobileDevice ? 32 : 16;

    // Deteksi modal terbuka agar auto-pause saat user membuka dialog/modal
    let isModalOpen =
      typeof document !== 'undefined' &&
      document.body.classList.contains('overflow-hidden');

    const observer =
      typeof MutationObserver !== 'undefined' && typeof document !== 'undefined'
        ? new MutationObserver(() => {
            isModalOpen = document.body.classList.contains('overflow-hidden');
          })
        : null;

    if (observer && typeof document !== 'undefined') {
      observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    }

    const onVisibilityChange = () => {
      if (document.hidden) {
        isPaused = true;
      } else {
        isPaused = false;
        lastTime = performance.now();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);

    const tick = (now) => {
      if (document.hidden || isModalOpen) {
        lastTime = now;
        rafId = requestAnimationFrame(tick);
        return;
      }

      const elapsed = now - lastTime;

      if (!isPaused) {
        if (elapsed >= minFrameInterval) {
          const delta = elapsed / 1000;
          accumulatedTime += delta;
          lastTime = now;
          setStandaloneFrame(Math.floor(accumulatedTime * 60) % LOOP_FRAMES);
        }
      } else {
        lastTime = now;
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (observer) observer.disconnect();
    };
  }, [ctx]);

  return ctx !== null ? ctx.frame : standaloneFrame;
};

export const useVideoConfig = () => {
  const ctx = useContext(RemotionPreviewContext);
  const [dimensions, setDimensions] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth || 1920 : 1920,
    height: typeof window !== 'undefined' ? window.innerHeight || 1080 : 1080,
  }));

  useEffect(() => {
    if (ctx !== null || typeof window === 'undefined') return undefined;
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth || 1920,
        height: window.innerHeight || 1080,
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [ctx]);

  if (ctx !== null) {
    return {
      width: ctx.width,
      height: ctx.height,
      fps: ctx.fps,
      durationInFrames: ctx.durationInFrames,
    };
  }

  return {
    width: dimensions.width,
    height: dimensions.height,
    fps: 60,
    durationInFrames: LOOP_FRAMES,
  };
};

export const interpolate = (input, inputRange, outputRange, options = {}) => {
  const { extrapolateLeft = 'extend', extrapolateRight = 'extend' } = options;
  if (!inputRange || !outputRange || inputRange.length < 2) {
    return outputRange?.[0] ?? 0;
  }

  if (input <= inputRange[0]) {
    if (extrapolateLeft === 'clamp') return outputRange[0];
    const slope =
      (outputRange[1] - outputRange[0]) / (inputRange[1] - inputRange[0] || 1);
    return outputRange[0] + (input - inputRange[0]) * slope;
  }

  const lastIdx = inputRange.length - 1;
  if (input >= inputRange[lastIdx]) {
    if (extrapolateRight === 'clamp') return outputRange[lastIdx];
    const slope =
      (outputRange[lastIdx] - outputRange[lastIdx - 1]) /
      (inputRange[lastIdx] - inputRange[lastIdx - 1] || 1);
    return outputRange[lastIdx] + (input - inputRange[lastIdx]) * slope;
  }

  for (let i = 0; i < lastIdx; i++) {
    if (input >= inputRange[i] && input <= inputRange[i + 1]) {
      const span = inputRange[i + 1] - inputRange[i] || 1;
      const t = (input - inputRange[i]) / span;
      return outputRange[i] + t * (outputRange[i + 1] - outputRange[i]);
    }
  }

  return outputRange[0];
};

/**
 * Deterministic PRNG untuk konsistensi posisi bintang, salju, dan tekstur pixel
 */
const seededRandom = (seed) => {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

/**
 * PALET WARNA: Deep Frosted Glacial Slate (Teduh, Dingin, Bebas Silau)
 */
const PALETTE = {
  // Langit Biru Navy Es Pekat
  skyTop: '#121E36',
  skyUpperMid: '#162542',
  skyLowerMid: '#1A2B4C',
  skyBottom: '#1E3254',
  skyHorizonMist: '#263E63',

  // Awan Glacial Redup
  cloudBase: '#223656',
  cloudHighlight: '#2D466B',
  cloudLight: '#2E4568',
  cloudMid: '#243856',
  cloudShadow: '#1A2A42',

  // Pegunungan Es & Kristal Salju
  mountainFarBase: '#1E293B',
  mountainFarHighlight: '#334155',
  mountainDarkSlate: '#263449',
  mountainIceShadow: '#334155',
  mountainMidSlate: '#475569',
  mountainFrostMid: '#94A3B8',
  mountainSnowCrisp: '#E2E8F0',
  mountainSnowPeak: '#F8FAFC',

  // Hutan & Pohon Cemara Megah
  distantPine: '#0F1E2E',
  pineShadow: '#091811',
  pineBase: '#0E2419',
  pineMid: '#143324',
  treeSnowShade: '#CBD5E1',
  treeSnowPure: '#F8FAFC',
  trunkDark: '#1E1B18',

  // Hamparan Tanah Salju Biru Es Redup (Tanpa Garis Putih Silau)
  groundFarSlope: '#1E2F4D',
  groundMidSlope: '#182740',
  groundNearSlope: '#132036',
  groundDeepValley: '#0E1829',
  groundSubtleEdge: '#2B4266',

  // Kereta Api Uap 16-Bit & Tanggul Rel
  trainBodyDark: '#111827',
  trainRoofSlate: '#1E293B',
  trainWheelSteel: '#0F172A',
  trainWindowBright: '#FEF08A',
  trainEmbankmentSlate: '#2C3E50',
  trainEmbankmentDark: '#1E293B',
};

/**
 * Komponen Awan Pixel Art Glacial
 */
const PixelCloudCluster = React.memo(({ x, y, scale = 1, variant = 0 }) => {
  const u = Math.max(3, Math.round(6 * scale));
  const blocks =
    variant === 0
      ? [
          { dx: 2, dy: 0, w: 6, h: 1, c: PALETTE.cloudHighlight },
          { dx: 1, dy: 1, w: 9, h: 1, c: PALETTE.cloudHighlight },
          { dx: 0, dy: 2, w: 12, h: 2, c: PALETTE.cloudBase },
        ]
      : [
          { dx: 3, dy: 0, w: 5, h: 1, c: PALETTE.cloudHighlight },
          { dx: 1, dy: 1, w: 8, h: 1, c: PALETTE.cloudHighlight },
          { dx: 0, dy: 2, w: 10, h: 1, c: PALETTE.cloudBase },
        ];

  return (
    <g opacity={0.48}>
      {blocks.map((b, i) => (
        <rect
          key={i}
          x={Math.round(x + b.dx * u)}
          y={Math.round(y + b.dy * u)}
          width={Math.round(b.w * u)}
          height={Math.round(b.h * u)}
          fill={b.c}
        />
      ))}
    </g>
  );
});

/**
 * Komponen Puncak Gunung Salju Pixel Art (Stepped 16-bit Ridges)
 */
const PixelMountainPeak = React.memo(({
  centerX,
  baseY,
  peakWidth,
  peakHeight,
  pixelStep = 6,
  ridgeSeed = 1,
  layerType = 'main',
}) => {
  const step = Math.max(4, Math.round(pixelStep));
  const rows = Math.max(8, Math.floor(peakHeight / step));

  const slices = useMemo(() => {
    const arr = [];
    for (let r = 0; r < rows; r++) {
      const progress = r / rows; // 0 di puncak, 1 di kaki gunung
      const jitterL = (seededRandom(ridgeSeed * 31 + r * 7) - 0.5) * step * 1.4;
      const jitterR = (seededRandom(ridgeSeed * 47 + r * 13) - 0.5) * step * 1.4;
      const rowHalfW = (peakWidth * 0.5) * Math.pow(progress, 0.92);

      const leftX = Math.round((centerX - rowHalfW + jitterL) / step) * step;
      const rightX = Math.round((centerX + rowHalfW + jitterR) / step) * step;
      const totalW = Math.max(step * 2, rightX - leftX);

      // Punggung bukit tengah bergeser sedikit untuk ilusi 3D
      const ridgeOffset =
        Math.sin(progress * Math.PI * 1.5 + ridgeSeed) * (totalW * 0.12);
      const ridgeX =
        Math.round((centerX + ridgeOffset) / step) * step;

      const y = Math.round(baseY - peakHeight + r * step);
      const snowCapRatio =
        layerType === 'main'
          ? Math.max(0.16, 0.52 - progress * 0.38)
          : Math.max(0.1, 0.34 - progress * 0.25);

      arr.push({
        y,
        leftX,
        rightX,
        ridgeX: Math.min(rightX - step, Math.max(leftX + step, ridgeX)),
        snowW: Math.max(step, Math.round(( (rightX - ridgeX) * snowCapRatio ) / step) * step),
        isUpperPeak: progress < 0.28,
      });
    }
    return arr;
  }, [centerX, baseY, peakWidth, peakHeight, step, rows, ridgeSeed, layerType]);

  const shadowColor =
    layerType === 'far' ? PALETTE.mountainFarBase : PALETTE.mountainDarkSlate;
  const litSlateColor =
    layerType === 'far' ? PALETTE.mountainFarHighlight : PALETTE.mountainMidSlate;
  const snowColor =
    layerType === 'far' ? PALETTE.mountainFrostMid : PALETTE.mountainSnowCrisp;

  return (
    <g>
      {slices.map((s, idx) => (
        <g key={idx}>
          {/* Sisi Bayangan Kiri Gunung */}
          <rect
            x={s.leftX}
            y={s.y}
            width={Math.max(step, s.ridgeX - s.leftX)}
            height={step + 1}
            fill={shadowColor}
          />
          {/* Sisi Tebing Es Kanan */}
          <rect
            x={s.ridgeX}
            y={s.y}
            width={Math.max(step, s.rightX - s.ridgeX)}
            height={step + 1}
            fill={litSlateColor}
          />
          {/* Aksen Kristal Salju di Punggung Tebing */}
          <rect
            x={s.ridgeX}
            y={s.y}
            width={s.snowW}
            height={step + 1}
            fill={snowColor}
            opacity={s.isUpperPeak ? 0.92 : 0.78}
          />
        </g>
      ))}
    </g>
  );
});

/**
 * Siluet Barisan Pinus Rendah di Kejauhan Kaki Gunung
 */
const DistantPixelTreeline = React.memo(({ startX, endX, baseY, pixelSize = 4, seed = 42 }) => {
  const p = Math.max(3, Math.round(pixelSize));
  const columns = useMemo(() => {
    const cols = [];
    const totalCols = Math.ceil((endX - startX) / p);
    for (let i = 0; i < totalCols; i++) {
      const wave =
        Math.sin(i * 0.25 + seed) * 3 +
        Math.cos(i * 0.65 + seed * 2) * 2 +
        seededRandom(i * 17 + seed) * 4;
      const hSteps = Math.max(2, Math.round(5 + wave));
      cols.push({
        x: startX + i * p,
        h: hSteps * p,
      });
    }
    return cols;
  }, [startX, endX, p, seed]);

  return (
    <g>
      {columns.map((col, idx) => (
        <rect
          key={idx}
          x={col.x}
          y={Math.round(baseY - col.h)}
          width={p + 1}
          height={col.h + p * 3}
          fill={PALETTE.distantPine}
        />
      ))}
    </g>
  );
});

/**
 * Hamparan Bukit Salju Bergradasi Biru Es Redup (Stepped Pixel Contour)
 */
const PixelSnowHillside = React.memo(({
  width,
  height,
  leftY,
  rightY,
  pixelStep = 8,
  fillColor,
  crestColor,
  curveWave = 0.012,
  seed = 1,
}) => {
  const step = Math.max(4, Math.round(pixelStep));
  const strips = useMemo(() => {
    const count = Math.ceil(width / step);
    const list = [];
    for (let i = 0; i < count; i++) {
      const t = i / Math.max(1, count - 1);
      const baseLine = leftY + (rightY - leftY) * t;
      const waveOffset =
        Math.sin(t * Math.PI * 2 + seed) * (height * curveWave);
      const topY = Math.round((baseLine + waveOffset) / step) * step;
      list.push({
        x: i * step,
        topY,
        h: Math.max(step, height - topY + step),
      });
    }
    return list;
  }, [width, height, leftY, rightY, step, curveWave, seed]);

  return (
    <g>
      {strips.map((st, idx) => (
        <g key={idx}>
          <rect
            x={st.x}
            y={st.topY}
            width={step + 1}
            height={st.h}
            fill={fillColor}
          />
          {crestColor && (
            <rect
              x={st.x}
              y={st.topY}
              width={step + 1}
              height={Math.max(2, Math.round(step * 0.45))}
              fill={crestColor}
              opacity={0.65}
            />
          )}
        </g>
      ))}
    </g>
  );
});

/**
 * Komponen Pohon Cemara Megah Bersalju di Ujung Kiri (Left-Anchored Lone Pine)
 * Proporsi ramping menjulang tinggi (spire conifer) dengan undakan dahan pixel 16-bit
 * dan batang yang menancap kokoh ke bukit salju bawah agar tidak pernah melayang.
 */
const PixelPineTree = React.memo(({
  x,
  topY,
  baseY,
  frame = 0,
  phaseOffset = 0,
  swayAmplitude = 1.4,
}) => {
  const tiers = 11;
  const targetFoliageHeight = Math.max(120, baseY - topY);
  // Ukuran unit pixel dihitung langsung dari tinggi pohon agar proporsional di semua resolusi
  const p = Math.max(2, targetFoliageHeight / (tiers * 3.15));

  const loopAngle = ((frame % LOOP_FRAMES) / LOOP_FRAMES) * Math.PI * 2;
  const windSway = Math.sin(loopAngle * 2 + phaseOffset) * swayAmplitude;

  const foliageBottomY = topY + tiers * 3.1 * p;
  const trunkWidth = Math.round(2.6 * p);
  const trunkTopY = Math.round(foliageBottomY - 2.5 * p);
  const trunkHeight = Math.round(Math.max(7 * p, baseY - trunkTopY + 5 * p));

  return (
    <g>
      {/* Batang Pohon Cemara (Menancap dalam ke bukit salju foreground) */}
      <rect
        x={Math.round(x - trunkWidth * 0.5)}
        y={trunkTopY}
        width={trunkWidth}
        height={trunkHeight}
        fill={PALETTE.trunkDark}
      />
      <rect
        x={Math.round(x - trunkWidth * 0.5)}
        y={trunkTopY}
        width={Math.max(2, Math.round(trunkWidth * 0.38))}
        height={trunkHeight}
        fill="#12100E"
      />

      {/* Gundukan Salju Akar Pohon agar Menyatu Kokoh dengan Tanah */}
      <rect
        x={Math.round(x - 4.5 * p)}
        y={Math.round(baseY + 1.2 * p)}
        width={Math.round(9 * p)}
        height={Math.round(1.6 * p)}
        fill={PALETTE.groundSubtleEdge}
        opacity={0.75}
      />
      <rect
        x={Math.round(x - 3.2 * p)}
        y={Math.round(baseY + 0.6 * p)}
        width={Math.round(6.4 * p)}
        height={Math.round(1.1 * p)}
        fill={PALETTE.treeSnowShade}
        opacity={0.8}
      />

      {/* Susunan 11 Tingkat Dahan Cemara Ramping (Dari Bawah ke Puncak) */}
      {Array.from({ length: tiers })
        .map((_, idx) => idx)
        .reverse()
        .map((tierIdx) => {
          const tierProgress = tierIdx / (tiers - 1);
          // Goyangan angin lebih terasa di pucuk atas, stabil di pangkal bawah
          const swayFactor = Math.pow(1 - tierProgress * 0.82, 1.35);
          const tierShiftX = Math.round(windSway * swayFactor * p * 0.45);

          const tierY = Math.round(topY + tierIdx * 3.05 * p);
          // Lebar dahan ramping & meruncing ke atas (tinggi pohon ~2.2x lebar bawah)
          const halfSpan = Math.round((1.4 + Math.pow(tierProgress, 0.92) * 8.2) * p);
          const upperSpan = Math.max(Math.round(p), Math.round(halfSpan * 0.62));
          const midSpan = Math.max(Math.round(1.5 * p), Math.round(halfSpan * 0.84));
          const stepH = Math.max(2, Math.round(1.05 * p));

          return (
            <g key={tierIdx} transform={`translate(${tierShiftX}, 0)`}>
              {/* 1. Bayangan Bawah Dahan & Ujung Dahan Merunduk (#091811) */}
              <rect
                x={Math.round(x - halfSpan - p * 0.5)}
                y={tierY + stepH * 3}
                width={Math.round((halfSpan + p * 0.5) * 2)}
                height={Math.round(stepH * 1.35)}
                fill={PALETTE.pineShadow}
              />
              {/* Ujung dahan kiri & kanan yang sedikit menjuntai khas cemara es */}
              <rect
                x={Math.round(x - halfSpan - p)}
                y={tierY + stepH * 3.6}
                width={Math.round(2.2 * p)}
                height={stepH}
                fill={PALETTE.pineShadow}
              />
              <rect
                x={Math.round(x + halfSpan - 1.2 * p)}
                y={tierY + stepH * 3.6}
                width={Math.round(2.2 * p)}
                height={stepH}
                fill={PALETTE.pineShadow}
              />

              {/* 2. Badan Utama Dahan Cemara Berundak (#0E2419 & #143324) */}
              <rect
                x={Math.round(x - halfSpan)}
                y={tierY + stepH * 2}
                width={halfSpan * 2}
                height={Math.round(stepH * 1.5)}
                fill={PALETTE.pineBase}
              />
              <rect
                x={Math.round(x - midSpan)}
                y={tierY + stepH}
                width={midSpan * 2}
                height={Math.round(stepH * 1.3)}
                fill={PALETTE.pineMid}
              />

              {/* 3. Lapisan Bayangan Salju Es Berundak (#CBD5E1) */}
              <rect
                x={Math.round(x - halfSpan + p * 0.4)}
                y={tierY + Math.round(stepH * 1.7)}
                width={Math.round((halfSpan - p * 0.4) * 2)}
                height={stepH}
                fill={PALETTE.treeSnowShade}
              />
              {/* Tumpukan salju di ujung kiri & kanan dahan */}
              <rect
                x={Math.round(x - halfSpan - p * 0.4)}
                y={tierY + Math.round(stepH * 2.3)}
                width={Math.round(2.4 * p)}
                height={Math.max(2, Math.round(stepH * 0.85))}
                fill={PALETTE.treeSnowShade}
              />
              <rect
                x={Math.round(x + halfSpan - 2 * p)}
                y={tierY + Math.round(stepH * 2.3)}
                width={Math.round(2.4 * p)}
                height={Math.max(2, Math.round(stepH * 0.85))}
                fill={PALETTE.treeSnowShade}
              />

              {/* 4. Lapisan Salju Putih Bersih di Punggung Dahan (#F8FAFC) */}
              <rect
                x={Math.round(x - midSpan)}
                y={tierY + Math.round(stepH * 0.8)}
                width={midSpan * 2}
                height={stepH}
                fill={PALETTE.treeSnowPure}
              />
              <rect
                x={Math.round(x - upperSpan)}
                y={tierY}
                width={upperSpan * 2}
                height={stepH}
                fill={PALETTE.treeSnowPure}
              />
            </g>
          );
        })}

      {/* Pucuk Runcing Kristal Salju Pohon Cemara (Spire Tip) */}
      <g transform={`translate(${Math.round(windSway * p * 0.5)}, 0)`}>
        <rect
          x={Math.round(x - p)}
          y={Math.round(topY - 1.4 * p)}
          width={Math.round(2 * p)}
          height={Math.round(1.6 * p)}
          fill={PALETTE.treeSnowShade}
        />
        <rect
          x={Math.round(x - p * 0.55)}
          y={Math.round(topY - 3.2 * p)}
          width={Math.round(1.1 * p)}
          height={Math.round(2.2 * p)}
          fill={PALETTE.treeSnowPure}
        />
      </g>
    </g>
  );
});

/**
 * Komponen Kereta Api Uap Pixel Art 16-Bit (PixelTrain) - Trinity Optimized for Low-End Mobile (Infinix Smart 6)
 * - Pacing tenang & syahdu: melintas selama ~14.5 - 15.5 detik, diikuti jeda hening ~14.5 - 15.5 detik.
 * - Skala pixel +15% di Desktop (p = 3.1) dan +20% di Mobile (p = 3.25) agar siluet gerbong & jendela
 *   langsung tegas terbaca di layar smartphone maupun desktop.
 * - Optimasi Mobile (Infinix Smart 6):
 *   1. Zero Layout-Thrashing: translasi 100% via GPU translate3d (${trainX}px, 0, 0).
 *   2. Fixed Particle Pool: uap asap dibatasi 5 partikel tetap di mobile (10 di desktop).
 *   3. Anti GPU Tile-Stall: Mematikan filter drop-shadow berat pada mobile (menggunakan halo 1px rect pixel murni).
 */
const PixelTrain = React.memo(({ frame, width, y, isMobile, fps = 60 }) => {
  const safeFps = fps > 0 ? fps : 60;
  const loopFrames = Math.round(30 * safeFps);

  const crossingSeconds = isMobile ? 14.5 : 15.5;
  const crossingFrames = Math.round(crossingSeconds * safeFps);
  const safeFrame = Number.isFinite(frame) ? frame : 0;
  const trainFrame = ((safeFrame % loopFrames) + loopFrames) % loopFrames;
  const isCrossing = trainFrame <= crossingFrames;

  // Skala pixel diperbesar proporsional (+15% Desktop, +20% Mobile)
  const p = isMobile ? 3.25 : 3.1;
  const baseY = Math.round(Number.isFinite(y) ? y : 0);

  const startX = isMobile ? -310 : -340;
  const endX = isMobile ? width + 110 : width + 210;

  const trainX = interpolate(
    trainFrame,
    [0, crossingFrames],
    [startX, endX],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  const carriages = [0, 1, 2, 3];
  const carriageWidth = Math.round(14 * p);
  const carriageGap = Math.round(2.6 * p);

  const locoX = carriages.length * (carriageWidth + carriageGap);
  const chimneyX = locoX + Math.round(10 * p);
  const chimneyTopY = baseY - Math.round(7 * p);

  // Elemen Rel Kereta Pixel & Fondasi Tanggul Salju
  const railwayDetails = useMemo(() => {
    const tieSpacing = Math.max(9, Math.round(3.4 * p));
    const tieWidth = Math.max(4, Math.round(1.55 * p));
    const totalTies = Math.ceil(width / tieSpacing);
    const ties = [];
    const frostPatches = [];
    const embankmentStones = [];

    for (let i = 0; i < totalTies; i++) {
      const tx = i * tieSpacing;
      const rand = seededRandom(i * 19 + 73);
      ties.push({
        x: tx,
        w: tieWidth,
        isDark: i % 2 === 0,
      });

      if (rand > 0.35) {
        frostPatches.push({
          x: tx - 1,
          w: Math.round(tieWidth * (1.4 + (rand - 0.35) * 2.1)),
          isBright: rand > 0.72,
        });
      }

      if (i % 2 === 0) {
        embankmentStones.push({
          x: tx,
          w: Math.round(tieSpacing * 1.35),
          h: rand > 0.5 ? Math.round(1.1 * p) : Math.round(0.8 * p),
        });
      }
    }
    return { ties, frostPatches, embankmentStones };
  }, [width, p]);

  // Fixed particle pool: 5 partikel di mobile (Infinix Smart 6) & 10 partikel di desktop
  const steamCount = isMobile ? 5 : 10;
  const steamPuffs = useMemo(() => {
    return Array.from({ length: steamCount }).map((_, idx) => {
      const cycleLen = safeFps <= 30 ? 44 : 88;
      const rawProgress =
        (((trainFrame + idx * (cycleLen / steamCount)) % cycleLen) + cycleLen) %
        cycleLen;
      const puffProgress = Math.max(0, Math.min(1, rawProgress / cycleLen));

      const waveX = Math.sin(puffProgress * Math.PI * 2 + idx * 0.7) * 0.65 * p;
      const puffDriftX = -puffProgress * 23 * p - idx * 0.45 * p + waveX;
      const puffRiseY =
        -Math.pow(puffProgress, 0.88) * 10.5 * p -
        Math.sin(puffProgress * Math.PI) * 1.4 * p;

      const puffSize = Math.round(
        interpolate(
          puffProgress,
          [0, 0.28, 0.75, 1],
          [p * 1.25, p * 2.1, p * 2.55, p * 1.45]
        )
      );

      const puffOpacity = interpolate(
        puffProgress,
        [0, 0.1, 0.35, 0.72, 1],
        [0.0, 0.66, 0.54, 0.28, 0.0],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
      );

      return {
        id: idx,
        dx: Math.round(puffDriftX),
        dy: Math.round(puffRiseY),
        size: Math.max(2, puffSize),
        opacity: puffOpacity,
      };
    });
  }, [trainFrame, safeFps, steamCount, p]);

  // Drop-shadow hanya aktif di desktop; di mobile dimatikan untuk mencegah GPU PowerVR tile-stall
  const warmWindowGlowStyle = isMobile
    ? undefined
    : { filter: 'drop-shadow(0px 0px 4px rgba(254, 240, 138, 0.6))' };

  return (
    <g id="midground-pixel-train-layer">
      {/* =========================================================
          0. PONDASI TANGGUL SALJU & REL KERETA PIXEL
      ========================================================== */}
      <g id="subtle-pixel-railway-track">
        <rect
          x={0}
          y={baseY + Math.round(1.6 * p) + 2}
          width={width}
          height={Math.round(3.8 * p)}
          fill={PALETTE.groundFarSlope}
        />

        <rect
          x={0}
          y={baseY + Math.round(1.25 * p)}
          width={width}
          height={Math.round(1.45 * p)}
          fill={PALETTE.trainEmbankmentSlate}
        />
        <rect
          x={0}
          y={baseY + Math.round(1.85 * p)}
          width={width}
          height={Math.round(1.15 * p)}
          fill={PALETTE.trainEmbankmentDark}
        />

        {railwayDetails.embankmentStones.map((stone, idx) => (
          <rect
            key={`stone-${idx}`}
            x={stone.x}
            y={baseY + Math.round(1.15 * p)}
            width={stone.w}
            height={stone.h}
            fill={
              idx % 2 === 0
                ? PALETTE.groundSubtleEdge
                : PALETTE.trainEmbankmentSlate
            }
            opacity={0.85}
          />
        ))}

        <rect
          x={0}
          y={baseY + Math.round(1.05 * p)}
          width={width}
          height={Math.max(1.5, Math.round(0.5 * p))}
          fill={PALETTE.mountainSnowCrisp}
          opacity={0.58}
        />

        <rect
          x={0}
          y={baseY + 1}
          width={width}
          height={Math.round(1.3 * p)}
          fill={PALETTE.trainWheelSteel}
          opacity={0.68}
        />

        {railwayDetails.ties.map((tie, idx) => (
          <rect
            key={`tie-${idx}`}
            x={tie.x}
            y={baseY}
            width={tie.w}
            height={Math.round(1.5 * p)}
            fill={tie.isDark ? PALETTE.trainWheelSteel : PALETTE.trainRoofSlate}
            opacity={0.9}
          />
        ))}

        <rect
          x={0}
          y={baseY}
          width={width}
          height={Math.max(1.5, Math.round(0.52 * p))}
          fill={PALETTE.mountainIceShadow}
          opacity={0.92}
        />

        <rect
          x={0}
          y={baseY + Math.round(0.92 * p)}
          width={width}
          height={Math.max(1.5, Math.round(0.48 * p))}
          fill={PALETTE.trainRoofSlate}
          opacity={0.96}
        />

        {railwayDetails.frostPatches.map((frost, idx) => (
          <rect
            key={`frost-${idx}`}
            x={frost.x}
            y={baseY + Math.round(1.02 * p)}
            width={frost.w}
            height={Math.max(1.5, Math.round(0.5 * p))}
            fill={
              frost.isBright ? PALETTE.treeSnowPure : PALETTE.treeSnowShade
            }
            opacity={frost.isBright ? 0.74 : 0.52}
          />
        ))}
      </g>

      {/* Rangkaian Kereta hanya dirender saat sedang melintas (isCrossing) */}
      {isCrossing && (
        <g
          style={{
            transform: `translate3d(${trainX.toFixed(2)}px, 0, 0)`,
            willChange: 'transform',
          }}
        >
          {/* =========================================================
              1. EMPAT GERBONG PENUMPANG BERLAMPU KUNING EMAS HANGAT
          ========================================================== */}
          {carriages.map((cIdx) => {
            const cx = cIdx * (carriageWidth + carriageGap);
            return (
              <g key={`carriage-${cIdx}`}>
                <rect
                  x={cx + carriageWidth}
                  y={baseY - Math.round(2.1 * p)}
                  width={carriageGap}
                  height={Math.round(p)}
                  fill={PALETTE.trainRoofSlate}
                />

                <rect
                  x={cx + Math.round(p)}
                  y={baseY - Math.round(5.8 * p)}
                  width={carriageWidth - Math.round(2 * p)}
                  height={Math.round(1.1 * p)}
                  fill={PALETTE.trainRoofSlate}
                />
                <rect
                  x={cx + Math.round(2 * p)}
                  y={baseY - Math.round(6.1 * p)}
                  width={carriageWidth - Math.round(4 * p)}
                  height={Math.max(1, Math.round(0.38 * p))}
                  fill={PALETTE.mountainFrostMid}
                  opacity={0.58}
                />

                <rect
                  x={cx}
                  y={baseY - Math.round(4.7 * p)}
                  width={carriageWidth}
                  height={Math.round(3.7 * p)}
                  fill={PALETTE.trainBodyDark}
                />

                <rect
                  x={cx + Math.round(1.6 * p)}
                  y={baseY - Math.round(1.05 * p)}
                  width={Math.round(3.1 * p)}
                  height={Math.round(1.15 * p)}
                  fill={PALETTE.trainWheelSteel}
                />
                <rect
                  x={cx + carriageWidth - Math.round(4.7 * p)}
                  y={baseY - Math.round(1.05 * p)}
                  width={Math.round(3.1 * p)}
                  height={Math.round(1.15 * p)}
                  fill={PALETTE.trainWheelSteel}
                />

                {/* Ambient glow pada badan gerbong */}
                <rect
                  x={cx + Math.round(1.1 * p)}
                  y={baseY - Math.round(4.4 * p)}
                  width={carriageWidth - Math.round(2.2 * p)}
                  height={Math.round(2.7 * p)}
                  fill={PALETTE.trainWindowBright}
                  opacity={0.18}
                />
                <rect
                  x={cx + Math.round(1.6 * p)}
                  y={baseY + Math.round(0.25 * p)}
                  width={carriageWidth - Math.round(3.2 * p)}
                  height={Math.round(1.1 * p)}
                  fill={PALETTE.trainWindowBright}
                  opacity={0.18}
                />

                {/* 4 Jendela Kuning Emas Cerah (#fef08a) */}
                <g style={warmWindowGlowStyle}>
                  {[0, 1, 2, 3].map((wIdx) => {
                    const wx = cx + Math.round((1.9 + wIdx * 2.85) * p);
                    const wy = baseY - Math.round(3.8 * p);
                    const ww = Math.round(1.9 * p);
                    const wh = Math.round(1.8 * p);
                    return (
                      <g key={`win-${wIdx}`}>
                        {/* Halo bloom pixel rect */}
                        <rect
                          x={wx - 1}
                          y={wy - 1}
                          width={ww + 2}
                          height={wh + 2}
                          fill="rgba(254, 240, 138, 0.38)"
                        />
                        <rect
                          x={wx}
                          y={wy}
                          width={ww}
                          height={wh}
                          fill={PALETTE.trainWindowBright}
                        />
                      </g>
                    );
                  })}
                </g>
              </g>
            );
          })}

          {/* =========================================================
              2. LOKOMOTIF UAP (Steam Engine)
          ========================================================== */}
          <g id="train-steam-locomotive">
            <rect
              x={locoX - Math.round(0.5 * p)}
              y={baseY - Math.round(6.2 * p)}
              width={Math.round(5.8 * p)}
              height={Math.round(p)}
              fill={PALETTE.trainRoofSlate}
            />
            <rect
              x={locoX}
              y={baseY - Math.round(5.2 * p)}
              width={Math.round(5.2 * p)}
              height={Math.round(4.2 * p)}
              fill={PALETTE.trainBodyDark}
            />
            <g style={warmWindowGlowStyle}>
              <rect
                x={locoX + Math.round(1.1 * p) - 1}
                y={baseY - Math.round(4.35 * p) - 1}
                width={Math.round(2.4 * p) + 2}
                height={Math.round(1.85 * p) + 2}
                fill="rgba(254, 240, 138, 0.38)"
              />
              <rect
                x={locoX + Math.round(1.3 * p)}
                y={baseY - Math.round(4.3 * p)}
                width={Math.round(2.3 * p)}
                height={Math.round(1.8 * p)}
                fill={PALETTE.trainWindowBright}
              />
            </g>

            <rect
              x={locoX + Math.round(5.2 * p)}
              y={baseY - Math.round(4.4 * p)}
              width={Math.round(8.8 * p)}
              height={Math.round(3.4 * p)}
              fill={PALETTE.trainBodyDark}
            />
            <rect
              x={locoX + Math.round(5.2 * p)}
              y={baseY - Math.round(4.8 * p)}
              width={Math.round(7.8 * p)}
              height={Math.round(0.75 * p)}
              fill={PALETTE.trainRoofSlate}
            />

            <rect
              x={chimneyX}
              y={chimneyTopY}
              width={Math.round(2.1 * p)}
              height={Math.round(2.9 * p)}
              fill={PALETTE.trainBodyDark}
            />
            <rect
              x={chimneyX - Math.round(0.4 * p)}
              y={chimneyTopY}
              width={Math.round(2.9 * p)}
              height={Math.round(0.85 * p)}
              fill={PALETTE.trainRoofSlate}
            />

            <rect
              x={locoX + Math.round(14 * p)}
              y={baseY - Math.round(2.3 * p)}
              width={Math.round(1.6 * p)}
              height={Math.round(1.3 * p)}
              fill={PALETTE.trainRoofSlate}
            />
            <rect
              x={locoX + Math.round(1.4 * p)}
              y={baseY - Math.round(1.05 * p)}
              width={Math.round(3.3 * p)}
              height={Math.round(1.15 * p)}
              fill={PALETTE.trainWheelSteel}
            />
            <rect
              x={locoX + Math.round(6 * p)}
              y={baseY - Math.round(1.05 * p)}
              width={Math.round(3.3 * p)}
              height={Math.round(1.15 * p)}
              fill={PALETTE.trainWheelSteel}
            />
            <rect
              x={locoX + Math.round(10.4 * p)}
              y={baseY - Math.round(1.05 * p)}
              width={Math.round(2.5 * p)}
              height={Math.round(1.15 * p)}
              fill={PALETTE.trainWheelSteel}
            />

            <g style={warmWindowGlowStyle}>
              <rect
                x={locoX + Math.round(14 * p)}
                y={baseY - Math.round(4 * p)}
                width={Math.round(1.35 * p)}
                height={Math.round(1.35 * p)}
                fill={PALETTE.trainWindowBright}
              />
            </g>
            <rect
              x={locoX + Math.round(15.35 * p)}
              y={baseY - Math.round(4.5 * p)}
              width={Math.round(5.4 * p)}
              height={Math.round(2.4 * p)}
              fill={PALETTE.trainWindowBright}
              opacity={0.25}
            />
          </g>

          {/* =========================================================
              3. KEPULAN UAP ASAP KONTINU (Semi-transparan lembut)
          ========================================================== */}
          <g id="locomotive-steam-puffs">
            {steamPuffs.map((puff) => {
              const px = chimneyX + puff.dx;
              const py = chimneyTopY - Math.round(1.1 * p) + puff.dy;
              const s = puff.size;
              const sub = Math.max(2, Math.round(s * 0.68));
              return (
                <g key={puff.id} opacity={puff.opacity}>
                  <rect
                    x={px}
                    y={py}
                    width={s}
                    height={s}
                    fill="rgba(255, 255, 255, 0.92)"
                  />
                  <rect
                    x={px - Math.round(sub * 0.62)}
                    y={py + Math.round(sub * 0.22)}
                    width={sub}
                    height={sub}
                    fill="rgba(241, 245, 249, 0.75)"
                  />
                  <rect
                    x={px + Math.round(s * 0.24)}
                    y={py - Math.round(sub * 0.55)}
                    width={sub}
                    height={sub}
                    fill="rgba(226, 232, 240, 0.7)"
                  />
                </g>
              );
            })}
          </g>
        </g>
      )}
    </g>
  );
});

/**
 * Layer Pegunungan Es Statis (React.memo)
 */
const FrostedSlateMountainsLayer = React.memo(function FrostedSlateMountainsLayer({
  mountains,
  pixelUnit,
}) {
  return (
    <g id="frosted-slate-mountains">
      {mountains.map((m, idx) => (
        <PixelMountainPeak
          key={idx}
          centerX={m.centerX}
          baseY={m.baseY}
          peakWidth={m.peakWidth}
          peakHeight={m.peakHeight}
          pixelStep={pixelUnit * 1.5}
          ridgeSeed={m.ridgeSeed}
          layerType={m.layerType}
        />
      ))}
    </g>
  );
});

/**
 * Layer Hamparan Bukit Salju Statis (React.memo)
 */
const DimIceBlueSnowfieldsLayer = React.memo(function DimIceBlueSnowfieldsLayer({
  width,
  height,
  horizonY,
  pixelUnit,
  isMobile,
}) {
  return (
    <g id="dim-ice-blue-snowfields">
      <PixelSnowHillside
        width={width}
        height={height}
        leftY={horizonY + height * 0.01}
        rightY={horizonY + height * 0.04}
        pixelStep={pixelUnit * 2}
        fillColor={PALETTE.groundFarSlope}
        crestColor={PALETTE.groundSubtleEdge}
        curveWave={0.012}
        seed={1}
      />

      <PixelSnowHillside
        width={width}
        height={height}
        leftY={isMobile ? height * 0.64 : height * 0.72}
        rightY={isMobile ? height * 0.74 : height * 0.8}
        pixelStep={pixelUnit * 2}
        fillColor={PALETTE.groundMidSlope}
        crestColor={PALETTE.groundSubtleEdge}
        curveWave={0.016}
        seed={3}
      />

      <PixelSnowHillside
        width={width}
        height={height}
        leftY={isMobile ? height * 0.73 : height * 0.77}
        rightY={isMobile ? height * 0.86 : height * 0.89}
        pixelStep={pixelUnit * 2}
        fillColor={PALETTE.groundNearSlope}
        crestColor={PALETTE.groundSubtleEdge}
        curveWave={0.014}
        seed={5}
      />

      <PixelSnowHillside
        width={width}
        height={height}
        leftY={isMobile ? height * 0.88 : height * 0.9}
        rightY={isMobile ? height * 0.94 : height * 0.95}
        pixelStep={pixelUnit * 2}
        fillColor={PALETTE.groundDeepValley}
        crestColor={null}
        curveWave={0.008}
        seed={7}
      />
    </g>
  );
});

/**
 * Komponen Utama: WinterFrostBackground
 * - Palet Deep Frosted Glacial Slate (Teduh, Dingin, Bebas Silau).
 * - Menampilkan 16-Bit PixelTrain di midground (keluar dari balik pohon cemara besar di kiri).
 * - High-performance 2D Canvas Snowflake Engine (0% React diffing, 55 partikel di mobile).
 */
export default function WinterFrostBackground({ children, className = '' }) {
  const canvasRef = useRef(null);
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();

  const isMobile = height > width;
  const pixelUnit = isMobile
    ? Math.max(3, Math.round(width / 180))
    : Math.max(4, Math.round(width / 320));

  const safeFrame = Number.isFinite(frame) ? frame : 0;
  const loopProgress =
    (((safeFrame % LOOP_FRAMES) + LOOP_FRAMES) % LOOP_FRAMES) / LOOP_FRAMES;

  /**
   * 1. KONFIGURASI PEGUNUNGAN ES
   */
  const mountains = useMemo(() => {
    if (isMobile) {
      const mBaseY = height * 0.56;
      return [
        {
          centerX: width * 0.34,
          baseY: mBaseY,
          peakWidth: width * 0.72,
          peakHeight: height * 0.25,
          ridgeSeed: 14,
          layerType: 'far',
        },
        {
          centerX: width * 0.86,
          baseY: mBaseY,
          peakWidth: width * 0.66,
          peakHeight: height * 0.24,
          ridgeSeed: 29,
          layerType: 'far',
        },
        {
          centerX: width * 0.64,
          baseY: mBaseY + height * 0.02,
          peakWidth: width * 0.88,
          peakHeight: height * 0.33,
          ridgeSeed: 43,
          layerType: 'main',
        },
        {
          centerX: width * 0.16,
          baseY: mBaseY + height * 0.015,
          peakWidth: width * 0.58,
          peakHeight: height * 0.21,
          ridgeSeed: 61,
          layerType: 'main',
        },
      ];
    }

    const dBaseY = height * 0.68;
    return [
      {
        centerX: width * 0.22,
        baseY: dBaseY,
        peakWidth: width * 0.44,
        peakHeight: height * 0.34,
        ridgeSeed: 14,
        layerType: 'far',
      },
      {
        centerX: width * 0.54,
        baseY: dBaseY,
        peakWidth: width * 0.48,
        peakHeight: height * 0.38,
        ridgeSeed: 29,
        layerType: 'far',
      },
      {
        centerX: width * 0.86,
        baseY: dBaseY,
        peakWidth: width * 0.46,
        peakHeight: height * 0.36,
        ridgeSeed: 42,
        layerType: 'far',
      },
      {
        centerX: width * 0.42,
        baseY: dBaseY + height * 0.02,
        peakWidth: width * 0.46,
        peakHeight: height * 0.42,
        ridgeSeed: 55,
        layerType: 'main',
      },
      {
        centerX: width * 0.74,
        baseY: dBaseY + height * 0.025,
        peakWidth: width * 0.52,
        peakHeight: height * 0.48,
        ridgeSeed: 73,
        layerType: 'main',
      },
    ];
  }, [isMobile, width, height]);

  /**
   * 2. SATU POHON CEMARA MEGAH DI UJUNG KIRI (Left-Anchored Lone Pine)
   */
  const lonePine = useMemo(() => {
    if (isMobile) {
      return {
        x: width * 0.16,
        topY: height * 0.28,
        baseY: height * 0.77,
        phase: 0.6,
        sway: 1.35,
      };
    }

    return {
      x: Math.max(width * 0.18, 300),
      topY: height * 0.18,
      baseY: height * 0.81,
      phase: 0.6,
      sway: 1.45,
    };
  }, [isMobile, width, height]);

  /**
   * 3. AWAN ES MALAM LOOPING HALUS
   */
  const clouds = useMemo(() => {
    const count = isMobile ? 4 : 6;
    return Array.from({ length: count }).map((_, i) => ({
      id: i,
      baseX: i / count,
      y: isMobile
        ? height * (0.07 + (i % 3) * 0.07)
        : height * (0.08 + (i % 3) * 0.08),
      scale: isMobile ? (width / 1080) * 1.35 : (width / 1920) * 1.7,
      variant: i % 2,
    }));
  }, [isMobile, width, height]);

  const horizonY = isMobile ? height * 0.56 : height * 0.68;

  // Jalur rel kereta midground di atas dataran danau es
  const trainTrackY =
    (isMobile ? horizonY + height * 0.036 : horizonY + height * 0.028) + 6;

  // Kabut lembah es tipis
  const mistOpacity = interpolate(
    Math.sin(loopProgress * Math.PI * 2 * 2),
    [-1, 1],
    [0.12, 0.24]
  );

  /**
   * 4. CANVAS 2D SNOW ENGINE (0% React State Re-renders)
   * Menjamin 60 FPS di desktop & locked 30 FPS di HP kentang (Infinix Smart 6).
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const isMobileDevice = typeof window !== 'undefined' ? window.innerWidth < 768 : false;
    const count = isMobileDevice ? 55 : 135;

    const flakes = Array.from({ length: count }).map((_, idx) => {
      const r1 = seededRandom(idx * 11 + 1);
      const r2 = seededRandom(idx * 23 + 2);
      const r3 = seededRandom(idx * 37 + 3);
      const r4 = seededRandom(idx * 53 + 4);

      const depthLayer = r3 > 0.74 ? 'near' : r3 > 0.36 ? 'mid' : 'far';
      const fallSpeed =
        depthLayer === 'near'
          ? (height / 11) * (0.85 + r2 * 0.3)
          : depthLayer === 'mid'
          ? (height / 15) * (0.8 + r2 * 0.4)
          : (height / 20) * (0.75 + r2 * 0.5);

      const swayRadius =
        depthLayer === 'near'
          ? width * 0.026
          : depthLayer === 'mid'
          ? width * 0.016
          : width * 0.009;

      const size =
        depthLayer === 'near'
          ? pixelUnit * 1.35
          : depthLayer === 'mid'
          ? pixelUnit * 1.0
          : pixelUnit * 0.7;

      const opacity =
        depthLayer === 'near' ? 0.88 : depthLayer === 'mid' ? 0.68 : 0.42;

      return {
        x: r1 * width,
        y: r2 * height,
        baseX: r1 * width,
        fallSpeed,
        swayRadius,
        swaySpeed: 1.2 + r4 * 1.4,
        phase: r4 * Math.PI * 2,
        size,
        opacity,
        isCrossFlake: idx % 7 === 0 && depthLayer === 'near',
      };
    });

    let rafId;
    let lastTime = performance.now();

    let isModalOpen =
      typeof document !== 'undefined' &&
      document.body.classList.contains('overflow-hidden');

    const observer =
      typeof MutationObserver !== 'undefined' && typeof document !== 'undefined'
        ? new MutationObserver(() => {
            isModalOpen = document.body.classList.contains('overflow-hidden');
          })
        : null;

    if (observer && typeof document !== 'undefined') {
      observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    }

    const minDelta = isMobileDevice ? 32 : 16;

    function render(now) {
      if (document.hidden || isModalOpen) {
        lastTime = now;
        rafId = requestAnimationFrame(render);
        return;
      }

      const elapsed = now - lastTime;
      if (elapsed < minDelta) {
        rafId = requestAnimationFrame(render);
        return;
      }

      const deltaSeconds = Math.min(elapsed / 1000, 0.1);
      lastTime = now;

      ctx.clearRect(0, 0, width, height);
      const timeSec = now / 1000;

      for (let i = 0; i < flakes.length; i++) {
        const flake = flakes[i];

        flake.y += flake.fallSpeed * deltaSeconds;
        if (flake.y > height + 8) {
          flake.y = -8;
          flake.baseX = Math.random() * width;
        }

        const sway = Math.sin(timeSec * flake.swaySpeed + flake.phase) * flake.swayRadius;
        const currentX = (flake.baseX + sway + width) % width;
        const s = flake.size;

        ctx.fillStyle = `rgba(248, 250, 252, ${flake.opacity})`;

        if (flake.isCrossFlake) {
          ctx.fillRect(currentX - s * 0.5, flake.y - s * 1.5, s, s * 3);
          ctx.fillRect(currentX - s * 1.5, flake.y - s * 0.5, s * 3, s);
        } else {
          ctx.fillRect(currentX, flake.y, s, s);
        }
      }

      if (!prefersReducedMotion) {
        rafId = requestAnimationFrame(render);
      }
    }

    render(performance.now());

    return () => {
      cancelAnimationFrame(rafId);
      if (observer) observer.disconnect();
    };
  }, [width, height, pixelUnit]);

  return (
    <AbsoluteFill
      className={className}
      style={{
        background: `linear-gradient(180deg, ${PALETTE.skyTop} 0%, ${PALETTE.skyUpperMid} 38%, ${PALETTE.skyLowerMid} 72%, ${PALETTE.skyBottom} 100%)`,
        overflow: 'hidden',
      }}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        shapeRendering="crispEdges"
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          imageRendering: 'pixelated',
        }}
      >
        {/* =================================================================
            LAYER 1: LANGIT BIRU NAVY ES PEKAT & AWAN GLACIAL
        ================================================================== */}
        <g id="deep-glacial-sky-bands">
          <rect
            x={0}
            y={0}
            width={width}
            height={height * 0.14}
            fill={PALETTE.skyTop}
          />
          <rect
            x={0}
            y={horizonY - height * 0.14}
            width={width}
            height={height * 0.16}
            fill={PALETTE.skyHorizonMist}
            opacity={0.35}
          />
        </g>

        <g id="drifting-glacial-clouds">
          {clouds.map((c) => {
            const wrapWidth = width + 320;
            const currentX =
              ((c.baseX + loopProgress) % 1) * wrapWidth - 160;
            return (
              <PixelCloudCluster
                key={c.id}
                x={Math.round(currentX / pixelUnit) * pixelUnit}
                y={c.y}
                scale={c.scale}
                variant={c.variant}
              />
            );
          })}
        </g>

        {/* =================================================================
            LAYER 2: PUNCAK PEGUNUNGAN ES
        ================================================================== */}
        <FrostedSlateMountainsLayer mountains={mountains} pixelUnit={pixelUnit} />

        {/* Kabut Lembah Es Redup di Kaki Pegunungan */}
        <rect
          x={0}
          y={horizonY - height * 0.03}
          width={width}
          height={height * 0.05}
          fill={PALETTE.mountainIceShadow}
          opacity={mistOpacity}
        />

        {/* =================================================================
            LAYER 3: SILUET BARISAN PINUS RENDAH DI KEJAUHAN KAKI GUNUNG
        ================================================================== */}
        <DistantPixelTreeline
          startX={0}
          endX={width}
          baseY={horizonY + height * 0.015}
          pixelSize={pixelUnit * 1.15}
          seed={42}
        />

        {/* =================================================================
            LAYER 4: HAMPARAN TANAH SALJU BERGRADASI BIRU ES REDUP
        ================================================================== */}
        <DimIceBlueSnowfieldsLayer
          width={width}
          height={height}
          horizonY={horizonY}
          pixelUnit={pixelUnit}
          isMobile={isMobile}
        />

        {/* ===============================================================
            LAYER 4.5 (MIDGROUND): KERETA API UAP 16-BIT (PixelTrain)
            Berada di atas dataran danau es berundak & di depan deretan pinus
            kecil/gunung, namun tetap di BELAKANG pohon cemara besar kiri.
        ================================================================ */}
        <PixelTrain
          frame={frame}
          width={width}
          y={trainTrackY}
          isMobile={isMobile}
          fps={fps}
        />

        {/* =================================================================
            LAYER 5: SATU POHON CEMARA MEGAH DI UJUNG KIRI (Left-Anchored Lone Pine)
        ================================================================== */}
        <g id="left-anchored-lone-pine">
          <PixelPineTree
            x={lonePine.x}
            topY={lonePine.topY}
            baseY={lonePine.baseY}
            frame={frame}
            phaseOffset={lonePine.phase}
            swayAmplitude={lonePine.sway}
          />
        </g>
      </svg>

      {/* =================================================================
          LAYER 6: CANVAS 2D HUJAN SALJU KRISTAL (Zero React State Re-renders)
      ================================================================== */}
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{
          imageRendering: 'pixelated',
        }}
      />

      {children && (
        <div className="relative z-10 w-full h-full pointer-events-auto">
          {children}
        </div>
      )}
    </AbsoluteFill>
  );
}
