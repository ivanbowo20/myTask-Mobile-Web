'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ListTodo,
  Plus,
  Folder,
  BookOpen,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useTasks } from '@/lib/task-context';
import { useNotebooks } from '@/lib/notebook-context';

export default function BottomNav({ onOpenAddTask }) {
  const pathname = usePathname();

  let taskContext = null;
  try {
    taskContext = useTasks();
  } catch (e) {
    // Graceful fallback if rendered outside TaskProvider
  }

  let notebookContext = null;
  try {
    notebookContext = useNotebooks();
  } catch (e) {
    // Graceful fallback if rendered outside NotebookProvider
  }

  const handleOpenAddTask = onOpenAddTask || taskContext?.openAddTask;
  const isNotebookTab = pathname.startsWith('/notebook');

  const handleCenterAction = isNotebookTab
    ? (notebookContext?.openAddNotebook || handleOpenAddTask)
    : handleOpenAddTask;

  const leftNavItems = [
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
  ];

  const rightNavItems = [
    {
      href: '/notebook',
      label: 'Notebook',
      icon: BookOpen,
      isActive: pathname === '/notebook' || pathname.startsWith('/notebook/'),
    },
    {
      href: '/kategori',
      label: 'Kategori',
      icon: Folder,
      isActive: pathname === '/kategori' || pathname.startsWith('/kategori/'),
    },
  ];

  function renderNavItem(item) {
    const Icon = item.icon;
    const active = item.isActive;

    return (
      <Link
        key={item.href}
        href={item.href}
        prefetch={true}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'relative flex flex-col items-center justify-center min-w-0 w-full min-h-[48px] py-1 px-0.5 rounded-xl transition-all duration-200 group select-none cursor-pointer',
          active
            ? 'text-[var(--theme-accent,#D97706)]'
            : 'text-zinc-400 hover:text-zinc-200'
        )}
      >
        {/* Active background pill */}
        {active && (
          <div
            className="absolute inset-1 rounded-xl bg-[var(--theme-glow-subtle,rgba(217,119,6,0.12))] border border-[var(--theme-accent,#D97706)]/25 pointer-events-none"
          />
        )}

        {/* Icon & Label */}
        <div className="relative z-10 flex flex-col items-center gap-0.5 w-full min-w-0">
          <Icon
            className={cn(
              'w-5 h-5 transition-transform duration-200 shrink-0',
              active ? 'scale-105 stroke-[2.2]' : 'group-hover:scale-105'
            )}
          />
          <span
            className={cn(
              'text-[10px] font-medium tracking-tight truncate max-w-full text-center transition-colors duration-200 px-0.5',
              active ? 'font-semibold text-[var(--theme-accent,#D97706)]' : 'text-zinc-400 group-hover:text-zinc-200'
            )}
          >
            {item.label}
          </span>
        </div>
      </Link>
    );
  }

  return (
    <nav
      aria-label="Navigasi bawah mobile"
      className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-[var(--theme-nav-bg,rgba(16,12,10,0.92))] backdrop-blur-sm sm:backdrop-blur-md backdrop-saturate-[120%] border-t border-[var(--glass-border,rgba(255,255,255,0.08))] shadow-[0_-4px_24px_rgba(0,0,0,0.4)] pb-[env(safe-area-inset-bottom,0px)] will-change-transform transform-gpu"
    >
      <div className="grid grid-cols-5 items-center h-16 max-w-lg mx-auto px-1 w-full">
        {leftNavItems.map(renderNavItem)}

        {/* Slot 3: Center Elevated Prominent Action Button (Context-Aware) */}
        <div className="flex items-center justify-center min-w-0 shrink-0">
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.05 }}
            onClick={handleCenterAction}
            aria-label={isNotebookTab ? 'Tambah catatan materi baru' : 'Tambah tugas baru'}
            title={isNotebookTab ? 'Tambah catatan materi baru' : 'Tambah tugas baru'}
            className="relative -top-3.5 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-tr from-[var(--theme-accent,#D97706)] to-[#F59E0B] text-[#0A0A0A] flex items-center justify-center shadow-[0_4px_16px_var(--theme-glow,rgba(217,119,6,0.45))] border-2 border-[var(--theme-nav-bg,#100C0A)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.75]" />
          </motion.button>
        </div>

        {rightNavItems.map(renderNavItem)}
      </div>
    </nav>
  );
}
