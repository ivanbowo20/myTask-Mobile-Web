export const REMINDER_OPTIONS = [
  { value: "15m", label: "15 Menit Sebelum" },
  { value: "30m", label: "30 Menit Sebelum" },
  { value: "1h", label: "1 Jam Sebelum" },
  { value: "3h", label: "3 Jam Sebelum" },
  { value: "6h", label: "6 Jam Sebelum" },
  { value: "1d", label: "1 Hari Sebelum" },
];

export const PRESET_WARNA_KATEGORI = [
  "#38BDF8", // Biru muda
  "#A78BFA", // Ungu
  "#4ADE80", // Hijau
  "#FBBF24", // Kuning
  "#F87171", // Merah
  "#FB7185", // Pink
  "#34D399", // Emerald
  "#60A5FA", // Sky Blue
];

export const CATEGORY_ICONS = [
  // Tier 1 — kategori umum
  "GraduationCap", // Kuliah/Belajar
  "Briefcase", // Kerja
  "User", // Pribadi
  "ShoppingCart", // Belanja
  "HeartPulse", // Kesehatan
  // Tier 2 — preset tambahan
  "Home", // Rumah
  "Wallet", // Keuangan
  "Dumbbell", // Olahraga
  "Utensils", // Makan
  "Code", // Coding/IT
  "Palette", // Desain/Seni
  "BookOpen", // Baca
  "Plane", // Travel
];

export const DEFAULT_CATEGORY_ICON = "Folder";

export const ICON_AUTO_DETECT = [
  { keywords: ["kuliah", "belajar", "sekolah", "study", "class"], icon: "GraduationCap" },
  { keywords: ["kerja", "kantor", "proyek", "meeting", "office", "work"], icon: "Briefcase" },
  { keywords: ["pribadi", "personal", "self"], icon: "User" },
  { keywords: ["belanja", "shopping", "beli"], icon: "ShoppingCart" },
  { keywords: ["kesehatan", "sehat", "health", "obat", "dokter"], icon: "HeartPulse" },
  { keywords: ["rumah", "home", "kos"], icon: "Home" },
  { keywords: ["keuangan", "duit", "uang", "finance", "bayar"], icon: "Wallet" },
  { keywords: ["olahraga", "gym", "fitness", "sport"], icon: "Dumbbell" },
  { keywords: ["makan", "masak", "food", "resep"], icon: "Utensils" },
  { keywords: ["coding", "koding", "programming", "it", "developer", "kode"], icon: "Code" },
  { keywords: ["desain", "design", "seni", "art", "gambar"], icon: "Palette" },
  { keywords: ["baca", "bacaan", "buku", "read", "book"], icon: "BookOpen" },
  { keywords: ["travel", "jalan", "liburan", "trip"], icon: "Plane" },
];

export function detectIconByCategoryName(name) {
  if (!name) return DEFAULT_CATEGORY_ICON;
  const lower = name.toLowerCase();
  const match = ICON_AUTO_DETECT.find(({ keywords }) =>
    keywords.some((k) => lower.includes(k))
  );
  return match ? match.icon : DEFAULT_CATEGORY_ICON;
}

export const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/tugas", label: "Semua Tugas", icon: "ListTodo" },
  { href: "/tugas/hari-ini", label: "Hari Ini", icon: "Calendar", badgeKey: "hariIni" },
  { href: "/tugas/penting", label: "Penting", icon: "Star", badgeKey: "penting" },
  { href: "/tugas/selesai", label: "Selesai", icon: "CheckCircle2", badgeKey: "selesai" },
  { href: "/kategori", label: "Kategori", icon: "Folder" },
  { href: "/notifikasi", label: "Notifikasi", icon: "Bell", badgeKey: "notifikasi" },
  { href: "/pengaturan", label: "Pengaturan", icon: "Settings" },
];
