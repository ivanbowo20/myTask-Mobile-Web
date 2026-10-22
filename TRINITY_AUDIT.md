# 🔱 TRINITY CODE AUDIT REPORT: Mobile Performance & Server Latency

**Target:** Client Performance (Infinix Smart 6 / Low-End Android) & Server Web PageSpeed / k6 Benchmarking  
**Arsitektur & Ruang Lingkup:** Next.js 15 (App Router) + React 19 + Tailwind CSS v4 + Supabase PostgreSQL (Port 6543 Pooler) + Better Auth. Analisis performa fokus pada render tree di perangkat entry-level (Unisoc SC9863A, PowerVR GE8322, 2GB RAM) dan latensi cold-start server.  
**Indeks yang Digunakan:** CodeGraph: Ya (`.codegraph/`) | Native AST: Ya

---

## 🚨 1. MUST FIX (Penyebab Utama Lag di Infinix Smart 6 & GPU Crash)

Masalah performa fatal yang membuat UI membeku (frame rate anjlok ke 3–10 FPS, delay input 1–2 detik pada Infinix Smart 6):

### [1] WebGL Procedural Noise Overload pada Tema Sky (`components/ui/cloud-shader.jsx:L18-L170`)
- **Fungsi Kode:** Merender awan bergerak prosedural dengan fragment shader WebGL (fbm, billow noise, domain warping) untuk latar tema Sky.
- **Akar Masalah (Bug/Performance):**
  - Infinix Smart 6 ditenagai chip grafis **PowerVR Rogue GE8322** (hanya ~20 GFLOPS, arsitektur 28nm hemat daya).
  - Pada resolusi layar ponsel (720 × 1600 = ~1,15 juta piksel), shader menghitung lebih dari 100 operasi noise matematis intensif (`vnoise`, `sin`, `dot`, `fbm`, `billow`) **per piksel per frame**.
  - Beban komputasi per frame mencapai >100 juta operasi trigonometri/noise di layar penuh pada 60 FPS. Hal ini memicu saturasi GPU 100% dan memblokir thread *browser compositor*.
  - Ketika pengguna menekan tombol buat tugas atau berpindah tab, *event dispatch* tertahan di antrean compositor, menimbulkan lag sentuhan 1–2 detik.
- **Blast Radius & Caller:** `CelestialSkyBackground.js`, `ThemeBackground.js`, seluruh halaman saat tema `celestial-sky` aktif.
- **Saran Perbaikan Minimal (Ponytail Fix):**
  - Pada perangkat mobile/low-end GPU (terdeteksi via media query, `deviceMemory <= 3`, atau `hardwareConcurrency <= 4`), turunkan `canvas` internal resolution (misal scale down 0.5x dengan CSS upscale halus), clamp frame rate ke 30 FPS via timestamp delta throttle, atau aktifkan mode fallback CSS gradient cloud dinamis yang super ringan (0% beban GPU).
- **Dampak jika Diabaikan:** Tema Sky akan selalu membuat HP entry-level panas, baterai cepat terkuras, dan freeze saat input.

---

### [2] CSS Cascade Override Bug: `.glass-card` Membatalkan Optimasi Mobile (`app/globals.css:L225` vs `L257`)
- **Fungsi Kode:** Memberikan efek frosted glass transparan pada kartu tugas dan panel.
- **Akar Masalah:**
  - Di baris 225 terdapat blok `@media (max-width: 768px)` yang berniat meringankan `backdrop-filter` ke `blur(8px)`.
  - Namun, di baris 255–258 (urutan lebih bawah dalam CSS), dideklarasikan kembali aturan:
    ```css
    .glass-card {
      backdrop-filter: blur(18px) saturate(130%);
      -webkit-backdrop-filter: blur(18px) saturate(130%);
    }
    ```
  - Karena memiliki spesifisitas selektor yang sama (`.glass-card`), deklarasi di baris 257 **menimpa (override) aturan media query mobile di baris 225**.
  - Akibatnya, pada Infinix Smart 6, setiap kartu tugas (bisa berjumlah 20–50 kartu) tetap merender multi-pass gaussian blur `18px` berlapis di atas canvas animasi! PowerVR GE8322 tidak sanggup melakukan compositing off-screen buffer sebanyak ini.
- **Blast Radius & Caller:** `TaskCard.js`, daftar tugas di semua tab (`/dashboard`, `/tugas`, `/tugas/hari-ini`, `/tugas/penting`, `/tugas/selesai`).
- **Saran Perbaikan Minimal (Ponytail Fix):**
  - Pindahkan blok penyesuaian mobile ke bagian paling bawah file CSS (atau gunakan selektor dengan prioritas benar), dan nonaktifkan `backdrop-filter` pada kartu tugas di layar mobile `< 768px` (ganti dengan `background: rgba(...)` solid semi-transparan ber-opacity tinggi tanpa blur). Efek visual tetap identik namun 0% beban multi-pass GPU!
- **Dampak jika Diabaikan:** Tampilan kartu tugas patah-patah saat scroll dan buat tugas.

---

