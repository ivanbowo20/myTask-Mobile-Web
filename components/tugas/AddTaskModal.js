'use client';

import { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import DeadlineAlert from "./DeadlineAlert";
import ReminderPicker from "./ReminderPicker";
import DateTimePicker from "@/components/ui/DateTimePicker";
import CustomSelect from "@/components/ui/CustomSelect";
import Magnet from "@/components/ui/Magnet";
import { Plus, Loader2, Star, Calendar, Bell, Folder, AlignLeft } from "lucide-react";
import { cn, formatTanggalSederhana } from "@/lib/utils";
import { REMINDER_OPTIONS } from "@/lib/constants";

export default function AddTaskModal({
  isOpen,
  onClose,
  categories,
  onAddTask,
  onOpenAddCategory,
}) {
  const [judul, setJudul] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [deadline, setDeadline] = useState("");
  const [reminder, setReminder] = useState("1h");
  const [kategoriId, setKategoriId] = useState("");
  const [prioritas, setPrioritas] = useState(false);
  const [errorJudul, setErrorJudul] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mobile quick-capture disclosure states
  const [showDeskripsi, setShowDeskripsi] = useState(false);
  const [activeMobileSection, setActiveMobileSection] = useState(null);

  // Delay auto-focus 250ms to allow mobile sheet entrance animation to complete smoothly
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        document.getElementById('task-title-input')?.focus();
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Real-time deadline validation
  const isDeadlinePast =
    deadline &&
    new Date(deadline).getTime() <= Date.now();

  const selectedCategory = categories?.find((c) => String(c.id) === String(kategoriId));
  const reminderLabel = REMINDER_OPTIONS?.find((r) => r.value === reminder)?.label || reminder;

  async function handleSubmit(e) {
    e.preventDefault();
    if (isSubmitting) return;

    if (!judul.trim()) {
      setErrorJudul("Judul tugas wajib diisi");
      return;
    }
    if (isDeadlinePast) {
      return;
    }

    try {
      setIsSubmitting(true);
      const startTime = Date.now();
      const res = await onAddTask({
        judul: judul.trim(),
        deskripsi: deskripsi.trim(),
        deadline: deadline ? new Date(deadline).toISOString() : null,
        reminder,
        kategoriId: kategoriId ? Number(kategoriId) : null,
        prioritas,
        selesai: false,
      });

      // Berikan jeda visual minimal ~350ms agar animasi loading spinner sempat terlihat oleh mata pengguna
      if (res?.success !== false) {
        const elapsed = Date.now() - startTime;
        if (elapsed < 350) {
          await new Promise((resolve) => setTimeout(resolve, 350 - elapsed));
        }
        handleClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleClose() {
    if (isSubmitting) return;
    setJudul("");
    setDeskripsi("");
    setDeadline("");
    setReminder("1h");
    setKategoriId("");
    setPrioritas(false);
    setErrorJudul("");
    setShowDeskripsi(false);
    setActiveMobileSection(null);
    onClose();
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Tambah Tugas Baru"
      description="Isi rincian tugas, tenggat waktu, dan pengingat."
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {/* Judul Tugas: Prominent & Borderless on Mobile, Boxed on Desktop */}
        <div className="space-y-1.5">
          <label
            htmlFor="task-title-input"
            className="hidden lg:block text-xs font-semibold uppercase tracking-wider text-zinc-300"
          >
            Judul Tugas
          </label>
          <input
            id="task-title-input"
            data-delayed-focus="true"
            type="text"
            placeholder="Apa yang perlu diselesaikan?"
            value={judul}
            onChange={(e) => {
              setJudul(e.target.value);
              if (errorJudul) setErrorJudul("");
            }}
            className="w-full text-lg lg:text-base font-medium text-[#FAFAFA] placeholder:text-zinc-500 bg-transparent lg:bg-white/[0.02] border-0 lg:border border-transparent lg:border-white/[0.08] lg:hover:border-white/[0.16] focus:outline-none lg:focus:border-[#FAFAFA] lg:focus:ring-1 lg:focus:ring-white/20 rounded-none lg:rounded-xl px-0 lg:px-3.5 py-2 lg:py-2.5 transition-all duration-200"
          />
          {errorJudul && (
            <p className="text-xs text-[#E88B8B] font-medium">{errorJudul}</p>
          )}
        </div>

        {/* Mobile Horizontal Quick-Action Chips */}
        <div className="lg:hidden flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {/* Priority Chip */}
          <button
            type="button"
            onClick={() => setPrioritas((prev) => !prev)}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors shrink-0 cursor-pointer",
              prioritas
                ? "bg-[#F59E0B]/20 border-[#F59E0B]/40 text-[#F59E0B]"
                : "bg-white/[0.04] border-white/[0.08] text-zinc-400 hover:text-zinc-200"
            )}
          >
            <Star className={cn("w-3.5 h-3.5", prioritas && "fill-[#F59E0B]")} />
            <span>{prioritas ? "Penting" : "Prioritas"}</span>
          </button>

          {/* Notes Toggle Chip */}
          <button
            type="button"
            onClick={() => setShowDeskripsi((prev) => !prev)}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors shrink-0 cursor-pointer",
              deskripsi
                ? "bg-[var(--theme-accent,#D97706)]/20 border-[var(--theme-accent,#D97706)]/40 text-[var(--theme-accent,#D97706)]"
                : showDeskripsi
                ? "bg-white/[0.12] border-white/[0.24] text-white"
                : "bg-white/[0.04] border-white/[0.08] text-zinc-400 hover:text-zinc-200"
            )}
          >
            <AlignLeft className="w-3.5 h-3.5" />
            <span>{deskripsi ? "Catatan ✓" : "+ Catatan"}</span>
          </button>

          {/* Deadline Chip */}
          <button
            type="button"
            onClick={() =>
              setActiveMobileSection((prev) => (prev === "deadline" ? null : "deadline"))
            }
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors shrink-0 cursor-pointer",
              deadline
                ? "bg-[var(--theme-accent,#D97706)]/20 border-[var(--theme-accent,#D97706)]/40 text-[var(--theme-accent,#D97706)]"
                : activeMobileSection === "deadline"
                ? "bg-white/[0.12] border-white/[0.24] text-white"
                : "bg-white/[0.04] border-white/[0.08] text-zinc-400 hover:text-zinc-200"
            )}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>{deadline ? formatTanggalSederhana(deadline) : "Tenggat"}</span>
          </button>

          {/* Reminder Chip */}
          <button
            type="button"
            onClick={() =>
              setActiveMobileSection((prev) => (prev === "reminder" ? null : "reminder"))
            }
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors shrink-0 cursor-pointer",
              activeMobileSection === "reminder"
                ? "bg-white/[0.12] border-white/[0.24] text-white"
                : "bg-white/[0.04] border-white/[0.08] text-zinc-400 hover:text-zinc-200"
            )}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>{reminderLabel || "Pengingat"}</span>
          </button>

          {/* Category Chip */}
          <button
            type="button"
            onClick={() =>
              setActiveMobileSection((prev) => (prev === "kategori" ? null : "kategori"))
            }
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors shrink-0 cursor-pointer",
              selectedCategory
                ? "border-white/[0.2] text-white"
                : activeMobileSection === "kategori"
                ? "bg-white/[0.12] border-white/[0.24] text-white"
                : "bg-white/[0.04] border-white/[0.08] text-zinc-400 hover:text-zinc-200"
            )}
            style={
              selectedCategory
                ? {
                    backgroundColor: `${selectedCategory.warna}25`,
                    borderColor: selectedCategory.warna,
                    color: selectedCategory.warna,
                  }
                : undefined
            }
          >
            <Folder className="w-3.5 h-3.5" />
            <span>{selectedCategory ? selectedCategory.nama : "Kategori"}</span>
          </button>
        </div>

        {/* Deskripsi - Progressive Disclosure on Mobile, Always Visible on Desktop */}
        <div
          className={cn(
            "space-y-1.5 transition-all duration-200",
            !showDeskripsi ? "hidden lg:block" : "block"
          )}
        >
          <div className="flex items-center justify-between">
            <label
              htmlFor="task-desc"
              className="block text-xs font-semibold uppercase tracking-wider text-zinc-300"
            >
              Deskripsi (Opsional)
            </label>
            <button
              type="button"
              onClick={() => setShowDeskripsi(false)}
              className="text-[11px] text-zinc-400 hover:text-white lg:hidden cursor-pointer"
            >
              Sembunyikan
            </button>
          </div>
          <textarea
            id="task-desc"
            rows={3}
            placeholder="Tambahkan catatan atau detail instruksi tugas..."
            value={deskripsi}
            onChange={(e) => setDeskripsi(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.08] hover:border-white/[0.16] focus:border-[#FAFAFA] focus:outline-none focus:ring-1 focus:ring-white/20 text-base sm:text-sm text-[#FAFAFA] placeholder:text-zinc-400 transition-all duration-200 resize-y backdrop-blur-sm"
          />
        </div>

        {/* Tenggat Waktu & Pengingat */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div
            className={cn(
              "space-y-1.5",
              activeMobileSection === "deadline"
                ? "block"
                : "hidden lg:block"
            )}
          >
            <div className="flex items-center justify-between">
              <label
                htmlFor="task-deadline"
                className="block text-xs font-semibold uppercase tracking-wider text-zinc-300"
              >
                Tenggat Waktu
              </label>
              <button
                type="button"
                onClick={() => setActiveMobileSection(null)}
                className="text-[11px] text-zinc-400 hover:text-white lg:hidden cursor-pointer"
              >
                Tutup
              </button>
            </div>
            <DateTimePicker
              id="task-deadline"
              value={deadline}
              onChange={setDeadline}
            />
          </div>

          <div
            className={cn(
              "space-y-1.5",
              activeMobileSection === "reminder"
                ? "block"
                : "hidden lg:block"
            )}
          >
            <div className="flex items-center justify-between">
              <label
                htmlFor="task-reminder"
                className="block text-xs font-semibold uppercase tracking-wider text-zinc-300"
              >
                Pengingat Waktu
              </label>
              <button
                type="button"
                onClick={() => setActiveMobileSection(null)}
                className="text-[11px] text-zinc-400 hover:text-white lg:hidden cursor-pointer"
              >
                Tutup
              </button>
            </div>
            <ReminderPicker
              id="task-reminder"
              value={reminder}
              onChange={setReminder}
            />
          </div>
        </div>

        {/* Warning if deadline is in past */}
        {isDeadlinePast && (
          <DeadlineAlert message="Tenggat waktu yang Anda pilih sudah lewat dari waktu saat ini. Harap tentukan waktu mendatang." />
        )}

        {/* Kategori dengan Quick Add */}
        <div
          className={cn(
            "space-y-1.5",
            activeMobileSection === "kategori"
              ? "block"
              : "hidden lg:block"
          )}
        >
          <div className="flex items-center justify-between">
            <label
              htmlFor="task-category"
              className="block text-xs font-semibold uppercase tracking-wider text-zinc-300"
            >
              Kategori
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveMobileSection(null)}
                className="text-[11px] text-zinc-400 hover:text-white lg:hidden cursor-pointer"
              >
                Tutup
              </button>
              <Magnet padding={40} magnetStrength={3} maxOffset={6}>
                <button
                  type="button"
                  onClick={onOpenAddCategory}
                  className="text-xs text-[#FAFAFA] hover:text-white hover:underline inline-flex items-center gap-1 cursor-pointer font-medium transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tambah Kategori Baru
                </button>
              </Magnet>
            </div>
          </div>
          <CustomSelect
            id="task-category"
            value={kategoriId}
            onChange={setKategoriId}
            categories={categories}
            onOpenAddCategory={onOpenAddCategory}
          />
        </div>

        {/* Prioritas Checkbox (Desktop only, mobile has horizontal chip) */}
        <div className="pt-1 hidden lg:block">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={prioritas}
              onChange={(e) => setPrioritas(e.target.checked)}
              className="w-5 h-5 rounded border border-white/[0.16] bg-white/[0.04] text-[#FAFAFA] focus:ring-1 focus:ring-white/30 cursor-pointer accent-white"
            />
            <span className="text-sm font-medium text-[#FAFAFA]">
              Tandai sebagai tugas penting (prioritas)
            </span>
          </label>
        </div>

        {/* Sticky Footer Actions */}
        <div className="sticky bottom-0 z-10 bg-[#0A0A0C]/90 backdrop-blur-md p-4 border-t border-white/10 flex items-center justify-end gap-3 mt-4 -mx-1 sm:-mx-0">
          {/* Desktop-only Batal Button */}
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={isSubmitting}
            className="hidden lg:inline-flex w-auto"
          >
            Batal
          </Button>

          {/* Primary Save CTA: Full-width on mobile, auto on desktop */}
          <Magnet
            padding={50}
            magnetStrength={3}
            maxOffset={8}
            className="w-full lg:w-auto"
            innerClassName="w-full"
          >
            <Button
              type="submit"
              variant="primary"
              disabled={Boolean(isDeadlinePast) || isSubmitting}
              className="w-full lg:w-auto min-w-[130px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#0A0A0A]" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                "Simpan Tugas"
              )}
            </Button>
          </Magnet>
        </div>
      </form>
    </Modal>
  );
}

