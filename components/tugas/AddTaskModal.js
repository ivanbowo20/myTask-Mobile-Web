'use client';

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import DeadlineAlert from "./DeadlineAlert";
import ReminderPicker from "./ReminderPicker";
import CustomSelect from "@/components/ui/CustomSelect";
import Magnet from "@/components/ui/Magnet";
import { WAKTU_ACUAN } from "@/lib/utils";
import { Plus } from "lucide-react";

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

  // Real-time deadline validation
  const isDeadlinePast =
    deadline &&
    new Date(deadline).getTime() <= (WAKTU_ACUAN || new Date()).getTime();

  function handleSubmit(e) {
    e.preventDefault();
    if (!judul.trim()) {
      setErrorJudul("Judul tugas wajib diisi");
      return;
    }
    if (isDeadlinePast) {
      return;
    }

    onAddTask({
      judul: judul.trim(),
      deskripsi: deskripsi.trim(),
      deadline: deadline ? new Date(deadline).toISOString() : null,
      reminder,
      kategoriId: kategoriId ? Number(kategoriId) : null,
      prioritas,
      selesai: false,
    });

    handleClose();
  }

  function handleClose() {
    setJudul("");
    setDeskripsi("");
    setDeadline("");
    setReminder("1h");
    setKategoriId("");
    setPrioritas(false);
    setErrorJudul("");
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
        {/* Judul Tugas */}
        <Input
          id="task-title"
          label="Judul Tugas"
          placeholder="Apa yang perlu Anda selesaikan?"
          value={judul}
          onChange={(e) => {
            setJudul(e.target.value);
            if (errorJudul) setErrorJudul("");
          }}
          error={errorJudul}
          autoFocus
        />

        {/* Deskripsi */}
        <div className="space-y-1.5">
          <label
            htmlFor="task-desc"
            className="block text-xs font-semibold uppercase tracking-wider text-zinc-300"
          >
            Deskripsi (Opsional)
          </label>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label
              htmlFor="task-deadline"
              className="block text-xs font-semibold uppercase tracking-wider text-zinc-300"
            >
              Tenggat Waktu
            </label>
            <input
              id="task-deadline"
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.08] hover:border-white/[0.16] focus:border-[#FAFAFA] focus:outline-none focus:ring-1 focus:ring-white/20 text-base sm:text-sm text-[#FAFAFA] transition-all duration-200 [color-scheme:dark] backdrop-blur-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="task-reminder"
              className="block text-xs font-semibold uppercase tracking-wider text-zinc-300"
            >
              Pengingat Waktu
            </label>
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
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="task-category"
              className="block text-xs font-semibold uppercase tracking-wider text-zinc-300"
            >
              Kategori
            </label>
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
          <CustomSelect
            id="task-category"
            value={kategoriId}
            onChange={setKategoriId}
            categories={categories}
            onOpenAddCategory={onOpenAddCategory}
          />
        </div>

        {/* Prioritas Checkbox */}
        <div className="pt-1">
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

        {/* Footer Actions */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-4 border-t border-white/[0.08]">
          <Button variant="secondary" onClick={handleClose} className="w-full sm:w-auto">
            Batal
          </Button>
          <Magnet padding={50} magnetStrength={3} maxOffset={8} className="w-full sm:w-auto">
            <Button
              type="submit"
              variant="primary"
              disabled={Boolean(isDeadlinePast)}
              className="w-full sm:w-auto"
            >
              Simpan Tugas
            </Button>
          </Magnet>
        </div>
      </form>
    </Modal>
  );
}
