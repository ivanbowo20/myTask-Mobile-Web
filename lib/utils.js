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

/**
 * Evaluasi 4 kriteria aturan keamanan kata sandi:
 * 1. Minimal 8 karakter
 * 2. Minimal 1 huruf besar (uppercase)
 * 3. Minimal 1 angka (digit)
 * 4. Minimal 1 simbol khusus
 */
export function evaluasiAturanPassword(password) {
  const str = typeof password === "string" ? password : "";
  const minLength = str.length >= 8;
  const hasUppercase = /[A-Z]/.test(str);
  const hasNumber = /[0-9]/.test(str);
  const hasSymbol = /[^A-Za-z0-9]/.test(str);

  const criteria = [
    { id: "length", label: "8+ karakter", passed: minLength },
    { id: "uppercase", label: "1 huruf besar", passed: hasUppercase },
    { id: "number", label: "1 angka", passed: hasNumber },
    { id: "symbol", label: "1 simbol", passed: hasSymbol },
  ];

  const score = criteria.filter((c) => c.passed).length;
  const isValid = score === 4;

  let strength = "none";
  let strengthLabel = "";
  if (str.length > 0) {
    if (score <= 1) {
      strength = "very-weak";
      strengthLabel = "Sangat Lemah";
    } else if (score === 2) {
      strength = "weak";
      strengthLabel = "Lemah";
    } else if (score === 3) {
      strength = "medium";
      strengthLabel = "Sedang";
    } else {
      strength = "strong";
      strengthLabel = "Kuat & Aman";
    }
  }

  return {
    criteria,
    score,
    isValid,
    strength,
    strengthLabel,
  };
}

export function htmlToChatFormattedText(html) {
  if (!html) return '';
  let s = String(html);
  // Replace non-breaking spaces & variants
  s = s.replace(/&nbsp;/gi, ' ').replace(/\u00A0/g, ' ');
  // Convert bold to *bold* (WhatsApp / Telegram / Markdown friendly)
  s = s.replace(/<(?:strong|b)\b[^>]*>([\s\S]*?)<\/(?:strong|b)>/gi, (m, p1) => {
    const t = p1.trim();
    return t ? ` *${t}* ` : '';
  });
  // Convert italic to _italic_
  s = s.replace(/<(?:em|i)\b[^>]*>([\s\S]*?)<\/(?:em|i)>/gi, (m, p1) => {
    const t = p1.trim();
    return t ? ` _${t}_ ` : '';
  });
  // Convert list items
  s = s.replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, '\n• $1');
  // Convert line breaks and paragraph ends
  s = s.replace(/<br\s*\/?>/gi, '\n');
  s = s.replace(/<\/(?:p|div|h[1-6]|blockquote)>/gi, '\n');
  // Strip remaining HTML tags
  s = s.replace(/<[^>]+>/g, '');
  // Unescape standard HTML entities
  s = s.replace(/&amp;/gi, '&')
       .replace(/&lt;/gi, '<')
       .replace(/&gt;/gi, '>')
       .replace(/&quot;/gi, '"')
       .replace(/&#39;/gi, "'");
  // Clean up whitespace & line breaks
  s = s.replace(/[ \t]+/g, ' ');
  s = s.replace(/ *\n */g, '\n');
  s = s.replace(/\n{3,}/g, '\n\n');
  return s.trim();
}

