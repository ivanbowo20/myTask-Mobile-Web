'use client';

import { useTheme } from '@/lib/theme-context';
import DarkChocolateBackground from './backgrounds/DarkChocolateBackground';
import CosmicGalaxyBackground from './backgrounds/CosmicGalaxyBackground';
import AbyssalTealBackground from './backgrounds/AbyssalTealBackground';
import CelestialSkyBackground from './backgrounds/CelestialSkyBackground';
import WinterFrostBackground from './backgrounds/WinterFrostBackground';
import { AnimatePresence, motion } from 'framer-motion';

export default function ThemeBackground() {
  const { theme, isMounted } = useTheme();
  const activeThemeId = theme || 'dark-chocolate';
  const usesAdaptiveScrim =
    activeThemeId !== 'celestial-sky' &&
    activeThemeId !== 'winter-frost' &&
    activeThemeId !== 'abyssal-teal' &&
    activeThemeId !== 'cosmic-galaxy';

  return (
    <div
      className="fixed inset-0 -z-10 pointer-events-none overflow-hidden bg-[var(--theme-base-bg)] isolate [transform:translate3d(0,0,0)]"
      aria-hidden="true"
    >
      {/* 0ms Instant CSS Poster/Gradient Backdrop (aktif sejak byte HTML pertama sebelum Canvas/WebGL jalan) */}
      <div
        className="theme-instant-backdrop absolute inset-0 pointer-events-none"
        aria-hidden="true"
      />

      {/* Dynamic Live Background Switcher (Canvas/WebGL/SVG aktif setelah client hydration) */}
      {isMounted && (
        <AnimatePresence initial={false}>
          <motion.div
            key={activeThemeId}
            initial={false}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0"
          >
            {activeThemeId === 'winter-frost' && <WinterFrostBackground />}
            {activeThemeId === 'celestial-sky' && <CelestialSkyBackground />}
            {activeThemeId === 'cosmic-galaxy' && <CosmicGalaxyBackground />}
            {activeThemeId === 'abyssal-teal' && <AbyssalTealBackground />}
            {activeThemeId === 'dark-chocolate' && <DarkChocolateBackground />}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Adaptive scrim mask: Dinonaktifkan pada celestial-sky, winter-frost, abyssal-teal & cosmic-galaxy agar visual alami & kontras teks terjaga */}
      <div
        className={`absolute inset-0 pointer-events-none transition-all duration-500 ${
          usesAdaptiveScrim
            ? 'bg-black/65 backdrop-blur-none sm:backdrop-blur-[2px]'
            : 'bg-transparent backdrop-blur-none'
        }`}
        aria-hidden="true"
      />

      {/* Subtle noise texture for frosted crystal refraction (Desktop only, hemat GPU HP) */}
      {isMounted && usesAdaptiveScrim && (
        <div
          className="hidden sm:block absolute inset-0 opacity-[0.025] mix-blend-overlay pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

