'use client';

import React, { useEffect, useRef, useState } from 'react';
import { GALAXY_FRAG, GALAXY_VERT } from './galaxyShader';

function compileShader(gl, type, src) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Failed to create WebGL shader');
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader) || 'Shader compilation error';
    gl.deleteShader(shader);
    throw new Error(info);
  }
  return shader;
}

function detectMobileViewport() {
  return (
    typeof window !== 'undefined' &&
    (window.innerWidth < 768 || 'ontouchstart' in window)
  );
}

function detectLowEndDevice() {
  if (typeof navigator === 'undefined') return false;
  const mem = typeof navigator.deviceMemory === 'number' ? navigator.deviceMemory : 4;
  const cores = typeof navigator.hardwareConcurrency === 'number' ? navigator.hardwareConcurrency : 4;
  return mem <= 3 || cores <= 4;
}

export default function CosmicGalaxyCanvas({ paused = false, onFallbackChange }) {
  const canvasRef = useRef(null);
  const pausedRef = useRef(paused);
  const onFallbackRef = useRef(onFallbackChange);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    onFallbackRef.current = onFallbackChange;
  }, [onFallbackChange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let isMobile = detectMobileViewport();
    const isLowEnd = detectLowEndDevice();

    // Gunakan low-power di mobile / perangkat low-end (Infinix Smart 6 / PowerVR GE8322) agar suhu dingin & hemat baterai
    const gl = canvas.getContext('webgl', {
      antialias: false,
      powerPreference: isMobile || isLowEnd ? 'low-power' : 'high-performance',
      depth: false,
      stencil: false,
      alpha: false,
      preserveDrawingBuffer: false,
    });

    if (!gl) {
      setFailed(true);
      if (onFallbackRef.current) onFallbackRef.current(true);
      return undefined;
    }

    let prog = null;
    let vertShader = null;
    let fragShader = null;
    let buf = null;
    let rafId = 0;
    let scrollTimer = null;
    let isDisposed = false;
    let isTabHidden = typeof document !== 'undefined' ? document.hidden : false;
    let isScrolling = false;

    try {
      prog = gl.createProgram();
      if (!prog) throw new Error('Failed to create WebGL program');

      vertShader = compileShader(gl, gl.VERTEX_SHADER, GALAXY_VERT);
      fragShader = compileShader(gl, gl.FRAGMENT_SHADER, GALAXY_FRAG);

      gl.attachShader(prog, vertShader);
      gl.attachShader(prog, fragShader);
      gl.linkProgram(prog);

      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(prog) || 'WebGL link failed');
      }
    } catch (err) {
      console.warn('Cosmic Galaxy procedural WebGL fallback:', err);
      setFailed(true);
      if (onFallbackRef.current) onFallbackRef.current(true);
      return undefined;
    }

    if (onFallbackRef.current) onFallbackRef.current(false);

    gl.useProgram(prog);

    buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW
    );

    const posLoc = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, 'uRes');
    const uTime = gl.getUniformLocation(prog, 'uTime');
    const uF = gl.getUniformLocation(prog, 'uF');
    const uMobile = gl.getUniformLocation(prog, 'uMobile');

    let lastW = 0;
    let lastH = 0;
    let elapsed = 4.2; // Start with spiral arms cleanly framed immediately
    let lastFrameTime = performance.now();

    // Adaptive auto-throttle state (pure JS, zero React state churn)
    // Mobile base: 42ms (~24 FPS sinematik), auto-throttle hingga 56ms (~18 FPS) jika GPU terbebani
    let adaptiveDelta = isMobile ? 42 : 22;
    let slowFrameStreak = 0;
    let fastFrameStreak = 0;

    const drawFrame = (t, grainSeed) => {
      if (isDisposed) return;
      gl.uniform1f(uTime, t);
      gl.uniform1f(uF, grainSeed);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const resize = () => {
      if (!canvas || isDisposed) return;
      isMobile = detectMobileViewport();
      adaptiveDelta = isMobile ? Math.max(adaptiveDelta, 42) : 22;

      // DPR 0.65 di mobile untuk menjaga PowerVR GE8322 tetap tajam & 60 FPS scroll, 1.25 di Desktop
      const dpr = isMobile ? 0.65 : Math.min(window.devicePixelRatio || 1, 1.25);
      const w = Math.max(2, Math.floor(canvas.clientWidth * dpr));
      const h = Math.max(2, Math.floor(canvas.clientHeight * dpr));

      // Sinkronisasi uniform uMobile setiap evaluasi viewport
      if (uMobile !== null) {
        gl.uniform1f(uMobile, isMobile ? 1.0 : 0.0);
      }

      // Imunitas terhadap dynamic address bar mobile
      const dw = Math.abs(w - lastW);
      const dh = Math.abs(h - lastH);
      if (lastW === 0 || dw > 4 || dh > 120) {
        lastW = w;
        lastH = h;
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
        }
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.uniform2f(uRes, canvas.width, canvas.height);
        drawFrame(elapsed, 0);
      }
    };

    const tick = (now) => {
      if (isDisposed || prefersReducedMotion) return;

      // Auto-pause 100% saat pengguna aktif menggulir layar sentuh di HP
      if (isScrolling && isMobile) {
        rafId = 0;
        return;
      }

      rafId = requestAnimationFrame(tick);

      if (isTabHidden || pausedRef.current) {
        lastFrameTime = now;
        return;
      }

      const rawDelta = now - lastFrameTime;
      const targetDelta = isMobile ? adaptiveDelta : 22;
      if (rawDelta < targetDelta) return;

      const deltaSec = Math.min(rawDelta / 1000, 0.1);
      lastFrameTime = now;
      elapsed += deltaSec;

      const grainSeed = (now * 0.05) % 97;
      const drawStart = performance.now();
      drawFrame(elapsed, grainSeed);
      const drawCost = performance.now() - drawStart;

      // Auto-throttle ringan di HP low-end bila waktu render/jitter frame meningkat
      if (isMobile) {
        const isSluggish = drawCost > 14 || rawDelta > targetDelta + 26;
        if (isSluggish) {
          slowFrameStreak += 1;
          fastFrameStreak = 0;
          if (slowFrameStreak >= 4 && adaptiveDelta < 56) {
            adaptiveDelta = Math.min(56, adaptiveDelta + 4);
            slowFrameStreak = 0;
          }
        } else {
          fastFrameStreak += 1;
          slowFrameStreak = 0;
          if (fastFrameStreak >= 20 && adaptiveDelta > 42) {
            adaptiveDelta = Math.max(42, adaptiveDelta - 2);
            fastFrameStreak = 0;
          }
        }
      }
    };

    const resumeLoop = () => {
      if (isDisposed || prefersReducedMotion || isTabHidden) return;
      if (!rafId) {
        lastFrameTime = performance.now();
        rafId = requestAnimationFrame(tick);
      }
    };

    // Tangkap nested scroll (<main overflow-y-auto>, modal, & window) via capture phase + touchmove pasif
    const onScrollInteraction = () => {
      if (!isMobile) return;
      isScrolling = true;
      if (scrollTimer) clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        isScrolling = false;
        resumeLoop();
      }, 160);
    };

    const onVisibilityChange = () => {
      isTabHidden = document.hidden;
      if (!isTabHidden) {
        lastFrameTime = performance.now();
        resumeLoop();
      }
    };

    const onContextLost = (e) => {
      e.preventDefault();
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
      setFailed(true);
      if (onFallbackRef.current) onFallbackRef.current(true);
    };

    resize();
    window.addEventListener('resize', resize, { passive: true });
    document.addEventListener('scroll', onScrollInteraction, { passive: true, capture: true });
    window.addEventListener('touchmove', onScrollInteraction, { passive: true });
    document.addEventListener('visibilitychange', onVisibilityChange);
    canvas.addEventListener('webglcontextlost', onContextLost, false);

    // Instant first frame (0ms network wait — 100% procedural math!)
    drawFrame(elapsed, 0);

    if (!prefersReducedMotion) {
      lastFrameTime = performance.now();
      rafId = requestAnimationFrame(tick);
    }

    return () => {
      isDisposed = true;
      if (rafId) cancelAnimationFrame(rafId);
      if (scrollTimer) clearTimeout(scrollTimer);

      window.removeEventListener('resize', resize);
      document.removeEventListener('scroll', onScrollInteraction, true);
      window.removeEventListener('touchmove', onScrollInteraction);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      canvas.removeEventListener('webglcontextlost', onContextLost);

      if (gl) {
        if (buf) gl.deleteBuffer(buf);
        if (prog) {
          if (vertShader) {
            gl.detachShader(prog, vertShader);
            gl.deleteShader(vertShader);
          }
          if (fragShader) {
            gl.detachShader(prog, fragShader);
            gl.deleteShader(fragShader);
          }
          gl.deleteProgram(prog);
        }
      }
    };
  }, []);

  if (failed) return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full pointer-events-none select-none"
      aria-hidden="true"
    />
  );
}
