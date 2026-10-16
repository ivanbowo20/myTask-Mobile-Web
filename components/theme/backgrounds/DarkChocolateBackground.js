'use client';

export default function DarkChocolateBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
      {/* Base Espresso Obsidian Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0C0A09] via-[#140E0B] to-[#1C130D]" />

      {/* Floating Orb 1: Warm Amber Gold */}
      <div className="ambient-orb orb-amber" />

      {/* Floating Orb 2: Deep Rich Mocha */}
      <div className="ambient-orb orb-mocha" />

      {/* Floating Orb 3: Luminous Caramel Accent */}
      <div className="ambient-orb orb-caramel" />
    </div>
  );
}

