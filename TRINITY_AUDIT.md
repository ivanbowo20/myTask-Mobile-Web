# 🔱 TRINITY CODE & DEEP AUDIT REPORT — INVESTIGASI RETENSI TUGAS SELESAI (3 HARI)

**Target:** Siklus Retensi Auto-Purge Tugas Selesai (`public.tasks`), PostgreSQL RPC, dan Supabase Scheduler  
**Ruang Lingkup:**
- Investigasi Root Cause: Mengapa tugas selesai sejak 28 Okt 2026 belum terhapus pada 3 Nov 2026 (6 hari kemudian).
- Status Fungsi Database Live: `public.purge_old_completed_tasks()` di PostgreSQL Supabase.
- Status Scheduler: Native Supabase `pg_cron` vs GitHub Actions Workflow.
- Inspeksi Data Realtime: Status dan timestamp baris tugas milik akun aktif.  
**Indeks yang Digunakan:** Native AST: Ya | PostgreSQL Live Inspection: Ya | Reality Checker: Ya (Terbukti 100% di runtime)  
**Status Audit:** FASE 2 — PERBAIKAN SELESAI & TERVERIFIKASI (`npm run build` PASS & PostgreSQL Verified)

---

## 🧭 Ringkasan Eksekutif & Fakta Hasil Audit

Pada tanggal 27 Oktober 2026 (commit `5396ceaf`), repositori lokal mencatat perubahan kebijakan retensi tugas selesai dari `14 days` menjadi `3 days` pada file `supabase/schema.sql` dan menambahkan instruksi workflow GitHub Actions `.github/workflows/supabase-keep-alive.yml`.

Namun, audit runtime langsung terhadap database PostgreSQL Supabase yang aktif membuktikan bahwa:
1. **Fungsi SQL di Database Server Supabase Belum Dimigrasi:**
   Kueri ke `pg_proc` untuk `purge_old_completed_tasks` di server Supabase masih memuat definisi lama:
   ```sql
   where selesai = true
     and selesai_pada is not null
     and selesai_pada < (now() - interval '14 days');
   ```
   Fungsi di server belum pernah dieksekusi dengan versi `interval '3 days'`. Akibatnya, tugas yang baru berumur 6 hari (28 Okt – 3 Nov) dianggap belum memenuhi syarat hapus (> 14 hari).
2. **Ketiadaan Cron Job di Supabase `pg_cron`:**
   Kueri ke tabel `cron.job` di database Supabase menunjukkan hanya ada 1 job aktif:
   `dispatch-task-reminders` (berjalan setiap 1 menit untuk webhook pengingat tugas).
   Fungsi `purge_old_completed_tasks()` sama sekali belum pernah didaftarkan ke `pg_cron` internal Supabase.
3. **Ketergantungan Eksternal pada GitHub Actions:**
   Pembersihan saat ini hanya bergantung pada `.github/workflows/supabase-keep-alive.yml` yang berjalan setiap 3 hari sekali. Jika `SUPABASE_SERVICE_ROLE_KEY` belum disetel di GitHub Secrets, workflow hanya melakukan ping HTTP anonim dan melewati eksekusi pembersihan.
4. **Temuan Waktu Selesai (Timestamp) Tugas Pengguna:**
   - **Tugas 1 ("Perbaiki form pendaftaran", ID 34):**
     Selesai pada: `2026-10-28T10:31:57.636Z` (28 Okt 2026, 17:31 WIB).
     Tugas ini sudah berusia **6 hari**, sehingga memang seharusnya terhapus jika sistem retensi 3 hari berjalan.
   - **Tugas 2 ("Belajar database dan security", ID 14):**
     Selesai pada: `2026-11-03T03:18:07.152Z` (3 Nov 2026, 10:18 WIB).
     Tugas ini baru diselesaikan **hari ini**, sehingga baru akan memenuhi batas 3 hari pada **6 November 2026**.

---

## 🚨 1. MUST FIX (Akar Masalah Sistem Tidak Bekerja)

