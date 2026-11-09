'use client';

import React from 'react';
import AuroraCanvas from './aurora/AuroraCanvas';

export default function AbyssalTealBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#0B120E] select-none pointer-events-none">
      {/* High-res Arctic Aurora Poster image for instant 0ms visual before WebGL paints */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-700"
        style={{
          backgroundImage: `url('/backgrounds/emerald-aurora-poster.jpg')`,
        }}
        aria-hidden="true"
      />

      {/* Real-Time WebGL Shader Scene (Aurora + Mountains + Starlight + Fjord Water Reflections) */}
      <AuroraCanvas paused={false} />

      {/* Adaptive Scrim Dark Overlay (Ensures To-Do List Cards & Text have crisp > 7:1 contrast) */}
      <div
        className="absolute inset-0 bg-black/55 backdrop-blur-[0.5px] pointer-events-none"
        aria-hidden="true"
      />
    </div>
  );
}
