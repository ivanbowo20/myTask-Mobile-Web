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
      if (document.hidden) {
        lastTime = now;
        rafId = requestAnimationFrame(tick);
        return;
      }

      const elapsed = now - lastTime;
      if (!isPaused) {
        const delta = elapsed / 1000;
        accumulatedTime += delta;
        lastTime = now;
        setStandaloneFrame(Math.floor(accumulatedTime * 60) % LOOP_FRAMES);
      } else {
        lastTime = now;
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
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
 * Komponen Puncak Gunung Salju Pixel Art (Stepped 16-bit Ridges)
 */
const PixelMountainPeak = React.memo(({
  centerX,
  baseY,
  peakWidth,
  peakHeight,
  pixelStep = 4,
  ridgeSeed = 1,
  layerType = 'main',
}) => {
  const steps = useMemo(() => {
    const halfW = peakWidth * 0.5;
    const numSteps = Math.max(12, Math.floor(peakHeight / pixelStep));
    const stepArr = [];

    const isFar = layerType === 'far';
    const mainFill = isFar
      ? PALETTE.mountainFarBase
      : PALETTE.mountainDarkSlate;
    const shadowFill = isFar
      ? PALETTE.mountainDarkSlate
      : PALETTE.mountainIceShadow;
    const snowMid = isFar
      ? PALETTE.mountainFarHighlight
      : PALETTE.mountainFrostMid;
    const snowCrest = isFar
      ? PALETTE.mountainFrostMid
      : PALETTE.mountainSnowCrisp;

    for (let i = 0; i < numSteps; i++) {
      const t = i / numSteps;
      const curY = baseY - peakHeight + i * pixelStep;
      const noiseL = (seededRandom(ridgeSeed + i * 1.7) - 0.5) * pixelStep * 1.6;
      const noiseR = (seededRandom(ridgeSeed + i * 2.3 + 50) - 0.5) * pixelStep * 1.6;

      const curHalfW = Math.max(
        pixelStep,
        Math.pow(t, 1.15) * halfW + (noiseL + noiseR) * 0.5
      );
      const ridgeOffset =
        (Math.sin(t * Math.PI * 1.5) * 0.22 +
          (seededRandom(ridgeSeed + i * 0.9) - 0.5) * 0.12) *
        curHalfW;

      stepArr.push({
        y: Math.round(curY),
        h: Math.round(pixelStep + 0.5),
        leftX: Math.round(centerX - curHalfW),
        rightX: Math.round(centerX + curHalfW),
        ridgeX: Math.round(centerX + ridgeOffset),
        snowCoverage: Math.max(0, 1 - t * 1.8),
        mainFill,
        shadowFill,
        snowMid,
        snowCrest,
      });
    }

    return stepArr;
  }, [centerX, baseY, peakWidth, peakHeight, pixelStep, ridgeSeed, layerType]);

  return (
    <g>
      {steps.map((s, idx) => {
        const leftWidth = Math.max(1, s.ridgeX - s.leftX);
        const rightWidth = Math.max(1, s.rightX - s.ridgeX);

        return (
          <g key={idx}>
            <rect
              x={s.leftX}
              y={s.y}
              width={leftWidth}
              height={s.h}
              fill={s.mainFill}
            />
            <rect
              x={s.ridgeX}
              y={s.y}
              width={rightWidth}
              height={s.h}
              fill={s.shadowFill}
            />

            {s.snowCoverage > 0.05 && (
              <>
                <rect
                  x={s.leftX}
                  y={s.y}
                  width={Math.round(leftWidth * s.snowCoverage)}
                  height={s.h}
                  fill={s.snowMid}
                />
                <rect
                  x={s.leftX}
                  y={s.y}
                  width={Math.max(
                    1,
                    Math.round(leftWidth * s.snowCoverage * 0.55)
                  )}
                  height={Math.max(1, Math.round(s.h * 0.7))}
                  fill={s.snowCrest}
                />
                <rect
                  x={s.ridgeX}
                  y={s.y}
                  width={Math.max(
                    1,
                    Math.round(rightWidth * s.snowCoverage * 0.35)
                  )}
                  height={s.h}
                  fill={s.snowMid}
                />
              </>
            )}
          </g>
        );
      })}
    </g>
  );
});

/**
 * Komponen Lereng Bukit Salju Glacial (Stepped Terraced Snow Slopes)
 */
const PixelSnowHillside = React.memo(({
  width,
  height,
  leftY,
  rightY,
  pixelStep = 6,
  fillColor,
  crestColor = null,
  curveWave = 0.012,
  seed = 1,
}) => {
  const terraces = useMemo(() => {
    const numCols = Math.ceil(width / pixelStep);
    const rects = [];

    for (let c = 0; c < numCols; c++) {
      const x = c * pixelStep;
      const progress = x / width;
      const baseY = leftY + (rightY - leftY) * progress;
      const wave =
        Math.sin(x * curveWave + seed * 2.1) * (pixelStep * 2.2) +
        Math.cos(x * curveWave * 0.5 + seed) * (pixelStep * 1.4);

      const surfaceY = Math.round((baseY + wave) / pixelStep) * pixelStep;
      const h = Math.max(0, height - surfaceY);

      rects.push({
        x,
        y: surfaceY,
        w: pixelStep + 0.5,
        h,
      });
    }

    return rects;
  }, [width, height, leftY, rightY, pixelStep, curveWave, seed]);

  return (
    <g>
      {terraces.map((t, idx) => (
        <g key={idx}>
          <rect x={t.x} y={t.y} width={t.w} height={t.h} fill={fillColor} />
          {crestColor && (
            <rect
              x={t.x}
              y={t.y}
              width={t.w}
              height={Math.max(1.5, Math.round(pixelStep * 0.35))}
              fill={crestColor}
            />
          )}
        </g>
      ))}
    </g>
  );
});

/**
 * Siluet Barisan Hutan Pinus Rendah di Kejauhan Kaki Gunung
 */
const DistantPixelTreeline = React.memo(({
  startX = 0,
  endX = 1920,
  baseY = 600,
  pixelSize = 4,
  seed = 42,
}) => {
  const trees = useMemo(() => {
    const result = [];
    const spacing = pixelSize * 2.4;
    const count = Math.ceil((endX - startX) / spacing);

    for (let i = 0; i < count; i++) {
      const x = startX + i * spacing;
      const rand = seededRandom(seed + i * 7.1);
      const treeH = Math.round((3 + rand * 4.5) * pixelSize);
      const topY = baseY - treeH;

      result.push({
        x: Math.round(x),
        topY: Math.round(topY),
        h: treeH,
        w: Math.round(pixelSize * 1.8),
        snowCapH: Math.max(1, Math.round(pixelSize * 0.8)),
      });
    }
    return result;
  }, [startX, endX, baseY, pixelSize, seed]);

  return (
    <g id="distant-pixel-pines">
      {trees.map((t, idx) => (
        <g key={idx}>
          <rect
            x={t.x}
            y={t.topY}
            width={t.w}
            height={t.h}
            fill={PALETTE.distantPine}
          />
          <rect
            x={t.x}
            y={t.topY}
            width={t.w}
            height={t.snowCapH}
            fill={PALETTE.mountainFrostMid}
            opacity={0.7}
          />
        </g>
      ))}
    </g>
  );
});

/**
 * Pohon Cemara Megah Tunggal di Ujung Kiri (Left-Anchored Lone Pine)
 * 100% Statis di layer terdepan midground sehingga kereta melintas di belakangnya.
 */
const PixelPineTree = React.memo(({
  x,
  topY,
  baseY,
  phaseOffset = 0,
  swayAmplitude = 1.4,
}) => {
  const tiers = 11;
  const targetFoliageHeight = Math.max(120, baseY - topY);
  const p = Math.max(2, targetFoliageHeight / (tiers * 3.15));
  const windSway = Math.sin(phaseOffset) * swayAmplitude * 0.4;

  const foliageBottomY = topY + tiers * 3.1 * p;
  const trunkWidth = Math.round(2.6 * p);
  const trunkTopY = Math.round(foliageBottomY - 2.5 * p);
  const trunkHeight = Math.round(Math.max(7 * p, baseY - trunkTopY + 5 * p));

  return (
    <g>
      {/* Batang Pohon Cemara */}
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

      {/* Gundukan Salju Akar Pohon */}
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

      {/* Susunan 11 Tingkat Dahan Cemara Ramping */}
      {Array.from({ length: tiers })
        .map((_, idx) => idx)
        .reverse()
        .map((tierIdx) => {
          const tierProgress = tierIdx / (tiers - 1);
          const swayFactor = Math.pow(1 - tierProgress * 0.82, 1.35);
          const tierShiftX = Math.round(windSway * swayFactor * p * 0.45);

          const tierY = Math.round(topY + tierIdx * 3.05 * p);
          const halfSpan = Math.round((1.4 + Math.pow(tierProgress, 0.92) * 8.2) * p);
          const upperSpan = Math.max(Math.round(p), Math.round(halfSpan * 0.62));
          const midSpan = Math.max(Math.round(1.5 * p), Math.round(halfSpan * 0.84));
          const stepH = Math.max(2, Math.round(1.05 * p));

          return (
            <g key={tierIdx} transform={`translate(${tierShiftX}, 0)`}>
              {/* 1. Bayangan Bawah Dahan */}
              <rect
                x={Math.round(x - halfSpan - p * 0.5)}
                y={tierY + stepH * 3}
                width={Math.round((halfSpan + p * 0.5) * 2)}
                height={Math.round(stepH * 1.35)}
                fill={PALETTE.pineShadow}
              />
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

              {/* 2. Dahan Dasar Hijau Es Sangat Gelap */}
              <rect
                x={Math.round(x - halfSpan)}
                y={tierY + stepH * 2}
                width={Math.round(halfSpan * 2)}
                height={Math.round(stepH * 1.2)}
                fill={PALETTE.pineBase}
              />

              {/* 3. Dahan Tengah Hijau Emerald Glacial */}
              <rect
                x={Math.round(x - midSpan)}
                y={tierY + stepH}
                width={Math.round(midSpan * 2)}
                height={stepH}
                fill={PALETTE.pineMid}
              />

              {/* 4. Lapisan Salju Tebal di Punggung Dahan */}
              <rect
                x={Math.round(x - upperSpan)}
                y={tierY}
                width={Math.round(upperSpan * 2)}
                height={stepH}
                fill={PALETTE.treeSnowShade}
              />
              <rect
                x={Math.round(x - upperSpan * 0.6)}
                y={tierY}
                width={Math.round(upperSpan * 1.2)}
                height={Math.max(1, Math.round(stepH * 0.6))}
                fill={PALETTE.treeSnowPure}
              />

              {/* Pucuk salju ekstra di ujung dahan */}
              <rect
                x={Math.round(x - halfSpan + p * 0.5)}
                y={tierY + stepH * 2}
                width={Math.round(1.5 * p)}
                height={Math.max(1, Math.round(stepH * 0.65))}
                fill={PALETTE.treeSnowShade}
              />
              <rect
                x={Math.round(x + halfSpan - 2 * p)}
                y={tierY + stepH * 2}
                width={Math.round(1.5 * p)}
                height={Math.max(1, Math.round(stepH * 0.65))}
                fill={PALETTE.treeSnowShade}
              />
            </g>
          );
        })}
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
 * Layer Tanggul Salju & Rel Kereta Pixel Statis (React.memo)
 */
const SubtlePixelRailwayTrack = React.memo(function SubtlePixelRailwayTrack({
  width,
  baseY,
  p,
}) {
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

  return (
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
  );
});

/**
 * ============================================================================
 * HIGH-PERFORMANCE CANVAS 2D DIRECT RENDER ENGINES (0% REACT VDOM OVERHEAD)
 * ============================================================================
 */

/**
 * Render Awan Glacial Pixel Art di Canvas 2D
 */
function drawPixelClouds(ctx, { width, height, isMobile, timeSec, pixelUnit }) {
  const cloudCount = isMobile ? 4 : 6;
  const wrapWidth = width + 320;
  ctx.save();
  ctx.globalAlpha = 0.48;

  for (let i = 0; i < cloudCount; i++) {
    const cBaseX = i / cloudCount;
    const cY = isMobile
      ? height * (0.07 + (i % 3) * 0.07)
      : height * (0.08 + (i % 3) * 0.08);
    const scale = isMobile ? (width / 1080) * 1.35 : (width / 1920) * 1.7;
    const variant = i % 2;
    const u = Math.max(3, Math.round(6 * scale));

    const cloudLoopTime = 120;
    const cloudProgress = (timeSec / cloudLoopTime) % 1;
    const currentX = ((cBaseX + cloudProgress) % 1) * wrapWidth - 160;
    const roundedX = Math.round(currentX / pixelUnit) * pixelUnit;

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
            { dx: 0, dy: 2, w: 10, h: 2, c: PALETTE.cloudBase },
          ];

    for (let b = 0; b < blocks.length; b++) {
      const block = blocks[b];
      ctx.fillStyle = block.c;
      ctx.fillRect(
        Math.round(roundedX + block.dx * u),
        Math.round(cY + block.dy * u),
        Math.round(block.w * u),
        Math.round(block.h * u)
      );
    }
  }
  ctx.restore();
}

/**
 * Render Kereta Api Uap 16-Bit & Kepulan Asap Uap Sinusoidal di Canvas 2D
 */
function drawPixelTrain(ctx, { width, baseY, isMobile, timeSec, p }) {
  const crossingSeconds = isMobile ? 14.5 : 15.5;
  const loopSeconds = 30;
  const timeInLoop = ((timeSec % loopSeconds) + loopSeconds) % loopSeconds;
  if (timeInLoop > crossingSeconds) return;

  const progress = timeInLoop / crossingSeconds;
  const startX = isMobile ? -310 : -340;
  const endX = isMobile ? width + 110 : width + 210;
  const trainX = startX + progress * (endX - startX);

  const carriages = [0, 1, 2, 3];
  const carriageWidth = Math.round(14 * p);
  const carriageGap = Math.round(2.6 * p);
  const locoX = trainX + carriages.length * (carriageWidth + carriageGap);
  const chimneyX = locoX + Math.round(10 * p);
  const chimneyTopY = baseY - Math.round(7 * p);

  // 1. Empat Gerbong Penumpang Berlampu Emas Hangat
  for (let cIdx = 0; cIdx < carriages.length; cIdx++) {
    const cx = trainX + cIdx * (carriageWidth + carriageGap);

    // Coupler
    ctx.fillStyle = PALETTE.trainRoofSlate;
    ctx.fillRect(cx + carriageWidth, baseY - Math.round(2.1 * p), carriageGap, Math.round(p));

    // Roof top
    ctx.fillRect(cx + Math.round(p), baseY - Math.round(5.8 * p), carriageWidth - Math.round(2 * p), Math.round(1.1 * p));
    ctx.fillStyle = PALETTE.mountainFrostMid;
    ctx.globalAlpha = 0.58;
    ctx.fillRect(cx + Math.round(2 * p), baseY - Math.round(6.1 * p), carriageWidth - Math.round(4 * p), Math.max(1, Math.round(0.38 * p)));
    ctx.globalAlpha = 1.0;

    // Body
    ctx.fillStyle = PALETTE.trainBodyDark;
    ctx.fillRect(cx, baseY - Math.round(4.7 * p), carriageWidth, Math.round(3.7 * p));

    // Wheels
    ctx.fillStyle = PALETTE.trainWheelSteel;
    ctx.fillRect(cx + Math.round(1.6 * p), baseY - Math.round(1.05 * p), Math.round(3.1 * p), Math.round(1.15 * p));
    ctx.fillRect(cx + carriageWidth - Math.round(4.7 * p), baseY - Math.round(1.05 * p), Math.round(3.1 * p), Math.round(1.15 * p));

    // Ambient glow badan gerbong
    ctx.fillStyle = PALETTE.trainWindowBright;
    ctx.globalAlpha = 0.18;
    ctx.fillRect(cx + Math.round(1.1 * p), baseY - Math.round(4.4 * p), carriageWidth - Math.round(2.2 * p), Math.round(2.7 * p));
    ctx.fillRect(cx + Math.round(1.6 * p), baseY + Math.round(0.25 * p), carriageWidth - Math.round(3.2 * p), Math.round(1.1 * p));
    ctx.globalAlpha = 1.0;

    // 4 Jendela Kuning Emas Cerah (#FEF08A)
    for (let wIdx = 0; wIdx < 4; wIdx++) {
      const wx = cx + Math.round((1.9 + wIdx * 2.85) * p);
      const wy = baseY - Math.round(3.8 * p);
      const ww = Math.round(1.9 * p);
      const wh = Math.round(1.8 * p);

      ctx.fillStyle = 'rgba(254, 240, 138, 0.38)';
      ctx.fillRect(wx - 1, wy - 1, ww + 2, wh + 2);
      ctx.fillStyle = PALETTE.trainWindowBright;
      ctx.fillRect(wx, wy, ww, wh);
    }
  }

  // 2. Lokomotif Uap (Steam Locomotive)
  ctx.fillStyle = PALETTE.trainRoofSlate;
  ctx.fillRect(locoX - Math.round(0.5 * p), baseY - Math.round(6.2 * p), Math.round(5.8 * p), Math.round(p));
  ctx.fillStyle = PALETTE.trainBodyDark;
  ctx.fillRect(locoX, baseY - Math.round(5.2 * p), Math.round(5.2 * p), Math.round(4.2 * p));

  // Cab window halo & core
  ctx.fillStyle = 'rgba(254, 240, 138, 0.38)';
  ctx.fillRect(locoX + Math.round(1.1 * p) - 1, baseY - Math.round(4.35 * p) - 1, Math.round(2.4 * p) + 2, Math.round(1.85 * p) + 2);
  ctx.fillStyle = PALETTE.trainWindowBright;
  ctx.fillRect(locoX + Math.round(1.3 * p), baseY - Math.round(4.3 * p), Math.round(2.3 * p), Math.round(1.8 * p));

  // Boiler & boiler roof
  ctx.fillStyle = PALETTE.trainBodyDark;
  ctx.fillRect(locoX + Math.round(5.2 * p), baseY - Math.round(4.4 * p), Math.round(8.8 * p), Math.round(3.4 * p));
  ctx.fillStyle = PALETTE.trainRoofSlate;
  ctx.fillRect(locoX + Math.round(5.2 * p), baseY - Math.round(4.8 * p), Math.round(7.8 * p), Math.round(0.75 * p));

  // Chimney & cap
  ctx.fillStyle = PALETTE.trainBodyDark;
  ctx.fillRect(chimneyX, chimneyTopY, Math.round(2.1 * p), Math.round(2.9 * p));
  ctx.fillStyle = PALETTE.trainRoofSlate;
  ctx.fillRect(chimneyX - Math.round(0.4 * p), chimneyTopY, Math.round(2.9 * p), Math.round(0.85 * p));

  // Cowcatcher
  ctx.fillRect(locoX + Math.round(14 * p), baseY - Math.round(2.3 * p), Math.round(1.6 * p), Math.round(1.3 * p));

  // Wheels
  ctx.fillStyle = PALETTE.trainWheelSteel;
  ctx.fillRect(locoX + Math.round(1.4 * p), baseY - Math.round(1.05 * p), Math.round(3.3 * p), Math.round(1.15 * p));
  ctx.fillRect(locoX + Math.round(6 * p), baseY - Math.round(1.05 * p), Math.round(3.3 * p), Math.round(1.15 * p));
  ctx.fillRect(locoX + Math.round(10.4 * p), baseY - Math.round(1.05 * p), Math.round(2.5 * p), Math.round(1.15 * p));

  // Headlight core & forward glow beam
  ctx.fillStyle = 'rgba(254, 240, 138, 0.38)';
  ctx.fillRect(locoX + Math.round(14 * p) - 1, baseY - Math.round(4 * p) - 1, Math.round(1.35 * p) + 2, Math.round(1.35 * p) + 2);
  ctx.fillStyle = PALETTE.trainWindowBright;
  ctx.fillRect(locoX + Math.round(14 * p), baseY - Math.round(4 * p), Math.round(1.35 * p), Math.round(1.35 * p));
  ctx.globalAlpha = 0.25;
  ctx.fillRect(locoX + Math.round(15.35 * p), baseY - Math.round(4.5 * p), Math.round(5.4 * p), Math.round(2.4 * p));
  ctx.globalAlpha = 1.0;

  // 3. Kepulan Uap Asap (Steam Puffs) Sinusoidal Murni
  const steamCount = isMobile ? 5 : 10;
  const cycleLen = 1.45;
  for (let idx = 0; idx < steamCount; idx++) {
    const rawProgress = ((timeSec + idx * (cycleLen / steamCount)) % cycleLen) / cycleLen;
    const waveX = Math.sin(rawProgress * Math.PI * 2 + idx * 0.7) * 0.65 * p;
    const puffDriftX = -rawProgress * 23 * p - idx * 0.45 * p + waveX;
    const puffRiseY = -Math.pow(rawProgress, 0.88) * 10.5 * p - Math.sin(rawProgress * Math.PI) * 1.4 * p;

    let puffSize = p * 1.25;
    if (rawProgress < 0.28) puffSize = p * 1.25 + (rawProgress / 0.28) * (p * 2.1 - p * 1.25);
    else if (rawProgress < 0.75) puffSize = p * 2.1 + ((rawProgress - 0.28) / 0.47) * (p * 2.55 - p * 2.1);
    else puffSize = p * 2.55 + ((rawProgress - 0.75) / 0.25) * (p * 1.45 - p * 2.55);

    let puffOpacity = 0;
    if (rawProgress < 0.1) puffOpacity = (rawProgress / 0.1) * 0.66;
    else if (rawProgress < 0.35) puffOpacity = 0.66 - ((rawProgress - 0.1) / 0.25) * (0.66 - 0.54);
    else if (rawProgress < 0.72) puffOpacity = 0.54 - ((rawProgress - 0.35) / 0.37) * (0.54 - 0.28);
    else puffOpacity = 0.28 - ((rawProgress - 0.72) / 0.28) * 0.28;

    if (puffOpacity > 0.02) {
      const px = chimneyX + Math.round(puffDriftX);
      const py = chimneyTopY - Math.round(1.1 * p) + Math.round(puffRiseY);
      const s = Math.max(2, Math.round(puffSize));
      const sub = Math.max(2, Math.round(s * 0.68));

      ctx.save();
      ctx.globalAlpha = Math.min(1, Math.max(0, puffOpacity));
      ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
      ctx.fillRect(px, py, s, s);
      ctx.fillStyle = 'rgba(241, 245, 249, 0.75)';
      ctx.fillRect(px - Math.round(sub * 0.62), py + Math.round(sub * 0.22), sub, sub);
      ctx.fillStyle = 'rgba(226, 232, 240, 0.7)';
      ctx.fillRect(px + Math.round(s * 0.24), py - Math.round(sub * 0.55), sub, sub);
      ctx.restore();
    }
  }
}

/**
 * ============================================================================
 * KOMPONEN UTAMA: WinterFrostBackground
 * - Zero React State Re-render Loop (0% Virtual DOM Diffing di Main Thread).
 * - Imunitas penuh terhadap fluktuasi URL address bar browser mobile saat scroll.
 * - Locked 60 FPS Canvas 2D engine untuk kereta uap 16-bit, awan, dan 55 salju.
 * ============================================================================
 */
export default function WinterFrostBackground({ children, className = '' }) {
  const midgroundCanvasRef = useRef(null);
  const snowCanvasRef = useRef(null);

  const lastWidthRef = useRef(typeof window !== 'undefined' ? window.innerWidth : 1920);
  const lastHeightRef = useRef(typeof window !== 'undefined' ? window.innerHeight : 1080);

  const [dimensions, setDimensions] = useState(() => {
    if (typeof window === 'undefined') return { width: 1920, height: 1080 };
    const w = window.innerWidth || 1920;
    const isMob = w < 768;
    const h = isMob && window.screen?.availHeight ? window.screen.availHeight : window.innerHeight || 1080;
    return { width: w, height: h };
  });

  const { width, height } = dimensions;
  const isMobile = height > width || width < 768;
  const pixelUnit = isMobile
    ? Math.max(3, Math.round(width / 180))
    : Math.max(4, Math.round(width / 320));

  const horizonY = isMobile ? height * 0.56 : height * 0.68;
  const trainTrackY = (isMobile ? horizonY + height * 0.036 : horizonY + height * 0.028) + 6;
  const trainP = isMobile ? 3.25 : 3.1;

  // Imunitas terhadap URL Address Bar Mobile Resize:
  // Hanya picu re-layout jika lebar berubah (rotasi layar) atau perubahan tinggi dramatis (> 120px)
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleResize = () => {
      const newW = window.innerWidth;
      const newH = window.innerHeight;
      const isMob = newW < 768;

      if (isMob && newW === lastWidthRef.current && Math.abs(newH - lastHeightRef.current) < 120) {
        return;
      }

      lastWidthRef.current = newW;
      lastHeightRef.current = newH;
      setDimensions({
        width: newW,
        height: isMob && window.screen?.availHeight ? window.screen.availHeight : newH,
      });
    };

    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  /**
   * 1. KONFIGURASI PEGUNUNGAN ES STATIS (Renders Once)
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
   * 2. SATU POHON CEMARA MEGAH DI UJUNG KIRI (Renders Once)
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
   * 3. UNIFIED HIGH-PERFORMANCE CANVAS 2D RENDER LOOP
   * Menjalankan rendering Awan, Kereta Api, dan 55 Partikel Salju Alami
   * dalam 1 requestAnimationFrame murni tanpa React state re-render loop.
   */
  useEffect(() => {
    const midCanvas = midgroundCanvasRef.current;
    const snowCanvas = snowCanvasRef.current;
    if (!midCanvas || !snowCanvas) return undefined;

    const midCtx = midCanvas.getContext('2d');
    const snowCtx = snowCanvas.getContext('2d');
    if (!midCtx || !snowCtx) return undefined;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const isMobileDevice = typeof window !== 'undefined' ? window.innerWidth < 768 : false;
    const count = isMobileDevice ? 55 : 135;

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

    // Auto-pause rendering saat modal tambah/edit tugas terbuka
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

    function render(now) {
      if (document.hidden || isModalOpen) {
        lastTime = now;
        rafId = requestAnimationFrame(render);
        return;
      }

      const elapsed = now - lastTime;
      const deltaSeconds = Math.min(elapsed / 1000, 0.1);
      lastTime = now;
      const timeSec = now / 1000;

      // 1. Render Midground (Awan Glacial, Kabut Lembah, dan Kereta Api Uap)
      midCtx.clearRect(0, 0, width, height);

      // Awan Pixel Art Melayang
      drawPixelClouds(midCtx, { width, height, isMobile, timeSec, pixelUnit });

      // Kabut Lembah Es Halus
      const mistOpacity = 0.14 + (Math.sin(timeSec * 0.4) + 1) * 0.5 * 0.08;
      midCtx.fillStyle = PALETTE.mountainIceShadow;
      midCtx.globalAlpha = mistOpacity;
      midCtx.fillRect(0, horizonY - height * 0.03, width, height * 0.05);
      midCtx.globalAlpha = 1.0;

      // Kereta Api Uap 16-Bit & Partikel Asap Uap Sinusoidal
      drawPixelTrain(midCtx, { width, baseY: trainTrackY, isMobile, timeSec, p: trainP });

      // 2. Render Foreground (55 Kristal Salju Alami - Zero Judder Pacing)
      snowCtx.clearRect(0, 0, width, height);
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

        snowCtx.fillStyle = `rgba(248, 250, 252, ${flake.opacity})`;
        if (flake.isCrossFlake) {
          snowCtx.fillRect(currentX - s * 0.5, flake.y - s * 1.5, s, s * 3);
          snowCtx.fillRect(currentX - s * 1.5, flake.y - s * 0.5, s * 3, s);
        } else {
          snowCtx.fillRect(currentX, flake.y, s, s);
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
  }, [width, height, pixelUnit, horizonY, trainTrackY, trainP, isMobile]);

  return (
    <AbsoluteFill
      className={className}
      style={{
        background: `linear-gradient(180deg, ${PALETTE.skyTop} 0%, ${PALETTE.skyUpperMid} 38%, ${PALETTE.skyLowerMid} 72%, ${PALETTE.skyBottom} 100%)`,
        overflow: 'hidden',
      }}
    >
      {/* =================================================================
          LAYER 1: PEMANDANGAN STATIS LATAR BELAKANG (0% React Diffing)
          Langit, Pegunungan Es, Barisan Pinus Kejauhan, Bukit Salju, dan Rel
      ================================================================== */}
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        shapeRendering="crispEdges"
        className="absolute inset-0 w-full h-full block pointer-events-none"
        style={{
          imageRendering: 'pixelated',
        }}
      >
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

        <FrostedSlateMountainsLayer mountains={mountains} pixelUnit={pixelUnit} />

        <DistantPixelTreeline
          startX={0}
          endX={width}
          baseY={horizonY + height * 0.015}
          pixelSize={pixelUnit * 1.15}
          seed={42}
        />

        <DimIceBlueSnowfieldsLayer
          width={width}
          height={height}
          horizonY={horizonY}
          pixelUnit={pixelUnit}
          isMobile={isMobile}
        />

        <SubtlePixelRailwayTrack
          width={width}
          baseY={trainTrackY}
          p={trainP}
        />
      </svg>

      {/* =================================================================
          LAYER 2: CANVAS 2D MIDGROUND (0% React Diffing)
          Awan Glacial Melayang, Kabut Lembah, dan Kereta Api Uap 16-Bit
      ================================================================== */}
      <canvas
        ref={midgroundCanvasRef}
        width={width}
        height={height}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{
          imageRendering: 'pixelated',
        }}
      />

      {/* =================================================================
          LAYER 3: POHON CEMARA MEGAH KIRI (0% React Diffing, Depan Kereta)
          Kereta melintas di belakang dahan cemara megah ini.
      ================================================================== */}
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        shapeRendering="crispEdges"
        className="absolute inset-0 w-full h-full block pointer-events-none"
        style={{
          imageRendering: 'pixelated',
        }}
      >
        <g id="left-anchored-lone-pine">
          <PixelPineTree
            x={lonePine.x}
            topY={lonePine.topY}
            baseY={lonePine.baseY}
            phaseOffset={lonePine.phase}
            swayAmplitude={lonePine.sway}
          />
        </g>
      </svg>

      {/* =================================================================
          LAYER 4: CANVAS 2D FOREGROUND (0% React Diffing)
          55 Kristal Salju Alami Mengalir Bebas di Layar HP & Desktop
      ================================================================== */}
      <canvas
        ref={snowCanvasRef}
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
