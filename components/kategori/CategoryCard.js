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
  Pencil,
  Trash2,
} from "lucide-react";
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
      whileHover={shouldReduceMotion ? undefined : { y: -2 }}
      whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
      transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
      className="glass-card group relative rounded-xl sm:rounded-2xl p-3.5 sm:p-5 transition-colors duration-200 flex flex-col justify-between gap-3 select-none"
    >
      {/* Top Bar: Icon Badge on Left, Action Buttons on Right */}
      <div className="flex items-start justify-between gap-2">
        {/* Icon Badge with Category Accent */}
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-transform duration-200 group-hover:scale-105"
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
            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-zinc-400 hover:text-[#FAFAFA] hover:bg-white/[0.08] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FAFAFA] cursor-pointer"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(kategori);
            }}
            aria-label={`Hapus kategori ${nama}`}
            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-zinc-400 hover:text-[#E88B8B] hover:bg-[#E88B8B]/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E88B8B] cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Info: Category Name & Task Count */}
      <div className="space-y-0.5 sm:space-y-1 min-w-0">
        <h3 className="text-sm sm:text-base font-semibold text-[#FAFAFA] truncate tracking-tight">
          {nama}
        </h3>
        <p className="text-[11px] sm:text-xs text-zinc-300 font-medium">
          {jumlahTugas} tugas
        </p>
      </div>

      {/* Progress Bar with Animated Fill */}
      <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
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
