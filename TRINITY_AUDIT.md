# 🔱 TRINITY CODE AUDIT REPORT

**Target:** Celestial Sky Theme, Modal Architecture, Theme Picker & Task Cards (`lib/theme-context.js`, `app/globals.css`, `components/ui/Modal.js`, `components/theme/ThemeModal.js`, `components/tugas/AddTaskModal.js`, `components/tugas/EditTaskModal.js`, `components/tugas/TaskCard.js`)  
**Arsitektur & Ruang Lingkup:** Next.js 15 App Router + Tailwind CSS + Framer Motion + Multi-Theme Dynamic Token Engine.  
**Indeks yang Digunakan:** CodeGraph: Ya (`.codegraph/`) | Direct AST & CSS Token Verifier: Ya.

---

## 🚨 1. MUST FIX (Bug, Logika Rusak, Keamanan, Kontras Tak Terbaca)

### [1] Hardcoded Dark Obsidian Surface pada Mobile Modal (`components/ui/Modal.js:L170, L178`, `components/tugas/AddTaskModal.js:L389`, `components/tugas/EditTaskModal.js:L216`)
- **Fungsi Kode:** Kontainer modal/dialog utama dan drawer layar penuh pada perangkat mobile untuk Tambah Tugas, Edit Tugas, dan Tambah Kategori.
- **Akar Masalah (Bug/Logic):** 
  - Pada layar mobile (`< lg`), kontainer modal di `Modal.js` di-hardcode menggunakan kelas `bg-[#0C0A09]` (warna obsidian gelap dari tema Dark Chocolate).
  - Header modal di `Modal.js:L178` di-hardcode menggunakan `bg-[#0C0A09]/95`.
  - Sticky footer di `AddTaskModal.js:L389` dan `EditTaskModal.js:L216` di-hardcode menggunakan `bg-[#0C0A09]/95`.
  - Di saat yang bersamaan, aturan CSS di `app/globals.css:L376-395` untuk tema `celestial-sky` (Light Mode) membalikkan semua teks kelas `.text-[#FAFAFA]`, `.text-white`, dan `.text-zinc-100` menjadi `#0F172A` (tinta slate sangat gelap/hampir hitam) dengan `!important`.
  - **Dampak Tabrakan Warna:** Teks `#0F172A` (hitam pekat) dirender di atas latar belakang `#0C0A09` (hitam pekat). Kontras drop menjadi **1.1:1**, jauh di bawah standar WCAG AA (4.5:1). Hasilnya, seluruh teks judul ("Tambah Tugas Baru"), input teks ("Apa yang perlu diselesaikan?"), tombol "Batal", dan ikon tombol close menjadi **hitam pekat di atas hitam pekat (sama sekali tidak kelihatan)**.
- **Blast Radius & Caller:** `components/ui/Modal.js`, `components/tugas/AddTaskModal.js`, `components/tugas/EditTaskModal.js`, `components/kategori/AddCategoryModal.js`, `components/kategori/EditCategoryModal.js`.
- **Saran Perbaikan Minimal (Ponytail Fix):**
  - Ganti `bg-[#0C0A09]` dan `bg-[#0C0A09]/95` pada mobile modal dengan kelas token tema adaptif `.glass-modal` atau `bg-[var(--theme-nav-bg)]`.
  - Di `app/globals.css`, pastikan `.glass-modal` pada tema Celestial Sky di layar mobile menggunakan surface es kristal terang (`rgba(255, 255, 255, 0.95)` dengan specular border `rgba(186, 230, 253, 0.8)`).
- **Dampak jika Diabaikan:** Pengguna HP dengan tema Celestial Sky tidak dapat membaca form tambah tugas maupun edit tugas.

---

### [2] Global Text Inversion Merusak Tagline Pill pada Theme Picker (`components/theme/ThemeModal.js:L258-266`, `app/globals.css:L376-380`)
- **Fungsi Kode:** Mockup kartu preview tema di dalam modal "Pilih Tema Tampilan".
- **Akar Masalah (Bug/Logic):**
  - Di dalam setiap kartu preview tema (`Dark Chocolate`, `Soft Aurora`, `Abyssal Teal`, `Celestial Sky`), terdapat pill floating mockup:
    ```jsx
    <div className="relative z-10 px-3 py-1.5 rounded-lg bg-black/40 backdrop-blur-md border border-white/[0.12] ...">
      <span className="text-[10px] font-semibold text-[#FAFAFA] tracking-wide">
        {t.tagline}
      </span>
    </div>
    ```
  - Pill ini sengaja didesain memiliki latar belakang gelap (`bg-black/40`) di semua tema.
  - Namun, karena selektor CSS global di `app/globals.css:L376`:
    ```css
    html[data-theme="celestial-sky"] .text-[#FAFAFA] {
      color: #0F172A !important;
    }
    ```
  - Teks `{t.tagline}` ("Hangat & Mewah", "Tenang & Mengalir", "Bioluminescent & Menenangkan", "Cerah, Sejuk & Produktif") dipaksa menjadi `#0F172A` (hitam pekat) di dalam pill `bg-black/40`.
  - Akibatnya, pada tangkapan layar `media_1792639984089_688e86e8.png`, seluruh tulisan tagline di jendela preview menjadi hitam dan tidak terbaca sama sekali.
