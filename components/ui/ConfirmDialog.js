'use client';

import Modal from "./Modal";
import Button from "./Button";
import { AlertTriangle } from "lucide-react";

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = "Konfirmasi Tindakan",
  message = "Apakah Anda yakin ingin melanjutkan tindakan ini? Tindakan ini tidak dapat dibatalkan.",
  confirmLabel = "Ya, Hapus",
  cancelLabel = "Batal",
  isDanger = true,
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-md">
      <div className="space-y-4 pt-1">
        <div className="flex items-start gap-3.5 p-3.5 rounded-lg bg-[rgba(232,139,139,0.08)] border border-[rgba(232,139,139,0.2)]">
          <AlertTriangle className="w-5 h-5 text-[#E88B8B] shrink-0 mt-0.5" />
          <p className="text-xs text-[#A1A1AA] leading-relaxed">{message}</p>
        </div>

        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-3 border-t border-[rgba(255,255,255,0.08)]">
          <Button variant="secondary" onClick={onClose} className="w-full sm:w-auto">
            {cancelLabel}
          </Button>
          <Button
            variant={isDanger ? "danger" : "primary"}
            className="w-full sm:w-auto"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
