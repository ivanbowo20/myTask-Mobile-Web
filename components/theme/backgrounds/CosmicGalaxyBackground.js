'use client';

import React, { useCallback, useState } from 'react';
import CosmicGalaxyCanvas from './galaxy/CosmicGalaxyCanvas';

export default function CosmicGalaxyBackground() {
  const [webglFallback, setWebglFallback] = useState(false);

  const handleFallbackChange = useCallback((isFallback) => {
    setWebglFallback(isFallback);
  }, []);

  return (
    <div
      className="absolute inset-0 overflow-hidden bg-[#070810] select-none pointer-events-none"
      style={
        webglFallback
          ? {
              backgroundImage:
                'radial-gradient(ellipse at 54% 49%, rgba(242, 198, 134, 0.24) 0%, rgba(138, 117, 158, 0.10) 28%, transparent 56%), radial-gradient(ellipse at 8% 72%, rgba(28, 72, 210, 0.28) 0%, transparent 52%), radial-gradient(ellipse at 92% 45%, rgba(168, 108, 48, 0.20) 0%, transparent 45%), linear-gradient(135deg, #060C22 0%, #070810 52%, #110B0A 100%)',
            }
          : undefined
      }
    >
      {/* 100% Pure Procedural WebGL Shader Scene (Scrim WCAG AA terintegrasi di shader -> Zero Chrome Overdraw) */}
      <CosmicGalaxyCanvas paused={false} onFallbackChange={handleFallbackChange} />

      {/* Fallback Scrim CSS hanya dirender apabila WebGL tidak tersedia/context lost */}
      {webglFallback && (
        <div
          className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/20 to-black/48 pointer-events-none"
          aria-hidden="true"
        />
      )}
    </div>
  );
}
