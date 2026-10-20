'use client';

import { Check, Clock, AlertTriangle, Calendar } from "lucide-react";
import { hitungSisaWaktu, cn } from "@/lib/utils";

export default function NotifItem({ task, type, kategori, onMarkDone }) {
  const sisa = hitungSisaWaktu(task.deadline);

  let icon = <Clock className="w-3.5 h-3.5 text-zinc-400" />;
  let statusText = "Mendatang";
  let statusColor = "text-zinc-400";

  if (type === "terlewat") {
    icon = <AlertTriangle className="w-3.5 h-3.5 text-[#E88B8B]" />;
    statusText = "Terlewat";
    statusColor = "text-[#E88B8B] font-medium";
  } else if (type === "hari-ini") {
    icon = <Calendar className="w-3.5 h-3.5 text-[var(--theme-accent,#D97706)]" />;
    statusText = "Hari Ini";
    statusColor = "text-[var(--theme-accent,#D97706)] font-medium";
  }

  return (
    <div
      className={cn(
        "p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.07] hover:border-white/[0.14] transition-all duration-150 flex items-center justify-between gap-3 group"
      )}
    >
      {/* Kolom Informasi Tugas */}
      <div className="flex items-start gap-2.5 min-w-0 flex-1">
        <div className="mt-0.5 shrink-0">{icon}</div>
        <div className="space-y-1 min-w-0 flex-1">
          <p
            className="text-xs font-semibold text-[#FAFAFA] truncate leading-tight group-hover:text-white"
            title={task.judul}
          >
            {task.judul}
          </p>

          <div className="flex items-center gap-1.5 text-[11px] leading-none flex-wrap">
            <span className={statusColor}>
              {statusText} • {sisa}
            </span>

            {kategori && (
              <span className="flex items-center gap-1 text-zinc-400 before:content-['•'] before:text-zinc-600 before:mr-0.5">
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: kategori.warna }}
                />
                <span className="truncate max-w-[120px]">{kategori.nama}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tombol Aksi: Lingkaran Checkmark Minimalis (Apple Reminders / Linear style) */}
      {onMarkDone && !task.selesai && (
        <button
          type="button"
          onClick={() => onMarkDone(task.id)}
          aria-label={`Tandai tugas ${task.judul} selesai`}
          title="Tandai Selesai"
          className="w-8 h-8 min-w-[32px] rounded-full border border-white/20 hover:border-[#8FB88F] bg-white/[0.02] hover:bg-[#8FB88F]/15 text-zinc-400 hover:text-[#8FB88F] flex items-center justify-center transition-all duration-150 active:scale-90 shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8FB88F]"
        >
          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
        </button>
      )}
    </div>
  );
}
