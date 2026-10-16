# UI Inspiration & Component Catalog (TaskFlow / TodoWeb v2)

> **Tujuan Dokumen:** Katalog referensi komponen UI, animasi interaktif, dan library micro-interaction modern untuk TaskFlow v2. Dokumen ini menjadi acuan utama bagi AI Coding Agent dan Developer untuk memilih, mengambil, dan mengimplementasikan komponen visual kelas atas (premium) yang cocok dengan tema **Dark Glassmorphism (Selenium Palette)** dan **Motion Language (Apple & Arc Browser Style)**.

---

## 1. Direktori Sumber & Referensi Komponen

Berikut adalah daftar library dan katalog komponen siap pakai yang telah dikurasi:

### 1. Aceternity UI
* **URL:** [ui.aceternity.com](https://ui.aceternity.com)
* **Stack:** React, Tailwind CSS, Framer Motion
* **Karakteristik:** Efek 3D modern, spotlight hover, border glow gradient, background effects (aurora, meteors, dots).
* **Komponen Unggulan untuk TodoWeb:**
  - `3D Card Effect`: Kartu tugas berputar 3D halus mengikuti koordinat mouse (`perspective(1000px)`).
  - `Spotlight / Card Hover Glow`: Efek sorotan cahaya radial di belakang kartu saat di-hover.
  - `Text Generate / Reveal Effect`: Animasi kemunculan kata demi kata saat membuka detail tugas atau headline sambutan.
  - `Animated Tooltip`: Tooltip avatar atau badge kategori dengan spring pop halus.

### 2. Skiper UI
* **URL / Source:** [skiper-ui / skiper.io](https://skiper-ui.com)
* **Stack:** React, Tailwind CSS, Framer Motion (Single File per Component, Shadcn CLI Ready)
* **Karakteristik:** Micro-interactions ekspresif, tanpa dependensi berlebih, fokus interaksi sentuh & gestur.
* **Komponen Unggulan untuk TodoWeb:**
  - `Dynamic Island Pill`: Floating pill interaktif di atas/bawah layar untuk status notifikasi & progress counter.
  - `Interactive Checklist / Devouring Details`: Animasi centang tugas yang fluid dan ekspresif.
  - `Drag & Scroll Elements`: Gestur drag halus pada list kategori dan filter tags.

### 3. Planes UI
* **URL:** [useplanes.com](https://useplanes.com)
* **Stack:** TypeScript, Tailwind CSS, Motion (Framer Motion)
* **Karakteristik:** **Didesain khusus untuk AI Agents** (mendukung `llms.txt` & MCP server). Komponen source code terbuka dan dapat diedit langsung.
* **Komponen Unggulan untuk TodoWeb:**
  - `Calendar / Due Date Picker`: Pemilih tanggal jatuh tempo tugas yang sangat bersih dan modern.
  - `Animated Filter Tabs`: Transisi slide halus penanda tab aktif (Semua, Aktif, Selesai, Terlambat).
  - `Status Badge Selector`: Dropdown pemilih prioritas (Tinggi, Sedang, Rendah) yang fluid.

### 4. Arc UI
* **URL:** [uiarc.dev](https://uiarc.dev)
* **Stack:** React, Tailwind CSS, Design Tokens Konsisten
* **Karakteristik:** Komponen dan blok lengkap khusus **Dashboard, Metrics, Settings, & Auth**.
* **Komponen Unggulan untuk TodoWeb:**
  - `Metric Summary Cards`: Tampilan angka ringkasan (Total Tugas, Produktivitas, Selesai) dengan loading states elegan.
  - `Skeleton Loaders`: Transisi shimmer gelap saat data tugas sedang dimuat.
  - `Settings / Preferences Layout`: Panel pengaturan akun dan preferensi notifikasi yang rapi.

### 5. Space UI
* **URL:** [spaceui.one](https://spaceui.one)
* **Stack:** React, Shaders, Framer Motion
* **Karakteristik:** Mengutamakan animasi *liquid switches*, *morphing controls*, *animated loaders*, dan *gooey effects*.
* **Komponen Unggulan untuk TodoWeb:**
  - `Liquid Switch / Morphing Checkbox`: Centang tugas dengan efek elastis/gooey saat diklik.
  - `Tactile Sliders`: Slider prioritas atau progress bar persentase penyelesaian tugas.
  - `Animated Morphing Buttons`: Tombol "Simpan" yang morphing menjadi spinner halus lalu tanda centang hijau.

### 6. Canvas UI
* **URL:** Canvas-powered effects (HTML-in-canvas)
* **Stack:** WebGL, WebGPU, HTML Canvas (Framework Agnostic)
* **Karakteristik:** Efek ambient visual kelas tinggi berbasis shader canvas (Aurora, Fluid, Glass, Ripple, Spotlight).
* **Komponen Unggulan untuk TodoWeb:**
  - `Ambient Aurora / Mesh Gradient Background`: Cahaya latar belakang sangat halus di area Hero Dashboard atau Halaman Login.
  - `Ripple Click Feedback`: Gelombang cahaya halus saat tombol aksi utama (FAB "+ Tugas Baru") ditekan.

### 7. Huashu Design
* **Repo / Author:** `alchaincyf/huashu-design` (@khifrandevsolution)
* **Stack:** React, Modern CSS & Tailwind
* **Karakteristik:** Desain minimalis kreatif dengan micro-animation taktis dan responsif.
* **Komponen Unggulan untuk TodoWeb:**
  - Micro-cards untuk sub-tasks.
  - Sidebar collapsed-to-expanded transition yang presisi.

### 8. Dark Design Showcase
* **URL:** [dark.design](https://dark.design)
* **Peran:** Portal kurasi website *dark-mode* terbaik dunia.
* **Manfaat untuk TodoWeb:**
  - Acuan kontras warna gelap (tidak menggunakan pure black `#000000` datar, melainkan kedalaman layer `#0A0A0A`, `#141416`, `#1E1D20`).
  - Standar hierarki tipografi: High contrast white `#FAFAFA` untuk heading, muted zinc `#A1A1AA` & `#71717A` untuk data pelengkap.

### 9. Resource Pelengkap: Magic UI & Origin UI
* **Magic UI ([magicui.design](https://magicui.design)):**
  - `Number Ticker`: Angka bertambah berputar halus saat membuka dashboard.
  - `Confetti Celebration`: Partikel selebrasi saat semua tugas hari ini tuntas.
  - `Border Beam`: Garis cahaya melingkar di sekeliling kartu tugas berprioritas mendesak.
* **Origin UI ([originui.com](https://originui.com)):**
  - Input form pencarian dengan shortcut keyboard badge (`Ctrl + K`).
  - Dropdown filter minimalis dengan animasi spring halus.

### 10. Cult UI
* **URL:** [cult-ui.com](https://cult-ui.com)
* **Tagline:** *"Shadcn, expanded — Experimental animated components and effects for modern interfaces"*
* **Stack:** React, Tailwind CSS, Motion (Framer Motion), Shadcn CLI Compatible
* **Karakteristik:** Ekstensi animasi canggih untuk ekosistem shadcn/ui (150+ komponen & effects). Menggunakan arsitektur registry shadcn (`npx shadcn@latest add @cult-ui/...`) sehingga source code langsung disalin ke proyek tanpa black-box dependency. Sangat ramah AI coding agent dengan dukungan struktur LLM & MCP.
* **Komponen Unggulan untuk TodoWeb:**
  - `Shift Card`: 3D hover tilt card yang sangat fluid dan responsif terhadap pergerakan kursor mouse, sangat cocok untuk `TaskCard` dan kartu kategori premium.
  - `Halo Button`: Tombol aksi primer ("+ Tambah Tugas", "+ Kategori Baru") dengan animasi glowing dynamic halo di sekeliling border saat aktif/hover.
  - `AI Prompt & Command Bar`: Input bar dinamis dengan micro-interaction ekspansi halus dan badge keyboard tactile.
  - `Reactive Status Indicators`: Badge prioritas dengan animasi pulse glow halus untuk tugas mendesak.

### 11. Framer (Marketplace & Motion Showcase)
* **URL:** [framer.com/marketplace](https://framer.com/marketplace)
* **Karakteristik:** Standar emas interaksi UI modern, physics-based springs, dan gestur visual fluid. Menjadi acuan utama untuk micro-interactions kelas atas, tactile feedback, dan transisi layout berbasis fisik.
* **Komponen Unggulan untuk TodoWeb:**
  - `Interactive Slide-out / Drawer Card`: Kartu interaktif di mana elemen detail (sub-tasks atau checklist) dapat meluncur keluar halus (seperti interaksi vinyl album sleeve / drawer) saat di-hover atau di-expand tanpa memicu reflow layout yang kasar.
  - `Inertia & Snap Drag Gestures`: Kurva spring physics alami untuk interaksi drag-and-drop antar kolom status (To-Do -> In Progress -> Done).
  - `Layered Depth Showcase Cards`: Kartu ringkasan dengan efek depth clipping dan multi-layer glassmorphism untuk area recap produktivitas mingguan.

### 12. The Design Stack
* **URL:** [thedesignstack.co.in](https://thedesignstack.co.in)
* **Tagline:** *"Paste-ready design, prompt-ready motion"*
* **Stack:** Figma Kits, Code Components, Prompt-Ready Motion Snippets
* **Karakteristik:** Portal kurasi aset desain siap pakai dan formula prompt motion yang dirancang khusus untuk diintegrasikan langsung ke AI coding agent (Claude Code, Cursor, Antigravity). Menjembatani desain high-craft dengan otomatisasi kode berbasis prompt.
* **Komponen Unggulan untuk TodoWeb:**
  - `Prompt-Ready Motion Presets`: Resep kurva animasi dan timing spesifik yang siap dioper ke AI agent untuk menghasilkan micro-interaction fluid secara konsisten.
  - `Paste-Ready Card & Dashboard Blocks`: Struktur kartu modular dengan kontras dark mode elegan dan hierarki visual yang tajam.
  - `Texture & Halftone Accents`: Aksen visual modern (halftone mesh, subtle grain, and geometric accents) untuk memberikan karakter unik pada header modal dan empty-state kartu.

### 13. OriginKit
* **URL:** [originkit.dev](https://originkit.dev)
* **Tagline:** *"Animated component infrastructure for the modern web"*
* **CLI:** `npx originkit add <component-name>`
* **Stack:** React, Next.js, TypeScript, Tailwind CSS, Framer Motion
* **Karakteristik:** Infrastruktur komponen animasi produksi dengan fokus micro-interaction mutakhir, efek visual GPU-safe, serta dukungan native untuk AI Coding Agents via Model Context Protocol (MCP server: `mcp.originkit.dev`).
* **Komponen Unggulan untuk TodoWeb:**
  - `Morphing Interactive Cards`: Kartu tugas/kategori yang bertransformasi bentuk secara elastis saat di-expand atau diklik.
  - `Animated Bento & Metric Grids`: Layout grid dinamis dengan interaksi hover visual yang sangat hidup untuk ringkasan dashboard.
  - `Smooth State-Changing Buttons`: Tombol aksi yang responsif dengan transisi state (idle -> loading -> success) yang fluid dan tanpa jeda visual.

### 14. DaisyUI
* **URL:** [daisyui.com](https://daisyui.com)
* **Tagline:** *"The most popular component library for Tailwind CSS — Faster, cleaner, easier"*
* **Stack:** Tailwind CSS Plugin, Pure CSS Classes (0kb JS overhead, Framework Agnostic)
* **Karakteristik:** Menyederhanakan penulisan utility Tailwind yang panjang menjadi semantic component classes (`btn`, `card`, `badge`, `modal`, `steps`, `toggle`, `drawer`, `stat`). Mendukung 30+ tema bawaan, sangat ringan, dan mempermudah struktur markup UI tetap rapi dan mudah dibaca.
* **Komponen Unggulan untuk TodoWeb:**
  - `Steps & Timeline Indicator`: Penanda alur tahapan tugas atau status progres proyek (Belum Mulai -> Dikerjakan -> Review -> Selesai).
  - `Radial Progress Ring`: Indikator persentase penyelesaian tugas berbasis SVG murni (`radial-progress`) tanpa butuh library grafik eksternal.
  - `Semantic Badges & Toggle Switches`: Badge status tugas (`badge-primary`, `badge-outline`) dan toggle switch prioritas yang bersih dan ringan.
  - `Lightweight Modal & Drawer`: Drawer navigasi samping dan modal konfirmasi yang cepat dan mudah diatur lewat CSS.

### 15. React Bits
* **URL:** [reactbits.dev](https://reactbits.dev)
* **Tagline:** *"Build the whole product with one library — 230+ components & animated blocks"*
* **GitHub:** [DavidHDev/react-bits](https://github.com/DavidHDev/react-bits) (~50k stars)
* **Stack:** React, Next.js, Motion (Framer Motion), Tailwind CSS / Pure CSS, JS/TS
* **Karakteristik:** Library komponen animasi modern terdepan yang sangat populer untuk **Text Animations** unik (30+ variasi efek teks), latar belakang ambient interaktif, serta micro-interactions. Memiliki fitur bawaan *"Copy for AI"* untuk memudahkan AI coding agent menyalin implementasi kode instan.
* **Komponen Unggulan untuk TodoWeb:**
  - `Fold Text & Split Text`: Animasi teks terlipat seperti lipatan kertas yang terbuka mendatar (*"Lines unfold into place like creased paper opening flat"*) — sangat dramatis untuk headline Dashboard atau nama kategori.
  - `Blur Text & Decrypted Text`: Teks judul atau quote motivasi produktivitas yang bertransisi halus dari blur menjadi tajam.
  - `True Focus`: Efek fokus kata dinamis yang menyorot kata penting secara bergantian pada kartu tugas mendesak.
  - `Click Spark / Splash Feedback`: Percikan partikel mikro saat tugas ditandai selesai (*celebration feedback*).

---

## 2. Pemetaan Komponen ke Fitur TodoWeb V2

Berikut adalah panduan bagi AI Agent saat membangun atau merefaktor fitur spesifik:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FITUR TODOWEB V2                                │
├──────────────────────────┬─────────────────────────────┬───────────────┤
│ Fitur / Komponen Target  │ Efek & Karakter Animasi     │ Sumber Acuan  │
├──────────────────────────┼─────────────────────────────┼───────────────┤
│ 1. TaskCard (Kartu Tugas)│ 3D Mouse Tilt + Glow Border │ Aceternity UI │
│                          │ Spring Scale on Click       │ Emil Kowalski │
├──────────────────────────┼─────────────────────────────┼───────────────┤
│ 2. Task Checkbox         │ Morphing / Liquid Check     │ Space UI      │
│                          │ Strike-through Text Slide   │ Motion        │
├──────────────────────────┼─────────────────────────────┼───────────────┤
│ 3. Stat Metrics Cards    │ Rolling Number Ticker       │ Magic UI      │
│                          │ Semi-circular Progress Ring │ Arc UI        │
├──────────────────────────┼─────────────────────────────┼───────────────┤
│ 4. Floating Action & Add │ Morphing FAB to Modal       │ Skiper UI     │
│                          │ Tactile Scale 0.97 Press    │ Apple Design  │
│                          │ Halo Glow Border            │ Cult UI       │
├──────────────────────────┼─────────────────────────────┼───────────────┤
│ 5. Date & Due Picker     │ Spring Popover, Year Slider │ Planes UI     │
├──────────────────────────┼─────────────────────────────┼───────────────┤
│ 6. Toast Notification    │ Dynamic Island Capsule      │ Skiper / Custom│
├──────────────────────────┼─────────────────────────────┼───────────────┤
│ 7. Ambient Background    │ Subtle Aurora / Selenium    │ Canvas UI     │
├──────────────────────────┼─────────────────────────────┼───────────────┤
│ 8. Fluid Tilt Card       │ Shift Card 3D Physics       │ Cult UI       │
├──────────────────────────┼─────────────────────────────┼───────────────┤
│ 9. Subtask Quick Drawer  │ Slide-out Sleeve / Drawer   │ Framer        │
│    & Inertia Drag        │ Physics Snap Drag & Drop    │ Framer        │
├──────────────────────────┼─────────────────────────────┼───────────────┤
│ 10. AI Motion Presets    │ Prompt-ready Micro-motions  │ The Design    │
│     & Card Textures      │ Halftone & Grain Overlays   │ Stack         │
├──────────────────────────┼─────────────────────────────┼───────────────┤
│ 11. Morphing Detail Cards│ Elastic Morphing Transition │ OriginKit     │
│     & Bento Grids        │ Dynamic Hover Glow Grids    │ OriginKit     │
├──────────────────────────┼─────────────────────────────┼───────────────┤
│ 12. Task Progress Rings  │ Pure CSS Radial Progress    │ DaisyUI       │
│     & Timeline Steps     │ Semantic Multi-step Stepper │ DaisyUI       │
├──────────────────────────┼─────────────────────────────┼───────────────┤
│ 13. Dynamic Headline &   │ Fold Text / Paper Unfold    │ React Bits    │
│     Motivational Quotes  │ Blur Text / True Focus      │ React Bits    │
└──────────────────────────┴─────────────────────────────┴───────────────┘
```

---

## 3. Blueprint & Standar Kode Animasi (Golden Rules)

Agar animasi terasa **mahal, responsif, dan tidak membuat browser lag (60+ FPS)**, AI Agent wajib mematuhi aturan teknis berikut:

### Rule 1: Kecepatan & Easing
- **Durasi Maksimal Interaksi UI:** `150ms` – `260ms`. Hindari animasi UI berdurasi di atas `300ms` karena akan membuat pengguna merasa aplikasi lambat.
- **Kurva Easing Wajib:** Gunakan `ease-out` atau custom spring curve. **Dilarang memakai `ease-in` untuk animasi pembuka.**
  ```css
  /* Rekomendasi Custom Curve */
  --ease-snappy: cubic-bezier(0.23, 1, 0.32, 1);
  --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
  ```

### Rule 2: Hanya Animasikan Properti GPU
- **Gunakan:** `transform` (`translateX`, `translateY`, `scale`, `rotate`) dan `opacity`.
- **Hindari:** Menganimasikan `height`, `width`, `padding`, atau `margin` secara berulang karena memicu *layout reflow* dan *browser repaint*.

### Rule 3: Tactile Feedback (`scale(0.97)`)
Setiap tombol yang dapat ditekan wajib memiliki respons feedback fisik:
```jsx
<motion.button
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.97 }}
  transition={{ type: "spring", stiffness: 400, damping: 25 }}
>
  Klik Saya
</motion.button>
```

### Rule 4: Hindari Muncul dari `scale(0)`
Ketika modal atau popover muncul, jangan mulai dari `scale(0)` (terasa tidak realistis). Selalu mulai dari `scale(0.95)` dan `opacity: 0`:
```jsx
const modalVariants = {
  initial: { opacity: 0, scale: 0.95, y: 8 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.96, y: 4 },
  transition: { duration: 0.2, ease: [0.23, 1, 0.32, 1] }
};
```

### Rule 5: Staggering untuk Tampilan List
Ketika menampilkan daftar tugas, berikan jeda staggered (30ms - 50ms) antar kartu agar masuk berurutan dengan elegan:
```jsx
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04 }
  }
};
```

---

## 4. Cara Penggunaan untuk AI Agent (Prompting Guide)

Jika ingin meminta implementasi animasi dari katalog ini, gunakan pola instruksi sederhana seperti contoh berikut:

- *"AI, tolong perbarui `TaskCard.js` agar memiliki efek 3D Tilt dan hover border glow mengikuti panduan Aceternity di `UI_INSPIRATION_CATALOG.md`."*
- *"AI, buatkan animasi counter angka pada kartu statistik Dashboard menggunakan resep Number Ticker dari `UI_INSPIRATION_CATALOG.md`."*
- *"AI, buatkan efek liquid checkmark pada checkbox tugas seperti di Space UI."*
- *"AI, aplikasikan komponen Shift Card dari Cult UI pada kartu kategori agar memiringkan sudut secara fluid saat kursor mouse bergerak."*
- *"AI, buatkan animasi slide-out drawer untuk sub-task card dengan referensi gesture fluid dari Framer."*
- *"AI, gunakan prompt-ready motion presets dari The Design Stack untuk transisi buka-tutup modal AddCategoryModal."*
- *"AI, buatkan efek Morphing Card dari OriginKit saat kartu tugas diklik untuk melihat detail checklist."*
- *"AI, buatkan indikator tahapan progres proyek menggunakan komponen Steps dan Radial Progress dari DaisyUI agar ringan tanpa dependensi JS berat."*
- *"AI, buatkan headline sambutan di Dashboard menggunakan efek Fold Text atau Blur Text dari React Bits agar animasi teks terlipat dan terbuka secara artistik."*

AI Agent akan otomatis membaca file ini, mengambil resep yang bersangkutan, dan mengaplikasikannya langsung ke kode proyek!




