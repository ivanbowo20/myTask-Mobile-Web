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

      {/* Adaptive Scrim Gradient (Langit atas bening agar pendaran aurora bersinar terang; bagian bawah bertransisi lembut ke obsidian gelap agar kartu to-do tetap tajam & kontras > 7:1) */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/60 pointer-events-none"
        aria-hidden="true"
      />
    </div>
  );
}
