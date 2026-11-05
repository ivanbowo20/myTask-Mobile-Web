'use client';

import React, { useMemo, useState, useEffect, useRef, createContext, useContext } from 'react';

/**
 * BUILT-IN REMOTION COMPATIBLE RUNTIME & HOOKS
 * Memungkinkan komponen berjalan langsung di Preview browser pada 60fps
 * tanpa error bundling "Could not resolve 'remotion'", sekaligus tetap 100%
 * kompatibel dengan API standar Remotion (AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate).
 */
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
    let isScrolling = false;
    let scrollTimer = null;
    let lastTime = performance.now();
    let accumulatedTime = 0;

    const isMobile =
      typeof window !== 'undefined' ? window.innerWidth < 768 : false;
    // Pada HP kentang (Infinix Smart 6): throttle ke ~30 FPS (interval >= 32ms) untuk memangkas beban CPU & baterai hingga 50%
    // Pada desktop: berjalan penuh 60 FPS (interval >= 16ms)
    const minFrameInterval = isMobile ? 32 : 16;

    const onVisibilityChange = () => {
      if (document.hidden) {
        isPaused = true;
      } else {
        isPaused = false;
        lastTime = performance.now();
      }
    };

    // Yield 100% thread CPU ke touch scrolling di HP kentang agar scroll daftar tugas 60fps tanpa jank
    const onScroll = () => {
      if (!isMobile) return;
      isScrolling = true;
      if (scrollTimer) clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        isScrolling = false;
        lastTime = performance.now();
      }, 120);
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', onScroll, { passive: true });
    }

    const tick = (now) => {
      const elapsed = now - lastTime;

      if (!isPaused && (!isScrolling || !isMobile)) {
        if (elapsed >= minFrameInterval) {
          const delta = elapsed / 1000;
          accumulatedTime += delta;
          lastTime = now;
          setStandaloneFrame(Math.floor(accumulatedTime * 60) % 1800);
        }
      } else {
        lastTime = now;
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      if (scrollTimer) clearTimeout(scrollTimer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (typeof window !== 'undefined') {
        window.removeEventListener('scroll', onScroll);
      }
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
    durationInFrames: 1800,
  };
};

export const interpolate = (input, inputRange, outputRange, options = {}) => {
  if (!inputRange || !outputRange || inputRange.length < 2) {
    return outputRange?.[0] ?? 0;
  }

  const { extrapolateLeft = 'extend', extrapolateRight = 'extend' } = options;

  if (input <= inputRange[0]) {
    if (extrapolateLeft === 'clamp') return outputRange[0];
  }
  if (input >= inputRange[inputRange.length - 1]) {
    if (extrapolateRight === 'clamp') return outputRange[outputRange.length - 1];
  }

  let segmentIndex = 0;
  for (let i = 1; i < inputRange.length; i++) {
    if (input <= inputRange[i] || i === inputRange.length - 1) {
      segmentIndex = i - 1;
      break;
    }
  }

  const inMin = inputRange[segmentIndex];
  const inMax = inputRange[segmentIndex + 1];
  const outMin = outputRange[segmentIndex];
  const outMax = outputRange[segmentIndex + 1];

  if (inMax === inMin) return outMin;
  const progress = (input - inMin) / (inMax - inMin);
  return outMin + progress * (outMax - outMin);
};

/**
 * KONSTANTA ANIMASI & PALET WARNA (DEEP FROSTED GLACIAL SLATE - REFERENSI FROZEN)
 * Loop sempurna 1800 frames (30 detik pada 60fps).
 * Palet dirancang teduh, dingin, dan bebas silau.
 */
const LOOP_FRAMES = 1800;

const PALETTE = {
  // Langit Biru Navy Es Pekat (Teduh & Dingin: #121E36 -> #1E3254)
  skyTop: '#121E36',
  skyUpperMid: '#15233E',
  skyLowerMid: '#192A48',
  skyBottom: '#1E3254',
  skyHorizonMist: '#233A60',

  // Awan Malam/Senja Es Redup
  cloudLight: '#2E4568',
  cloudMid: '#243856',
  cloudShadow: '#1A2A42',

  // Pegunungan Bersalju (Dark Glacial Slate #334155 / #475569 & Salju Kristal Tajam)
  mountainSnowPeak: '#F8FAFC',
  mountainSnowCrisp: '#CBD5E1',
  mountainFrostMid: '#64748B',
  mountainIceLight: '#475569',
  mountainIceShadow: '#334155',
  mountainDeepSlate: '#1E293B',
  mountainAbyss: '#0F172A',

  // Pohon Cemara Megah (#0E2419) dengan Lapisan Salju Putih Bersih
  pineDarkest: '#07140E',
  pineBase: '#0E2419',
  pineMid: '#143324',
  pineHighlight: '#1B4330',
  treeSnowPure: '#F8FAFC',
  treeSnowShade: '#CBD5E1',
  treeSnowSlate: '#64748B',

  // Siluet Barisan Pinus Rendah di Kejauhan Kaki Gunung
  distantPineDark: '#0A1914',
  distantPineBase: '#0E2419',
  distantPineFrost: '#334155',

  // Hamparan Tanah Salju Bergradasi Biru Es Redup (Tanpa Garis Putih Silau)
  groundFarSlope: '#1E2F4D',
  groundMidSlope: '#182740',
  groundNearSlope: '#132036',
  groundDeepValley: '#0E1829',
  groundSubtleEdge: '#273D61',
};

/**
 * Generator angka pseudo-random deterministik (Seeded PRNG)
 */
const seededRandom = (seed) => {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453123;
  return x - Math.floor(x);
};

/**
 * Komponen Pohon Cemara Tunggal Megah (Left-Anchored Lone Pine)
 * Dirancang lebih tinggi, rimbun, dan detail menggunakan warna dasar #0E2419
 * dengan tumpukan salju putih bersih di atas setiap dahannya.
 */
const PixelPineTree = ({
  x,
  y,
  scale = 1,
  tiers = 8,
  frame,
  phaseOffset = 0,
  swayAmplitude = 1.5,
}) => {
  const loopProgress = (frame % LOOP_FRAMES) / LOOP_FRAMES;
  const angle = loopProgress * Math.PI * 2 * 2 + phaseOffset;
  const windOffset = Math.sin(angle) * swayAmplitude;

  const px = 3.2 * scale;
  const tierElements = [];

  // Puncak lancip pohon cemara bersalju (Spire)
  const topShift = windOffset * 1.15;
  tierElements.push(
    <g key="spire" transform={`translate(${topShift * px * 0.35}, 0)`}>
      <rect x={-0.6 * px} y={-4.5 * px} width={1.2 * px} height={4.5 * px} fill={PALETTE.treeSnowPure} />
      <rect x={-1.6 * px} y={-1.2 * px} width={3.2 * px} height={2.2 * px} fill={PALETTE.treeSnowPure} />
      <rect x={-2.2 * px} y={0.8 * px} width={4.4 * px} height={1.4 * px} fill={PALETTE.treeSnowShade} />
      <rect x={-2.2 * px} y={2.0 * px} width={4.4 * px} height={1.2 * px} fill={PALETTE.pineBase} />
    </g>
  );

  for (let t = 0; t < tiers; t++) {
    const tierWeight = (tiers - t) / tiers;
    const tierSway = windOffset * (0.2 + tierWeight * 0.85);
    const tierY = (t * 5.2 + 2.2) * px;
    const halfSpan = (3.4 + t * 2.35) * px;
    const tierHeight = 6.2 * px;

    tierElements.push(
      <g
        key={`tier-${t}`}
        transform={`translate(${tierSway * px * 0.32}, ${tierY})`}
      >
        {/* Bayangan Dalam Dahan Cemara (#07140E) */}
        <rect
          x={-halfSpan * 0.92}
          y={tierHeight * 0.56}
          width={halfSpan * 1.84}
          height={px * 2.4}
          fill={PALETTE.pineDarkest}
        />

        {/* Dahan Utama Hijau Pine Pekat (#0E2419) */}
        <rect
          x={-halfSpan * 1.06}
          y={tierHeight * 0.44}
          width={halfSpan * 2.12}
          height={px * 1.8}
          fill={PALETTE.pineBase}
        />
        <rect
          x={-halfSpan * 0.96}
          y={tierHeight * 0.26}
          width={halfSpan * 1.92}
          height={px * 2.0}
          fill={PALETTE.pineBase}
        />

        {/* Undakan Gerigi Ujung Dahan Kiri & Kanan */}
        <rect
          x={-halfSpan * 1.14}
          y={tierHeight * 0.52}
          width={px * 2.4}
          height={px * 1.4}
          fill={PALETTE.pineBase}
        />
        <rect
          x={halfSpan * 1.14 - px * 2.4}
          y={tierHeight * 0.52}
          width={px * 2.4}
          height={px * 1.4}
          fill={PALETTE.pineBase}
        />

        {/* Aksen Dahan Hijau Teduh (#143324) */}
        <rect
          x={-halfSpan * 0.65}
          y={tierHeight * 0.36}
          width={halfSpan * 0.85}
          height={px * 1.3}
          fill={PALETTE.pineMid}
        />

        {/* Bayangan Bawah Salju di Dahan (#64748B) */}
        <rect
          x={-halfSpan * 0.98}
          y={tierHeight * 0.2}
          width={halfSpan * 1.96}
          height={px * 1.1}
          fill={PALETTE.treeSnowSlate}
        />
        <rect
          x={-halfSpan * 1.08}
          y={tierHeight * 0.34}
          width={px * 2.5}
          height={px * 1.2}
          fill={PALETTE.treeSnowSlate}
        />
        <rect
          x={halfSpan * 1.08 - px * 2.5}
          y={tierHeight * 0.34}
          width={px * 2.5}
          height={px * 1.2}
          fill={PALETTE.treeSnowSlate}
        />

        {/* Lapisan Salju Transisi (#CBD5E1) */}
        <rect
          x={-halfSpan * 0.9}
          y={tierHeight * 0.06}
          width={halfSpan * 1.8}
          height={px * 1.4}
          fill={PALETTE.treeSnowShade}
        />

        {/* Lapisan Salju Putih Bersih (#F8FAFC) di Punggung Dahan */}
        <rect
          x={-halfSpan * 0.82}
          y={-px * 0.45}
          width={halfSpan * 1.64}
          height={px * 1.5}
          fill={PALETTE.treeSnowPure}
        />
        <rect
          x={-halfSpan * 0.54}
          y={-px * 1.2}
          width={halfSpan * 1.08}
          height={px * 1.0}
          fill={PALETTE.treeSnowPure}
        />
        {/* Tumpukan Salju Putih di Ujung Dahan Kiri & Kanan */}
        <rect
          x={-halfSpan * 0.98}
          y={tierHeight * 0.14}
          width={px * 2.6}
          height={px * 1.2}
          fill={PALETTE.treeSnowPure}
        />
        <rect
          x={halfSpan * 0.98 - px * 2.6}
          y={tierHeight * 0.14}
          width={px * 2.6}
          height={px * 1.2}
          fill={PALETTE.treeSnowPure}
        />
      </g>
    );
  }

  const totalTreeHeight = (tiers * 5.2 + 2.2) * px;

  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Batang Pohon Kokoh di Dasar */}
      <rect
        x={-2.2 * px}
        y={totalTreeHeight - 1.5 * px}
        width={4.4 * px}
        height={6.5 * px}
        fill={PALETTE.pineDarkest}
      />
      <rect
        x={-1.0 * px}
        y={totalTreeHeight - 1.5 * px}
        width={1.6 * px}
        height={6.0 * px}
        fill={PALETTE.pineBase}
      />

      {/* Gundukan Salju Redup di Kaki Pohon (Menyatu dengan Bukit Biru Es) */}
      <rect
        x={-8.5 * px}
        y={totalTreeHeight + 3.2 * px}
        width={17 * px}
        height={2.6 * px}
        fill={PALETTE.groundSubtleEdge}
      />
      <rect
        x={-6.5 * px}
        y={totalTreeHeight + 2.0 * px}
        width={13 * px}
        height={2.0 * px}
        fill={PALETTE.treeSnowSlate}
      />
      <rect
        x={-4.5 * px}
        y={totalTreeHeight + 1.2 * px}
        width={9 * px}
        height={1.4 * px}
        fill={PALETTE.treeSnowShade}
      />

      {tierElements}
    </g>
  );
};