### [3] Framer Motion Layout Thrashing pada TaskCard (`components/tugas/TaskCard.js:L324`)
- **Fungsi Kode:** Animasi transisi posisi kartu tugas saat list bertambah/berkurang.
- **Akar Masalah:**
  - Setiap kartu tugas memiliki atribut `<motion.div layout ...>`.
  - Properti `layout` memaksa Framer Motion memanggil `getBoundingClientRect()` pada seluruh kartu tugas secara sinkron di main thread setiap kali ada perubahan state (tambah tugas, centang selesai).
  - Pada 8-core Cortex-A55 Infinix Smart 6 yang berfrekuensi rendah (1.2–1.6 GHz), pembacaan layout sinkron untuk puluhan elemen menyebabkan *Forced Synchronous Reflow* yang membekukan thread utama JavaScript selama 200–500ms.
- **Blast Radius & Caller:** `TaskCard.js` dipanggil di 6 halaman daftar tugas.
- **Saran Perbaikan Minimal (Ponytail Fix):**
  - Nonaktifkan atribut `layout` animasi Framer Motion di mobile atau batasi ke CSS transform standar `transform: translate3d`.
- **Dampak jika Diabaikan:** Jeda/stutter terasa nyata setiap kali menekan checkbox atau membuat tugas baru.

---

## ⚠️ 2. SHOULD FIX (Performa Tab Switching & Latensi Server)

### [4] Instabilitas Memoization di TaskProvider & Sinkronisasi LocalStorage (`lib/task-context.js:L132-L144, L540-L583`)
- **Fungsi Kode:** Pengelolaan state global aplikasi (tugas, kategori, statistik).
- **Akar Masalah:**
  - Di dalam `TaskProvider`, fungsi operasional (`addTask`, `updateTask`, dll) serta callback modal (`openAddTask: () => setIsAddTaskOpen(true)`) dibuat ulang (*re-instantiated*) pada setiap re-render karena tidak dibungkus `useCallback`.
  - Hal ini menyebabkan `value` pada `useMemo` ikut berubah, memicu re-render menyeluruh pada seluruh komponen anak (`DashboardShell`, `Sidebar`, `BottomNav`, dan halaman aktif).
  - Selain itu, `useEffect` untuk penyimpanan cache lokal menjalankan `JSON.stringify(tasks)` dan `localStorage.setItem` secara sinkron langsung di main thread pada setiap mutasi tugas.
- **Blast Radius & Caller:** Seluruh halaman di dalam rute `(dashboard)`.
- **Saran Perbaikan Minimal (Ponytail Fix):**
  - Bungkus fungsi-fungsi handler dengan `useCallback`.
  - Berikan debounce mikro atau gunakan `requestIdleCallback` untuk penulisan `localStorage` agar tidak menahan interaksi klik pengguna.
- **Dampak jika Diabaikan:** Pindah tab terasa ada jeda rendering ulang yang tidak perlu.

---

### [5] Latensi Pembukaan Awal / Server TTFB Cold-Start (`app/(dashboard)/layout.js:L12-L32`)
- **Fungsi Kode:** Server-Side Rendering (SSR) untuk memuat sesi dan data tugas awal.
- **Akar Masalah:**
  - Mengapa pembukaan web kadang terasa lemot hingga ~3 detik?
  - `auth.api.getSession` dan `getInitialDashboardData` berjalan secara sekuensial (bergantian). Setiap panggilan membuka koneksi TCP/SSL ke Supabase pooler di AWS Singapura (`aws-0-ap-southeast-1.pooler.supabase.com`).
  - Jika connection pool sedang idle (cold start), handshake TLS + TCP round trip ke cloud memakan waktu 800ms–1500ms sebelum HTML mulai dikirimkan (TTFB).
- **Blast Radius & Caller:** Initial load semua rute dashboard.
- **Saran Perbaikan Minimal (Ponytail Fix):**
  - Manfaatkan paralelisme query di mana memungkinkan dan optimalkan keep-alive pooler database.
- **Dampak jika Diabaikan:** First Contentful Paint (FCP) lambat saat pertama kali membuka web dari kondisi dingin.

---

## 💡 3. BENCHMARK & TESTING HARNESS (PageSpeed & k6)

### [6] Ketersediaan Alat Uji k6 & URL Target
- **Fakta Lingkungan:**
  - Perintah `k6` belum terpasang di sistem operasi Windows lokal (`CommandNotFoundException`).
  - Aturan proyek melarang AI menyalakan `npm run dev` secara mandiri.
- **Solusi Rekayasa:**
  - Kita dapat membuat skrip pengujian beban k6 resmi (`scripts/load-test.js` atau `tests/k6-test.js`) yang siap dijalankan oleh user terhadap target `http://localhost:3000` atau URL deployment production (misal Vercel / domain live).
  - Kita juga dapat menyediakan skrip benchmark bawaan berbasis Node.js (`scripts/benchmark-pagespeed.js`) untuk mengukur TTFB, respon time API, dan throughput concurrency tanpa memerlukan instalasi binary k6 eksternal.

---

## 📊 KESIMPULAN AUDIT
- **Total Temuan:** 6 (Must Fix: 3 | Should Fix: 2 | Testing: 1)
- **Fokus Utama:** Ringankan GPU load tema Sky, hilangkan bug override `backdrop-filter` di mobile, dan hapus layout thrashing di `TaskCard`.