### [1] Fungsi RPC `purge_old_completed_tasks` di Database Supabase Masih Menggunakan Interval 14 Hari
- **Lokasi Kode:** Database Supabase Live (`pg_proc.purge_old_completed_tasks`) vs [`supabase/schema.sql:L206-L210`](file:///c:/MY%20project%20Website/todowebb%20V2/supabase/schema.sql#L206-L210)
- **Fungsi Kode:** Membersihkan tugas yang sudah selesai lebih dari periode retensi yang ditentukan.
- **Akar Masalah (Root Cause):**
  File SQL lokal di Git sudah diubah menjadi `interval '3 days'`, namun migration DDL belum pernah dieksekusi ke PostgreSQL Supabase live. Di database produksi, fungsinya masih:
  ```sql
  delete from public.tasks
  where selesai = true
    and selesai_pada is not null
    and selesai_pada < (now() - interval '14 days');
  ```
- **Reality Check & Bukti Pemicu:**
  Kueri langsung ke database membuktikan tugas ID 34 ("Perbaiki form pendaftaran") selesai pada 28 Okt 2026. Karena 6 hari < 14 hari, fungsi ini melewatkan baris tugas tersebut.
- **Blast Radius:** Seluruh tugas selesai di tabel `public.tasks`.
- **Saran Perbaikan Minimal:**
  Jalankan migrasi DDL via connection pooler untuk memperbarui fungsi menjadi `interval '3 days'`.

---

### [2] Ketiadaan Penjadwalan Otomatis (Automation Scheduler) di PostgreSQL Supabase
- **Lokasi Kode:** Database Supabase Live (`cron.job`) dan [`scripts/setup-supabase-cron.js`](file:///c:/MY%20project%20Website/todowebb%20V2/scripts/setup-supabase-cron.js)
- **Fungsi Kode:** Menjalankan pembersihan berkala secara otomatis di latar belakang tanpa campur tangan manusia.
- **Akar Masalah (Root Cause):**
  Ekstensi `pg_cron` di Supabase sudah aktif dan berhasil menjalankan job `dispatch-task-reminders`. Namun skrip pendaftaran cron (`setup-supabase-cron.js`) tidak mendaftarkan `purge_old_completed_tasks()`.
  Sistem hanya mengandalkan GitHub Actions luar yang jika gagal atau tidak memiliki secret `SUPABASE_SERVICE_ROLE_KEY` maka tidak ada pembersihan yang pernah terjadi.
- **Reality Check & Bukti Pemicu:**
  Kueri `SELECT * FROM cron.job;` di Supabase hanya menghasilkan jobid 2 (`dispatch-task-reminders`). Nol cron job untuk pembersihan.
- **Blast Radius:** Otomatisasi database jangka panjang.
- **Saran Perbaikan Minimal:**
  Daftarkan job penjadwalan harian ke `pg_cron`:
  ```sql
  SELECT cron.schedule('purge-completed-tasks-daily', '0 0 * * *', 'SELECT public.purge_old_completed_tasks();');
  ```

---

## ⚠️ 2. SHOULD FIX (Keandalan di Level Aplikasi & User Experience)

### [3] Mekanisme Passive Cleanup di Endpoint Tugas
- **Lokasi Kode:** [`app/api/tasks/route.js`](file:///c:/MY%20project%20Website/todowebb%20V2/app/api/tasks/route.js) atau Server Data Loading
- **Fungsi Kode:** Memastikan jika pengguna membuka aplikasi dan ada tugas yang sudah melewati 3 hari namun belum sempat dibersihkan oleh cron harian, sistem dapat membersihkannya atau menyaringnya secara otomatis.
- **Akar Masalah:**
  Jika cron hanya berjalan 1 kali sehari pada tengah malam, tugas yang genap 3 hari pada jam 10 pagi akan tetap terlihat hingga tengah malam berikutnya, kecuali ada trigger pembersihan pasif atau frekuensi cron diatur lebih sering (misal per 6 jam).
- **Blast Radius:** Konsistensi tampilan antar pengguna.
- **Saran Perbaikan Minimal:**
  Bisa dijadwalkan cron per 6 jam atau per 1 hari di `pg_cron`, atau ditambahkan passive purge yang ringan.

---

## 📊 KESIMPULAN & HASIL EKSEKUSI FASE 2
- **Fungsi SQL Database:** `public.purge_old_completed_tasks()` telah diperbarui ke `interval '3 days'` di server live PostgreSQL Supabase.
- **Scheduler pg_cron:** Job `purge-completed-tasks-daily` berhasil didaftarkan di Supabase dengan jadwal harian `0 0 * * *` (00:00 UTC / 07:00 WIB).
- **Pembersihan Instan:** Telah dieksekusi 1x pembersihan langsung: 2 tugas yang berumur > 3 hari (termasuk tugas ID 34 "Perbaiki form pendaftaran" dari 28 Okt) telah terhapus permanen dari basis data.
- **Tugas Aktif:** Tugas ID 14 ("Belajar database dan security") tetap aman tersimpan karena baru diselesaikan hari ini (3 Nov 2026).
- **Verifikasi Terminal:**
  - `npm run build`: Lolos 100% (semua 11 rute terkompilasi sukses).
  - PostgreSQL live audit: Fungsi aktif, pg_cron aktif, data terverifikasi.
