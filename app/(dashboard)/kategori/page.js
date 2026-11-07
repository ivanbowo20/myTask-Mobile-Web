'use client';

import { useState } from "react";
import { motion } from "framer-motion";
import { FolderSimple, Plus } from "@phosphor-icons/react";
import CategoryCard from "@/components/kategori/CategoryCard";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import MotionContainer from "@/components/ui/MotionContainer";
import { useDesktopMotion } from "@/lib/use-desktop-motion";
import { useTasks } from "@/lib/task-context";
import { detectIconByCategoryName } from "@/lib/constants";

const cascadeContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.02,
    },
  },
};

const cascadeItemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

export default function CategoriesPage() {
  const {
    tasks,
    categories,
    addCategory,
    openEditCategory,
    deleteCategory,
    openAddCategory,
  } = useTasks();

  const isDesktop = useDesktopMotion();
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
      <MotionContainer delay={0} className="rounded-2xl">
        <div className="glass-card p-4 sm:p-6 rounded-2xl relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5 z-10">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="w-8 h-8 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] flex items-center justify-center text-[var(--theme-accent)] shadow-sm shrink-0">
                <FolderSimple weight="fill" className="w-4 h-4" />
              </div>
              <h1 className="font-heading text-xl sm:text-2xl font-bold text-[var(--text-primary)] tracking-tight">
                Kategori Tugas
              </h1>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-secondary)] shadow-sm">
                {categories.length} kategori
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
              Kelompokkan tugas berdasarkan bidang pekerjaan, prioritas hidup, atau kegiatan kuliah.
            </p>
          </div>

          <Button variant="primary" onClick={openAddCategory} className="z-10 shrink-0">
            <Plus weight="bold" className="w-4 h-4" />
            Tambah Kategori
          </Button>
        </div>
      </MotionContainer>

      {/* Quick Add Inline Card */}
      <MotionContainer delay={1} className="rounded-2xl">
        <div className="glass-panel p-5 sm:p-6 rounded-2xl space-y-4 shadow-sm">
          <h2 className="font-heading text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
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
                className="w-11 h-11 rounded-xl bg-transparent border border-[var(--glass-border)] cursor-pointer shrink-0"
                title="Pilih warna kategori"
              />

              <Button type="submit" variant="primary" className="flex-1 sm:flex-none active:scale-[0.97] transition-all">
                Tambah
              </Button>
            </div>
          </form>
        </div>
      </MotionContainer>

      {/* Categories Grid */}
      {categories.length === 0 ? (
        <MotionContainer delay={1}>
          <EmptyState
            icon={FolderSimple}
            title="Belum ada kategori"
            description="Buat kategori pertama Anda untuk memudahkan pengelolaan dan penyaringan tugas."
            actionLabel="Tambah Kategori Baru"
            onAction={openAddCategory}
          />
        </MotionContainer>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
          {categories.map((cat, idx) => (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.38,
                delay: Math.min(0.15 + idx * 0.08, 0.65),
                ease: [0.16, 1, 0.3, 1],
              }}
              className="h-full relative rounded-xl sm:rounded-2xl overflow-hidden"
            >
              {/* Subtle Ambient Accent Glow (SielloMita Standard) */}
              <div
                className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[var(--theme-glow-subtle,transparent)] via-transparent to-transparent opacity-25 z-0"
                aria-hidden="true"
              />
              <div className="relative z-10 h-full">
                <CategoryCard
                  kategori={cat}
                  jumlahTugas={taskCountMap[cat.id] || 0}
                  onEdit={openEditCategory}
                  onDelete={(c) => setCategoryToDelete(c)}
                />
              </div>
            </motion.div>
          ))}
        </div>
      )}

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
