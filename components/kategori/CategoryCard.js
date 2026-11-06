'use client';

import { motion, useReducedMotion } from "framer-motion";
import {
  GraduationCap,
  Briefcase,
  User,
  ShoppingCart,
  HeartPulse,
  Home,
  Wallet,
  Dumbbell,
  Utensils,
  Code,
  Palette,
  BookOpen,
  Plane,
  Folder,
} from "lucide-react";
import { PencilSimple, Trash } from "@phosphor-icons/react";
import { DEFAULT_CATEGORY_ICON } from "@/lib/constants";

const ICON_MAP = {
  GraduationCap,
  Briefcase,
  User,
  ShoppingCart,
  HeartPulse,
  Home,
  Wallet,
  Dumbbell,
  Utensils,
  Code,
  Palette,
  BookOpen,
  Plane,
  Folder,
};

export default function CategoryCard({
  kategori,
  jumlahTugas = 0,
  onEdit,
  onDelete,
}) {
  const { nama, warna, icon } = kategori;
  const shouldReduceMotion = useReducedMotion();
  const progressPercent = Math.min(jumlahTugas * 10, 100);

  const IconComponent =
    ICON_MAP[icon] || ICON_MAP[DEFAULT_CATEGORY_ICON] || Folder;

  return (
    <motion.div
      whileHover={shouldReduceMotion ? undefined : { y: -4, scale: 1.015 }}
      whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      className="glass-card group relative rounded-xl sm:rounded-2xl p-3.5 sm:p-5 [html[data-theme='celestial-sky']_&]:bg-white/85 [html[data-theme='celestial-sky']_&]:border-sky-200/60 shadow-sm transition-all duration-200 lg:hover:shadow-lg flex flex-col justify-between gap-3 select-none"
    >
      {/* Top Bar: Icon Badge on Left, Action Buttons on Right */}
      <div className="flex items-start justify-between gap-2">
        {/* Icon Badge with Category Accent */}
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-300 group-hover:scale-115 group-hover:rotate-6 group-hover:shadow-sm"
          style={{
            backgroundColor: `${warna}26`,
            borderColor: `${warna}40`,
          }}
        >
          <IconComponent size={18} style={{ color: warna }} />
        </div>

        {/* Action Buttons (Separated, non-overlapping 44x44px touch targets) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 -mr-1 -mt-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(kategori);
            }}
            aria-label={`Ubah kategori ${nama}`}
            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-zinc-400 hover:text-[#FAFAFA] hover:bg-white/[0.08] [html[data-theme='celestial-sky']_&]:text-slate-500 [html[data-theme='celestial-sky']_&]:hover:text-slate-900 [html[data-theme='celestial-sky']_&]:hover:bg-black/[0.04] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FAFAFA] cursor-pointer"
          >
            <PencilSimple className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(kategori);
            }}
            aria-label={`Hapus kategori ${nama}`}
            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-zinc-400 hover:text-[#E88B8B] hover:bg-[#E88B8B]/10 [html[data-theme='celestial-sky']_&]:text-rose-500 [html[data-theme='celestial-sky']_&]:hover:text-rose-700 [html[data-theme='celestial-sky']_&]:hover:bg-rose-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E88B8B] cursor-pointer"
          >
            <Trash className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Info: Category Name & Task Count */}
      <div className="space-y-0.5 sm:space-y-1 min-w-0">
        <h3 className="text-sm sm:text-base font-semibold text-[#FAFAFA] [html[data-theme='celestial-sky']_&]:text-[#0F172A] truncate tracking-tight">
          {nama}
        </h3>
        <p className="text-[11px] sm:text-xs text-zinc-300 [html[data-theme='celestial-sky']_&]:text-slate-600 font-medium">
          {jumlahTugas} tugas
        </p>
      </div>

      {/* Progress Bar with Animated Fill */}
      <div className="w-full h-1.5 rounded-full bg-white/[0.06] [html[data-theme='celestial-sky']_&]:bg-slate-200/80 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: warna }}
          initial={{ width: 0 }}
          animate={{ width: `${progressPercent}%` }}
          transition={{
            duration: shouldReduceMotion ? 0.1 : 0.35,
            ease: [0.23, 1, 0.32, 1],
          }}
        />
      </div>
    </motion.div>
  );
}
