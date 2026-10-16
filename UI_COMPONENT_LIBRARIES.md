# Modern UI Component Libraries & Animation Directory

> **Deskripsi:** Katalog komprehensif library komponen UI, micro-interactions, animasi modern, dan design resources untuk pengembangan web modern. Dirancang secara umum dan modular agar dapat digunakan sebagai panduan acuan standar untuk berbagai proyek web (SaaS, Dashboard, E-Commerce, Landing Page, dan Web Apps).

---

## 1. Direktori Sumber & Referensi Komponen

Berikut adalah daftar library dan katalog komponen siap pakai yang telah dikurasi berdasarkan ekosistem pengembangannya:

### 1. Aceternity UI
* **URL:** [ui.aceternity.com](https://ui.aceternity.com)
* **Stack:** React, Next.js, Tailwind CSS, Framer Motion
* **Fokus / Karakteristik:** Efek visual 3D modern, spotlight hover, border glow gradient, dan efek latar belakang ambient (aurora, meteors, dots, grid background).
* **Komponen Andalan:**
  - `3D Card Effect`: Kartu dengan rotasi 3D dinamis mengikuti pergerakan kursor mouse (`perspective(1000px)`).
  - `Spotlight Card`: Efek sorotan cahaya radial halus yang menyinari border kartu saat di-hover.
  - `Text Generate / Reveal`: Animasi kemunculan teks kata per kata untuk hero title atau pengumuman.
  - `Animated Tooltip`: Tooltip avatar dan badge dengan transisi spring pop yang mulus.

---

### 2. Cult UI
* **URL:** [cult-ui.com](https://cult-ui.com)
* **Tagline:** *"Shadcn, expanded — Experimental animated components and effects for modern interfaces"*
* **Stack:** React, Tailwind CSS, Motion (Framer Motion), Shadcn CLI Compatible
* **Fokus / Karakteristik:** Ekstensi animasi mutakhir untuk ekosistem shadcn/ui (150+ komponen & effects). Menggunakan arsitektur registry shadcn (`npx shadcn@latest add @cult-ui/...`) sehingga kode sumber langsung tersimpan di proyek tanpa dependensi black-box. Sangat ramah AI coding agent (mendukung MCP dan prompt-first scaffolding).
* **Komponen Andalan:**
  - `Shift Card`: 3D hover tilt card fluid yang reaktif terhadap posisi mouse.
  - `Halo Button`: Tombol aksi primer dengan dynamic halo glowing border saat aktif/hover.
  - `AI Prompt & Command Bar`: Input bar dinamis dengan micro-interaction ekspansi halus dan badge keyboard tactile.
  - `Reactive Status Indicators`: Badge status dengan efek pulse glow dinamis.

---

### 3. OriginKit
* **URL:** [originkit.dev](https://originkit.dev)
* **Tagline:** *"Animated component infrastructure for the modern web"*
* **CLI:** `npx originkit add <component-name>`
* **Stack:** React, Next.js, TypeScript, Tailwind CSS, Framer Motion
* **Fokus / Karakteristik:** Infrastruktur komponen animasi kelas produksi dengan fokus micro-interaction mutakhir, efek visual GPU-safe, serta dukungan native untuk AI Coding Agents via Model Context Protocol (MCP server: `mcp.originkit.dev`).
* **Komponen Andalan:**
  - `Morphing Interactive Cards`: Kartu yang bertransformasi bentuk secara elastis saat di-expand atau diklik.
  - `Animated Bento & Metric Grids`: Layout grid dinamis dengan interaksi hover visual yang sangat hidup.
  - `Smooth State-Changing Buttons`: Tombol aksi responsif dengan transisi state (*idle* $\rightarrow$ *loading* $\rightarrow$ *success*) tanpa jeda visual.

---

### 4. DaisyUI
* **URL:** [daisyui.com](https://daisyui.com)
* **Tagline:** *"The most popular component library for Tailwind CSS — Faster, cleaner, easier"*
* **Stack:** Tailwind CSS Plugin, Pure Semantic CSS Classes (0kb JavaScript overhead, Framework Agnostic)
* **Fokus / Karakteristik:** Menyederhanakan penulisan utility Tailwind yang panjang menjadi semantic component classes (`btn`, `card`, `badge`, `modal`, `steps`, `toggle`, `drawer`, `stat`). Mendukung 30+ tema bawaan (*dark*, *light*, *cupcake*, *synthwave*, dll.), sangat ringan, dan mempermudah markup UI tetap bersih.
* **Komponen Andalan:**
  - `Steps & Timeline Indicator`: Penanda alur tahapan multi-step proses yang responsif.
  - `Radial Progress Ring`: Indikator persentase penyelesaian berbasis SVG murni (`radial-progress`) tanpa butuh JS eksternal.
  - `Semantic Badges & Toggle Switches`: Badge status dan toggle switch prioritas yang bersih dan ringan.
  - `Lightweight Modal & Drawer`: Drawer navigasi samping dan modal konfirmasi yang cepat dan mudah diatur lewat CSS.

---

### 5. Skiper UI
* **URL:** [skiper-ui.com](https://skiper-ui.com)
* **Stack:** React, Tailwind CSS, Framer Motion (Single File Component, Shadcn Ready)
* **Fokus / Karakteristik:** Micro-interactions ekspresif, tanpa dependensi berlebih, dan fokus pada interaksi sentuh, gestur, serta nuansa tactile ala iOS/macOS.
* **Komponen Andalan:**
  - `Dynamic Island Pill`: Floating pill interaktif di atas/bawah layar untuk status notifikasi, pemutar audio, atau progress counter.
  - `Interactive Checklist`: Animasi centang yang fluid dan ekspresif.
  - `Drag & Scroll Elements`: Gestur drag halus pada list kategori dan filter tags.

---

### 6. Planes UI
* **URL:** [useplanes.com](https://useplanes.com)
* **Stack:** TypeScript, Tailwind CSS, Motion (Framer Motion)
* **Fokus / Karakteristik:** Didesain khusus ramah AI Agents (mendukung `llms.txt` & MCP server). Komponen source code terbuka dan dapat diedit langsung.
* **Komponen Andalan:**
  - `Calendar / Date Picker`: Pemilih tanggal jatuh tempo atau rentang waktu yang sangat bersih dan modern.
  - `Animated Filter Tabs`: Transisi slide halus penanda tab aktif (All, Active, Completed, Archived).
  - `Status Badge Selector`: Dropdown pemilih status/prioritas yang fluid.

---

### 7. Arc UI
* **URL:** [uiarc.dev](https://uiarc.dev)
* **Stack:** React, Tailwind CSS, Design Tokens Konsisten
* **Fokus / Karakteristik:** Komponen dan blok khusus **Dashboard, Metrics, Analytics, Settings, & Auth**.
* **Komponen Andalan:**
  - `Metric Summary Cards`: Tampilan angka ringkasan KPI/statistik dengan loading states elegan.
  - `Skeleton Loaders`: Transisi shimmer gelap/terang saat data sedang dimuat.
  - `Settings & Preferences Layout`: Panel pengaturan akun, preferensi notifikasi, dan form profil yang rapi.

---

### 8. Space UI
* **URL:** [spaceui.one](https://spaceui.one)
* **Stack:** React, Shaders, Framer Motion
* **Fokus / Karakteristik:** Mengutamakan animasi *liquid switches*, *morphing controls*, *animated loaders*, dan *gooey effects*.
* **Komponen Andalan:**
  - `Liquid Switch / Morphing Checkbox`: Switch dan checkbox dengan efek elastis/gooey saat diklik.
  - `Tactile Sliders`: Slider prioritas, volume, atau range progress.
  - `Morphing Buttons`: Tombol aksi yang bertransformasi menjadi spinner halus lalu tanda centang.

---

### 9. The Design Stack
* **URL:** [thedesignstack.co.in](https://thedesignstack.co.in)
* **Tagline:** *"Paste-ready design, prompt-ready motion"*
* **Stack:** Figma Kits, Code Components, Prompt-Ready Motion Snippets
* **Fokus / Karakteristik:** Portal kurasi aset desain siap pakai dan formula prompt motion yang dirancang khusus untuk diintegrasikan langsung ke AI coding agent (Claude Code, Cursor, Antigravity).
* **Komponen Andalan:**
  - `Prompt-Ready Motion Presets`: Resep kurva animasi dan timing spesifik yang siap dioper ke AI agent.
  - `Paste-Ready Card & Dashboard Blocks`: Struktur kartu modular dengan kontras dark mode elegan dan hierarki visual tajam.
  - `Texture & Halftone Accents`: Aksen visual modern (halftone mesh, subtle grain, and geometric accents) untuk header dan background.

---

### 10. Framer Marketplace & Showcase
* **URL:** [framer.com/marketplace](https://framer.com/marketplace)
* **Fokus / Karakteristik:** Standar emas interaksi UI modern, physics-based springs, dan gestur visual fluid. Menjadi acuan utama untuk micro-interactions kelas atas, tactile feedback, dan transisi layout berbasis fisik.
* **Komponen Andalan:**
  - `Interactive Slide-out / Drawer Card`: Kartu interaktif di mana elemen detail dapat meluncur keluar halus (seperti sleeve drawer) saat di-hover/expand.
  - `Inertia & Snap Drag Gestures`: Kurva spring physics alami untuk drag-and-drop antar kolom kanban/list.
  - `Layered Depth Showcase Cards`: Kartu ringkasan dengan efek depth clipping dan multi-layer glassmorphism.

---

### 11. Launch UI
* **URL:** [launchuicomponents.com](https://launchuicomponents.com) | [GitHub](https://github.com/launch-ui/launch-ui)
* **Tagline:** *"Landing page components built with React, Shadcn/ui and Tailwind"*
* **Stack:** React, Next.js, Tailwind CSS, Shadcn/ui, Radix UI
* **Fokus / Karakteristik:** Spesialisasi pada seksi **Landing Page & Marketing Kits** berkualitas tinggi (Hero sections, Glow buttons, Pricing tables, Mockup showcases, FAQ accordions, Testimonial sliders).
* **Komponen Andalan:**
  - `Hero Showcase with Mockup Frame`: Tampilan hero dengan window mockup 3D dan background glow subtle.
  - `Glow Button`: Tombol dengan efek cahaya lembut yang dinamis.
  - `Feature Bento Grid`: Grid fitur modern dengan visual hierarchy yang kuat.

---

### 12. Magic UI & Origin UI
* **Magic UI ([magicui.design](https://magicui.design)):**
  - `Number Ticker`: Counter angka animasi halus yang bergulir naik saat halaman dimuat.
  - `Confetti Celebration`: Partikel selebrasi saat pengguna menyelesaikan target/checkout/tugas.
  - `Border Beam`: Garis cahaya melingkar di sekeliling border kartu.
  - `Shiny Text`: Efek kilau cahaya yang bergerak melintasi teks headline.
* **Origin UI ([originui.com](https://originui.com)):**
  - Input form pencarian dengan shortcut keyboard badge (`Ctrl + K` / `Cmd + K`).
  - Dropdown filter minimalis dengan animasi spring halus.
  - Form validation states yang interaktif dan ramah aksesibilitas.

---

### 13. Canvas UI & Shader Resources
* **Fokus / Karakteristik:** Efek ambient visual kelas tinggi berbasis shader canvas (WebGL/WebGPU/HTML Canvas).
* **Komponen Andalan:**
  - `Ambient Aurora / Mesh Gradient Background`: Cahaya latar belakang dinamis yang sangat halus untuk area Hero atau Login.
  - `Ripple Click Feedback`: Gelombang cahaya halus saat tombol aksi utama ditekan.

---

### 14. Dark Design Showcase
* **URL:** [dark.design](https://dark.design)
* **Peran:** Portal kurasi website *dark-mode* terbaik dunia untuk acuan palet warna, kedalaman kontras, dan hierarki tipografi.
* **Prinsip Utama:**
  - Hindari pure black `#000000` datar; gunakan layer kedalaman (`#0A0A0A`, `#141416`, `#1E1D20`).
  - Standar hierarki tipografi: High contrast white (`#FAFAFA`) untuk heading, muted zinc (`#A1A1AA` & `#71717A`) untuk teks pendukung.

---

### 15. React Bits
* **URL:** [reactbits.dev](https://reactbits.dev)
* **Tagline:** *"Build the whole product with one library — 230+ components & animated blocks"*
* **GitHub:** [DavidHDev/react-bits](https://github.com/DavidHDev/react-bits) (~50k stars)
* **Stack:** React, Next.js, Motion (Framer Motion), Tailwind CSS / Pure CSS, JS/TS
* **Fokus / Karakteristik:** Koleksi komponen animasi open-source terlengkap untuk **Text Animations** unik (30+ variasi efek teks kreatif), interactive backgrounds (Aurora, Particles, WebGL), serta micro-interactions. Dilengkapi tombol bawaan *"Copy for AI"* untuk memudahkan AI coding assistant menyalin kode siap pakai.
* **Komponen Andalan:**
  - `Fold Text & Split Text`: Teks terlipat membuka seperti kertas mendatar (*"Lines unfold into place like creased paper opening flat"*).
  - `Blur Text & Decrypted Text`: Teks reveal dramatis yang bertransisi dari blur halus atau karakter teracak (*glitch decrypt*) menjadi teks tajam.
  - `True Focus`: Efek fokus/blur dinamis yang menyorot kata-kata kunci secara bergantian dalam sebuah kalimat.
  - `Fuzzy Text & Text Pressure`: Tipografi interaktif yang merespons posisi kursor mouse dengan distorsi spring elastis.
  - `Click Spark & Magnet Button`: Micro-interaction tombol magnetis dan efek percikan partikel halus saat diklik.

---

## 2. Panduan Pemilihan Library (Decision Matrix)

| Kebutuhan Proyek | Pilihan Library Rekomendasi | Alasan Utama |
|---|---|---|
| **SaaS Dashboard & Web App** | Arc UI, Shadcn/ui, Origin UI | Komponen fungsional lengkap, tabel data, form controls, dan settings. |
| **Landing Page & Marketing Site** | Launch UI, Aceternity UI, Cult UI | Visual memukau, border glows, 3D cards, dan hero section siap pakai. |
| **Animasi Teks Kreatif & Headline Hero** | React Bits, Aceternity UI | 30+ variasi efek teks (Fold Text, True Focus, Decrypted Text, Blur Text). |
| **Proyek Cepat & Hemat Bundle (Zero JS)** | DaisyUI | Berbasis pure semantic CSS, tanpa runtime JavaScript, 30+ tema instan. |
| **Micro-Interactions & Gestur Mewah** | Framer, Skiper UI, Space UI | Physics spring, drag & snap, liquid switches, dan tactile haptic feedback. |
| **AI-Assisted Dev (Cursor, Claude, Antigravity)** | OriginKit, Planes UI, The Design Stack | Dilengkapi server MCP, file `llms.txt`, dan prompt-ready code snippets. |

---

## 3. Standar & Golden Rules Animasi Web Modern (60+ FPS)

Untuk memastikan antarmuka terasa mewah, responsif, dan tidak membuat browser lag, terapkan prinsip teknis berikut:

### Rule 1: Kecepatan & Easing
- **Durasi Interaksi UI:** `150ms` – `260ms`. Hindari animasi UI berdurasi di atas `300ms` karena akan membuat pengguna merasa aplikasi lambat.
- **Kurva Easing:** Gunakan `ease-out` atau custom spring curve. **Dilarang memakai `ease-in` untuk animasi pembuka.**
  ```css
  --ease-snappy: cubic-bezier(0.23, 1, 0.32, 1);
  --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
  ```

### Rule 2: Hanya Animasikan Properti GPU
- **Gunakan:** `transform` (`translateX`, `translateY`, `scale`, `rotate`) dan `opacity`.
- **Hindari:** Menganimasikan `height`, `width`, `padding`, atau `margin` secara berulang karena memicu *layout reflow* dan *browser repaint*.

### Rule 3: Tactile Physical Feedback
Setiap tombol aksi yang dapat ditekan wajib memiliki respons sentuhan fisik:
```jsx
<motion.button
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.97 }}
  transition={{ type: "spring", stiffness: 400, damping: 25 }}
>
  Click Me
</motion.button>
```

### Rule 4: Hindari Muncul dari `scale(0)`
Ketika modal, dropdown, atau popover muncul, mulailah dari `scale(0.95)` dan `opacity: 0` (bukan dari `scale(0)`):
```jsx
const modalVariants = {
  initial: { opacity: 0, scale: 0.95, y: 8 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.96, y: 4 },
  transition: { duration: 0.2, ease: [0.23, 1, 0.32, 1] }
};
```

### Rule 5: Staggering untuk List / Grid
Ketika menampilkan daftar kartu atau item list, berikan jeda staggered (30ms - 50ms) antar elemen agar masuk berurutan dengan elegan:
```jsx
const listVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04 }
  }
};
```

---

## 4. Cara Menggunakan Dokumen Ini Bersama AI Coding Agent

Saat memulai proyek web baru, Anda cukup menyalin file ini ke direktori proyek dan memberikan prompt ke AI Agent seperti contoh di bawah:

- *"AI, buatkan Hero Section untuk landing page SaaS ini dengan merujuk pada gaya Launch UI dan border beam dari Magic UI yang ada di `UI_COMPONENT_LIBRARIES.md`."*
- *"AI, buatkan komponen kartu fitur dengan efek 3D hover tilt seperti Shift Card dari Cult UI di `UI_COMPONENT_LIBRARIES.md`."*
- *"AI, buatkan indikator status multi-step proses registrasi menggunakan komponen Steps dari DaisyUI."*
- *"AI, buatkan headline hero yang dramatis menggunakan efek Fold Text atau Blur Text dari React Bits yang tercantum di `UI_COMPONENT_LIBRARIES.md`."*
- *"AI, implementasikan modal popup dengan animasi spring physics mengikuti standar Golden Rules di `UI_COMPONENT_LIBRARIES.md`."*


