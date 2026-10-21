'use client';

import { useTheme } from '@/lib/theme-context';
import DarkChocolateBackground from './backgrounds/DarkChocolateBackground';
import SoftAuroraBackground from './backgrounds/SoftAuroraBackground';
import AbyssalTealBackground from './backgrounds/AbyssalTealBackground';
import CelestialSkyBackground from './backgrounds/CelestialSkyBackground';
import { AnimatePresence, motion } from 'framer-motion';

export default function ThemeBackground() {
  const { theme, isMounted } = useTheme();

  // Hold canvas mounting until mounted to prevent initial flash & unnecessary canvas creation
  if (!isMounted) {
    return (
      <div
        className="fixed inset-0 -z-10 pointer-events-none overflow-hidden bg-[var(--theme-base-bg,#0C0A09)]"
        aria-hidden="true"
      />
    );
  }

  const activeThemeId = theme || 'dark-chocolate';

  return (
    <div
      className="fixed inset-0 -z-10 pointer-events-none overflow-hidden bg-[var(--theme-base-bg,#0C0A09)] isolate [transform:translate3d(0,0,0)]"
      aria-hidden="true"
    >
      {/* Dynamic Background Switcher with Fluid Simultaneous Cross-fade */}
      <AnimatePresence initial={false}>
        <motion.div
          key={activeThemeId}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0"
        >
          {activeThemeId === 'celestial-sky' && <CelestialSkyBackground />}
          {activeThemeId === 'soft-aurora' && <SoftAuroraBackground />}
          {activeThemeId === 'abyssal-teal' && <AbyssalTealBackground />}
          {activeThemeId === 'dark-chocolate' && <DarkChocolateBackground />}
        </motion.div>
      </AnimatePresence>

      {/* Adaptive scrim mask: Dinonaktifkan pada celestial-sky agar langit biru cerah alami & kontras teks terjaga */}
      <div
        className={`absolute inset-0 pointer-events-none transition-all duration-500 ${
          activeThemeId === 'celestial-sky'
            ? 'bg-transparent backdrop-blur-none'
            : activeThemeId === 'abyssal-teal'
            ? 'bg-black/55 backdrop-blur-none sm:backdrop-blur-[1.5px]'
            : 'bg-black/65 backdrop-blur-none sm:backdrop-blur-[2px]'
        }`}
        aria-hidden="true"
      />

      {/* Subtle noise texture for frosted crystal refraction (Desktop only, hemat GPU HP) */}
      {activeThemeId !== 'celestial-sky' && (
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