/**
 * Komponen Puncak Gunung Bersalju Pixel Art 16-Bit (Deep Frosted Glacial Slate)
 * Menggunakan bayangan es gelap (#334155 / #475569) dengan aksen salju kristal tajam
 * di punggung gunung sehingga gagah namun tidak menyilaukan mata.
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
  const columns = useMemo(() => {
    const numCols = Math.max(10, Math.floor(peakWidth / pixelStep));
    const halfCols = numCols / 2;
    const result = [];

    for (let i = 0; i <= numCols; i++) {
      const normalized = (i - halfCols) / halfCols; // -1 (kiri) ke +1 (kanan)
      const dist = Math.abs(normalized);

      // Profil tebing curam bergerigi khas pegunungan es Frozen
      const jag1 =
        Math.sin(i * 0.62 + ridgeSeed * 2.1) * 0.065 * (1 - dist * 0.45);
      const jag2 =
        Math.cos(i * 1.4 + ridgeSeed * 4.7) * 0.038 * (1 - dist * 0.3);
      const heightRatio = Math.max(
        0,
        Math.pow(1 - dist, 1.32) + jag1 + jag2
      );

      const colHeight =
        Math.round((heightRatio * peakHeight) / pixelStep) * pixelStep;

      if (colHeight <= 0) continue;

      const colX = centerX + (i - halfCols) * pixelStep;
      const topY = baseY - colHeight;

      // Garis patahan punggung tengah gunung (ridge line)
      const ridgeOffset =
        Math.round(Math.sin(colHeight * 0.035 + ridgeSeed) * 1.6) *
        (normalized / (dist + 0.1));

      const isLeftLitSide = i < halfCols + ridgeOffset;
      const isNearRidge = Math.abs(i - (halfCols + ridgeOffset)) <= 1.8;

      // Lapisan es terang & kristal tajam hanya di puncak dan punggung tebing
      const snowCapRatio = isLeftLitSide
        ? 0.26 + 0.24 * (1 - dist) + seededRandom(i * 13 + ridgeSeed) * 0.1
        : 0.12 + 0.14 * (1 - dist) + seededRandom(i * 17 + ridgeSeed) * 0.08;

      const snowHeight = Math.max(
        pixelStep,
        Math.round((colHeight * snowCapRatio) / pixelStep) * pixelStep
      );

      const midSlateHeight = Math.max(
        pixelStep * 2,
        Math.round((colHeight * 0.52) / pixelStep) * pixelStep
      );

      result.push({
        colX,
        topY,
        colHeight,
        snowHeight: Math.min(colHeight, snowHeight),
        midSlateHeight: Math.min(colHeight, snowHeight + midSlateHeight),
        isLeftLitSide,
        isNearRidge,
        dist,
        index: i,
      });
    }
    return result;
  }, [centerX, baseY, peakWidth, peakHeight, pixelStep, ridgeSeed]);

  // Palet gunung berdasarkan kedalaman (Far vs Main) dengan dominasi #334155 & #475569
  const colors =
    layerType === 'far'
      ? {
          baseLeft: PALETTE.mountainIceShadow, // #334155
          baseRight: PALETTE.mountainDeepSlate, // #1E293B
          midLeft: PALETTE.mountainIceLight, // #475569
          midRight: PALETTE.mountainIceShadow, // #334155
          crownLeft: PALETTE.mountainSnowCrisp, // #CBD5E1
          crownRight: PALETTE.mountainFrostMid, // #64748B
          ridgeCrystal: PALETTE.mountainSnowPeak, // #F8FAFC
        }
      : {
          baseLeft: PALETTE.mountainIceShadow, // #334155
          baseRight: PALETTE.mountainAbyss, // #0F172A
          midLeft: PALETTE.mountainIceLight, // #475569
          midRight: PALETTE.mountainIceShadow, // #334155
          crownLeft: PALETTE.mountainSnowCrisp, // #CBD5E1
          crownRight: PALETTE.mountainIceLight, // #475569
          ridgeCrystal: PALETTE.mountainSnowPeak, // #F8FAFC
        };

  return (
    <g>
      {columns.map((col) => (
        <g key={col.index}>
          {/* Tubuh Tebing Bawah (Dark Slate #334155 / #1E293B) */}
          <rect
            x={col.colX}
            y={col.topY}
            width={pixelStep + 0.5}
            height={col.colHeight}
            fill={col.isLeftLitSide ? colors.baseLeft : colors.baseRight}
          />

          {/* Lapisan Bayangan Es Tengah (#475569 / #334155) */}
          <rect
            x={col.colX}
            y={col.topY}
            width={pixelStep + 0.5}
            height={col.midSlateHeight}
            fill={col.isLeftLitSide ? colors.midLeft : colors.midRight}
          />

          {/* Mahkota Es & Salju di Puncak Lereng */}
          <rect
            x={col.colX}
            y={col.topY}
            width={pixelStep + 0.5}
            height={col.snowHeight}
            fill={col.isLeftLitSide ? colors.crownLeft : colors.crownRight}
          />

          {/* Aksen Salju Kristal Tajam (#F8FAFC) di Puncak & Garis Patahan Punggung Gunung */}
          {(col.isNearRidge || (col.isLeftLitSide && col.dist < 0.28)) && (
            <rect
              x={col.colX}
              y={col.topY}
              width={pixelStep + 0.5}
              height={Math.min(
                col.colHeight,
                col.isNearRidge ? pixelStep * 4 : pixelStep * 2
              )}
              fill={colors.ridgeCrystal}
            />
          )}
        </g>
      ))}
    </g>
  );
});

