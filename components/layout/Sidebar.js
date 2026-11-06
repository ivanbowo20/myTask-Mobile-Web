'use client';

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  SquaresFour,
  CheckSquareOffset,
  BookBookmark,
  FolderSimple,
  GearSix,
  Palette,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/theme-context";

export default function Sidebar({
  badges = {},
}) {
  const pathname = usePathname();
  const { openThemeModal, isThemeModalOpen } = useTheme();
  const [hoveredHref, setHoveredHref] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isAsideHovered, setIsAsideHovered] = useState(false);

  const mainLinks = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: SquaresFour,
    },
    {
      href: "/tugas",
      label: "Tugas",
      icon: CheckSquareOffset,
      badge: badges.total,
    },
    {
      href: "/notebook",
      label: "Notebook",
      icon: BookBookmark,
      badge: badges.notebook,
    },
    {
      href: "/kategori",
      label: "Kategori",
      icon: FolderSimple,
      badge: badges.kategori,
    },
  ];

  const otherLinks = [
    {
      href: "/pengaturan",
      label: "Pengaturan",
      icon: GearSix,
    },
  ];

  function renderLinkItem({ href, label, icon: Icon, badge, badgeColor }) {
    const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
    const isHovered = hoveredHref === href;

    return (
      <div key={href}>
        <Link
          href={href}
          prefetch={true}
          onMouseEnter={() => setHoveredHref(href)}
          className={cn(
            "relative flex items-center justify-between min-h-[40px] px-3 py-2 rounded-[8px] text-sm font-medium transition-colors duration-150 group cursor-pointer active:scale-[0.97] select-none",
            isActive
              ? "text-[var(--text-primary)] font-semibold"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          )}
        >
          {/* Active Solid Highlight Pill with Elastic Liquid Spring & Refined Minimal Accent Edge */}
          {isActive && (
            <motion.div
              layoutId="sidebar-active-pill"
              className="absolute inset-0 bg-[var(--glass-bg-hover)] rounded-[8px] border border-[var(--glass-border)] shadow-sm pointer-events-none z-0"
              transition={{
                type: "spring",
                stiffness: 360,
                damping: 25,
                mass: 0.85,
              }}
            >
              <div className="absolute left-1.5 top-2.5 bottom-2.5 w-[2px] rounded-full bg-[var(--theme-accent,#D97706)] opacity-90" />
            </motion.div>
          )}

          {/* Floating Hover Indicator Pill */}
          {isHovered && !isActive && (
            <motion.div
              layoutId="sidebar-hover-pill"
              className="absolute inset-0 bg-[var(--glass-bg)] rounded-[8px] border border-[var(--glass-border)] pointer-events-none z-0"
              transition={{
                type: "spring",
                stiffness: 420,
                damping: 32,
              }}
            />
          )}

          <div className="relative z-10 flex items-center gap-3">
            <motion.div
              animate={isActive ? { scale: [1, 1.25, 1.08], rotate: [0, -6, 0] } : { scale: 1, rotate: 0 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="shrink-0 flex items-center justify-center"
            >
              <Icon
                weight={isActive ? "fill" : "regular"}
                className={cn(
                  "w-4 h-4 transition-colors duration-150",
                  isActive
                    ? "text-[var(--text-primary)]"
                    : "text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]"
                )}
              />
            </motion.div>
            <span>{label}</span>
          </div>

          {badge !== undefined && badge > 0 && (
            <span
              className={cn(
                "relative z-10 text-[11px] font-semibold px-2 py-0.5 rounded-[6px] transition-colors duration-150",
                badgeColor ||
                  (isActive
                    ? "bg-[var(--glass-border-hover)] text-[var(--text-primary)]"
                    : "bg-[var(--glass-border)] text-[var(--text-secondary)]")
              )}
            >
              {badge}
            </span>
          )}
        </Link>
      </div>
    );
  }

  return (
    <aside
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }}
      onMouseEnter={() => setIsAsideHovered(true)}
      onMouseLeave={() => {
        setIsAsideHovered(false);
        setHoveredHref(null);
      }}
      className="hidden lg:flex fixed top-16 bottom-0 left-0 z-30 w-64 bg-[var(--theme-nav-bg,rgba(16,12,10,0.75))] backdrop-blur-[20px] backdrop-saturate-[130%] border-r border-[var(--glass-border)] flex-col justify-between overflow-hidden"
    >
      {/* Magnetic Cursor Ambient Spotlight — Ultra-Subtle & Refined */}
      {isAsideHovered && (
        <div
          className="pointer-events-none absolute -inset-px opacity-70 transition-opacity duration-300 z-0 overflow-hidden"
          style={{
            background: `radial-gradient(90px circle at ${mousePos.x}px ${mousePos.y}px, color-mix(in srgb, var(--theme-accent, #D97706) 14%, transparent), transparent 75%)`,
          }}
        />
      )}
      <div className="p-4 space-y-6 overflow-y-auto">
        {/* Section 1: Menu Utama */}
        <div className="space-y-1.5">
          <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Menu Utama
          </p>
          <nav className="space-y-1">
            {mainLinks.map(renderLinkItem)}

            {/* Tema Menu Item (Immediately after Kategori) */}
            <div>
              <button
                type="button"
                onClick={() => {
                  openThemeModal();
                }}
                onMouseEnter={() => setHoveredHref("tema")}
                className={cn(
                  "w-full relative flex items-center justify-between min-h-[40px] px-3 py-2 rounded-[8px] text-sm font-medium transition-colors duration-150 group cursor-pointer active:scale-[0.97] select-none",
                  isThemeModalOpen
                    ? "text-[var(--text-primary)] font-semibold"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                )}
              >
                {/* Active Highlight for Tema */}
                {isThemeModalOpen && (
                  <motion.div
                    layoutId="sidebar-active-pill"
                    className="absolute inset-0 bg-[var(--glass-bg-hover)] rounded-[8px] border border-[var(--glass-border)] shadow-sm pointer-events-none z-0"
                    transition={{
                      type: "spring",
                      stiffness: 360,
                      damping: 25,
                      mass: 0.85,
                    }}
                  >
                    <div className="absolute left-1.5 top-2.5 bottom-2.5 w-[2px] rounded-full bg-[var(--theme-accent,#D97706)] opacity-90" />
                  </motion.div>
                )}

                {/* Floating Hover Indicator */}
                {hoveredHref === "tema" && !isThemeModalOpen && (
                  <motion.div
                    layoutId="sidebar-hover-pill"
                    className="absolute inset-0 bg-[var(--glass-bg)] rounded-[8px] border border-[var(--glass-border)] pointer-events-none z-0"
                    transition={{
                      type: "spring",
                      stiffness: 420,
                      damping: 32,
                    }}
                  />
                )}

                <div className="relative z-10 flex items-center gap-3">
                  <motion.div
                    animate={isThemeModalOpen ? { scale: [1, 1.25, 1.08], rotate: [0, -6, 0] } : { scale: 1, rotate: 0 }}
                    transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                    className="shrink-0 flex items-center justify-center"
                  >
                    <Palette
                      weight={isThemeModalOpen ? "fill" : "regular"}
                      className={cn(
                        "w-4 h-4 transition-colors duration-150",
                        isThemeModalOpen
                          ? "text-[var(--text-primary)]"
                          : "text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]"
                      )}
                    />
                  </motion.div>
                  <span>Tema</span>
                </div>

                <span className="relative z-10 text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded-[6px] bg-purple-500/10 text-purple-600 dark:bg-purple-400/15 dark:text-purple-300 transition-colors duration-150">
                  PRO
                </span>
              </button>
            </div>
          </nav>
        </div>

        {/* Section 2: Lainnya */}
        <div className="space-y-1.5 pt-3 border-t border-[var(--glass-border)]">
          <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Lainnya
          </p>
          <nav className="space-y-1">
            {otherLinks.map(renderLinkItem)}
          </nav>
        </div>
      </div>

      {/* Footer App Info */}
      <div className="p-4 border-t border-[var(--glass-border)] text-xs text-[var(--text-muted)] space-y-1">
        <p className="font-medium text-[var(--text-primary)]">MyTask v2.0</p>
        <p>© 2026 Manajemen Pintar</p>
      </div>
    </aside>
  );
}
