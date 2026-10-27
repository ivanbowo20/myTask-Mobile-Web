# 🔱 TRINITY CODE AUDIT REPORT

**Target:** Siklus Retensi Tugas Selesai, Supabase Free Tier Optimizer, & Fitur Pembersihan Massal (Bulk Delete)  
**Ruang Lingkup:** Optimasi Kuota Supabase Free Tier (500 MB limit), Auto-Purge Database Interval, API Endpoint Bulk Deletion, & UI Ergonomics  
**Indeks yang Digunakan:** CodeGraph: Ya (`.codegraph/`) | AST Tracing: Ya | Ponytail Audit: Ya  
**Status Eksekusi:** FASE 2 — PERBAIKAN SELESAI & TERVERIFIKASI (`npm run build` BERHASIL 100%)

---

## 🚨 1. MUST FIX (Optimasi Kuota Database & Ketiadaan Fitur Bulk Delete)

### [1] Retensi Auto-Purge Database 14 Hari Terlalu Panjang untuk Free Tier
- **Lokasi Berkas:** [`supabase/schema.sql:L182-L198`](file:///c:/MY%20project%20Website/todowebb%20V2/supabase/schema.sql#L182-L198) dan [`.github/workflows/supabase-keep-alive.yml:L3-L92`](file:///c:/MY%20project%20Website/todowebb%20V2/.github/workflows/supabase-keep-alive.yml#L3-L92)
- **Fungsi Kode:** Fungsi PostgreSQL `purge_old_completed_tasks()` yang bertugas membersihkan tugas selesai usang untuk menjaga batas kuota penyimpanan Supabase Free Tier (500 MB).
- **Akar Masalah:**
  Sebelumnya, fungsi SQL menggunakan filter `selesai_pada < (now() - interval '14 days')`. Meskipun GitHub Actions cron berjalan setiap 3 hari sekali (`0 5 */3 * *`), tugas selesai yang berumur di bawah 14 hari tetap tersimpan di database. Hal ini menyebabkan penumpukan riwayat tugas selesai dan menghabiskan baris database serta kuota bandwidth egress.
- **Blast Radius & Caller:**
  - PostgreSQL DB Supabase via RPC `/rest/v1/rpc/purge_old_completed_tasks`.
  - GitHub Actions Workflow keep-alive.
- **Saran Perbaikan Minimal (Ponytail Fix):**
  Ubah interval retensi di fungsi SQL dari `14 days` menjadi `3 days`:
  ```sql
  delete from public.tasks
  where selesai = true
    and selesai_pada is not null
    and selesai_pada < (now() - interval '3 days');
  ```
- **Dampak jika Diabaikan:** Kapasitas database cepat penuh saat pengguna aktif bertambah banyak, berpotensi memicu penguncian database menjadi *Read-Only* oleh Supabase.

---

### [2] Ketiadaan Endpoint & Aksi Bulk Deletion Tugas Selesai
- **Lokasi Berkas:** [`app/api/tasks/route.js:L475-L515`](file:///c:/MY%20project%20Website/todowebb%20V2/app/api/tasks/route.js#L475-L515) dan [`lib/task-context.js:L244-L315`](file:///c:/MY%20project%20Website/todowebb%20V2/lib/task-context.js#L244-L315)
- **Fungsi Kode:** Mutasi penghapusan data tugas melalui API dan React Context.
- **Akar Masalah:**
  Endpoint `DELETE /api/tasks` sebelumnya hanya menerima single `id` (`DELETE /api/tasks?id=123`). User harus menekan tombol hapus satu per satu yang melelahkan dan menghasilkan puluhan HTTP request terpisah.
- **Blast Radius & Caller:**
  - `DELETE /api/tasks`
  - `TaskProvider` (`lib/task-context.js`)
  - Seluruh halaman pengguna (`DashboardPage`, `CompletedTasksPage`, `AllTasksPage`).
- **Saran Perbaikan Minimal (Ponytail Fix):**
  1. Tambahkan handler `scope=completed` di `DELETE /api/tasks` dengan parameterized query `$1` (`session.user.id`) guna menjamin keamanan IDOR & SQL Injection.
  2. Tambahkan fungsi `clearCompletedTasks()` di `lib/task-context.js` dengan pola Optimistic UI + Rollback otomatis jika jaringan gagal + sinkronisasi `localStorage` offline-first.

---

### [3] Runtime ReferenceError `isClearCompletedOpen is not defined` pada Halaman Tugas
- **Lokasi Berkas:** [`app/(dashboard)/tugas/page.js:L44`](file:///c:/MY%20project%20Website/todowebb%20V2/app/(dashboard)/tugas/page.js#L44) dan [`app/(dashboard)/tugas/selesai/page.js:L24`](file:///c:/MY%20project%20Website/todowebb%20V2/app/(dashboard)/tugas/selesai/page.js#L24)
- **Fungsi Kode:** State modal konfirmasi pembersihan tugas massal `<ConfirmDialog isOpen={isClearCompletedOpen} ... />`.
- **Akar Masalah (Root Cause):**
  Saat komponen dialog disisipkan ke JSX, deklarasi `const [isClearCompletedOpen, setIsClearCompletedOpen] = useState(false)` dan destrukturisasi `clearCompletedTasks` dari `useTasks()` terlewat di blok pembuka fungsi `AllTasksContent` dan `CompletedTasksPage`. Karena proyek ini adalah JavaScript murni tanpa compiler TypeScript di waktu build (`npm run build` mengompilasi bundler tanpa mengevaluasi runtime client component tree), error baru muncul saat user membuka rute `/tugas` di browser.
- **Blast Radius:**
  - `app/(dashboard)/tugas/page.js`
  - `app/(dashboard)/tugas/selesai/page.js`
- **Surgical Fix:**
  1. Tambahkan `clearCompletedTasks` ke pemanggilan `useTasks()` di kedua berkas.
  2. Deklarasikan state `const [isClearCompletedOpen, setIsClearCompletedOpen] = useState(false)` di kedua komponen.
  3. Lakukan verifikasi statis komprehensif (`deep-verify.js`) dan uji build terminal (`npm run build`).

---

## ⚠️ 2. SHOULD FIX (UI/UX Ergonomi & Adaptabilitas Multi-Tema)

### [4] Penempatan Tombol Pembersihan & Konsistensi Tema
- **Lokasi Berkas:**
  - [`app/(dashboard)/dashboard/page.js`](file:///c:/MY%20project%20Website/todowebb%20V2/app/(dashboard)/dashboard/page.js)
  - [`app/(dashboard)/tugas/selesai/page.js`](file:///c:/MY%20project%20Website/todowebb%20V2/app/(dashboard)/tugas/selesai/page.js)
  - [`app/(dashboard)/tugas/page.js`](file:///c:/MY%20project%20Website/todowebb%20V2/app/(dashboard)/tugas/page.js)
- **Fungsi Antarmuka:** Menampilkan tombol aksi pembersihan massal yang nyaman diakses pada tab/filter "Selesai".
- **Akar Masalah:**
  Tombol harus berada di area jangkauan jempol (*natural thumb zone*) saat user sedang melihat tugas selesai, tanpa menabrak FAB (+) atau mengotori tab lain. Warna tombol juga tidak boleh menyolok/norak di tema gelap (`dark-chocolate`, `soft-aurora`, `abyssal-teal`) maupun tema terang (`celestial-sky`).
- **Saran Perbaikan Minimal:**
  1. Munculkan tombol `Hapus Semua (N)` secara kondisional saat tab/filter "Selesai" aktif dan jumlah tugas selesai > 0.
  2. Gunakan styling *Ghost Danger* yang lembut:
     - Dark mode: `text-rose-400 bg-rose-500/10 border-rose-500/20 hover:bg-rose-500/20 hover:border-rose-500/30`
     - Light mode (`celestial-sky`): `[html[data-theme='celestial-sky']_&]:text-rose-600 [html[data-theme='celestial-sky']_&]:bg-rose-50 [html[data-theme='celestial-sky']_&]:border-rose-200`
  3. Lengkapi dengan `ConfirmDialog` untuk mencegah klik tak sengaja.

---

## 📊 KESIMPULAN AUDIT & STATUS VERIFIKASI
- **Total Temuan:** 4 (Must Fix: 3 | Should Fix: 1 | Nice to Have: 0)
- **Status Kode:** FASE 2 SELESAI DIEKSEKUSI & DIVERIFIKASI.
- **Verifikasi Terminal:** `npm run build` berjalan sukses 100% (12.3s).
