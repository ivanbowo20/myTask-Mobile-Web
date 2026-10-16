# Context & Overview Project: TaskFlow v2 (TodoWeb v2)

> **Tujuan Dokumen:** Dokumen ini merangkum gambaran umum, arsitektur teknis, desain sistem, status pengerjaan, dan batasan (constraints) dari aplikasi **TaskFlow v2**. Dokumen ini siap dibagikan ke AI lain sebagai basis konteks (prompt injection) untuk kebutuhan *brainstorming*, ide fitur, referensi interaksi/animasi, atau perancangan arsitektur lanjutan.

---

## 1. Ringkasan Eksekutif (Executive Summary)

**TaskFlow v2** (sebelumnya *TodoWeb*) adalah aplikasi manajemen tugas (*task management web app*) modern yang berfokus pada **produktivitas personal dengan estetika kelas atas**. 

Bukan sekadar aplikasi to-do biasa, TaskFlow v2 mengedepankan pengalaman visual *dark-only glassmorphism*, pergerakan yang sangat halus (*fluid micro-interactions* terinspirasi dari Apple iOS & Arc Browser), serta alur kerja yang intuitif dan bebas distraksi.

Aplikasi ini saat ini berada pada tahap penyempurnaan UI/UX & sistem interaksi frontend (Next.js 15 App Router), sebelum melangkah ke integrasi backend database (Supabase), autentikasi (Better Auth), dan Progressive Web App (PWA).

---

## 2. Tech Stack & Fondasi Arsitektur

| Layer | Teknologi / Library | Catatan & Peran |
| :--- | :--- | :--- |
| **Framework** | **Next.js 15 (App Router)** | JavaScript (ESNext), React 19 |
| **Styling** | **Tailwind CSS v4** | Modern CSS engine, token-based utility |
| **Animasi** | **Framer Motion** | Layout animation, spring physics, dynamic island morphing |
| **Icon Pack** | **Lucide Icons (`lucide-react`)** | Konsisten, minimalis, dan ringan |
| **Notifikasi UI** | **Custom Dynamic Island Toast** | Floating capsule di bottom-center (spring physics, anti-duplikasi) |
| **State Saat Ini** | **React Context (`TaskContext`)** | In-memory mock data (mudah dimigrasi ke backend) |
| **Backend (Planned)**| **Supabase** | PostgreSQL, Row-Level Security (RLS), Realtime sync |
| **Auth (Planned)** | **Better Auth** | Modern authentication framework |
| **Platform (Planned)**| **PWA (Progressive Web App)** | Installable, offline capabilities, Web Push & Email notifications |

---

## 3. Desain Sistem & Estetika Visual (Design Tokens)

TaskFlow v2 memiliki aturan visual yang ketat dan tidak menggunakan tema terang (*pure dark mode*):

* **Tema Utama:** Pure Dark Mode + Frosted Glassmorphism.
* **Signature Gradient (Selenium):** `#3c3b3f` → `#605c3c` (digunakan sebagai aksen gradasi, border subtle glow, dan surface card).
* **Palet Teks:**
  * Primary Text: `#FAFAFA` (kontras tinggi, heading & teks penting)
  * Secondary Text: `#A1A1AA` (deskripsi, meta info, label)
  * Muted / Tertiary Text: `#71717A` (placeholder, timestamp lampau, border separator)
* **Glassmorphism Spec:**
  * Background translusen (`rgba(255, 255, 255, 0.03)` s.d. `0.08)`)
  * `backdrop-blur-md` / `backdrop-blur-xl`
  * Border halus 1px (`rgba(255, 255, 255, 0.08)` hingga `0.12)`)
* **Motion Language (Opsi 1: Arc + Skiper Wow):**
  * Spring transitions ala Apple (damping & stiffness terukur).
  * Hover cards dengan subtle lift dan glow border.
  * Morphing Dynamic Island di bagian atas layar untuk feedback aksi instan.

---

## 4. Struktur Halaman & Fitur Saat Ini

Saat ini struktur navigasi dan halaman yang telah dibangun meliputi:

1. **Dashboard (`/dashboard`):**
   * Overview statistik (Total tugas, tugas hari ini, tugas selesai, rasio produktivitas).
   * Quick glance tugas mendekati deadline.
