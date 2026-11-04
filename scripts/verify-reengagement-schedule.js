// scripts/verify-reengagement-schedule.js
// Verifikasi otomatis untuk modul rotasi dan copy ajakan anti-slop

import {
  REENGAGEMENT_MESSAGES,
  getReengagementMessage,
  isReengagementScheduleWindow,
  getWibDate,
} from "../lib/notifications/reengagement.js";

console.log("=== MEMULAI TEST VERIFIKASI RE-ENGAGEMENT NOTIFICATION ===\n");

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`[PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`[FAIL] ${message}`);
    process.exitCode = 1;
  }
}

// 1. Uji Validasi Anti-Slop pada 6 Pesan
assert(REENGAGEMENT_MESSAGES.length === 6, "Total variasi pesan harus tepat 6 item");

for (const msg of REENGAGEMENT_MESSAGES) {
  assert(Boolean(msg.title) && Boolean(msg.body), `Pesan #${msg.id} memiliki judul dan body valid`);
  assert(!msg.title.includes("—") && !msg.body.includes("—"), `Pesan #${msg.id} tidak memuat em-dash (—)`);
  assert(!/[\u{1F300}-\u{1F9FF}]/u.test(msg.title), `Pesan #${msg.id} judul bebas dari emoji`);
  assert(!/[\u{1F300}-\u{1F9FF}]/u.test(msg.body), `Pesan #${msg.id} isi bebas dari emoji`);
  assert(!msg.title.includes("!!") && !msg.body.includes("!!"), `Pesan #${msg.id} tidak memuat tanda seru ganda`);
}

// 2. Uji Jendela Jadwal Waktu WIB (Senin & Kamis pukul 08:00 - 08:59 WIB)
// 08:00 WIB = 01:00 UTC
// 2026-11-09 adalah hari Senin
const monMorningUtc = new Date(Date.UTC(2026, 10, 9, 1, 15, 0)); // Senin 08:15 WIB
assert(isReengagementScheduleWindow(monMorningUtc) === true, "Senin 08:15 WIB harus masuk jendela jadwal");

const monNoonUtc = new Date(Date.UTC(2026, 10, 9, 5, 0, 0)); // Senin 12:00 WIB
assert(isReengagementScheduleWindow(monNoonUtc) === false, "Senin 12:00 WIB tidak boleh masuk jendela jadwal");

// 2026-11-12 adalah hari Kamis
const thuMorningUtc = new Date(Date.UTC(2026, 10, 12, 1, 0, 0)); // Kamis 08:00 WIB
assert(isReengagementScheduleWindow(thuMorningUtc) === true, "Kamis 08:00 WIB harus masuk jendela jadwal");

// 2026-11-10 adalah hari Selasa
const tueMorningUtc = new Date(Date.UTC(2026, 10, 10, 1, 0, 0)); // Selasa 08:00 WIB
assert(isReengagementScheduleWindow(tueMorningUtc) === false, "Selasa 08:00 WIB tidak boleh masuk jendela jadwal");

// 3. Uji Rotasi Siklis 1..6 Selama 4 Pekan Berturut-turut
// W1: Mon 2026-11-02, Thu 2026-11-05
// W2: Mon 2026-11-09, Thu 2026-11-12
// W3: Mon 2026-11-16, Thu 2026-11-19
// W4: Mon 2026-11-23, Thu 2026-11-26
const testDates = [
  new Date(Date.UTC(2026, 10, 2, 1, 0, 0)),
  new Date(Date.UTC(2026, 10, 5, 1, 0, 0)),
  new Date(Date.UTC(2026, 10, 9, 1, 0, 0)),
  new Date(Date.UTC(2026, 10, 12, 1, 0, 0)),
  new Date(Date.UTC(2026, 10, 16, 1, 0, 0)),
  new Date(Date.UTC(2026, 10, 19, 1, 0, 0)),
  new Date(Date.UTC(2026, 10, 23, 1, 0, 0)),
];

const expectedPattern = [1, 2, 3, 4, 5, 6, 1];
const actualPattern = testDates.map((d) => getReengagementMessage(d).id);

console.log("Expected pattern:", expectedPattern);
console.log("Actual pattern:  ", actualPattern);

for (let i = 0; i < testDates.length; i++) {
  assert(
    actualPattern[i] === expectedPattern[i],
    `Pekan ${Math.floor(i / 2) + 1} hari ${i % 2 === 0 ? "Senin" : "Kamis"} harus menghasilkan pesan #${expectedPattern[i]} (dihasilkan #${actualPattern[i]})`
  );
}

console.log(`\n=== HASIL: ${passedTests}/${totalTests} TESTS BERHASIL ===\n`);
if (passedTests === totalTests) {
  console.log("Seluruh logika anti-slop, rotasi siklis, dan jadwal WIB tervalidasi 100%!");
}
