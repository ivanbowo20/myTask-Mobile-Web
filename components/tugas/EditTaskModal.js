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
import { Plus, Loader2, Trash2, Check } from "lucide-react";

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
  const [subtasks, setSubtasks] = useState([]);
  const [newSubtaskJudul, setNewSubtaskJudul] = useState("");

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
      setSubtasks(Array.isArray(task.subtasks) ? task.subtasks : []);
      setNewSubtaskJudul("");
      setErrorJudul("");
    }
  }, [task]);

  function handleAddSubtask() {
    const trimmed = newSubtaskJudul.trim();
    if (!trimmed) return;
    if (subtasks.length >= 15) return;
    setSubtasks((prev) => [
      ...prev,
      {
        id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        judul: trimmed.slice(0, 150),
        selesai: false,
      },
    ]);
    setNewSubtaskJudul("");
  }

  function handleRemoveSubtask(id) {
    setSubtasks((prev) => prev.filter((st) => st.id !== id));
  }

  function handleToggleSubtask(id) {
    setSubtasks((prev) =>
      prev.map((st) => (st.id === id ? { ...st, selesai: !st.selesai } : st))
    );
  }

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

    // Hitung status selesai tugas utama berdasarkan sub-tugas (jika ada)
    const allSubtasksDone = subtasks.length > 0 && subtasks.every((st) => st.selesai);
    const isTaskSelesai = subtasks.length > 0 ? allSubtasksDone : Boolean(task?.selesai);

    const payload = {
      ...task,
      judul: judul.trim(),
      deskripsi: deskripsi.trim(),
      deadline: deadline ? new Date(deadline).toISOString() : null,
      reminder,
      kategoriId: kategoriId ? Number(kategoriId) : null,
      prioritas,
      subtasks,
      selesai: isTaskSelesai,
      selesaiPada: isTaskSelesai ? (task?.selesaiPada || new Date().toISOString()) : null,
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

        {/* Sub-Tugas / Checklist (Langkah Kecil) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-300 inline-flex items-center gap-1.5">
              <span>Sub-Tugas (Langkah Kecil)</span>
              {subtasks.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-white/[0.08] text-[var(--theme-accent,#D97706)]">
                  {subtasks.filter((st) => st.selesai).length}/{subtasks.length} selesai
                </span>
              )}
            </label>
            <span className="text-[11px] text-zinc-400">
              Maks. 15 langkah
            </span>
          </div>

          {/* Quick Input Bar */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Tambah langkah baru... (tekan Enter)"
              value={newSubtaskJudul}
              onChange={(e) => setNewSubtaskJudul(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddSubtask();
                }
              }}
              disabled={subtasks.length >= 15}
              maxLength={150}
              className="flex-1 min-h-[44px] px-3.5 py-2 rounded-xl bg-white/[0.02] border border-white/[0.08] hover:border-white/[0.16] focus:border-[#FAFAFA] focus:outline-none focus:ring-1 focus:ring-white/20 text-sm text-[#FAFAFA] placeholder:text-zinc-400 transition-all duration-200"
            />
            <button
              type="button"
              onClick={handleAddSubtask}
              disabled={!newSubtaskJudul.trim() || subtasks.length >= 15}
              aria-label="Tambah sub-tugas"
              className="min-h-[44px] px-3.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.16] text-[#FAFAFA] border border-white/[0.1] text-xs font-medium inline-flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Tambah</span>
            </button>
          </div>

          {/* Subtasks Item List with Checkboxes */}
          {subtasks.length > 0 && (
            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
              {subtasks.map((st, idx) => (
                <div
                  key={st.id || idx}
                  className="flex items-center justify-between gap-2.5 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs text-zinc-200"
                >
                  <label className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer select-none">
                    <button
                      type="button"
                      onClick={() => handleToggleSubtask(st.id)}
                      aria-label={st.selesai ? "Tandai sub-tugas belum selesai" : "Tandai sub-tugas selesai"}
                      className="w-4 h-4 rounded-full border flex items-center justify-center transition-colors shrink-0 cursor-pointer focus:outline-none"
                      style={{
                        borderColor: st.selesai ? "#8FB88F" : "rgba(255,255,255,0.3)",
                        backgroundColor: st.selesai ? "#8FB88F" : "transparent",
                      }}
                    >
                      {st.selesai && <Check className="w-3 h-3 text-[#0A0A0A] stroke-[3]" />}
                    </button>
                    <span
                      className={`truncate ${
                        st.selesai ? "line-through text-zinc-500" : "text-[#FAFAFA]"
                      }`}
                    >
                      {st.judul}
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => handleRemoveSubtask(st.id)}
                    aria-label={`Hapus sub-tugas ${st.judul}`}
                    className="min-h-[32px] min-w-[32px] inline-flex items-center justify-center text-zinc-400 hover:text-[#E88B8B] p-1 rounded transition-colors cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
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
