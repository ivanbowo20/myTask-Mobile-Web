import { AlertTriangle } from "lucide-react";

export default function DeadlineAlert({ message }) {
  return (
    <div
      role="alert"
      className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 backdrop-blur-md flex items-start gap-3 text-xs"
    >
      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
      <span className="font-medium leading-relaxed">
        {message || "Tenggat waktu tidak valid. Silakan pilih tanggal dan jam setelah waktu saat ini."}
      </span>
    </div>
  );
}