/**
 * Komponen Awan Es Redup Pixel Art 16-Bit
 */
const PixelCloudCluster = React.memo(({ x, y, scale = 1, variant = 0 }) => {
  const p = 6 * scale;
  const shapes = [
    [
      { dx: 2, dy: 0, w: 8, h: 1, c: PALETTE.cloudLight },
      { dx: 1, dy: 1, w: 12, h: 1, c: PALETTE.cloudMid },
      { dx: 0, dy: 2, w: 15, h: 1, c: PALETTE.cloudShadow },
    ],
    [
      { dx: 3, dy: 0, w: 6, h: 1, c: PALETTE.cloudLight },
      { dx: 1, dy: 1, w: 10, h: 1, c: PALETTE.cloudMid },
      { dx: 0, dy: 2, w: 12, h: 1, c: PALETTE.cloudShadow },
    ],
  ];

  const blocks = shapes[variant % shapes.length];

  return (
    <g transform={`translate(${x}, ${y})`} opacity={0.45}>
      {blocks.map((b, i) => (
        <rect
          key={i}
          x={b.dx * p}
          y={b.dy * p}
          width={b.w * p}
          height={b.h * p}
          fill={b.c}
        />
      ))}
    </g>
  );
});

/**
 * Barisan Siluet Pinus Rendah di Kejauhan Kaki Gunung (Distant Conifer Treeline)
 * Membentang tenang di kaki pegunungan menggunakan warna #0A1914 dan #0E2419.
 */
