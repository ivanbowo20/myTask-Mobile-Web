# 🔱 TRINITY CODE AUDIT REPORT

**Target:** `components/auth/AuthSlider.js`, `app/(auth)/layout.js`, `app/globals.css`  
**Ruang Lingkup:** Audit visual, styling token, dan kontras tema Celestial Sky (Mode Terang) pada alur autentikasi (Masuk & Daftar)  
**Indeks yang Digunakan:** Native AST (`swc`), DOM Tree & Token Audit, Disiplin AI Systematic Debugging  
**Tanggal Audit:** 28 Oktober 2026  
**Status Fase:** Fase 2 Selesai — Eksekusi Bedah Tuntas & Terverifikasi Terminal (`npm run build` PASS)

---

## 🔍 Ringkasan Eksekutif & Diagnosa Akar Masalah

Pengguna melaporkan adanya tampilan yang bermasalah dan **menghitam** pada sesi login dan pendaftaran saat tema **Celestial Sky** diaktifkan.

Berdasarkan investigasi menyeluruh pada berkas `components/auth/AuthSlider.js` dan riwayat commit (`git log` commit `f124fdbb`):
1. **Akar Masalah Utama (Root Cause):**  
   Pada commit sebelumnya, seluruh elemen `<input>` formulir (Email & Password pada Login; Nama Lengkap, Email, Password, & Konfirmasi Password pada Register) diubah dari `bg-white/[0.02]` menjadi **`bg-black/40`** secara hardcoded.
2. **Tabrakan dengan Arsitektur Tema Celestial Sky:**  
   - Tema Celestial Sky adalah tema **Light Mode** berbasis *Frosted Ice Glass* (`rgba(255, 255, 255, 0.75)`).
   - Di `app/globals.css`, kelas warna teks `.text-[#FAFAFA]` otomatis diinversi menjadi teks gelap `#0F172A` (Deep Slate) untuk menjaga keterbacaan di atas latar belakang putih/terang.
   - Namun, karena `<input>` memiliki kelas `bg-black/40`, browser merender lapisan hitam 40% di atas kartu putih, menghasilkan **kotak input berwarna arang kotor / abu-abu gelap berlumpur (`#606870`)**.
   - Ketika teks input diinversi menjadi warna gelap (`#0F172A`), pengguna harus mengetik **teks hitam di atas kotak abu-abu gelap**, menyebabkan kontras teks anjlok di bawah 2:1 (gagal total standar aksesibilitas WCAG 2.1 AA yang mensyaratkan minimal 4.5:1).

---

## 🚨 1. MUST FIX (Bug Visual Fatal, Kontras Rusak, Aksesibilitas WCAG Gagal)

### [1] Input Form Menghitam & Kontras Teks Tumpuk Gelap (`components/auth/AuthSlider.js:L413, L438, L588, L613, L638, L676`)
- **Fungsi Kode:** Elemen input teks dan kata sandi untuk autentikasi pengguna pada halaman Masuk (`/login`) dan Daftar (`/register`).
- **Akar Masalah (Bug/Logic):**  
  Hardcoded utility `bg-black/40 border border-white/[0.08]` pada keenam elemen `<input>`:
  ```jsx
  className="... bg-black/40 border border-white/[0.08] hover:border-white/[0.16] focus:border-[var(--theme-accent,#D97706)] ... text-[#FAFAFA] placeholder:text-[#71717A] ..."
  ```
  Pada tema Celestial Sky:
  - Latar belakang input menjadi abu-abu gelap berlumpur (`bg-black/40`).
  - Border input putih pudar (`border-white/[0.08]`) menjadi tidak kasat mata di atas kartu putih.
  - Teks yang diketik berubah menjadi `#0F172A` (hitam) di atas kotak abu-abu gelap.
  - Placeholder berubah menjadi `#64748B` (slate) di atas kotak abu-abu gelap.
- **Blast Radius & Caller:**  
  - `components/auth/AuthSlider.js` (komponen inti form login & register).
  - `app/(auth)/login/page.js` (halaman login).
  - `app/(auth)/register/page.js` (halaman pendaftaran).
