# Aturan Pengembangan

## Pengujian & Validasi
- DILARANG menggunakan tool `browser_subagent` atau membuka browser otomatis.
- DILARANG mengambil screenshot halaman.
- Validasi kode hanya boleh dilakukan melalui terminal menggunakan `npm run build` atau `npm test`.
- Pengujian visual di browser akan dilakukan sendiri oleh user.

## Component & Animasi Library (Global Registry)
- Registries resmi yang terkonfigurasi di `components.json`:
  - `@canvas-ui`: Canvas / WebGPU fluid, 3D, physics simulation (`https://canvasui.dev`).
  - `@aceternity`: Aceternity UI animasi & 3D cards, beams, lamps (`https://ui.aceternity.com`).
  - `@magicui`: Magic UI modern elements (bento-grid, globe, animated-beam, marquee) (`https://magicui.design`).
  - `@react-bits`: React Bits animations & text effects (`https://reactbits.dev`).
  - `@ballmac`: Ballmac UI AI agent consoles, developer tools, and device frames (`https://ui.ballmac.com`).
- Ketika merencanakan atau menambahkan animasi, selalu gunakan referensi dari library ini untuk rekomendasi terbaik dan install komponen dengan format `npx shadcn@latest add @registry/component-name`.

### 🛡️ Aturan Emas Performa Animasi & Mobile Interaction (Anti-Compromise Animation)
1. **Dilarang Mengorbankan Kehalusan & Keindahan Animasi demi Optimasi:**
   - Optimasi performa TIDAK BOLEH memangkas elemen visual yang menjadi daya tarik aplikasi (misal: menghilangkan kereta api, salju lebat, atau awan bergerak).
   - DILARANG menggunakan teknik "pause/freeze on scroll" (mematikan animasi saat layar disentuh/digulir) karena merusak kepuasan interaksi pengguna dan menimbulkan kesan aplikasi sering lag/macet.
2. **Mandat Zero-React-Diffing untuk Animasi Bergerak:**
   - Animasi kontinu (salju, partikel, awan, objek melintas) DILARANG KERAS digerakkan melalui React state loop (`useState` di dalam `requestAnimationFrame`).
   - Wajib menggunakan HTML5 Canvas 2D langsung, WebGL shader, atau CSS GPU transforms (`transform: translate3d()`, `@keyframes`) yang 100% independen dari siklus re-render Virtual DOM React.
3. **Imunitas Terhadap Dynamic Address Bar Mobile:**
   - Dimensi kanvas atau container animasi latar belakang wajib terkunci stabil di layar mobile untuk mencegah pembatalan loop render (`cancelAnimationFrame`) saat bilah alamat peramban naik atau turun saat scrolling.

## Frontend Design & Anti-AI Slop (SielloMita Design)
- Menggunakan standar skill `siellomita` (SielloMita Design System — powered by Mythra Radiant Anti-Slop Engine):
  - **Anti-AI Slop Enforcement**: Melarang 16 AI slop tells (gradien generik ungu, judul hero membungkus 6 baris, pill shapes di semua tombol/kartu, glassmorphism kabur berlebih, bento berlubang, 3 kartu fitur simetris tanpa visual anchor, dual competing primary CTAs, shouty hype copy, chaotic ambient pulsing, *Card-in-Card Nesting Hell*, dan *Divider Line Clutter*).
  - **Ruthless Visual Subtraction (oil-ui Protocol)**: Wajib menerapkan *The Subtraction Test* & *Card/Border Diet* — maksimal 1 tingkat elevation card per section, pangkas 80% border pemisah, dan prioritaskan whitespace/ritme tonal.
  - **Awwwards Design DNA & Kinetic Choreography**: Kontras skala tipografi dinamis (*oversized clamp headline* dipadu *micro monospaced data*), *rhythmic color band-mapping*, dan orkestrasi motion 3-tier (*micro-tactile 80-120ms*, *staggered entrance 150-300ms*, dan *spatial kinetic*).
  - **The 9-Pass Unslopping Protocol**: Audit & refactor wajib mengikuti 9 lapis redline (Spacing -> Color -> Icons -> Copy -> Type -> Layout -> Details -> Visuals -> Motion).
  - **Apple WWDC Fluid Motion**: Interaksi aktif wajib responsif seketika (`:active scale(0.97)`), interruptible springs.
  - **Gapless Dense Grid (Stageshow Protocol)**: Wajib menggunakan `grid-flow-dense` dan dilarang kartu pasif hanya-teks (wajib artefak micro-widget produk nyata).
  - **Phosphor Dynamic Iconography**: Navigasi utama desktop & mobile wajib menggunakan `@phosphor-icons/react` dengan transisi state dinamis (unselected `regular`, selected `fill`).
  - **Triage 3 Arah & Interactive Sandbox**: Analisa slop diagnostic + 3 arah alternatif desain + file artefak HTML interaktif mandiri (`/siellomita compare`) + kode implementasi siap pakai.
  - **Agentic AI Cockpit & Composite Blocks (BoardUI & Watermelon Standard)**: Fitur AI agent wajib menyertakan reasoning accordion, multi-step pipeline tracker, model switchers, token metrics, dan arsitektur composite animated blocks via `/siellomita agentic`.
  - **Cinematic Scroll & Signature Move (Scroll-Craft & GSAP Standard)**: Memperlakukan scroll sebagai timeline sinematik dengan 8 Page Grammars, The Feeling Curve (Peak-End Rule: tepat 1 puncak emosional visual utama), tepat 1 Signature Move interaktif per landing page, kepatuhan Next.js `useGSAP` lifecycle guard, dan larangan mutlak *layout thrashing* (hanya menganimasikan GPU transforms: `xPercent`, `yPercent`, `scale`, `rotation`, `opacity`).
  - **Real Materiality & Anti-Default Assets (Craftwork Protocol)**: Larangan placeholder teks dummy (*Lorem Ipsum*), avatar kartun generik, atau ikon melayang sendirian; wajib menggunakan data domain nyata, razor-thin 1px rim highlight, dan kanvas *warm bone ivory* / *obsidian ink*.
  - **Design Consultation & Plan Review**: Gunakan `/siellomita consult` untuk konsultasi sistem desain dari nol dan `/siellomita plan-review` untuk audit rencana UI/UX (rating 0-10, 5 state interaksi wajib) sebelum penulisan kode.

