/**
 * Utility copywriting anti-AI-slop untuk header dashboard.
 * Menghasilkan sapaan kontekstual berbasis waktu nyata & beban tugas aktual pengguna.
 */

export function getContextualGreeting({
  user,
  stats = {},
  referenceDate = new Date(),
  seed = 0,
}) {
  const rawName = user?.name || user?.nama;
  const name = rawName ? rawName.trim() : 'Anda';
  const firstName = rawName ? rawName.trim().split(' ')[0] : 'Anda';
  const hour = referenceDate.getHours();

  const todayPending = stats.today ?? 0;
  const overdueCount = stats.overdue ?? 0;
  const completedToday = stats.completed ?? 0;
  const urgentCount = overdueCount + todayPending;

  // Kondisi khusus: semua tugas hari ini sudah beres
  if (todayPending === 0 && overdueCount === 0 && completedToday > 0) {
    const allDoneHeadlines = [
      `Semua agenda hari ini beres, ${name}.`,
      `Target hari ini tercapai, ${firstName}.`,
    ];
    return {
      headline: allDoneHeadlines[seed % allDoneHeadlines.length],
      subtext: 'Tidak ada tanggungan mendesak yang tersisa. Saatnya rehat.',
      period: 'done',
    };
  }

  // Penentuan waktu
  if (hour >= 5 && hour < 12) {
    // PAGI
    const headlines = [
      `Selamat pagi, ${name}.`,
      `Mulai hari ini, ${firstName}.`,
      `Rencana kerja hari ini, ${firstName}.`,
      `Fokus pagi ini, ${firstName}.`,
    ];

    let subtext = 'Agenda pagi ini terkendali. Waktu yang baik untuk menyicil tugas penting.';
    if (overdueCount > 0) {
      subtext = `${overdueCount} tugas melewati tenggat dan ${todayPending} tugas hari ini. Utamakan yang mendesak.`;
    } else if (todayPending > 0) {
      subtext = `${todayPending} tugas terjadwal untuk hari ini. Mulai dari prioritas tertinggi.`;
    }

    return {
      headline: headlines[seed % headlines.length],
      subtext,
      period: 'pagi',
    };
  }

  if (hour >= 12 && hour < 15) {
    // SIANG
    const headlines = [
      `Selamat siang, ${name}.`,
      `Lanjutkan progres, ${firstName}.`,
      `Prioritas siang ini, ${firstName}.`,
      `Cek ritme kerja, ${firstName}.`,
    ];

    let subtext = 'Fokus tuntaskan tugas yang sedang berjalan sebelum beralih ke agenda berikutnya.';
    if (todayPending > 0 && completedToday > 0) {
      subtext = `${completedToday} tugas selesai, ${todayPending} masih berjalan. Pertahankan ritmenya.`;
    } else if (todayPending > 0) {
      subtext = `${todayPending} tugas masih menunggu penyelesaian siang ini.`;
    }

    return {
      headline: headlines[seed % headlines.length],
      subtext,
      period: 'siang',
    };
  }

  if (hour >= 15 && hour < 18) {
    // SORE
    const headlines = [
      `Selamat sore, ${name}.`,
      `Menjelang akhir hari, ${firstName}.`,
      `Tinjau sisa agenda, ${firstName}.`,
      `Sore hari, ${firstName}.`,
    ];

    let subtext = 'Waktu kerja sore ini cukup longgar. Rapikan checklist Anda.';
    if (todayPending > 0) {
      subtext = `${todayPending} tugas tersisa untuk hari ini. Tuntaskan yang paling krusial sebelum selesai.`;
    }

    return {
      headline: headlines[seed % headlines.length],
      subtext,
      period: 'sore',
    };
  }

  // MALAM (18:00 - 04:59)
  const headlines = [
    `Selamat malam, ${name}.`,
    `Evaluasi hari ini, ${firstName}.`,
    `Catatan akhir hari, ${firstName}.`,
    `Ringkasan malam ini, ${firstName}.`,
  ];

  let subtext = 'Periksa kembali checklist hari ini dan siapkan prioritas untuk esok.';
  if (urgentCount > 0) {
    subtext = `Masih ada ${urgentCount} tugas yang belum tuntas. Jadwalkan ulang yang dapat dipindahkan ke esok.`;
  }

  return {
    headline: headlines[seed % headlines.length],
    subtext,
    period: 'malam',
  };
}

