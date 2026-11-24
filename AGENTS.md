# Repository Agent & Engineering Instructions

**WAJIB DIBACA (MANDATORY PRE-FLIGHT):**
Sebelum melakukan perubahan kode apa pun—termasuk edit file, perbaikan bug, implementasi fitur baru, refactoring, atau audit kode—**wajib membaca dan mematuhi** panduan lengkap pada:

- [`MASTER_ENGINEERING_DESIGN_SYSTEM.md`](./MASTER_ENGINEERING_DESIGN_SYSTEM.md)

## Ringkasan Kepatuhan Wajib
1. **Cognitive Gate & Inspeksi Konfigurasi:** Selalu periksa `package.json`, `jsconfig.json`, dan struktur terkait sebelum menulis kode.
2. **Atomic & Surgical Execution:** Eksekusi secara bertahap dan minimal; hindari perubahan massal tanpa pelacakan dependensi dan pemanggil (*callers*).
3. **Root-Cause Debugging:** Ikuti investigasi 4 langkah sebelum memperbaiki bug; dilarang menebak (*shotgun debugging*).
4. **Anti-AI Slop UI/UX (SielloMita):** Patuhi seluruh aturan visual, tata letak, kontras, animasi GPU-composited (`transform`/`opacity`), dan 5 state komponen (`idle`, `loading`, `empty`, `error`, `success`).
5. **Verifikasi Pasif:** Jalankan `npm run lint` (AST scope & import verification) atau test suite terkait setelah perubahan kode.
