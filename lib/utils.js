import { clsx } from "clsx";

// WAKTU_ACUAN diubah menjadi null (menggunakan waktu nyata / new Date() secara default)
export const WAKTU_ACUAN = null;

export function cn(...inputs) {
  return clsx(inputs);
}

export function formatTanggal(isoString, explicitTimeZone = null) {
  if (!isoString) return "-";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "-";

  // Pada server Vercel (Node.js), default ke WIB ('Asia/Jakarta') agar tidak terjadi pergeseran jam UTC
  const timeZone =
    explicitTimeZone ||
    (typeof window !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Jakarta"
      : "Asia/Jakarta");

  const parts = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone,
  }).formatToParts(date);

  const getPart = (type) => parts.find((p) => p.type === type)?.value || "";

  const day = getPart("day");
  const month = getPart("month");
  const year = getPart("year");
  const hour = getPart("hour");
  const minute = getPart("minute");

  return `${day} ${month} ${year}, ${hour}:${minute}`;
}

export function formatTanggalSederhana(isoString, explicitTimeZone = null) {
  if (!isoString) return "-";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "-";

  const timeZone =
    explicitTimeZone ||
    (typeof window !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Jakarta"
      : "Asia/Jakarta");

  const parts = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone,
  }).formatToParts(date);

  const getPart = (type) => parts.find((p) => p.type === type)?.value || "";
  const weekday = getPart("weekday");
  const day = getPart("day");
  const month = getPart("month");
  const year = getPart("year");

  return `${weekday}, ${day} ${month} ${year}`;
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

  const timeZone =
    typeof window !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Jakarta"
      : "Asia/Jakarta";

  const getLocalDateKey = (d) =>
    new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone,
    }).format(d);

  const tglDeadline = getLocalDateKey(deadline);
  const tglAcuan = getLocalDateKey(waktuBanding);

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