const DistantPixelTreeline = React.memo(({
  startX,
  endX,
  baseY,
  pixelSize = 4,
  seed = 10,
}) => {
  const columns = useMemo(() => {
    const cols = [];
    const totalCols = Math.ceil((endX - startX) / pixelSize);
    for (let i = 0; i < totalCols; i++) {
      const treeCycle = (i % 5) - 2;
      const spireBoost =
        treeCycle === 0 ? 6 : Math.abs(treeCycle) === 1 ? 3.5 : 1.5;
      const wave = Math.sin(i * 0.12 + seed) * 1.5;
      const noise = Math.floor(seededRandom(i * 7 + seed) * 2.5);
      const h = Math.max(2, Math.round(spireBoost + wave + noise)) * pixelSize;

      cols.push({
        x: startX + i * pixelSize,
        h,
        isTip: treeCycle === 0,
        isAlt: i % 2 === 0,
      });
    }
    return cols;
  }, [startX, endX, pixelSize, seed]);

  return (
    <g>
      {columns.map((c, idx) => (
        <g key={idx}>
          <rect
            x={c.x}
            y={baseY - c.h}
            width={pixelSize + 0.5}
            height={c.h + pixelSize * 4}
            fill={c.isAlt ? PALETTE.distantPineBase : PALETTE.distantPineDark}
          />
          {c.isTip && (
            <rect
              x={c.x}
              y={baseY - c.h}
              width={pixelSize + 0.5}
              height={pixelSize * 1.2}
              fill={PALETTE.distantPineFrost}
            />
          )}
        </g>
      ))}
    </g>
  );
});