## Rekayasa Kode Bertahap & Disiplin (Disiplin AI)
- Menggunakan standar skill `disiplin-ai` (Peleburan Obra Superpowers):
  - **Pengerjaan Bertahap (One Task at a Time)**: Breakdown checklist terukur, eksekusi 1 langkah per giliran, tanpa melompat.
  - **Systematic Debugging**: Lacak akar masalah dan data flow; dilarang menebak-nebak (*no shotgun debugging*).
  - **Evidence Before Assertions**: Wajib validasi terminal (`npm run build`, lint, test) sebelum mengklaim selesai.

## Wawancara Kebutuhan & Anti-Halusinasi (/super-grill & /grill-me)
- Menggunakan standar skill `super-grill` (Super Grill-Me Harness):
  - **Bebas Bertanya Banyak (Hingga 10 Pertanyaan):** AI diizinkan dan diwajibkan bertanya secara mendalam (sampai 10 pertanyaan) untuk membedah penambahan fitur dan perbaikan bug tanpa batasan 1-pertanyaan kaku.
  - **Proaktif dengan `ask_question`:** Gunakan tool `ask_question` untuk interaksi langsung dengan pilihan opsi rekomendasi `(Recommended)`.
  - **Zero-Hallucination Policy:** Dilarang berasumsi sepihak atau menulis kode sebelum Statement of Intent dikonfirmasi oleh user dengan kata "Ya" atau "Setuju".

## Keamanan Backend & Database (Aegis Backend Skill)
- Menggunakan standar skill `aegis-backend` (Unified Cloudflare 6-Phase Harness + Standar OWASP Top 10:2025 Final + Database Shield):
  - **Kepatuhan OWASP Top 10:2025**: Memeriksa 10 vektor utama (A01: Broken Access Control & SSRF, A02: Security Misconfiguration, A03: Software Supply Chain Failures, A04: Cryptographic Failures, A05: Injection, A06: Insecure Design, A07: Authentication Failures, A08: Software & Data Integrity Failures, A09: Security Logging & Alerting Failures, A10: Mishandling of Exceptional Conditions & Fail-Open).
  - **SQL Injection Guard**: Dilarang menggunakan konkatenasi string SQL (`SELECT ... WHERE id = ' + id`). Semua query Postgres/Supabase wajib parameterized (`$1, $2` atau query builder Supabase). Kebal terhadap scan `sqlmap`.
  - **Database RLS**: Tabel Supabase wajib dilindungi Row Level Security (RLS).
  - **XSS Sanitization**: Input HTML yang akan dirender wajib disaring menggunakan `dompurify`.
  - **Validasi Session**: Setiap mutasi server actions/API wajib memvalidasi user session dari Better Auth.
  - **Read-Only Audit**: Deep audit file dilakukan secara read-only dan menyajikan laporan `AEGIS_AUDIT_REPORT.md`.

## ATURAN TERMINAL & DEV SERVER
1. AI DILARANG KERAS menyalakan `npm run dev` atau `npm run start` secara mandiri atau di background.
2. Hanya USER yang berhak menyalakan dan mematikan dev server.
3. AI hanya boleh menjalankan perintah terminal yang bersifat read-only (seperti `git status`, `npm run lint`) atau perintah penghapus cache (`Remove-Item .next`).
4. Jika AI butuh server menyala untuk tes, AI HARUS meminta izin user terlebih dahulu.
