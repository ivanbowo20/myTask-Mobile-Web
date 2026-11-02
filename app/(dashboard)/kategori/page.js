'use client';

import { useState } from "react";
import { FolderSimple, Plus } from "@phosphor-icons/react";
import CategoryCard from "@/components/kategori/CategoryCard";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import AnimatedContent from "@/components/ui/AnimatedContent";
import { useTasks } from "@/lib/task-context";
import { detectIconByCategoryName } from "@/lib/constants";

export default function CategoriesPage() {
  const {
    tasks,
    categories,
    addCategory,
    openEditCategory,
    deleteCategory,
    openAddCategory,
  } = useTasks();

  const [categoryToDelete, setCategoryToDelete] = useState(null);

  // Quick inline add form state
  const [namaBaru, setNamaBaru] = useState("");
  const [warnaBaru, setWarnaBaru] = useState("#38BDF8");
  const [errorNama, setErrorNama] = useState("");

  // Map task counts per category
  const taskCountMap = tasks.reduce((acc, task) => {
    if (task.kategoriId) {
      acc[task.kategoriId] = (acc[task.kategoriId] || 0) + 1;
    }
    return acc;
  }, {});

  function handleQuickAdd(e) {
    e.preventDefault();
    if (!namaBaru.trim()) {
      setErrorNama("Nama kategori wajib diisi");
      return;
    }

    addCategory({
      nama: namaBaru.trim(),
      warna: warnaBaru,
      icon: detectIconByCategoryName(namaBaru.trim()),
    });

    setNamaBaru("");
    setWarnaBaru("#38BDF8");
    setErrorNama("");
  }

  return (
    <div className="space-y-8">
      {/* Header (Hero Glass Banner — SielloMita Anti-Washout Standard) */}
      <AnimatedContent delay={0}>
        <div className="glass-card p-4 sm:p-6 rounded-2xl relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5 z-10">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/[0.08] [html[data-theme='celestial-sky']_&]:bg-sky-100/80 [html[data-theme='celestial-sky']_&]:border-sky-200/60 [html[data-theme='celestial-sky']_&]:text-sky-700 flex items-center justify-center text-[#FAFAFA] shadow-sm shrink-0">
                <FolderSimple weight="fill" className="w-4 h-4" />
              </div>
              <h1 className="font-heading text-xl sm:text-2xl font-bold text-[#FAFAFA] [html[data-theme='celestial-sky']_&]:text-[#0F172A] tracking-tight">
                Kategori Tugas
              </h1>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.08] [html[data-theme='celestial-sky']_&]:bg-white/80 [html[data-theme='celestial-sky']_&]:border-sky-200/60 [html[data-theme='celestial-sky']_&]:text-slate-800 text-zinc-300 shadow-sm">
                {categories.length} kategori
              </span>
            </div>
            <p className="text-xs sm:text-sm text-zinc-300 [html[data-theme='celestial-sky']_&]:text-[#334155] [html[data-theme='celestial-sky']_&]:font-medium leading-relaxed">
              Kelompokkan tugas berdasarkan bidang pekerjaan, prioritas hidup, atau kegiatan kuliah.
            </p>
          </div>

          <Button variant="primary" onClick={openAddCategory} className="z-10 shrink-0">
            <Plus weight="bold" className="w-4 h-4" />
            Tambah Kategori
          </Button>
        </div>
      </AnimatedContent>

      {/* Quick Add Inline Card */}
      <AnimatedContent delay={0.08}>
        <div className="glass-panel p-5 sm:p-6 rounded-2xl space-y-4 [html[data-theme='celestial-sky']_&]:bg-white/80 [html[data-theme='celestial-sky']_&]:border-sky-200/60 shadow-sm">
          <h2 className="font-heading text-sm font-bold text-[#FAFAFA] [html[data-theme='celestial-sky']_&]:text-[#0F172A] flex items-center gap-2">
            <Plus weight="bold" className="w-4 h-4 text-[var(--theme-accent,#D97706)]" />
            Tambah Kategori Cepat
          </h2>

          <form onSubmit={handleQuickAdd} className="flex flex-col sm:flex-row items-end gap-3">
            <div className="flex-1 w-full">
              <Input
                id="quick-cat-name"
                placeholder="Contoh: Riset Proyek, Keuangan, Memasak..."
                value={namaBaru}
                onChange={(e) => {
                  setNamaBaru(e.target.value);
                  if (errorNama) setErrorNama("");
                }}
                error={errorNama}
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="color"
                value={warnaBaru}
                onChange={(e) => setWarnaBaru(e.target.value)}
                className="w-11 h-11 rounded-xl bg-transparent border border-white/[0.16] [html[data-theme='celestial-sky']_&]:border-sky-300 cursor-pointer shrink-0"
                title="Pilih warna kategori"
              />

              <Button type="submit" variant="primary" className="flex-1 sm:flex-none active:scale-[0.97] transition-all">
                Tambah
              </Button>
            </div>
          </form>
        </div>
      </AnimatedContent>

      {/* Categories Grid */}
      <AnimatedContent delay={0.16}>
        {categories.length === 0 ? (
          <EmptyState
            icon={FolderSimple}
            title="Belum ada kategori"
            description="Buat kategori pertama Anda untuk memudahkan pengelolaan dan penyaringan tugas."
            actionLabel="Tambah Kategori Baru"
            onAction={openAddCategory}
          />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
            {categories.map((cat) => (
              <div key={cat.id} className="h-full">
                <CategoryCard
                  kategori={cat}
                  jumlahTugas={taskCountMap[cat.id] || 0}
                  onEdit={openEditCategory}
                  onDelete={(c) => setCategoryToDelete(c)}
                />
              </div>
            ))}
          </div>
        )}
      </AnimatedContent>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(categoryToDelete)}
        onClose={() => setCategoryToDelete(null)}
        onConfirm={() => {
          if (categoryToDelete) {
            deleteCategory(categoryToDelete.id);
            setCategoryToDelete(null);
          }
        }}
        title="Hapus Kategori"
        message={`Apakah Anda yakin ingin menghapus kategori "${categoryToDelete?.nama}"? Tugas yang terkait dengan kategori ini tidak akan dihapus, tetapi status kategorinya akan dilepas.`}
      />
    </div>
  );
}
