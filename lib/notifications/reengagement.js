// lib/notifications/reengagement.js
// Logika rotasi dan kurasi pesan ajakan (Re-engagement) anti-AI slop

export const REENGAGEMENT_MESSAGES = [
  {
    id: 1,
    day: "senin",
    title: "Rencana pekan ini",
    body: "Tulis satu atau dua hal penting yang ingin kamu selesaikan lebih dulu.",
  },
  {
    id: 2,
    day: "kamis",
    title: "Pemeriksaan tengah pekan",
    body: "Luangkan satu menit untuk melihat apa yang sudah selesai dan apa yang tersisa.",
  },
  {
    id: 3,
    day: "senin",
    title: "Fokus hari ini",
    body: "Catat agenda utamamu agar pikiran lebih tenang saat mulai beraktivitas.",
  },
  {
    id: 4,
    day: "kamis",
    title: "Ringankan daftar tugas",
    body: "Coret yang sudah beres atau rapikan prioritas untuk beberapa hari ke depan.",
  },
  {
    id: 5,
    day: "senin",
    title: "Mulai pekan dengan rapi",
    body: "Keluarkan ide dan tugas yang menumpuk di kepala ke dalam daftar.",
  },
  {
    id: 6,
    day: "kamis",
    title: "Menjelang akhir pekan",
    body: "Pilih tugas prioritas yang ingin kamu tuntaskan sebelum pekan berakhir.",
  },
];

/**
 * Konversi tanggal ke komponen waktu Asia/Jakarta (WIB, UTC+7)
 */
export function getWibDate(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    weekday: "short",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(d);
  const partMap = {};
  for (const p of parts) {
    partMap[p.type] = p.value;
  }

  return {
    year: parseInt(partMap.year, 10),
    month: parseInt(partMap.month, 10),
    day: parseInt(partMap.day, 10),
    hour: parseInt(partMap.hour, 10),
    minute: parseInt(partMap.minute, 10),
    second: parseInt(partMap.second, 10),
    weekday: partMap.weekday, // 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'
  };
}

/**
 * Menghitung pesan ajakan berdasarkan rotasi siklis 1..6
 * - Senin (Minggu 1): #1
 * - Kamis (Minggu 1): #2
 * - Senin (Minggu 2): #3
 * - Kamis (Minggu 2): #4
 * - Senin (Minggu 3): #5
 * - Kamis (Minggu 3): #6
 * Lalu berulang kembali ke #1 setiap 3 minggu.
 */
export function getReengagementMessage(date = new Date()) {
  const wib = getWibDate(date);
  const isThursday = wib.weekday === "Thu";

  // Titik acuan peluncuran: Senin, 2 November 2026 (pekan pertama fitur aktif)
  const EPOCH_MONDAY_MS = Date.UTC(2026, 10, 2);
  const currentUtcMs = Date.UTC(wib.year, wib.month - 1, wib.day);
  const diffDays = Math.floor((currentUtcMs - EPOCH_MONDAY_MS) / (1000 * 60 * 60 * 24));
  const elapsedWeeks = Math.floor(diffDays / 7);

  // Modulo positif aman (handles past or future weeks smoothly)
  const baseSlot = isThursday ? elapsedWeeks * 2 + 1 : elapsedWeeks * 2;
  const slotIndex = ((baseSlot % 6) + 6) % 6;

  return {
    ...REENGAGEMENT_MESSAGES[slotIndex],
    index: slotIndex + 1,
    weekday: wib.weekday,
    wibTime: `${String(wib.hour).padStart(2, "0")}:${String(wib.minute).padStart(2, "0")}`,
  };
}

/**
 * Cek apakah waktu saat ini masuk dalam jendela jadwal kirim (Senin / Kamis pukul 08:00-08:59 WIB)
 */
export function isReengagementScheduleWindow(date = new Date()) {
  const wib = getWibDate(date);
  const isTargetDay = wib.weekday === "Mon" || wib.weekday === "Thu";
  const isTargetHour = wib.hour === 8;

  return isTargetDay && isTargetHour;
}
