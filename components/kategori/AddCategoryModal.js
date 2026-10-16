'use client';

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import {
  PRESET_WARNA_KATEGORI,
  CATEGORY_ICONS,
  DEFAULT_CATEGORY_ICON,
  detectIconByCategoryName,
} from "@/lib/constants";
import {
  GraduationCap,
  Briefcase,
  User,
  ShoppingCart,
  HeartPulse,
  Home,
  Wallet,
  Dumbbell,
  Utensils,
  Code,
  Palette,
  BookOpen,
  Plane,
  Folder,
} from "lucide-react";

const ICON_MAP = {
  GraduationCap,
  Briefcase,
  User,
  ShoppingCart,
  HeartPulse,
  Home,
  Wallet,
  Dumbbell,
  Utensils,
  Code,
  Palette,
  BookOpen,
  Plane,
  Folder,
};

export default function AddCategoryModal({ isOpen, onClose, onAdd }) {
  const [nama, setNama] = useState("");
  const [warna, setWarna] = useState("#38BDF8");
  const [selectedIcon, setSelectedIcon] = useState(DEFAULT_CATEGORY_ICON);
  const [userPickedIcon, setUserPickedIcon] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    if (!nama.trim()) {
      setError("Nama kategori wajib diisi");
      return;
    }
    onAdd({
      nama: nama.trim(),
      warna,
      icon: selectedIcon,
    });
    setNama("");
    setWarna("#38BDF8");
    setSelectedIcon(DEFAULT_CATEGORY_ICON);
    setUserPickedIcon(false);
    setError("");
    onClose();
  }

  function handleClose() {
    setError("");
    setNama("");
    setSelectedIcon(DEFAULT_CATEGORY_ICON);
    setUserPickedIcon(false);
    onClose();
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Tambah Kategori Baru"
      description="Buat kategori baru untuk mengelompokkan tugas Anda secara rapi."
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        <Input
          id="add-category-name"
          label="Nama Kategori"
          placeholder="Contoh: Proyek Desain, Hobi, Olahraga..."
          value={nama}
          onChange={(e) => {
            const val = e.target.value;
            setNama(val);
            if (error) setError("");
            if (!userPickedIcon) {
              setSelectedIcon(detectIconByCategoryName(val));
            }
          }}
          error={error}
          autoFocus
        />

        {/* Color Palette Picker */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#A1A1AA]">
            Pilih Warna Kategori
          </label>
          <div className="flex flex-wrap items-center gap-2.5">
            {PRESET_WARNA_KATEGORI.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setWarna(color)}
                className={`w-9 h-9 rounded-full border-2 transition-all flex items-center justify-center cursor-pointer ${
                  warna.toLowerCase() === color.toLowerCase()
                    ? "border-[#FAFAFA] scale-110 shadow-md"
                    : "border-transparent hover:scale-105"
                }`}
                style={{ backgroundColor: color }}
                aria-label={`Pilih warna ${color}`}
              />
            ))}
            {/* Custom Color Input */}
            <div className="flex items-center gap-2 ml-1">
              <input
                type="color"
                value={warna}
                onChange={(e) => setWarna(e.target.value)}
                className="w-9 h-9 rounded-xl bg-transparent border border-white/[0.16] cursor-pointer"
                title="Pilih warna kustom"
              />
              <span className="text-xs font-mono text-[#A1A1AA] uppercase">
                {warna}
              </span>
            </div>
          </div>
        </div>

        {/* Icon Picker Section */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#A1A1AA]">
            Pilih Ikon Kategori
          </label>
          <div className="grid grid-cols-5 sm:grid-cols-7 gap-2">
            {CATEGORY_ICONS.map((iconName) => {
              const IconComp = ICON_MAP[iconName] || Folder;
              const isSelected = selectedIcon === iconName;
              return (
                <button
                  key={iconName}
                  type="button"
                  onClick={() => {
                    setSelectedIcon(iconName);
                    setUserPickedIcon(true);
                  }}
                  className={`min-h-[44px] min-w-[44px] aspect-square rounded-xl flex items-center justify-center border transition-all cursor-pointer ${
                    isSelected
                      ? "border-white/40 bg-white/10 shadow-sm scale-105"
                      : "border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06] text-[#A1A1AA] hover:text-[#FAFAFA]"
                  }`}
                  style={isSelected ? { color: warna } : undefined}
                  aria-label={`Pilih ikon ${iconName}`}
                >
                  <IconComp size={20} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-4 border-t border-white/[0.08]">
          <Button variant="secondary" onClick={handleClose} className="w-full sm:w-auto">
            Batal
          </Button>
          <Button type="submit" variant="primary" className="w-full sm:w-auto">
            Simpan Kategori
          </Button>
        </div>
      </form>
    </Modal>
  );
}
