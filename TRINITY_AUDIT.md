# 🔱 TRINITY CODE AUDIT REPORT

**Target:** Sistem Kalender, Validasi Tenggat Waktu (Deadline), & Proteksi Mutasi Tugas  
**Ruang Lingkup:** [`components/ui/DateTimePicker.jsx`](file:///c:/MY%20project%20Website/todowebb%20V2/components/ui/DateTimePicker.jsx), [`components/tugas/AddTaskModal.js`](file:///c:/MY%20project%20Website/todowebb%20V2/components/tugas/AddTaskModal.js), [`components/tugas/EditTaskModal.js`](file:///c:/MY%20project%20Website/todowebb%20V2/components/tugas/EditTaskModal.js), [`app/api/tasks/route.js`](file:///c:/MY%20project%20Website/todowebb%20V2/app/api/tasks/route.js)  
**Indeks yang Digunakan:** Native AST & Call Hierarchy Tracing  

---

## 🧭 EKSEKUTIF RINGKASAN

Audit mendalam terhadap alur pembuatan dan pembaruan tugas menemukan celah di mana pengguna dapat memilih dan menyimpan tenggat waktu (deadline) di masa lalu / tanggal kemarin. Masalah ini bersumber dari ketiadaan pembatasan (`minDate`) di komponen UI Kalender (`DateTimePicker.jsx`) serta ketiadaan validasi waktu lampau di endpoint backend API (`/api/tasks`).

---

## 🚨 1. MUST FIX (Bug, Logika Kalender, & Validasi API)

### [1] Ketiadaan Pembatasan Tanggal Masa Lalu di UI Kalender (`components/ui/DateTimePicker.jsx`)
- **Fungsi Kode:** Komponen pemilih tanggal & waktu interaktif untuk modal tambah dan ubah tugas.
- **Akar Masalah (Bug/Logic):**
  1. Pada tampilan kalender desktop/tablet (`renderCalendar`), tombol tanggal sebelum hari ini (`day < today`) tetap aktif, dapat diklik, dan memiliki styling interaktif normal.
  2. Tombol navigasi bulan lalu (`ChevronLeft`) dapat ditekan terus-menerus mundur ke bulan atau tahun lampau tanpa batas.
  3. Pada tampilan mobile Android (`renderMobileDatePicker`), tag `<input type="date">` tidak memiliki atribut `min={todayStr}`, sehingga dialog kalender bawaan OS Android mengizinkan pemilihan tanggal lampau.
  4. Pilihan cepat 1-tap "Hari Ini 17:00" tetap aktif meski waktu saat ini sudah lewat jam 17:00 WIB.
  5. Tombol "Terapkan" tetap mengeksekusi `onChange` meskipun kombinasi tanggal dan jam yang dipilih berada di masa lalu.
- **Blast Radius & Caller:** [`AddTaskModal.js`](file:///c:/MY%20project%20Website/todowebb%20V2/components/tugas/AddTaskModal.js), [`EditTaskModal.js`](file:///c:/MY%20project%20Website/todowebb%20V2/components/tugas/EditTaskModal.js).
- **Saran Perbaikan Minimal (Ponytail Fix):**
  - Hitung batas `today` secara reaktif.
  - Disable hari sebelum hari ini (`disabled`, `opacity-30`, `cursor-not-allowed`, `pointer-events-none`).
  - Kunci tombol `ChevronLeft` jika tampilan berada di bulan & tahun berjalan.
  - Pasang `min={minDateString}` pada native date input.
  - Cek apakah kombinasi tanggal + jam yang dipilih berada di masa lalu; jika ya, kunci tombol "Terapkan" dengan indikator visual.

### [2] Ketiadaan Validasi Server-Side Deadline Lampau di Backend API (`app/api/tasks/route.js`)
- **Fungsi Kode:** Handler POST dan PUT untuk mutasi data tugas di PostgreSQL Supabase.
- **Akar Masalah (Bug/Logic):**
  - POST `/api/tasks` hanya memvalidasi format string tanggal (`parseSafeIsoDate`), tetapi tidak memvalidasi apakah tanggal tersebut sudah lewat dari `Date.now()`. Akibatnya, request langsung via API atau bypass client dapat menyimpan tugas dengan deadline masa lalu.
  - PUT `/api/tasks` tidak memvalidasi perubahan deadline ke masa lalu.
- **Blast Radius & Caller:** Seluruh alur pembuatan dan pembaruan tugas di aplikasi.
- **Saran Perbaikan Minimal (Ponytail Fix):**
  - Pada POST: jika `parsedDeadline.value` ada, pastikan tidak lebih kecil dari `Date.now() - 120000` (toleransi clock drift 2 menit). Jika lewat, kembalikan HTTP 400 Bad Request.
  - Pada PUT: jika deadline diubah ke tanggal lampau, kembalikan HTTP 400 Bad Request (namun tetap izinkan tugas yang sudah overdue untuk diedit properti lainnya tanpa error).

---

## ⚠️ 2. SHOULD FIX (UX Sinkronisasi & Feedback Input)

### [3] Pencegahan Submit via Tombol Enter pada Form Modal Tambah Tugas
- **Fungsi Kode:** Form submit pada `AddTaskModal.js` dan `EditTaskModal.js`.
- **Akar Masalah:** Jika pengguna menekan tombol Enter pada input judul saat deadline bernilai masa lalu, form tetap berpotensi ter-submit jika state validasi tidak sinkron.
- **Saran Perbaikan:** Pastikan pengecekan `isDeadlinePast` memblokir submit form secara tegas dengan pesan peringatan yang jelas.

---

## 📊 RENCANA EKSEKUSI BERTAHAP (DISIPLIN AI)
- [x] **Langkah 1:** Refaktor dan perkuat komponen `DateTimePicker.jsx` dengan validasi tanggal masa lalu (desktop grid, tombol navigasi bulan, input mobile Android, preset jam, dan tombol Terapkan).
- [x] **Langkah 2:** Tambahkan validasi server-side deadline masa lalu di `app/api/tasks/route.js` (POST & PUT).
- [x] **Langkah 3:** Sinkronkan guard di `AddTaskModal.js` dan `EditTaskModal.js` agar konsisten.
- [x] **Langkah 4:** Verifikasi integritas melalui `npm run build` dan `npm run lint` (Lolos 100%, Exit Code: 0).