- **Saran Perbaikan Minimal (Ponytail Fix):**  
  Menambahkan varian tema adaptif untuk Celestial Sky (`[html[data-theme='celestial-sky']_&]:bg-white/85 [html[data-theme='celestial-sky']_&]:border-sky-200/80 [html[data-theme='celestial-sky']_&]:text-slate-900 [html[data-theme='celestial-sky']_&]:placeholder:text-slate-400 [html[data-theme='celestial-sky']_&]:shadow-xs`) atau menerapkan aturan spesifik di `app/globals.css` untuk `.auth-slider-input` agar otomatis menjadi *Frosted Ice Glass Input* saat mode Celestial Sky aktif.
- **Dampak jika Diabaikan:** Formulir tampak rusak, kotor, dan pengguna tidak dapat membaca apa yang mereka ketik.

---

## ⚠️ 2. SHOULD FIX (Harmonisasi Desain & Interaksi Aktif)

### [2] Garis Pemisah (Divider) & Ikon Input Menghilang di Tema Sky (`components/auth/AuthSlider.js:L386, L561, L446, L647`)
- **Fungsi Kode:**  
  - Garis pembatas horizontal antara Google Sign-In dan form email (`"atau dengan email"` / `"atau isi formulir"`).
  - Tombol intip sandi (`Eye` / `EyeOff`) dan ikon field (`User`, `AtSign`, `Lock`, `ShieldCheck`).
- **Akar Masalah:**  
  - Pembatas menggunakan `border-white/[0.08]` yang hilang total pada latar belakang putih.
  - Tombol intip sandi memiliki kelas `hover:text-white` yang jika di-hover di tema terang akan membuat ikon menjadi putih di atas putih (menghilang).
- **Saran Perbaikan Minimal:**  
  - Tambahkan penyesuaian border di Celestial Sky (`[html[data-theme='celestial-sky']_&]:border-sky-200/60`).
  - Sesuaikan hover state ikon agar menjadi `[html[data-theme='celestial-sky']_&]:hover:text-slate-900`.

### [3] Tombol Submit & Checkbox "Ingat Saya" Kurang Kontras (`components/auth/AuthSlider.js:L464, L471, L698`)
- **Fungsi Kode:** Tombol primer formulir (`Button variant="primary"`) dan checkbox persistensi sesi.
- **Akar Masalah:**  
  - `Button variant="primary"` menggunakan `bg-[#FAFAFA]` (putih solid). Pada kartu putih frosted glass di Celestial Sky, tombol putih di atas kartu putih memiliki hierarki visual yang datar.
  - Checkbox menggunakan `accent-white` dan `border-white/[0.16]`.
- **Saran Perbaikan Minimal:**  
  - Pada tema Celestial Sky, tombol submit dapat menggunakan tema aksen Sapphire Blue (`bg-[#0284C7] hover:bg-[#0369A1] text-white`) yang konsisten dengan tombol `specular-button` dan tombol aksi dashboard lainnya, atau tetap putih dengan kontras border & shadow azure yang tegas.
  - Checkbox disesuaikan dengan aksen sky blue.

---

## 💡 3. NICE TO HAVE (Polish & Konsistensi Kartu)

### [4] Frame Luar Kartu Auth di Layar Desktop & Mobile (`components/auth/AuthSlider.js:L278`)
- **Fungsi Kode:** Kontainer terluar kartu autentikasi dengan efek `backdrop-blur-xl`.
- **Akar Masalah:** Border terluar masih menggunakan `border-white/[0.08]`. Di tema Celestial Sky, border ini dapat diselaraskan menjadi `border-sky-200/50` agar memberikan efek kristal es yang serasi dengan desain antarmuka MyTask.

---

## 📊 KESIMPULAN AUDIT TRINITY CODE
- **Total Temuan:** 4 (Must Fix: 1 | Should Fix: 2 | Nice to Have: 1)
- **Komponen Terdampak:** `components/auth/AuthSlider.js` & `app/globals.css`
- **Potensi Regresi:** Nol (perbaikan hanya menyentuh styling tampilan form login/daftar tanpa mengubah logika autentikasi Better Auth).