/**
 * Komponen Hamparan Bukit Salju Bergradasi Biru Es Redup (Stepped Pixel Snow Slope)
 * Menggantikan pita putih silau dengan kontur bukit melandai bergradasi biru es teduh.
 */
const PixelSnowHillside = React.memo(({
  width,
  height,
  leftY,
  rightY,
  pixelStep = 6,
  fillColor,
  crestColor = null,
  curveWave = 0.02,
  seed = 1,
}) => {
  const steps = useMemo(() => {
    const numCols = Math.ceil(width / pixelStep);
    const arr = [];
    for (let i = 0; i < numCols; i++) {
      const t = i / Math.max(1, numCols - 1);
      // Kurva melandai dari sisi kiri (tempat pohon cemara besar berdiri) ke lembah kanan
      const easeT = t * t * (3 - 2 * t);
      const wave = Math.sin(t * Math.PI * 2 + seed) * height * curveWave;
      const rawY = leftY + (rightY - leftY) * easeT + wave;
      const steppedY = Math.round(rawY / pixelStep) * pixelStep;

      arr.push({
        x: i * pixelStep,
        y: steppedY,
        h: Math.max(0, height - steppedY + pixelStep),
      });
    }
    return arr;
  }, [width, height, leftY, rightY, pixelStep, curveWave, seed]);

  return (
    <g>
      {steps.map((s, idx) => (
        <g key={idx}>
          <rect
            x={s.x}
            y={s.y}
            width={pixelStep + 0.6}
            height={s.h}
            fill={fillColor}
          />
          {crestColor && (
            <rect
              x={s.x}
              y={s.y}
              width={pixelStep + 0.6}
              height={pixelStep * 1.2}
              fill={crestColor}
            />
          )}
        </g>
      ))}
    </g>
  );
});

