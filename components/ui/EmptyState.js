import { Inbox } from "lucide-react";
import Button from "./Button";

export default function EmptyState({
  icon: Icon = Inbox,
  title = "Tidak ada data",
  description = "Belum ada item yang dapat ditampilkan saat ini.",
  actionLabel,
  onAction,
}) {
  return (
    <div className="w-full py-14 px-6 rounded-2xl bg-[var(--glass-bg)] backdrop-blur-[16px] backdrop-saturate-[120%] border border-[var(--glass-border)] text-center flex flex-col items-center justify-center space-y-4">
      <div className="w-14 h-14 rounded-full bg-[var(--glass-border)] border border-[var(--glass-border)] flex items-center justify-center text-[var(--text-muted)]">
        <Icon className="w-7 h-7" />
      </div>
      <div className="space-y-1 max-w-sm">
        <h3 className="text-base font-semibold text-[var(--text-primary)] font-heading">{title}</h3>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{description}</p>
      </div>
      {actionLabel && onAction && (
        <div className="pt-2">
          <Button variant="primary" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
