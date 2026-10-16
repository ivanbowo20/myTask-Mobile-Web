'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ListTodo,
  Folder,
  Settings,
  Shirt,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
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
    },
    {
      href: "/kategori",
      label: "Kategori",
      icon: Folder,
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
    const isActive = pathname === href || (href === "/tugas" && pathname.startsWith("/tugas"));

    return (
      <motion.div
        key={href}
        whileHover={{ x: 4, transition: { type: "spring", stiffness: 400, damping: 25 } }}
      >
        <Link
          href={href}
          className={cn(
            "relative flex items-center justify-between min-h-[44px] px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 group cursor-pointer",
            isActive
              ? "text-[#FAFAFA] font-semibold"
              : "text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-white/[0.04]"
          )}
        >
          {isActive && (
            <motion.div
              layoutId="sidebar-active-pill"
              className="absolute inset-0 bg-[var(--theme-glow-subtle,rgba(217,119,6,0.1))] border-l-2 border-l-[var(--theme-accent,#D97706)] border-y border-r border-white/[0.08] rounded-lg pointer-events-none shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
          )}
          <div className="relative z-10 flex items-center gap-3">
            <motion.div
              className="flex items-center justify-center shrink-0"
              whileHover={{ scale: 1.25, rotate: [0, -4, 4, 0] }}
              transition={{
                scale: { type: "spring", stiffness: 450, damping: 18 },
                rotate: { duration: 0.35, ease: "easeInOut" },
              }}
            >
              <Icon
                className={cn(
                  "w-4 h-4 transition-colors duration-200",
                  isActive ? "text-[#FAFAFA]" : "text-[#71717A] group-hover:text-[#FAFAFA]"
                )}
              />
            </motion.div>
            <span className="transition-transform duration-200 group-hover:translate-x-0.5">{label}</span>
          </div>

          {badge !== undefined && badge > 0 && (
            <motion.span
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ repeat: Infinity, repeatDelay: 4, duration: 0.4 }}
              className={cn(
                "relative z-10 text-[11px] font-bold px-2 py-0.5 rounded-full transition-all duration-200",
                badgeColor || "bg-[rgba(255,255,255,0.06)] text-[#A1A1AA] border border-[rgba(255,255,255,0.08)]"
              )}
            >
              {badge}
            </motion.span>
          )}
        </Link>
      </motion.div>
    );
  }

  return (
    <aside
      className="hidden lg:flex fixed top-16 bottom-0 left-0 z-30 w-64 bg-[var(--theme-nav-bg,rgba(16,12,10,0.75))] backdrop-blur-[20px] backdrop-saturate-[130%] border-r border-[var(--glass-border,rgba(255,255,255,0.08))] flex-col justify-between"
    >
      <div className="p-4 space-y-6 overflow-y-auto">
        {/* Section 1: Menu Utama */}
        <div className="space-y-1.5">
          <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#71717A]">
            Menu Utama
          </p>
          <nav className="space-y-1">
            {mainLinks.map(renderLinkItem)}

            {/* Tema Menu Item (Immediately after Kategori) */}
            <motion.div
              whileHover={{ x: 4, transition: { type: "spring", stiffness: 400, damping: 25 } }}
            >
              <button
                type="button"
                onClick={() => {
                  openThemeModal();
                }}
                className={cn(
                  "w-full relative flex items-center justify-between min-h-[44px] px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 group cursor-pointer",
                  isThemeModalOpen
                    ? "text-[#FAFAFA] font-semibold"
                    : "text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-white/[0.04]"
                )}
              >
                {isThemeModalOpen && (
                  <motion.div
                    layoutId="sidebar-active-pill-theme"
                    className="absolute inset-0 bg-[var(--theme-glow-subtle,rgba(217,119,6,0.1))] border-l-2 border-l-[var(--theme-accent,#D97706)] border-y border-r border-white/[0.08] rounded-lg pointer-events-none shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <div className="relative z-10 flex items-center gap-3">
                  <motion.div
                    className="flex items-center justify-center shrink-0"
                    whileHover={{ scale: 1.25, rotate: [0, -6, 6, 0] }}
                    transition={{
                      scale: { type: "spring", stiffness: 450, damping: 18 },
                      rotate: { duration: 0.35, ease: "easeInOut" },
                    }}
                  >
                    <Shirt
                      className={cn(
                        "w-4 h-4 transition-colors duration-200",
                        isThemeModalOpen
                          ? "text-[#FAFAFA]"
                          : "text-[#71717A] group-hover:text-[#FAFAFA]"
                      )}
                    />
                  </motion.div>
                  <span className="transition-transform duration-200 group-hover:translate-x-0.5">
                    Tema
                  </span>
                </div>

                <span className="relative z-10 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--theme-accent,#D97706)]/15 text-[var(--theme-accent,#D97706)] border border-[var(--theme-accent,#D97706)]/30 transition-colors duration-200">
                  PRO
                </span>
              </button>
            </motion.div>
          </nav>
        </div>

        {/* Section 2: Lainnya */}
        <div className="space-y-1.5 pt-3 border-t border-[rgba(255,255,255,0.08)]">
          <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#71717A]">
            Lainnya
          </p>
          <nav className="space-y-1">
            {otherLinks.map(renderLinkItem)}
          </nav>
        </div>
      </div>

      {/* Footer App Info */}
      <div className="p-4 border-t border-[rgba(255,255,255,0.08)] text-xs text-[#71717A] space-y-1">
        <p className="font-medium text-[#A1A1AA]">MyTask v2.0</p>
        <p>© 2026 Manajemen Pintar</p>
      </div>
    </aside>
  );
}
