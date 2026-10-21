'use client';

import React from 'react';
import { CloudShader } from '@/components/ui/cloud-shader';

export default function CelestialSkyBackground({ children, className = '' }) {
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none select-none ${className}`}>
      {/* 
        WebGL Procedural Cloud Shader by Aceternity UI 
        Optimized for 60fps with mobile DPR-clamping and auto-pause on inactive tabs
      */}
      <div className="absolute inset-0 w-full h-full">
        <CloudShader
          className="w-full h-full min-h-full"
          speed={0.75}
          count={5}
          cloudColor="#FFFFFF"
          skyTopColor="#3172B8"
          skyBottomColor="#8CBEE8"
        />
      </div>

      {/* 
        Soft Ethereal Azure Vignette:
        Memberikan kontras alami di tepi layar dan menyatukan estetika iOS Weather
      */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 45%, transparent 60%, rgba(26, 75, 128, 0.15) 100%)',
        }}
        aria-hidden="true"
      />

      {/* 
        Mobile Atmospheric Soft Scrim:
        Meredam silau awan khusus di HP agar teks & kartu 100% terbaca tajam tanpa membebani GPU
      */}
      <div
        className="sm:hidden absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.22) 0%, rgba(224, 242, 254, 0.15) 50%, rgba(255, 255, 255, 0.30) 100%)',
        }}
        aria-hidden="true"
      />

      {children && (
        <div className="relative z-10 w-full h-full pointer-events-auto">
          {children}
        </div>
      )}
    </div>
  );
}
