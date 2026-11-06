'use client';

import { useSyncExternalStore } from 'react';

/**
 * Hook pendeteksi lingkungan desktop untuk animasi premium.
 * Menggunakan React 19 useSyncExternalStore untuk eliminasi jank,
 * zero hydration tearing, dan responsif seketika terhadap resize.
 */
function subscribe(callback) {
  if (typeof window === 'undefined') return () => {};
  const desktopQuery = window.matchMedia('(min-width: 1024px)');
  const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  desktopQuery.addEventListener('change', callback);
  reduceMotionQuery.addEventListener('change', callback);

  return () => {
    desktopQuery.removeEventListener('change', callback);
    reduceMotionQuery.removeEventListener('change', callback);
  };
}

function getSnapshot() {
  if (typeof window === 'undefined') return false;
  const isDesktop = window.matchMedia('(min-width: 1024px)').matches;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return isDesktop && !prefersReduced;
}

function getServerSnapshot() {
  return false;
}

export function useDesktopMotion() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
