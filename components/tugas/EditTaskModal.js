'use client';

import { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import DeadlineAlert from "./DeadlineAlert";
import ReminderPicker from "./ReminderPicker";
import DateTimePicker from "@/components/ui/DateTimePicker";
import CustomSelect from "@/components/ui/CustomSelect";
import Magnet from "@/components/ui/Magnet";
import { Plus, Loader2 } from "lucide-react";

export default function EditTaskModal({
  isOpen,
  onClose,
  task,
  categories,
  onUpdateTask,
  onOpenAddCategory,
}) {
  const [judul, setJudul] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [deadline, setDeadline] = useState("");
  const [reminder, setReminder] = useState("1h");
  const [kategoriId, setKategoriId] = useState("");
  const [prioritas, setPrioritas] = useState(false);
  const [errorJudul, setErrorJudul] = useState("");

  // Helper to format ISO to datetime-local input (YYYY-MM-DDTHH:mm)
  function toLocalInputDate(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  // Populate data when task opens
  useEffect(() => {
    if (task) {
      setJudul(task.judul || "");
      setDeskripsi(task.deskripsi || "");
      setDeadline(toLocalInputDate(task.deadline));
      setReminder(task.reminder || "1h");
      setKategoriId(task.kategoriId ? String(task.kategoriId) : "");
      setPrioritas(Boolean(task.prioritas));
      setErrorJudul("");
    }
  }, [task]);

  // Perbaikan Bug #2: Hanya validasi jika due_date BERUBAH!
  const originalDateStr = toLocalInputDate(task?.deadline);
  const isDeadlineChanged = deadline !== originalDateStr;
  const isDeadlinePast = Boolean(
    isDeadlineChanged &&
    deadline &&
    !isNaN(new Date(deadline).getTime()) &&
    new Date(deadline).getTime() <= Date.now()
  );

  function handleSubmit(e) {
    e.preventDefault();

    if (!judul.trim()) {
      setErrorJudul("Judul tugas wajib diisi");
      return;
    }
    if (isDeadlinePast) {
      return;
    }

    const payload = {
      ...task,
      judul: judul.trim(),
      deskripsi: deskripsi.trim(),
      deadline: deadline ? new Date(deadline).toISOString() : null,
      reminder,
      kategoriId: kategoriId ? Number(kategoriId) : null,
      prioritas,
    };

    // 1. Tutup modal seketika (0ms)
    onClose();

    // 2. Kirim update ke background (TaskContext sudah update state secara optimistik)
    onUpdateTask(payload).catch((err) => {
      console.error("Gagal sinkronisasi update tugas di background:", err);
    });
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Ubah Rincian Tugas"
      description="Perbarui informasi tugas, jadwal deadline, atau kategori."
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1 flex flex-col min-h-full">
        {/* Judul Tugas */}
        <Input
          id="edit-task-title"
          label="Judul Tugas"
          placeholder="Judul tugas..."
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
            htmlFor="edit-task-desc"
            className="block text-xs font-semibold uppercase tracking-wider text-zinc-300"
          >
            Deskripsi (Opsional)
          </label>
          <textarea
            id="edit-task-desc"
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
              htmlFor="edit-task-deadline"
              className="block text-xs font-semibold uppercase tracking-wider text-zinc-300"
            >
              Tenggat Waktu
            </label>
            <DateTimePicker
              id="edit-task-deadline"
              value={deadline}
              onChange={setDeadline}
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="edit-task-reminder"
              className="block text-xs font-semibold uppercase tracking-wider text-zinc-300"
            >
              Pengingat Waktu
            </label>
            <ReminderPicker
              id="edit-task-reminder"
              value={reminder}
              onChange={setReminder}
            />
          </div>
        </div>

        {/* Perbaikan Bug #2: Warning only if user attempts to change deadline to past */}
        {isDeadlinePast && (
          <DeadlineAlert message="Perubahan tenggat waktu tidak boleh berada di masa lalu. Harap tentukan waktu mendatang." />
        )}

        {/* Perbaikan Bug #1: Quick Add Kategori muncul di EditTaskModal juga! */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="edit-task-category"
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
            id="edit-task-category"
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

        {/* Sticky Footer Actions (Stays anchored at bottom of screen / adapts above keyboard) */}
        <div className="sticky bottom-0 z-10 bg-[var(--theme-nav-bg,#0C0A09)]/95 lg:bg-transparent backdrop-blur-md lg:backdrop-blur-none p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] lg:p-0 lg:pt-4 border-t border-white/10 lg:border-white/[0.08] flex items-center justify-end gap-3 mt-auto -mx-4 lg:-mx-0">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className="w-1/3 lg:w-auto font-medium"
          >
            Batal
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={Boolean(isDeadlinePast)}
            className="flex-1 lg:w-auto min-w-[150px] font-semibold"
          >
            Simpan Perubahan
          </Button>
        </div>
      </form>
    </Modal>
  );
}
