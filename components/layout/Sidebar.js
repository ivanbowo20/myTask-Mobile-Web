'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ListTodo,
  BookOpen,
  Folder,
  Settings,
  Shirt,
} from "lucide-react";
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
      icon: LayoutDashboard,
    },
    {
      href: "/tugas",
      label: "Tugas",
      icon: ListTodo,
      badge: badges.total,
    },
    {
      href: "/notebook",
      label: "Notebook",
      icon: BookOpen,
      badge: badges.notebook,
    },
    {
      href: "/kategori",
      label: "Kategori",
      icon: Folder,
      badge: badges.kategori,
    },
  ];

  const otherLinks = [
    {
      href: "/pengaturan",
      label: "Pengaturan",
      icon: Settings,
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
              ? "bg-white/[0.08] text-white font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.1)] [html[data-theme='celestial-sky']_&]:bg-black/[0.06] [html[data-theme='celestial-sky']_&]:text-slate-900"
              : "text-zinc-400 hover:text-white hover:bg-white/[0.04] [html[data-theme='celestial-sky']_&]:text-slate-600 [html[data-theme='celestial-sky']_&]:hover:text-slate-900 [html[data-theme='celestial-sky']_&]:hover:bg-black/[0.03]"
          )}
        >
          <div className="flex items-center gap-3">
            <Icon
              className={cn(
                "w-4 h-4 shrink-0 transition-colors duration-150",
                isActive
                  ? "text-white [html[data-theme='celestial-sky']_&]:text-slate-900 stroke-[2.2]"
                  : "text-zinc-400 group-hover:text-white [html[data-theme='celestial-sky']_&]:text-slate-500 [html[data-theme='celestial-sky']_&]:group-hover:text-slate-900 stroke-[1.8]"
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
                    ? "bg-white/10 text-white [html[data-theme='celestial-sky']_&]:bg-black/10 [html[data-theme='celestial-sky']_&]:text-slate-900"
                    : "bg-white/[0.06] text-zinc-400 [html[data-theme='celestial-sky']_&]:bg-black/[0.04] [html[data-theme='celestial-sky']_&]:text-slate-600")
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
      className="hidden lg:flex fixed top-16 bottom-0 left-0 z-30 w-64 bg-[var(--theme-nav-bg,rgba(16,12,10,0.75))] backdrop-blur-[20px] backdrop-saturate-[130%] border-r border-[var(--glass-border,rgba(255,255,255,0.08))] [html[data-theme='celestial-sky']_&]:border-slate-200/80 flex-col justify-between"
    >
      <div className="p-4 space-y-6 overflow-y-auto">
        {/* Section 1: Menu Utama */}
        <div className="space-y-1.5">
          <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 [html[data-theme='celestial-sky']_&]:text-slate-400">
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
                    ? "bg-white/[0.08] text-white font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.1)] [html[data-theme='celestial-sky']_&]:bg-black/[0.06] [html[data-theme='celestial-sky']_&]:text-slate-900"
                    : "text-zinc-400 hover:text-white hover:bg-white/[0.04] [html[data-theme='celestial-sky']_&]:text-slate-600 [html[data-theme='celestial-sky']_&]:hover:text-slate-900 [html[data-theme='celestial-sky']_&]:hover:bg-black/[0.03]"
                )}
              >
                <div className="flex items-center gap-3">
                  <Shirt
                    className={cn(
                      "w-4 h-4 shrink-0 transition-colors duration-150",
                      isThemeModalOpen
                        ? "text-white [html[data-theme='celestial-sky']_&]:text-slate-900 stroke-[2.2]"
                        : "text-zinc-400 group-hover:text-white [html[data-theme='celestial-sky']_&]:text-slate-500 [html[data-theme='celestial-sky']_&]:group-hover:text-slate-900 stroke-[1.8]"
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
        <div className="space-y-1.5 pt-3 border-t border-white/[0.08] [html[data-theme='celestial-sky']_&]:border-slate-200/80">
          <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 [html[data-theme='celestial-sky']_&]:text-slate-400">
            Lainnya
          </p>
          <nav className="space-y-1">
            {otherLinks.map(renderLinkItem)}
          </nav>
        </div>
      </div>

      {/* Footer App Info */}
      <div className="p-4 border-t border-white/[0.08] [html[data-theme='celestial-sky']_&]:border-slate-200/80 text-xs text-zinc-500 dark:text-zinc-400 [html[data-theme='celestial-sky']_&]:text-slate-500 space-y-1">
        <p className="font-medium text-zinc-300 dark:text-zinc-300 [html[data-theme='celestial-sky']_&]:text-slate-700">MyTask v2.0</p>
        <p>© 2026 Manajemen Pintar</p>
      </div>
    </aside>
  );
}