2. **Semua Tugas (`/tugas`):**
   * List task lengkap dengan filter pencarian, filter status, dan filter prioritas.
   * Drawer / Modal tambah & edit tugas dengan selector reminder (15m, 30m, 1h, dst.) dan pemilihan kategori.
3. **Smart Filters Tugas:**
   * **Hari Ini (`/tugas/hari-ini`):** Tugas terfokus dengan jadwal jatuh tempo hari ini.
   * **Penting (`/tugas/penting`):** Tugas bertanda bintang (*starred / high priority*).
   * **Selesai (`/tugas/selesai`):** Arsip tugas selesai dengan metrik penyelesaian.
4. **Kategori (`/kategori`):**
   * Pengelompokan tugas berdasarkan proyek/ranah hidup (Kerja, Pribadi, Belajar, dll.).
   * Tagging warna menggunakan 8 preset warna hex konsisten.
5. **Notifikasi (`/notifikasi`):**
   * Halaman log riwayat notifikasi & reminder.
   * Quick notification bell dropdown pada header bar.
6. **Pengaturan (`/pengaturan`):**
   * Preferensi aplikasi, profil, dan konfigurasi reminder.

---

## 5. Roadmap Pengerjaan

* [x] **Task 1 - 3:** Audit kode awal, perombakan struktur Next.js App Router, pematangan layout responsive, dan penerapan glassmorphism dark-theme.
* [x] **Task 3.1:** Penyelesaian konflik cache Next.js (`dev` vs `build` isolated clean script).
* [ ] 🔥 **Task 4B (Sedang Berjalan):** Dynamic Island Toast — komponen toast mengapung di atas dengan morphing animasi interaktif ala iOS.
* [ ] ⏳ **Task 4C - 4E:** Micro-animations mendalam (Arc-style tab switching, drag & reorder tasks, celebratory completion burst).
* [ ] ⏳ **Task 5:** Integrasi Supabase Database (CRUD riil, Realtime subscription) & Better Auth.
* [ ] ⏳ **Task 6+:** Konfigurasi PWA (manifest, service worker) + Dual Notification System (Web Push Notification + Email reminder melalui worker/edge function).

---

## 6. Prinsip Rekayasa & Aturan Kunci (Rules of Engagement)

1. **Bug Dulu, Baru Fitur:** Menolak menambahkan kompleksitas baru sebelum kode eksisting bebas dari error dan regression.
2. **Anti-Slop Standard:** Dilarang menggunakan desain generik, template AI murahan, tombol monoton, atau teks filler yang klise. Setiap elemen harus memiliki sentuhan artistik, ergonomis, dan fungsional.
3. **Dark-Only Policy:** Tidak menyediakan mode terang (light mode) untuk menjaga identitas visual eksklusif dan performa kontras tinggi.
4. **Clean Code & Ponytail Simplicity:** Memilih solusi arsitektur yang paling bersih, modular, dan mudah dirawat daripada over-engineering.

---

## 7. Instruksi untuk AI Brainstorming / Kolaborator

Jika Anda memberikan file ini ke AI lain untuk meminta ide, sertakan prompt pemicu berikut di bawahnya:

```markdown
Hai! Saya sedang membangun "TaskFlow v2" berdasarkan konteks proyek di atas.
Tolong bantu saya mengeksplorasi ide pada aspek berikut:

1. [Ide Fitur / UX Unik]: Apa fitur pembeda (unique selling point) yang membuat aplikasi ini terasa seperti "aplikasi produktivitas tahun 2026" tanpa membuatnya bloated? (Contoh: time-blocking visual, micro-habits, keyboard-first navigation ala Raycast/Linear, smart auto-grouping).
2. [Ide Animasi & Interaksi]: Dengan stack Framer Motion + Tailwind v4 + Dynamic Island Toast, interaksi micro apa lagi yang bisa membuat user merasa puas saat menyelesaikan tugas?
3. [Arsitektur Notifikasi]: Bagaimana arsitektur terbaik untuk menggabungkan Web Push Notification PWA dan Email Reminder agar hemat resource dan reliabel?
4. [Skema Database Supabase]: Rekomendasi rancangan skema tabel untuk tasks, categories, subtasks, dan notification logs yang siap untuk realtime sync.
```
