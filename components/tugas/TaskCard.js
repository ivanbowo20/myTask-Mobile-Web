"use client";

import { useState } from "react";
import {
  Calendar,
  Check,
  ChevronDown,
  Pencil,
  Star,
  Trash2,
} from "lucide-react";
import { formatTanggal, hitungSisaWaktu, hitungStatusDeadline, cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export default function TaskCard({
  task,
  kategori,
  onToggleSelesai,
  onTogglePrioritas,
  onEdit,
  onDelete,
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const status = hitungStatusDeadline(task);
  const sisaWaktu = hitungSisaWaktu(task.deadline);

  // Status-based container styling (theme specular glassmorphism)
  let containerStyles = "border-[var(--glass-border,rgba(255,255,255,0.08))] bg-[var(--glass-bg,rgba(22,17,14,0.55))] hover:border-[var(--glass-border-hover,rgba(255,255,255,0.2))]";
  if (task.selesai) {
    containerStyles = "border-[#8FB88F]/30 bg-[#8FB88F]/5 hover:border-[#8FB88F]/40";
  } else if (status === "terlewat") {
    containerStyles = "border-[#E88B8B]/30 bg-[#E88B8B]/[0.04] hover:border-[#E88B8B]/50";
  } else if (status === "hari-ini") {
    containerStyles = "border-[var(--theme-accent,#D97706)]/30 bg-[var(--theme-accent,#D97706)]/[0.04] hover:border-[var(--theme-accent,#D97706)]/50";
  }

  return (
    <motion.div
      layout
      transition={{ duration: 0.25, ease: "easeOut" }}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      className={cn(
        "group relative rounded-xl glass-card transition-colors duration-200",
        containerStyles
      )}
    >
      {/* ============================================================ */}
      {/* MOBILE COMPACT ACCORDION VIEW (< 640px)                      */}
      {/* ============================================================ */}
      <div className="flex sm:hidden flex-col p-2.5">
        {/* Header Baris Utama (Collapsed View) */}
        <div className="flex items-center justify-between gap-2.5">
          {/* 1. Checkbox Bulat Selesai (Tap Target >= 44px) */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.86 }}
            onClick={() => onToggleSelesai(task.id)}
            aria-label={task.selesai ? "Tandai belum selesai" : "Tandai selesai"}
            className="min-h-[44px] min-w-[44px] -ml-1 inline-flex items-center justify-center shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FAFAFA] rounded-full"
          >
            <span
              className={cn(
                "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors duration-200",
                task.selesai
                  ? "bg-[#8FB88F] border-[#8FB88F] text-[#0A0A0A]"
                  : "border-zinc-500 hover:border-[#FAFAFA] bg-white/[0.02]"
              )}
            >
              {task.selesai && (
                <motion.div
                  initial={{ scale: 0, rotate: -45 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </motion.div>
              )}
            </span>
          </motion.button>

          {/* 2. Kolom Tengah: Judul Tugas & Sub-info inline */}
          <div
            onClick={() => setIsExpanded((prev) => !prev)}
            className="flex-1 min-w-0 pr-1 cursor-pointer select-none"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setIsExpanded((prev) => !prev);
              }
            }}
            aria-expanded={isExpanded}
            aria-label={`Lihat detail tugas ${task.judul}`}
          >
            <h3
              className={cn(
                "text-[13px] font-medium truncate transition-colors duration-200 leading-snug",
                task.selesai ? "text-zinc-400 line-through decoration-zinc-500" : "text-[#FAFAFA]"
              )}
              title={task.judul}
            >
              {task.judul}
            </h3>

            <div className="flex items-center gap-1.5 text-[11px] text-zinc-300 mt-0.5 truncate">
              {kategori ? (
                <span
                  className="inline-flex items-center gap-1 font-medium shrink-0"
                  style={{ color: kategori.warna }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: kategori.warna }}
                  />
                  <span className="truncate max-w-[85px]">{kategori.nama}</span>
                </span>
              ) : (
                <span className="text-zinc-400 shrink-0">Umum</span>
              )}

              <span className="text-zinc-400 shrink-0">·</span>

              {/* Deadline / Status inline */}
              {!task.selesai && status === "terlewat" ? (
                <span className="text-[#E88B8B] font-semibold shrink-0">
                  Terlewat ({sisaWaktu})
                </span>
              ) : !task.selesai && status === "hari-ini" ? (
                <span className="text-[var(--theme-accent,#D97706)] font-semibold shrink-0">
                  Hari Ini ({sisaWaktu})
                </span>
              ) : task.selesai ? (
                <span className="text-[#8FB88F] font-medium shrink-0 inline-flex items-center gap-1">
                  <span>Selesai</span>
                </span>
              ) : task.deadline ? (
                <span className="text-zinc-300 truncate">
                  {formatTanggal(task.deadline).split(",")[1] || formatTanggal(task.deadline)}
                </span>
              ) : (
                <span className="text-zinc-400 shrink-0">Tanpa deadline</span>
              )}
            </div>
          </div>

          {/* 3. Aksi Kanan: Star & Chevron Accordion (Tap Target >= 44px) */}
          <div className="flex items-center -mr-1 shrink-0">
            {/* Star Button */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.84 }}
              onClick={() => onTogglePrioritas(task.id)}
              aria-label={task.prioritas ? "Hapus tanda penting" : "Tandai sebagai penting"}
              title={task.prioritas ? "Tugas penting" : "Tandai penting"}
              className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-zinc-400 hover:text-[#F59E0B] transition-colors focus-visible:outline-none cursor-pointer"
            >
              <Star
                className={cn(
                  "w-4 h-4 transition-colors duration-200",
                  task.prioritas && "text-[#F59E0B] fill-[#F59E0B]"
                )}
              />
            </motion.button>

            {/* Chevron Accordion Button */}
            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
              aria-expanded={isExpanded}
              aria-label={isExpanded ? "Tutup detail tugas" : "Lihat selengkapnya"}
              title={isExpanded ? "Tutup detail" : "Lihat selengkapnya"}
              className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-zinc-400 hover:text-[#FAFAFA] transition-colors focus-visible:outline-none cursor-pointer"
            >
              <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <ChevronDown className="w-4 h-4" />
              </motion.div>
            </button>
          </div>
        </div>

        {/* Expanded Content Section (Animasi Height Auto) */}
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              key="mobile-expanded-details"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div className="pt-2.5 mt-2 border-t border-white/[0.06] space-y-2.5 text-xs">
                {/* Judul Lengkap */}
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">
                    Judul Tugas:
                  </span>
                  <p className="text-xs font-semibold text-[#FAFAFA] leading-snug break-words">
                    {task.judul}
                  </p>
                </div>

                {/* Deskripsi Catatan (jika ada) */}
                {task.deskripsi && (
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">
                      Catatan:
                    </span>
                    <p className="text-xs text-zinc-300 leading-relaxed break-words bg-white/[0.02] p-2 rounded-lg border border-white/[0.04]">
                      {task.deskripsi}
                    </p>
                  </div>
                )}

                {/* Info Tenggat Waktu Lengkap */}
                <div className="flex items-center gap-1.5 text-zinc-300 text-xs pt-0.5">
                  <Calendar className="w-3.5 h-3.5 text-[var(--theme-accent,#D97706)] shrink-0" />
                  <span className="text-[11px]">
                    {task.deadline ? (
                      <>
                        <span className="text-zinc-400">Tenggat: </span>
                        <span className="font-medium text-[#FAFAFA]">
                          {formatTanggal(task.deadline)}
                        </span>
                      </>
                    ) : (
                      <span className="text-zinc-400">Tanpa batas waktu</span>
                    )}
                  </span>
                </div>

                {/* Tombol Aksi: Ubah & Hapus (Tap Target >= 44px) */}
                <div className="grid grid-cols-2 gap-2 pt-1.5">
                  <button
                    type="button"
                    onClick={() => onEdit(task)}
                    aria-label={`Ubah tugas ${task.judul}`}
                    className="min-h-[44px] px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.16] text-[#FAFAFA] text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5 text-zinc-300" />
                    Ubah Tugas
                  </button>

                  <button
                    type="button"
                    onClick={() => onDelete(task)}
                    aria-label={`Hapus tugas ${task.judul}`}
                    className="min-h-[44px] px-3 py-2 rounded-xl bg-[#E88B8B]/10 hover:bg-[#E88B8B]/20 border border-[#E88B8B]/20 hover:border-[#E88B8B]/40 text-[#E88B8B] text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Hapus Tugas
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ============================================================ */}
      {/* DESKTOP FULL VIEW (>= 640px)                                 */}
      {/* Tampilan SAMA PERSIS seperti semula (box glassmorphism)      */}
      {/* ============================================================ */}
      <div className="hidden sm:flex sm:flex-col justify-between gap-3 p-5">
        {/* Header Row: Checkbox, Judul (line-clamp-2), Star */}
        <div className="flex items-start gap-2.5">
          {/* 1. Checkbox Bulat Selesai */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.86 }}
            onClick={() => onToggleSelesai(task.id)}
            aria-label={task.selesai ? "Tandai belum selesai" : "Tandai selesai"}
            className="min-h-[44px] min-w-[44px] -ml-2.5 -mt-2.5 inline-flex items-center justify-center shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FAFAFA] rounded-full"
          >
            <span
              className={cn(
                "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors duration-200",
                task.selesai
                  ? "bg-[#8FB88F] border-[#8FB88F] text-[#0A0A0A]"
                  : "border-zinc-500 hover:border-[#FAFAFA] bg-white/[0.02]"
              )}
            >
              {task.selesai && (
                <motion.div
                  initial={{ scale: 0, rotate: -45 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 25 }}
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </motion.div>
              )}
            </span>
          </motion.button>

          {/* 2. Judul Tugas (line-clamp-2) */}
          <div className="relative pt-0.5 min-w-0 flex-1">
            <h3
              className={cn(
                "text-sm font-semibold line-clamp-2 break-words leading-snug transition-colors duration-200",
                task.selesai ? "text-zinc-400 line-through decoration-zinc-500" : "text-[#FAFAFA]"
              )}
              title={task.judul}
            >
              {task.judul}
            </h3>
          </div>

          {/* 3. Star Prioritas Button */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.84 }}
            onClick={() => onTogglePrioritas(task.id)}
            aria-label={task.prioritas ? "Hapus tanda penting" : "Tandai sebagai penting"}
            title={task.prioritas ? "Tugas penting (klik untuk batalkan)" : "Tandai sebagai penting"}
            className="min-h-[44px] min-w-[44px] -mr-2 -mt-2 inline-flex items-center justify-center shrink-0 rounded-lg text-zinc-400 hover:text-[#F59E0B] hover:bg-white/[0.06] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F59E0B] cursor-pointer"
          >
            <motion.div
              animate={task.prioritas ? { scale: [0.8, 1.25, 1], rotate: [0, 15, 0] } : { scale: 1, rotate: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
              <Star
                className={cn(
                  "w-4 h-4 transition-colors duration-200",
                  task.prioritas && "text-[#F59E0B] fill-[#F59E0B]"
                )}
              />
            </motion.div>
          </motion.button>
        </div>

        {/* Deskripsi Tugas (Indentasi sejajar judul) */}
        {task.deskripsi && (
          <p className="text-xs text-zinc-300 line-clamp-2 leading-relaxed pl-8 -mt-1">
            {task.deskripsi}
          </p>
        )}

        {/* Footer Metadata & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-white/[0.06] text-xs">
          {/* Left: Kategori & Status Pills */}
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            {kategori ? (
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border border-white/[0.06] whitespace-nowrap"
                style={{
                  backgroundColor: `${kategori.warna}20`,
                  color: kategori.warna,
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: kategori.warna }}
                />
                {kategori.nama}
              </span>
            ) : (
              <span className="text-zinc-400 text-[11px]">Tanpa Kategori</span>
            )}

            {/* Status Pills: Terlewat / Hari Ini / Selesai */}
            {!task.selesai && status === "terlewat" && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#E88B8B]/15 text-[#E88B8B] border border-[#E88B8B]/30 whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-[#E88B8B] animate-pulse" />
                Terlewat ({sisaWaktu})
              </span>
            )}

            {!task.selesai && status === "hari-ini" && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--theme-accent,#D97706)]/15 text-[var(--theme-accent,#D97706)] border border-[var(--theme-accent,#D97706)]/30 whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--theme-accent,#D97706)] animate-pulse" />
                Hari Ini ({sisaWaktu})
              </span>
            )}

            {task.selesai && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#8FB88F]/15 text-[#8FB88F] border border-[#8FB88F]/30 whitespace-nowrap">
                <Check className="w-3 h-3" />
                Selesai
              </span>
            )}
          </div>

          {/* Right: Actions (Edit, Trash) & Tanggal */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => onEdit(task)}
              aria-label={`Ubah tugas ${task.judul}`}
              title="Ubah tugas"
              className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-zinc-400 hover:text-[#FAFAFA] hover:bg-white/[0.06] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FAFAFA] cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => onDelete(task)}
              aria-label={`Hapus tugas ${task.judul}`}
              title="Hapus tugas"
              className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-zinc-400 hover:text-[#E88B8B] hover:bg-[#E88B8B]/10 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E88B8B] cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            <div className="flex items-center gap-1.5 text-zinc-300 text-[11px] pl-1">
              {task.deadline ? (
                <span
                  className={cn(
                    "inline-flex items-center gap-1",
                    status === "terlewat" && "text-[#E88B8B] font-medium",
                    status === "hari-ini" && "text-[var(--theme-accent,#D97706)] font-medium"
                  )}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  {formatTanggal(task.deadline)}
                </span>
              ) : (
                <span className="text-zinc-400">Tanpa batas waktu</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
