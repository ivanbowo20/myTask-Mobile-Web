# 🔱 TRINITY CODE AUDIT REPORT — SISTEM NOTIFIKASI DUA TAHAP (REMINDER & DEADLINE)

**Target:** Arsitektur Web Push Notification, Background Cron Scheduler, Database State, & Dispatcher API  
**Ruang Lingkup:** 
- [`app/api/notifications/dispatch/route.js`](file:///c:/MY%20project%20Website/todowebb%20V2/app/api/notifications/dispatch/route.js)
- [`scripts/setup-supabase-cron.js`](file:///c:/MY%20project%20Website/todowebb%20V2/scripts/setup-supabase-cron.js)
- [`supabase/schema.sql`](file:///c:/MY%20project%20Website/todowebb%20V2/supabase/schema.sql)
- [`app/api/tasks/route.js`](file:///c:/MY%20project%20Website/todowebb%20V2/app/api/tasks/route.js)
- [`public/sw.js`](file:///c:/MY%20project%20Website/todowebb%20V2/public/sw.js)  
**Indeks yang Digunakan:** CodeGraph AST Exploration, Call Hierarchy Tracing, & PostgreSQL Schema Analysis  

---

## 🧭 EKSEKUTIF RINGKASAN & CARA KERJA SISTEM SAAT INI

### 1. Bagaimana Notifikasi Bekerja Walau Tab Tidak Dibuka?
Sistem notifikasi TaskFlow v2 bekerja secara *serverless background push* berkat kombinasi 4 pilar arsitektur:
1. **PWA Service Worker (`public/sw.js`):** Berjalan di background OS browser (Chrome/Edge/Android) dan mendengarkan event push tanpa bergantung pada tab aktif.
2. **Web Push Subscription (`public.push_subscriptions`):** Endpoint unik per perangkat pengguna disimpan di PostgreSQL Supabase dengan enkripsi VAPID key.
3. **Database Cron Scheduler (`pg_cron` + `pg_net`):** Supabase menjalankan fungsi `public.check_and_dispatch_task_reminders()` otomatis setiap 1 menit (`* * * * *`). Jika ada tugas yang memenuhi kriteria, Supabase menembakkan webhook HTTP via `pg_net` ke endpoint Vercel `/api/notifications/dispatch?key=CRON_SECRET`.
4. **Dispatcher Backend (`/api/notifications/dispatch`):** Vercel menerima webhook, mengunci baris tugas secara atomik (`FOR UPDATE SKIP LOCKED`), mengirim paket Web Push ke semua perangkat terdaftar via modul `web-push`, dan mencatat riwayat ke tabel `public.notifications`.

### 2. Mengapa Notifikasi Tepat Jam 5 (Tenggat Waktu) Tidak Muncul?
Saat Anda mengatur deadline jam 17:00 dengan reminder 30 menit:
- **Pukul 16:30 (Reminder):** Cron mendeteksi `(deadline - 30 minutes) <= NOW()`. Dispatcher mengirim notifikasi ke perangkat Anda dan **langsung mengeksekusi:**
  ```sql
  UPDATE public.tasks SET reminder_sent = true WHERE id = target_tasks.id;
  ```
- **Pukul 17:00 (Tenggat Waktu / Deadline):** Cron dan Dispatcher hanya mencari tugas dengan filter:
  ```sql
  WHERE t.selesai = false AND t.reminder_sent = false
  ```
  Karena tugas tersebut sudah bernilai `reminder_sent = true`, maka tugas tersebut **dilewati dan dianggap sudah selesai dikirimi notifikasi**.
- **Kesimpulan:** Arsitektur saat ini bersifat **Single-Shot (1 kali kirim)**. Belum ada kolom penanda kedua (seperti `deadline_sent`) dan belum ada logika evaluasi untuk tugas yang mencapai batas `deadline <= NOW()`.

---

## 🚨 1. MUST FIX (Logika Dispatcher & Database State)

### [1] Ketiadaan Kolom Pelacak Notifikasi Tenggat (`deadline_sent`)
- **File:** [`supabase/schema.sql`](file:///c:/MY%20project%20Website/todowebb%20V2/supabase/schema.sql), tabel `public.tasks`
- **Akar Masalah:** Tabel `public.tasks` hanya memiliki `reminder_sent boolean default false`. Ketika reminder terkirim, flag ini bernilai `true` sehingga task terkunci dari pengiriman selanjutnya.
- **Saran Perbaikan (Ponytail Fix):**
  Tambahkan kolom baru `deadline_sent boolean not null default false` ke tabel `public.tasks`.
  ```sql
  ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS deadline_sent boolean NOT NULL DEFAULT false;
  ```

### [2] Ketiadaan Cabang Evaluasi Notifikasi Tepat Tenggat di Dispatcher Backend
- **File:** [`app/api/notifications/dispatch/route.js:L26-L54`](file:///c:/MY%20project%20Website/todowebb%20V2/app/api/notifications/dispatch/route.js#L26-L54)
- **Akar Masalah:** Query atomik hanya memproses `reminder_sent = false` dengan kalkulasi selisih interval reminder. Tidak ada batch processing atau status discriminator untuk membedakan:
  - **Kasus A (Pengingat Pra-Tenggat):** Waktu saat ini berada di antara `deadline - interval` hingga `deadline`, dan `reminder_sent = false`.
  - **Kasus B (Tenggat Waktu Habis / Jatuh Tempo Sekarang):** Waktu saat ini sudah mencapai `deadline <= NOW()`, dan `deadline_sent = false`.
- **Saran Perbaikan (Ponytail Fix):**
  Pisahkan atau perluas CTE Dispatcher menjadi dua fase evaluasi yang atomik (`dispatch_phase: 'reminder' | 'deadline'`). Masing-masing mengupdate flag yang bersesuaian (`reminder_sent = true` atau `deadline_sent = true`) dan menghasilkan teks payload yang berbeda.

### [3] Pembaruan Fungsi Pemeriksa di Supabase Cron (`check_and_dispatch_task_reminders`)
- **File:** [`scripts/setup-supabase-cron.js:L103-L120`](file:///c:/MY%20project%20Website/todowebb%20V2/scripts/setup-supabase-cron.js#L103-L120)
- **Akar Masalah:** Fungsi PL/pgSQL di Supabase yang berjalan tiap menit hanya menghitung `task_count` berdasarkan `t.reminder_sent = false`. Akibatnya, pada jam 17:00, `task_count` bernilai 0 sehingga cron tidak memicu HTTP POST ke Vercel sama sekali.
- **Saran Perbaikan (Ponytail Fix):**
  Perbarui query `SELECT count(*) INTO task_count` di fungsi database agar menghitung:
  ```sql
  WHERE t.selesai = false 
    AND (
      (t.reminder_sent = false AND (t.deadline - reminder_interval) <= NOW() AND t.deadline > NOW())
      OR
      (t.deadline_sent = false AND t.deadline <= NOW())
    )
  ```

---

## ⚠️ 2. SHOULD FIX (Copywriting, Service Worker Tag, & Sinkronisasi Mutasi)

### [4] Pembedaan Web Push `tag` agar Tidak Saling Timpa di Tray OS
- **File:** [`app/api/notifications/dispatch/route.js:L80`](file:///c:/MY%20project%20Website/todowebb%20V2/app/api/notifications/dispatch/route.js#L80) & [`public/sw.js`](file:///c:/MY%20project%20Website/todowebb%20V2/public/sw.js)
- **Akar Masalah:** Payload saat ini menggunakan tag statis `tag: task-reminder-${task.id}`. Jika browser menerima notifikasi deadline dengan tag yang sama persis, beberapa OS/browser akan menimpa (menggantikan) notifikasi sebelumnya daripada memunculkan pemberitahuan baru yang jelas.
- **Saran Perbaikan:**
  Gunakan tag spesifik per tahap:
  - Tahap Reminder: `tag: task-reminder-${task.id}`
  - Tahap Deadline Habis: `tag: task-deadline-${task.id}`

### [5] Reset Status Dua Flag saat Pengguna Mengubah Deadline di Modal Edit
- **File:** [`app/api/tasks/route.js:L424-L427`](file:///c:/MY%20project%20Website/todowebb%20V2/app/api/tasks/route.js#L424-L427)
- **Akar Masalah:** Saat deadline atau jam diubah di modal edit, saat ini hanya `reminder_sent` yang di-reset ke `false`. Kolom baru `deadline_sent` juga harus di-reset ke `false` agar tugas yang diundur batas waktunya dapat menerima kedua notifikasi kembali secara utuh.
- **Saran Perbaikan:**
  ```sql
  reminder_sent = CASE WHEN (deadline IS DISTINCT FROM $3) OR (reminder IS DISTINCT FROM $4) THEN false ELSE reminder_sent END,
  deadline_sent = CASE WHEN (deadline IS DISTINCT FROM $3) THEN false ELSE deadline_sent END
  ```

---

## 💡 3. NICE TO HAVE (Edge Cases & Fallback)

### [6] Penanganan Tugas Tanpa Pengingat Awal (`reminder: null`)
- Jika user membuat tugas dengan memilih "Tanpa Pengingat", apakah notifikasi tenggat waktu tepat jam 5 tetap harus dikirim?
- **Rekomendasi:** YA, notifikasi tenggat waktu tepat jam 5 tetap harus dikirim sebagai safety net agar pengguna tidak melewatkan batas waktu tugas.

---

## 📊 RENCANA EKSEKUSI BERTAHAP (DISIPLIN AI)
- [x] **Langkah 1 (Database DDL):** Kolom `deadline_sent` telah ditambahkan ke tabel `public.tasks` di Supabase dan terverifikasi via `scripts/add-deadline-sent-column.js`.
- [x] **Langkah 2 (Supabase Cron Update):** Fungsi `check_and_dispatch_task_reminders()` di PostgreSQL Supabase telah diperbarui dan terdaftar 100% aktif via `scripts/setup-supabase-cron.js`.
- [x] **Langkah 3 (Dispatcher Engine):** Refaktor `handleDispatch()` di `app/api/notifications/dispatch/route.js` selesai dengan query atomik CTE `eligible_tasks` (`reminder` vs `deadline`).
- [x] **Langkah 4 (Task Mutation Logic):** `app/api/tasks/route.js` (POST & PUT) telah diperbarui dengan instant dispatch dan reset `reminder_sent` & `deadline_sent`.
- [x] **Langkah 5 (Verifikasi Bukti Terminal):** Database query test via `scripts/verify-two-phase-notification.js` lolos 100%, dan Next.js production build (`npm run build`) sukses tanpa error (Exit code: 0).
