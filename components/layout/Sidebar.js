'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
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

    return (
      <div key={href}>
        <Link
          href={href}
          prefetch={true}
          className={cn(
            "relative flex items-center justify-between min-h-[40px] px-3 py-2 rounded-[8px] text-sm font-medium transition-all duration-150 group cursor-pointer active:scale-[0.98]",
            isActive
              ? "bg-[var(--glass-bg-hover)] text-[var(--text-primary)] font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.1)] border border-[var(--glass-border)]"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg)]"
          )}
        >
          <div className="flex items-center gap-3">
            <Icon
              weight={isActive ? "fill" : "regular"}
              className={cn(
                "w-4 h-4 shrink-0 transition-all duration-150",
                isActive
                  ? "text-[var(--text-primary)] scale-105"
                  : "text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]"
              )}
            />
            <span>{label}</span>
          </div>

          {badge !== undefined && badge > 0 && (
            <span
              className={cn(
                "text-[11px] font-semibold px-2 py-0.5 rounded-[6px] transition-colors duration-150",
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
      className="hidden lg:flex fixed top-16 bottom-0 left-0 z-30 w-64 bg-[var(--theme-nav-bg,rgba(16,12,10,0.75))] backdrop-blur-[20px] backdrop-saturate-[130%] border-r border-[var(--glass-border)] flex-col justify-between"
    >
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
                className={cn(
                  "w-full relative flex items-center justify-between min-h-[40px] px-3 py-2 rounded-[8px] text-sm font-medium transition-all duration-150 group cursor-pointer active:scale-[0.98]",
                  isThemeModalOpen
                    ? "bg-[var(--glass-bg-hover)] text-[var(--text-primary)] font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.1)] border border-[var(--glass-border)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg)]"
                )}
              >
                <div className="flex items-center gap-3">
                  <Palette
                    weight={isThemeModalOpen ? "fill" : "regular"}
                    className={cn(
                      "w-4 h-4 shrink-0 transition-all duration-150",
                      isThemeModalOpen
                        ? "text-[var(--text-primary)] scale-105"
                        : "text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]"
                    )}
                  />
                  <span>Tema</span>
                </div>

                <span className="text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded-[6px] bg-purple-500/10 text-purple-600 dark:bg-purple-400/15 dark:text-purple-300 transition-colors duration-150">
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
