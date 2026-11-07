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
      <div key={href} title={!isAsideHovered ? label : undefined}>
        <Link
          href={href}
          prefetch={true}
          onMouseEnter={() => setHoveredHref(href)}
          className={cn(
            "relative flex items-center min-h-[42px] py-2 rounded-2xl text-sm font-medium transition-all duration-200 group cursor-pointer active:scale-[0.97] select-none",
            isAsideHovered ? "px-3.5 justify-between" : "px-0 justify-center",
            isActive
              ? "text-[var(--text-primary)] font-semibold"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          )}
        >
          {/* Active Capsule Pill with Integrated Theme Sheen & Elastic Liquid Spring */}
          {isActive && (
            <motion.div
              layoutId="sidebar-active-pill"
              className={cn(
                "absolute inset-0 border border-[var(--theme-accent,#D97706)]/25 shadow-[0_2px_12px_var(--theme-glow,rgba(217,119,6,0.12))] pointer-events-none z-0",
                isAsideHovered ? "rounded-full" : "rounded-2xl"
              )}
              style={{
                background: `color-mix(in srgb, var(--theme-accent, #D97706) 12%, var(--glass-bg-hover, rgba(255,255,255,0.06)))`,
              }}
              transition={{
                type: "spring",
                stiffness: 220,
                damping: 30,
                mass: 0.8,
              }}
            />
          )}

          {/* Floating Hover Indicator Pill */}
          {isHovered && !isActive && (
            <motion.div
              layoutId="sidebar-hover-pill"
              className={cn(
                "absolute inset-0 bg-[var(--glass-bg)] border border-[var(--glass-border)] pointer-events-none z-0",
                isAsideHovered ? "rounded-full" : "rounded-2xl"
              )}
              transition={{
                type: "spring",
                stiffness: 240,
                damping: 32,
              }}
            />
          )}

          <div className={cn("relative z-10 flex items-center", !isAsideHovered && "justify-center w-full")}>
            <div className="shrink-0 w-8 h-8 flex items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105">
              <Icon
                weight={isActive ? "fill" : "regular"}
                className={cn(
                  "w-4 h-4 transition-colors duration-150",
                  isActive
                    ? "text-[var(--text-primary)]"
                    : "text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]"
                )}
              />
            </div>
            {isAsideHovered && (
              <span className="whitespace-nowrap text-sm ml-2.5 select-none transition-opacity duration-200">
                {label}
              </span>
            )}
          </div>

          {/* Badge count saat sidebar melebar (hanya di-render saat hover agar tidak mendistorsi flex flow saat collapsed) */}
          {isAsideHovered && badge !== undefined && badge > 0 && (
            <span
              className={cn(
                "relative z-10 font-mono text-[10px] font-semibold px-2 py-0.5 rounded-full ml-2 shrink-0 select-none transition-all duration-200",
                badgeColor ||
                  (isActive
                    ? "bg-[var(--glass-border-hover)] text-[var(--text-primary)]"
                    : "bg-[var(--glass-border)] text-[var(--text-secondary)]")
              )}
            >
              {badge}
            </span>
          )}

          {/* Micro dot indicator saat sidebar ramping (w-16) - berposisi absolute sehingga 0% efek pada sumbu icon */}
          {!isAsideHovered && badge !== undefined && badge > 0 && (
            <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-[var(--theme-accent,#D97706)] ring-2 ring-[var(--theme-nav-bg,#100c0a)] pointer-events-none transition-opacity duration-200" />
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
      className={cn(
        "hidden lg:flex fixed top-16 bottom-0 left-0 z-40 bg-[var(--theme-nav-bg,rgba(16,12,10,0.85))] backdrop-blur-[24px] backdrop-saturate-[130%] border-r border-[var(--glass-border)] flex-col justify-between overflow-hidden transition-[width,box-shadow,border-color] duration-350 ease-[cubic-bezier(0.16,1,0.3,1)]",
        isAsideHovered
          ? "w-64 shadow-[0_20px_50px_rgba(0,0,0,0.55)] border-[var(--glass-border-hover)]"
          : "w-16 shadow-none"
      )}
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
      <div className={cn("space-y-6 overflow-y-auto transition-all duration-300", isAsideHovered ? "p-4" : "p-2")}>
        {/* Section 1: Menu Utama */}
        <div className="space-y-1.5">
          <p
            className={cn(
              "px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden",
              isAsideHovered ? "max-h-6 opacity-100" : "max-h-0 opacity-0 pointer-events-none"
            )}
          >
            Menu Utama
          </p>
          <nav className="space-y-1">
            {mainLinks.map(renderLinkItem)}

            {/* Tema Menu Item (Immediately after Kategori) */}
            <div title={!isAsideHovered ? "Pilih Tema" : undefined}>
              <button
                type="button"
                onClick={() => {
                  openThemeModal();
                }}
                onMouseEnter={() => setHoveredHref("tema")}
                className={cn(
                  "w-full relative flex items-center min-h-[42px] py-2 rounded-2xl text-sm font-medium transition-all duration-200 group cursor-pointer active:scale-[0.97] select-none",
                  isAsideHovered ? "px-3.5 justify-between" : "px-0 justify-center",
                  isThemeModalOpen
                    ? "text-[var(--text-primary)] font-semibold"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                )}
              >
                {/* Active Capsule Pill for Tema */}
                {isThemeModalOpen && (
                  <motion.div
                    layoutId="sidebar-active-pill"
                    className={cn(
                      "absolute inset-0 border border-[var(--theme-accent,#D97706)]/25 shadow-[0_2px_12px_var(--theme-glow,rgba(217,119,6,0.12))] pointer-events-none z-0",
                      isAsideHovered ? "rounded-full" : "rounded-2xl"
                    )}
                    style={{
                      background: `color-mix(in srgb, var(--theme-accent, #D97706) 12%, var(--glass-bg-hover, rgba(255,255,255,0.06)))`,
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 220,
                      damping: 30,
                      mass: 0.8,
                    }}
                  />
                )}

                {/* Floating Hover Indicator */}
                {hoveredHref === "tema" && !isThemeModalOpen && (
                  <motion.div
                    layoutId="sidebar-hover-pill"
                    className={cn(
                      "absolute inset-0 bg-[var(--glass-bg)] border border-[var(--glass-border)] pointer-events-none z-0",
                      isAsideHovered ? "rounded-full" : "rounded-2xl"
                    )}
                    transition={{
                      type: "spring",
                      stiffness: 240,
                      damping: 32,
                    }}
                  />
                )}

                <div className={cn("relative z-10 flex items-center", !isAsideHovered && "justify-center w-full")}>
                  <div className="shrink-0 w-8 h-8 flex items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105">
                    <Palette
                      weight={isThemeModalOpen ? "fill" : "regular"}
                      className={cn(
                        "w-4 h-4 transition-colors duration-150",
                        isThemeModalOpen
                          ? "text-[var(--text-primary)]"
                          : "text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]"
                      )}
                    />
                  </div>
                  {isAsideHovered && (
                    <span className="whitespace-nowrap text-sm ml-2.5 select-none transition-opacity duration-200">
                      Tema
                    </span>
                  )}
                </div>

                {isAsideHovered && (
                  <span className="relative z-10 text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:bg-purple-400/15 dark:text-purple-300 ml-2 shrink-0 select-none transition-all duration-200">
                    PRO
                  </span>
                )}
              </button>
            </div>
          </nav>
        </div>

        {/* Section 2: Lainnya */}
        <div className="space-y-1.5 pt-3 border-t border-[var(--glass-border)]">
          <p
            className={cn(
              "px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden",
              isAsideHovered ? "max-h-6 opacity-100" : "max-h-0 opacity-0 pointer-events-none"
            )}
          >
            Lainnya
          </p>
          <nav className="space-y-1">
            {otherLinks.map(renderLinkItem)}
          </nav>
        </div>
      </div>

      {/* Footer App Info */}
      <div className={cn("border-t border-[var(--glass-border)] text-xs text-[var(--text-muted)] transition-all duration-300", isAsideHovered ? "p-4 space-y-1" : "p-2 text-center")}>
        <p className="font-medium text-[var(--text-primary)] transition-all duration-300">{isAsideHovered ? "MyTask v2.0" : "v2.0"}</p>
        <p
          className={cn(
            "text-[11px] overflow-hidden transition-all duration-300",
            isAsideHovered ? "max-h-4 opacity-100" : "max-h-0 opacity-0 pointer-events-none"
          )}
        >
          © 2026 Manajemen Pintar
        </p>
      </div>
    </aside>
  );
}
