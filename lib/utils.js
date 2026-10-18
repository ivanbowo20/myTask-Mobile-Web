// WAKTU_ACUAN diubah menjadi null (menggunakan waktu nyata / new Date() secara default)
export const WAKTU_ACUAN = null;

export function cn(...inputs) {
  return inputs.filter(Boolean).join(" ");
}

export function formatTanggal(isoString) {
  if (!isoString) return "-";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "-";

  const bulan = [
    "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
    "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
  ];

  const tgl = date.getDate();
  const bln = bulan[date.getMonth()];
  const thn = date.getFullYear();
  const jam = String(date.getHours()).padStart(2, "0");
  const mnt = String(date.getMinutes()).padStart(2, "0");

  return `${tgl} ${bln} ${thn}, ${jam}:${mnt}`;
}

export function formatTanggalSederhana(isoString) {
  if (!isoString) return "-";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "-";

  const bulan = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  const hari = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  return `${hari[date.getDay()]}, ${date.getDate()} ${bulan[date.getMonth()]} ${date.getFullYear()}`;
}

export function hitungStatusDeadline(task, acuan = null) {
  if (!task) return "tanpa-deadline";
  if (task.selesai) return "selesai";
  if (!task.deadline) return "tanpa-deadline";

  const deadline = new Date(task.deadline);
  if (isNaN(deadline.getTime())) return "tanpa-deadline";

  let waktuBanding = acuan instanceof Date ? acuan : (acuan ? new Date(acuan) : new Date());
  if (isNaN(waktuBanding.getTime())) {
    waktuBanding = new Date();
  }

  if (deadline.getTime() < waktuBanding.getTime()) {
    return "terlewat";
  }

  const tglDeadline = `${deadline.getFullYear()}-${deadline.getMonth()}-${deadline.getDate()}`;
  const tglAcuan = `${waktuBanding.getFullYear()}-${waktuBanding.getMonth()}-${waktuBanding.getDate()}`;

  if (tglDeadline === tglAcuan) {
    return "hari-ini";
  }

  return "akan-datang";
}

export function hitungSisaWaktu(deadlineIso, acuan = null) {
  if (!deadlineIso) return "Tanpa deadline";
  const deadline = new Date(deadlineIso);
  if (isNaN(deadline.getTime())) return "-";

  let waktuBanding = acuan instanceof Date ? acuan : (acuan ? new Date(acuan) : new Date());
  if (isNaN(waktuBanding.getTime())) {
    waktuBanding = new Date();
  }
  const diffMs = deadline.getTime() - waktuBanding.getTime();
  const absMs = Math.abs(diffMs);

  const menit = Math.floor(absMs / (1000 * 60));
  const jam = Math.floor(absMs / (1000 * 60 * 60));
  const hari = Math.floor(absMs / (1000 * 60 * 60 * 24));

  if (diffMs < 0) {
    if (hari > 0) return `Terlewat ${hari} hari`;
    if (jam > 0) return `Terlewat ${jam} jam`;
    return `Terlewat ${menit} menit`;
  }

  if (hari > 0) {
    if (hari === 1) return "Besok";
    return `${hari} hari lagi`;
  }
  if (jam > 0) {
    return `Sisa ${jam} jam`;
  }
  return `Sisa ${menit} menit`;
}

export function getKategoriById(categories, id) {
  if (!id) return null;
  return categories.find((c) => c.id === Number(id)) || null;
}

let scrollLockCount = 0;

export function lockBodyScroll() {
  if (typeof window !== 'undefined' && document.body) {
    scrollLockCount++;
    if (scrollLockCount === 1) {
      document.body.style.overflow = 'hidden';
    }
  }
}

export function unlockBodyScroll() {
  if (typeof window !== 'undefined' && document.body) {
    scrollLockCount = Math.max(0, scrollLockCount - 1);
    if (scrollLockCount === 0) {
      document.body.style.overflow = '';
    }
  }
}

// Retention policy: tugas selesai disimpan permanen sebagai arsip riwayat
export const RETENTION_MINUTES = 15;
export const RETENTION_MS = RETENTION_MINUTES * 60 * 1000;

export function hitungSisaWaktuHapus() {
  return null;
}

export function isTaskExpired() {
  return false;
}



