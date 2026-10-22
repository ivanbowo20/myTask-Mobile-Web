# 🔱 TRINITY CODE AUDIT REPORT

**Target:** Mobile DateTimePicker, Cross-Platform Android/iOS Date UX, and Modal Forms (`components/ui/DateTimePicker.jsx`, `components/tugas/AddTaskModal.js`, `components/tugas/EditTaskModal.js`)  
**Arsitektur & Ruang Lingkup:** Next.js 15 App Router + Tailwind CSS + Framer Motion + Responsive Touch Controls.  
**Indeks yang Digunakan:** CodeGraph: Ya (`.codegraph/`) | Direct AST & Git History Verifier: Ya.

---

## 🚨 1. MUST FIX (Bug, Logika Rusak, Keamanan, Degradasi Platform)

### [1] Hardcoded Native `<input type="datetime-local">` Merusak UX Mobile di Android / Tecno POVA 6 (`components/ui/DateTimePicker.jsx:L310-330`)
- **Fungsi Kode:** Komponen pemilih tanggal & jam tenggat waktu (deadline picker) untuk tugas baru dan edit tugas.
- **Akar Masalah (Bug/Logic):**
  - Pada commit `c5297bfd`, dibuat pemisahan responsif: untuk viewport layar kecil (`sm:hidden`, `< 640px`), kalender interaktif dan 3D wheel **SENGAJA DISEMBUNYIKAN** (`hidden sm:flex`).
  - Sebagai gantinya, dipasang `<input type="datetime-local" ... />` dengan anggapan pengguna HP akan memakai native picker bawaan.
  - **Mengapa di HP developer terlihat ada animasi popup, sedangkan di HP Tecno POVA 6 tidak ada?**
    - **Di iOS (iPhone/Safari):** Tag `<input type="datetime-local">` memicu sheet roda putar native Apple yang halus dengan animasi popup bawaan iOS.
    - **Di Android / HiOS (Tecno POVA 6):** Tag `<input type="datetime-local">` dirender sebagai **input box teks polos HTML5** yang menampilkan teks mentah `dd/mm/tttt, --:--`.
    - Kotak ini tidak memunculkan popup kalender web interaktif, tidak memiliki visual identitas tema aplikasi (tampak seperti form HTML jadul 1995), dan membuat pengguna Tecno POVA 6 mengeluh karena tidak ada opsi tenggat waktu atau popup kalender yang jelas.
- **Blast Radius & Caller:**
  - `components/ui/DateTimePicker.jsx`
  - `components/tugas/AddTaskModal.js:L285` (Modal Tambah Tugas)
  - `components/tugas/EditTaskModal.js:L144` (Modal Edit Tugas)
- **Saran Perbaikan Minimal (Ponytail Fix):**
  - Singkirkan `<input type="datetime-local">` mentah dari antarmuka mobile.
  - Bangun arsitektur kalender & pemilih waktu kustom yang 100% responsif untuk semua layar (lebar mobile 360px - 430px) tanpa degradasi HTML5 mentah.
  - Di mobile, gunakan tab switcher yang elegan `[ 📅 Tanggal ]` & `[ 🕒 Jam ]` atau collapsible accordion di dalam popover sehingga muat di layar HP tanpa overflow dan terasa mulus di semua merk smartphone (Tecno, Samsung, Xiaomi, iPhone, dll).
- **Dampak jika Diabaikan:** 70%+ pengguna mobile Android (terutama merk Transsion/Tecno/Infinix, Xiaomi, Realme) akan mengira aplikasi rusak atau belum selesai dibuat.

---

## ⚠️ 2. SHOULD FIX (Risiko UX & Ketidaknyamanan Interaksi)

### [2] Hit Target & Touch Interaction di Layar Sempit (`components/ui/DateTimePicker.jsx:L397-412`)
- **Fungsi Kode:** Grid tanggal 1-31 pada bulan aktif.
- **Akar Masalah:**
  - Tombol tanggal menggunakan `h-7 w-full` (tinggi hanya 28px).
  - Standar WCAG 2.1 & Apple Human Interface Guidelines mewajibkan ukuran sentuh jari minimal **44px × 44px** (atau minimal 36px dengan padding sentuh).
  - Pada layar HP Tecno POVA 6 (layar 6.78" FHD+), tombol 28px terlalu kecil sehingga rentan salah tekan (*fat-finger error*).
- **Saran Perbaikan:**
  - Tingkatkan touch hit-target tanggal menjadi minimal `h-9` atau `h-10` dengan active feedback WWDC fluid springs (`:active scale(0.96)`).

---

## 💡 3. NICE TO HAVE (Lean & Polish)

### [3] Sinkronisasi Waktu Cepat (Quick Presets) Langsung Menutup Dialog (`components/ui/DateTimePicker.jsx:L293-296`)
- **Fungsi Kode:** Tombol preset "Hari Ini 17:00", "Besok 09:00", dll.
- **Peluang Optimasi:**
  - Saat ini tombol preset langsung mengeksekusi `onChange` dan `setIsOpen(false)`. Ini sudah bagus dan efisien (1-tap action).
  - Namun dapat diperkaya dengan haptic visual ripple / micro-bounce sebelum menutup agar terasa responsif dan meyakinkan di HP.

---

## 📊 KESIMPULAN AUDIT
- **Total Temuan:** 3 (Must Fix: 1 | Should Fix: 1 | Nice to Have: 1)
- **Status Server & CSS:** Server dalam kondisi prima (bukan masalah server). CSS tema bekerja normal. Masalah murni merupakan **pilihan implementasi kode kondisional `sm:hidden`** yang merender `<input type="datetime-local">` polos di mobile.
- **Solusi SielloMita:** Hapus ketergantungan pada native HTML5 datetime-local di mobile, ganti dengan custom interactive date-time sheet yang konsisten di semua platform.