/**
 * Layer Pegunungan Es Statis (React.memo)
 * Memastikan ribuan segmen tebing gunung es tidak pernah di-diff virtual DOM ulang per frame animasi.
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
 * Mengunci kontur lereng salju bertingkat agar 0 overhead CPU pada HP kentang saat salju turun.
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
      {/* Lereng Salju Jauh di Kaki Hutan Pinus (#1E2F4D) */}
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

      {/* Lereng Bukit Salju Tengah (#182740) */}
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

      {/* Bukit Salju Kiri Tempat Pohon Cemara Megah Berdiri (#132036) */}
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

      {/* Lembah Dasar Salju Biru Gelap Teduh (#0E1829) */}
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
 * - Komposisi Asymmetric Left-Anchored Lone Pine (Satu pohon cemara megah di sisi kiri
 *   baik pada Mobile 9:16 maupun Desktop 16:9, membingkai puncak gunung es di sisi tengah-kanan).
 */
export default function WinterFrostBackground({ children, className = '' }) {
  const canvasRef = useRef(null);
  const [dimensions, setDimensions] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth || 1920 : 1920,
    height: typeof window !== 'undefined' ? window.innerHeight || 1080 : 1080,
  }));

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth || 1920,
        height: window.innerHeight || 1080,
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { width, height } = dimensions;
  const isMobile = height > width;
  const pixelUnit = isMobile
    ? Math.max(3, Math.round(width / 180))
    : Math.max(4, Math.round(width / 320));

  /**
   * 1. KONFIGURASI PEGUNUNGAN ES (Terbuka & Megah di Tengah hingga Kanan)
   */
  const mountains = useMemo(() => {
    if (isMobile) {
      const mBaseY = height * 0.56;
      return [
        // Puncak Jauh (Far Slate Peaks)
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
        // Puncak Utama Megah di Tengah-Kanan (Tidak tertutup pohon)
        {
          centerX: width * 0.64,
          baseY: mBaseY + height * 0.02,
          peakWidth: width * 0.88,
          peakHeight: height * 0.33,
          ridgeSeed: 43,
          layerType: 'main',
        },
        // Puncak Pendamping di Sisi Kiri Belakang Pohon
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

    // Desktop (16:9 Panorama)
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
      // Puncak Utama Tengah & Kanan yang Megah
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
   * 2. KONFIGURASI SATU POHON CEMARA MEGAH DI UJUNG KIRI (Left-Anchored Lone Pine)
   */
  const lonePine = useMemo(() => {
    if (isMobile) {
      const mScale = (width / 1080) * 4.4;
      return {
        x: width * 0.19,
        y: height * 0.34,
        scale: mScale,
        tiers: 8,
        phase: 0.6,
        sway: 1.45,
      };
    }

    const dScale = (width / 1920) * 4.2;
    return {
      x: width * 0.13,
      y: height * 0.26,
      scale: dScale,
      tiers: 8,
      phase: 0.6,
      sway: 1.55,
    };
  }, [isMobile, width, height]);

  /**
   * 3. AWAN ES MALAM/SENJA
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

  /**
   * 4. CANVAS 2D SNOW ENGINE (0% React State Re-renders)
   * Menggambar salju langsung di Canvas 2D via native requestAnimationFrame.
   * - Menghilangkan 100% Virtual DOM diffing (setState = 0).
   * - Auto-pause saat modal (Tambah Tugas / Catatan) terbuka, memberi 100% CPU/GPU ke modal.
   * - Auto-pause saat scrolling di HP kentang (Infinix Smart 6).
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
    const count = isMobileDevice ? 80 : 135;

    // Generate deterministic snowflake pool
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
    let isScrolling = false;
    let scrollTimer = null;

    // Deteksi modal terbuka (saat modal open, lockBodyScroll menambahkan class 'overflow-hidden' ke body)
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

    const handleScroll = () => {
      if (!isMobileDevice) return;
      isScrolling = true;
      if (scrollTimer) clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        isScrolling = false;
        lastTime = performance.now();
      }, 100);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', handleScroll, { passive: true });
    }

    const minDelta = isMobileDevice ? 32 : 16; // ~30 FPS on mobile, 60 FPS on desktop

    function render(now) {
      if (document.hidden || isModalOpen || (isScrolling && isMobileDevice)) {
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
      if (scrollTimer) clearTimeout(scrollTimer);
      if (observer) observer.disconnect();
      if (typeof window !== 'undefined') {
        window.removeEventListener('scroll', handleScroll);
      }
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
        {/* LAYER 1: LANGIT BIRU NAVY ES PEKAT & AWAN */}
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
          {clouds.map((c) => (
            <PixelCloudCluster
              key={c.id}
              x={c.baseX * width}
              y={c.y}
              scale={c.scale}
              variant={c.variant}
            />
          ))}
        </g>

        {/* LAYER 2: PUNCAK PEGUNUNGAN ES (Zero CPU Virtual DOM Overhead) */}
        <FrostedSlateMountainsLayer mountains={mountains} pixelUnit={pixelUnit} />

        {/* Kabut Lembah Es Redup di Kaki Pegunungan */}
        <rect
          x={0}
          y={horizonY - height * 0.03}
          width={width}
          height={height * 0.05}
          fill={PALETTE.mountainIceShadow}
          opacity={0.18}
        />

        {/* LAYER 3: SILUET BARISAN PINUS RENDAH DI KEJAUHAN KAKI GUNUNG */}
        <DistantPixelTreeline
          startX={0}
          endX={width}
          baseY={horizonY + height * 0.015}
          pixelSize={pixelUnit * 1.15}
          seed={42}
        />

        {/* LAYER 4: HAMPARAN TANAH SALJU BERGRADASI BIRU ES REDUP */}
        <DimIceBlueSnowfieldsLayer
          width={width}
          height={height}
          horizonY={horizonY}
          pixelUnit={pixelUnit}
          isMobile={isMobile}
        />

        {/* LAYER 5: SATU POHON CEMARA MEGAH DI UJUNG KIRI (Left-Anchored Lone Pine) */}
        <g id="left-anchored-lone-pine">
          <PixelPineTree
            x={lonePine.x}
            y={lonePine.y}
            scale={lonePine.scale}
            tiers={lonePine.tiers}
            frame={0}
            phaseOffset={lonePine.phase}
            swayAmplitude={lonePine.sway}
          />
        </g>
      </svg>

      {/* LAYER 6: CANVAS 2D HUJAN SALJU KRISTAL (Zero React State Re-renders) */}
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