- **Blast Radius & Caller:** `components/theme/ThemeModal.js`.
- **Saran Perbaikan Minimal (Ponytail Fix):**
  - Berikan isolasi proteksi warna putih khusus pada teks pill preview: tambahkan kelas `.theme-preview-tagline` atau style `color: #FFFFFF !important`.
  - Di `app/globals.css`, tambahkan pengecualian agar teks di dalam container `.bg-black/*` atau `.theme-preview-pill` tidak diubah menjadi `#0F172A`.
- **Dampak jika Diabaikan:** Menu pemilihan tema terlihat cacat dan tidak profesional karena teks tagline preview hilang.

---

## ⚠️ 2. SHOULD FIX (Risiko Skala, Blast Radius, Refaktor Arsitektur)

### [3] Kartu Pilihan Tema Membaur/Hilang Garis Batas pada Light Modal (`components/theme/ThemeModal.js:L203-204`)
- **Fungsi Kode:** Daftar kartu opsi tema yang dapat diklik pengguna di modal Pilih Tema.
- **Akar Masalah:**
  - Kartu tema yang tidak aktif menggunakan styling:
    `border border-white/[0.08] bg-white/[0.02] hover:border-white/[0.2] hover:bg-white/[0.05]`
  - Pada tema Celestial Sky, background modal adalah putih frosted (`rgba(255, 255, 255, 0.92)`).
  - Garis batas `border-white/[0.08]` putih transparan di atas putih menghasilkan kontras nol (invisible border). Kartu terlihat melayang tanpa batas tepi yang tegas.
- **Saran Perbaikan Minimal (Ponytail Fix):**
  - Tambahkan styling khusus light mode pada kartu tema tidak aktif di `app/globals.css`:
    ```css
    html[data-theme="celestial-sky"] .glass-modal button[aria-pressed="false"] {
      background-color: rgba(255, 255, 255, 0.75) !important;
      border-color: rgba(186, 230, 253, 0.80) !important;
      box-shadow: 0 2px 8px rgba(2, 132, 199, 0.06) !important;
    }
    ```

---

### [4] Kontras Rendah pada Badge "Aktif" & Grab Handle Mobile (`components/theme/ThemeModal.js:L150, L212`)
- **Fungsi Kode:** Status indikator tema yang sedang aktif dan handle geser mobile sheet.
- **Akar Masalah:**
  - Badge aktif menggunakan `bg-[var(--theme-accent)] text-[#0A0A0A]`. Pada Celestial Sky, aksennya adalah `#0284C7` (Sky-600). Teks hitam `#0A0A0A` di atas `#0284C7` hanya memiliki rasio kontras 4.0:1 (gagal WCAG AA untuk font ukuran 11px). Teks wajib berwarna putih `#FFFFFF` (rasio kontras 4.6:1+).
  - Grab handle mobile menggunakan `bg-white/20`, tidak terlihat sama sekali di atas sheet putih.
- **Saran Perbaikan Minimal (Ponytail Fix):**
  - Ubah warna teks badge aktif menjadi `#FFFFFF` pada Celestial Sky.
  - Ubah warna grab handle menjadi `bg-slate-300` pada light mode.

---

### [5] Tombol Sekunder "Batal" & Input Border Contrast di Celestial Sky (`components/ui/Button.js:L23`, `app/globals.css:L472-479`)
- **Fungsi Kode:** Tombol Batal dan field input di semua modal.
- **Akar Masalah:**
  - `Button.js` varian `secondary` ("Batal") menggunakan `bg-[rgba(255,255,255,0.04)] text-[#FAFAFA] border border-[rgba(255,255,255,0.08)]`.
  - Di tema Celestial Sky, teks diubah menjadi `#0F172A`, tetapi background dan border tidak disesuaikan dengan light mode, sehingga tampak kusam atau tidak jelas batas interaksinya.
- **Saran Perbaikan Minimal (Ponytail Fix):**
  - Tambahkan rule di `globals.css` agar tombol sekunder memiliki background `rgba(241, 245, 249, 0.9)`, border `rgba(186, 230, 253, 0.8)`, dan teks `#334155`.

---

## 💡 3. NICE TO HAVE (Lean, Pembersihan Bloat & YAGNI)

### [6] FOUC (Flash of Unstyled Color) pada Reload Awal (`app/layout.js:L61`)
- **Fungsi Kode:** Skrip inline `<script>` di `<head>` untuk menyetel variabel CSS sebelum hidrasi React.
- **Peluang Optimasi:**
  - Kamus tema `var c = {...}` di `app/layout.js:L61` saat ini hanya mencatat `dark-chocolate`, `soft-aurora`, dan `abyssal-teal`. `celestial-sky` belum terdaftar di skrip ini.
  - Akibatnya, saat hard refresh pada tema Sky, browser sempat menampilkan fallback warna gelap selama sepersekian milidetik sebelum `ThemeProvider` React aktif.
- **Saran Perbaikan:** Masukkan token `celestial-sky` ke dalam dictionary script inline di `app/layout.js`.

---

## 📊 KESIMPULAN AUDIT
- **Total Temuan:** 6 (Must Fix: 2 | Should Fix: 3 | Nice to Have: 1)
- **Akar Masalah Utama:** Ketidaksinkronan arsitektur modal mobile yang masih meng-hardcode warna gelap `#0C0A09` sementara selektor CSS global memaksa semua teks menjadi hitam `#0F172A` untuk light mode.
- **Prinsip Solusi (SielloMita + Trinity):** Mengganti hardcoded color di shared modal core (`Modal.js`) menjadi token adaptif tema, serta memberikan isolasi selektor CSS agar elemen gelap (seperti pill preview) tetap mempertahankan teks putih kontras tinggi.
