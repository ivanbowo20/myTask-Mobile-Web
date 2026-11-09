'use client';

import React, { useEffect, useRef, useState } from 'react';
import { FRAG, VERT } from './shader';

const LOOP_SECONDS = 40;
const TWO_PI = 2 * Math.PI;
const SPEED = TWO_PI / LOOP_SECONDS;

function compile(gl, type, src) {
  const s = gl.createShader(type);
  if (!s) throw new Error('Failed to create shader');
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(s) || 'shader error';
    gl.deleteShader(s);
    throw new Error(info);
  }
  return s;
}

export default function AuroraCanvas({ paused = false }) {
  const ref = useRef(null);
  const pausedRef = useRef(paused);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return undefined;

    const gl = canvas.getContext('webgl', {
      antialias: false,
      powerPreference: 'high-performance',
      depth: false,
      stencil: false,
      alpha: false,
      preserveDrawingBuffer: false,
    });

    if (!gl) {
      setFailed(true);
      return undefined;
    }

    let prog;
    let vertShader;
    let fragShader;
    let buf;

    try {
      prog = gl.createProgram();
      if (!prog) throw new Error('Failed to create program');

      vertShader = compile(gl, gl.VERTEX_SHADER, VERT);
      fragShader = compile(gl, gl.FRAGMENT_SHADER, FRAG);

      gl.attachShader(prog, vertShader);
      gl.attachShader(prog, fragShader);
      gl.linkProgram(prog);

      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(prog) || 'Link failed');
      }
    } catch (e) {
      console.warn('Aurora WebGL compilation warning:', e);
      setFailed(true);
      return undefined;
    }

    gl.useProgram(prog);

    buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW
    );

    const loc = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, 'uRes');
    const uP = gl.getUniformLocation(prog, 'uP');
    const uF = gl.getUniformLocation(prog, 'uF');

    let lastW = 0;
    let lastH = 0;

    const resize = () => {
      if (!canvas) return;
      const isMob = typeof window !== 'undefined' && (window.innerWidth < 768 || 'ontouchstart' in window);
      // DPR 0.65 di mobile (<768px) untuk menghemat fill-rate GPU low-end (Infinix Smart 6 / PowerVR), 1.25 di Desktop
      const dpr = isMob ? 0.65 : Math.min(window.devicePixelRatio || 1, 1.25);
      const w = Math.max(2, Math.floor(canvas.clientWidth * dpr));
      const h = Math.max(2, Math.floor(canvas.clientHeight * dpr));

      // Imunitas terhadap dynamic address bar mobile:
      // Hanya re-allocate buffer WebGL jika lebar berubah (rotasi layar) atau tinggi berubah signifikan (> 120px)
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
      }
    };

    resize();
    window.addEventListener('resize', resize, { passive: true });

    let phase = 0;
    let last = performance.now();
    let raf = 0;
    let isTabHidden = false;

    const draw = (p, f) => {
      gl.uniform1f(uP, p);
      gl.uniform1f(uF, f);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    draw(0, 0);

    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      if (isTabHidden || pausedRef.current) return;

      const delta = Math.min((now - last) / 1000, 0.1);
      last = now;

      phase = (phase + delta * SPEED) % TWO_PI;
      const grainSeed = (now * 0.05) % 97;

      draw(phase, grainSeed);
    };

    raf = requestAnimationFrame(tick);

    // Battery saver: pause when tab hidden
    const onVisibilityChange = () => {
      isTabHidden = document.hidden;
      if (!isTabHidden) {
        last = performance.now();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibilityChange);

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

  return (
    <>
      <canvas
        ref={ref}
        className="absolute inset-0 h-full w-full pointer-events-none select-none"
        aria-hidden="true"
      />
      {failed && (
        <div
          className="absolute inset-0 bg-cover bg-center pointer-events-none"
          style={{
            backgroundImage: `url('/backgrounds/emerald-aurora-poster.jpg')`,
          }}
          aria-hidden="true"
        />
      )}
    </>
  );
}
