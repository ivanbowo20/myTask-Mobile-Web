export const WAKTU_ACUAN = new Date("2026-10-13T10:39:11");

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

export function hitungStatusDeadline(task, acuan = WAKTU_ACUAN) {
  if (!task) return "tanpa-deadline";
  if (task.selesai) return "selesai";
  if (!task.deadline) return "tanpa-deadline";

  const deadline = new Date(task.deadline);
  if (isNaN(deadline.getTime())) return "tanpa-deadline";

  const waktuBanding = acuan || new Date();

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

export function hitungSisaWaktu(deadlineIso, acuan = WAKTU_ACUAN) {
  if (!deadlineIso) return "Tanpa deadline";
  const deadline = new Date(deadlineIso);
  if (isNaN(deadline.getTime())) return "-";

  const waktuBanding = acuan || new Date();
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

export const RETENTION_MINUTES = 15;
export const RETENTION_MS = RETENTION_MINUTES * 60 * 1000;

export function hitungSisaWaktuHapus(selesaiPada) {
  if (!selesaiPada) return null;
  const selesaiTime = new Date(selesaiPada).getTime();
  if (isNaN(selesaiTime)) return null;
  const expiredTime = selesaiTime + RETENTION_MS;
  const diff = expiredTime - Date.now();
  if (diff <= 0) return "Segera dihapus";
  const menit = Math.floor(diff / (60 * 1000));
  const detik = Math.floor((diff % (60 * 1000)) / 1000);
  if (menit >= 1) {
    return `${menit} mnt lagi`;
  }
  return `${detik} dtk lagi`;
}

export function isTaskExpired(task) {
  if (!task || !task.selesai || !task.selesaiPada) return false;
  const selesaiTime = new Date(task.selesaiPada).getTime();
  if (isNaN(selesaiTime)) return false;
  return Date.now() - selesaiTime >= RETENTION_MS;
}


