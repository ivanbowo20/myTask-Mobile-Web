'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ListTodo,
  Folder,
  Settings,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    {
      href: '/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      isActive: pathname === '/dashboard' || pathname.startsWith('/dashboard/'),
    },
    {
      href: '/tugas',
      label: 'Tugas',
      icon: ListTodo,
      isActive: pathname === '/tugas' || pathname.startsWith('/tugas'),
    },
    {
      href: '/kategori',
      label: 'Kategori',
      icon: Folder,
      isActive: pathname === '/kategori' || pathname.startsWith('/kategori/'),
    },
    {
      href: '/pengaturan',
      label: 'Pengaturan',
      icon: Settings,
      isActive: pathname === '/pengaturan' || pathname.startsWith('/pengaturan/'),
    },
  ];

  return (
    <nav
      aria-label="Navigasi bawah mobile"
      className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-[var(--theme-nav-bg,rgba(16,12,10,0.85))] backdrop-blur-[20px] backdrop-saturate-[130%] border-t border-[var(--glass-border,rgba(255,255,255,0.08))] shadow-[0_-4px_24px_rgba(0,0,0,0.4)] pb-[env(safe-area-inset-bottom,0px)]"
    >
      <div className="grid grid-cols-4 items-center h-16 max-w-lg mx-auto px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.isActive;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative flex flex-col items-center justify-center min-h-[48px] py-1 px-1 rounded-xl transition-all duration-200 group select-none cursor-pointer',
                active
                  ? 'text-[var(--theme-accent,#D97706)]'
                  : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              {/* Active sliding background pill */}
              {active && (
                <motion.div
                  layoutId="bottom-nav-active-pill"
                  className="absolute inset-1 rounded-xl bg-[var(--theme-glow-subtle,rgba(217,119,6,0.12))] border border-[var(--theme-accent,#D97706)]/25 pointer-events-none"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}

              {/* Icon & Label */}
              <div className="relative z-10 flex flex-col items-center gap-0.5">
                <Icon
                  className={cn(
                    'w-5 h-5 transition-transform duration-200',
                    active ? 'scale-105 stroke-[2.2]' : 'group-hover:scale-105'
                  )}
                />
                <span
                  className={cn(
                    'text-[11px] font-medium tracking-tight transition-colors duration-200',
                    active ? 'font-semibold text-[var(--theme-accent,#D97706)]' : 'text-zinc-400 group-hover:text-zinc-200'
                  )}
                >
                  {item.label}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
