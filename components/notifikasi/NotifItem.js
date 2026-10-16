import { Check, Clock, AlertTriangle, Calendar } from "lucide-react";
import { formatTanggal, hitungSisaWaktu, cn } from "@/lib/utils";

export default function NotifItem({ task, type, kategori, onMarkDone }) {
  const sisa = hitungSisaWaktu(task.deadline);

  let icon = <Clock className="w-4 h-4 text-[#A1A1AA]" />;
  let badgeColor = "text-[#A1A1AA] bg-white/[0.06] border-white/[0.1]";
  let labelType = "Mendatang";
  let borderLeft = "border-l-4 border-l-white/20";

  if (type === "terlewat") {
    icon = <AlertTriangle className="w-4 h-4 text-[#E88B8B]" />;
    badgeColor = "text-[#E88B8B] bg-[#E88B8B]/15 border-[#E88B8B]/30";
    labelType = "Terlewat";
    borderLeft = "border-l-4 border-l-[#E88B8B]";
  } else if (type === "hari-ini") {
    icon = <Calendar className="w-4 h-4 text-[var(--theme-accent,#D97706)]" />;
    badgeColor = "text-[var(--theme-accent,#D97706)] bg-[var(--theme-accent,#D97706)]/15 border-[var(--theme-accent,#D97706)]/30";
    labelType = "Hari Ini";
    borderLeft = "border-l-4 border-l-[var(--theme-accent,#D97706)]";
  }

  return (
    <div
      className={cn(
        "p-3 rounded-xl bg-white/[0.03] backdrop-blur-md border border-white/[0.08] hover:border-white/[0.16] hover:bg-white/[0.06] transition-all duration-200 flex items-start justify-between gap-3",
        borderLeft
      )}
    >
      <div className="flex items-start gap-2.5 min-w-0">
        <div className="mt-0.5 shrink-0">{icon}</div>
        <div className="space-y-1 min-w-0">
          <p className="text-xs font-semibold text-[#FAFAFA] truncate" title={task.judul}>
            {task.judul}
          </p>
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className={cn("px-2 py-0.5 rounded-full border font-medium", badgeColor)}>
              {labelType} • {sisa}
            </span>
            {kategori && (
              <span
                className="px-2 py-0.5 rounded-full font-medium border border-white/[0.06]"
                style={{
                  backgroundColor: `${kategori.warna}15`,
                  color: kategori.warna,
                }}
              >
                {kategori.nama}
              </span>
            )}
          </div>
        </div>
      </div>

      {onMarkDone && !task.selesai && (
        <button
          type="button"
          onClick={() => onMarkDone(task.id)}
          aria-label={`Tandai tugas ${task.judul} selesai`}
          className="min-h-[44px] min-w-[44px] shrink-0 inline-flex items-center justify-center rounded-lg text-xs font-semibold text-[#8FB88F] bg-[#8FB88F]/10 hover:bg-[#8FB88F] hover:text-[#0A0A0A] border border-[#8FB88F]/30 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8FB88F]"
        >
          <Check className="w-4 h-4 mr-1 stroke-[2.5]" />
          Selesai
        </button>
      )}
    </div>
  );
}

