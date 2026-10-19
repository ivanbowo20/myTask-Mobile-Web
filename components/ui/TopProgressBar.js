'use client';

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function TopProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, setIsNavigating] = useState(false);
  const [progress, setProgress] = useState(0);

  // Monitor clicks on internal navigation links
  useEffect(() => {
    const handleClick = (e) => {
      // Find nearest anchor element
      const anchor = e.target?.closest?.("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (
        !href ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        anchor.target === "_blank" ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }

      try {
        const targetUrl = new URL(href, window.location.href);
        // Trigger only if navigating to a different pathname within the same origin
        if (
          targetUrl.origin === window.location.origin &&
          targetUrl.pathname !== window.location.pathname
        ) {
          setIsNavigating(true);
          setProgress(35);
        }
      } catch {
        // Safe fallback for irregular URLs
      }
    };

    document.addEventListener("click", handleClick, { capture: true });
    return () => {
      document.removeEventListener("click", handleClick, { capture: true });
    };
  }, []);

  // Smoothly increment progress while waiting for route transition
  useEffect(() => {
    if (!isNavigating) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 85) {
          clearInterval(interval);
          return 85;
        }
        return prev + Math.floor(Math.random() * 15 + 5);
      });
    }, 150);

    return () => clearInterval(interval);
  }, [isNavigating]);

  // Complete and reset progress bar when navigation finishes
  useEffect(() => {
    if (isNavigating) {
      setProgress(100);
      const timer = setTimeout(() => {
        setIsNavigating(false);
        setProgress(0);
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [pathname, searchParams]);

  if (!isNavigating && progress === 0) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 h-[2.5px] z-[9999] pointer-events-none overflow-hidden"
      role="progressbar"
      aria-label="Memuat halaman..."
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full bg-gradient-to-r from-zinc-400 via-white to-white shadow-[0_0_10px_rgba(255,255,255,0.85)] transition-all ease-out"
        style={{
          width: `${progress}%`,
          transitionDuration: progress === 100 ? "150ms" : "300ms",
        }}
      />
    </div>
  );
}
