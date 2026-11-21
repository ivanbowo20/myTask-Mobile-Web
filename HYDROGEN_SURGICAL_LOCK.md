# HYDROGEN SURGICAL LOCK & MULTI-MODEL CONTAINMENT PROTOCOL (V2.0 GENERAL)

**STATUS: WAJIB DIBACA, DISIMPAN, DAN DITERAPKAN SEBELUM MENULIS ATAU MENGUBAH KODE APA PUN.**

Protokol ini dibuat untuk menjamin integritas kode, estetika visual (Design DNA), serta keamanan data pada proyek web (React, Vite, Next.js, Three.js, Vercel, Supabase, dan Netlify).

Tujuan utama dari protokol ini adalah membatasi ruang gerak model AI ringan (Hydrogen 4) atau model baru agar **TIDAK PERNAH** merusak, merombak, atau mereset hasil kerja dari model kelas tinggi (Neon 4).

---

## I. MATRIKS PEMBAGIAN TUGAS MODEL (TASK ROUTING)

| Jenis Tugas / Modul | Model Wajib | Batas Toleransi & Pembatasan |
| :--- | :--- | :--- |
| **Arsitektur Utama & DB Schema** | **Neon 4** | Pembuatan komponen 3D baru, struktur Supabase RLS, kalkulasi algoritma rumit, perancangan ulang layout utama. |
| **Audit Keamanan & Kecepatan** | **Neon 4** | Audit OWASP, integrasi Gitleaks CI, pengerasan header security, optimasi WebGL canvas. |
| **Bedah Mikro & Edit Ringan** | **Hydrogen 4** | Perubahan teks/label, penyesuaian jarak (padding/margin), penambahan item data di JSON/array, edit 1 file terisolasi. |
| **Fitur Visual Musiman (e.g. Tema Natal)** | **Neon 4 (Inisiasi) → Hydrogen (Edit)** | Neon 4 membuat komponen latar belakang musiman pertama kali; Hydrogen 4 hanya mengedit parameter warna/kecepatan partikel. |

---

## II. 7 HUKUM BESAR KETERISOLASIAN KODE (IRONCLAD RULES)

### 1. Hak Akses Berkas Terbatas (Strict File Whitelist)
- AI **HANYA BOLEH** membaca dan mengedit berkas yang tercantum secara eksplisit pada daftar `TARGET_FILES`.
- Seluruh berkas lain di luar daftar tersebut berstatus **READ-ONLY MUTLAK**.
- Dilarang keras menyentuh, merapikan ulang, atau memformat berkas seperti `App.tsx`, `app/page.js`, `app/layout.js`, `index.css`, `app/globals.css`, koneksi Supabase (`lib/supabase/*` / `supabaseClient.ts`), atau skema database (`supabase/*`) tanpa izin langsung.

### 2. Perlindungan DNA Desain & Logika (Zero Visual/Logic Regression)
- Dilarang mengganti palet warna, sistem kelas Tailwind (`.liquid-glass`, `.glass-card`, efek neon, dsb.), komponen UI, atau alur logika yang sudah ada.
- Jika bertugas menambahkan elemen baru, elemen tersebut **WAJIB** menyesuaikan gaya visual eksisting, bukan membuat gaya desain baru yang bertabrakan.

### 3. Eksekusi Berbasis Selisih (Diff-Only Updates)
- Dilarang menulis ulang (*regenerate*) seluruh isi berkas apabila perubahan hanya memerlukan beberapa baris kode.
- Fokus hanya pada elemen, variabel, atau komponen yang diperintahkan.

### 4. Dilarang Melakukan Refactoring Tanpa Perintah
- Dilarang mengubah nama variabel, memindahkan fungsi ke file lain, mengganti tipe data TypeScript/JSDoc, atau mengganti pustaka (*library*) npm yang sudah berjalan normal.

### 5. Perlindungan Rahasia & Variabel Lingkungan (Secret Shield)
- Dilarang memasukkan, mengubah, atau menampilkan nilai asli API Key, Service Role Key, URL Supabase, atau isi berkas `.env` / `.env.local` langsung ke dalam kode klien atau riwayat percakapan.
- Gunakan selalu rujukan variabel lingkungan aman (`import.meta.env.*` atau `process.env.*`).

### 6. Berhenti Saat Ambigu (Stop on Ambiguity)
- Jika perintah dari pengguna bersifat umum (seperti *"polish UI"*, *"rapikan kodenya"*, atau *"baguskan tampilannya"*), AI **WAJIB BERHENTI** dan meminta spesifikasi detail berkas serta bagian mana yang ingin diubah sebelum menyentuh kode.

### 7. Konfirmasi 3 Baris Wajib (3-Line Pre-Flight Lock)
- Sebelum menulis kode apa pun, AI **WAJIB** mencantumkan 3 baris konfirmasi ringkas berikut pada bagian paling atas respons:

```text
[PRE-FLIGHT LOCK]
• Target File : <nama_file_yang_diizinkan>
• Perubahan   : <deskripsi_singkat_baris_atau_fitur_yang_diubah>
• Garansi     : Dilarang menyentuh file lain, logika Supabase/DB, dan Design DNA eksisting.
```

---

## III. TEMPLATE PROMPT SIAP PAKAI

### Template A: Untuk Tugas Ringan (Hydrogen 4)

Salin teks di bawah ini setiap kali menugaskan Hydrogen 4 untuk melakukan tugas ringan:

```text
Aktifkan **HYDROGEN SURGICAL LOCK (V2.0)**.

- TARGET_FILES: `src/components/ChristmasBackground.tsx`
- TUGAS SPESIFIK: Ubah kecepatan animasi partikel salju dari `duration: 5` menjadi `duration: 8` dan ganti warna glow menjadi `#38BDF8`.
- LARANGAN: Dilarang menyentuh file Supabase, dilarang merubah layout halaman utama, dilarang refactor nama variabel, dan dilarang menyentuh file di luar TARGET_FILES.

Tulis 3-Line Pre-Flight Lock terlebih dahulu sebelum mengeksekusi kode.
```

### Template B: Untuk Pembuatan Fitur Baru (Neon 4)

Salin teks di bawah ini saat menggunakan Neon 4 untuk menambahkan fitur/tampilan baru tanpa merusak sistem lama:

```text
Jalankan tugas pembuatan fitur baru dengan **ISOLASI KOMPONEN MANDIRI**.

- FITUR BARU: Tambahkan efek latar belakang Ambient Tema Natal.
- INSTRUKSI ISOLASI: 
  1. Buat berkas baru secara terpisah (`src/components/ambient/ChristmasTheme.tsx`).
  2. Jangan ubah komponen utama yang sudah ada. Cukup panggil komponen baru ini sebagai lapisan (*overlay*) transparan di `App.tsx` tanpa merusak z-index UI utama.
  3. Pastikan seluruh variabel warna dan kelas Tailwind tunduk pada Design DNA eksisting (`.liquid-glass`, tema gelap cybernetic).
```
