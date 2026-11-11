# Agent Guidelines

## Agent skills

### Issue tracker

GitHub Issues via `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Canonical roles mapped 1:1 (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context repo (`CONTEXT.md` + `docs/adr/`). See `docs/agents/domain.md`.

## COMPONENT & ANIMATION LIBRARIES (GLOBAL REGISTRY)
Project ini telah terintegrasi dengan shadcn registry untuk animasi & visual modern:
1. **Canvas UI (`@canvas-ui`)**: WebGPU / WebGL canvas shaders, fluid dynamics, 3D ASCII, cloth, bend, displacement, bubble (`npx shadcn@latest add @canvas-ui/[name]`).
2. **Aceternity UI (`@aceternity`)**: Background beams, aurora, bento-grid, 3D card tilt, lamp, sparkles, card-hover-effect, vortex, moving-border (`npx shadcn@latest add @aceternity/[name]`).
3. **Magic UI (`@magicui`)**: Bento-grid, globe, animated beam, marquee, confetti, border-beam, number-ticker.
4. **React Bits (`@react-bits`)**: Split-text, blur-text, hyperspeed, magnet, star-border.
5. **Ballmac UI (`@ballmac`)**: AI agent consoles, developer tools, device frames, and macOS/iOS desktop-style surfaces (`npx shadcn@latest add @ballmac/[name]`).

Saat user meminta rekomendasi atau penambahan animasi, AI HARUS merujuk pada katalog di atas atau skill `animation-components-registry` untuk memberikan opsi visual terbaik yang sesuai dengan konteks desain.

### ATURAN EMAS PERFORMA ANIMASI & MOBILE INTERACTION (ANTI-COMPROMISE ANIMATION)
1. **Mandat Mutlak Mobile-First Supremacy (Utamakan HP Dulu):**
   - Setiap penambahan fitur baru, perombakan antarmuka, dan perbaikan bug WAJIB dirancang, diuji, dan berfungsi 100% sempurna di layar HP ($\le 640\text{px}$, perangkat mobile seperti Infinix Smart 6) terlebih dahulu sebelum desktop.
   - DILARANG KERAS menyembunyikan tombol aksi utama (seperti tombol Tambah Kategori, Kelola, atau Filter) hanya pada sidebar atau mode desktop. Setiap kontrol penting wajib memiliki padanan yang jelas terlihat, mudah dijangkau satu tangan, dan tidak boleh terpotong atau tersembunyi di ujung scroll horizontal tanpa indikator.
   - Semua elemen interaktif di HP wajib memenuhi ukuran sentuh minimal 44×44px (touch target), bebas jebakan horizontal overflow, dan dilarang menggunakan latar belakang ultra-transparan (`bg-white/[0.03]`) yang tenggelam di kanvas dinamis. Kartu dan banner wajib menggunakan permukaan solid grounded (`.glass-card` opasitas 92-96%) agar kontras teks tajam dan nyaman dibaca di seluruh tema.
2. **Dilarang Mengorbankan Kehalusan & Keindahan Animasi demi Optimasi:**
   - Optimasi performa TIDAK BOLEH memangkas elemen visual yang menjadi daya tarik aplikasi (misal: menghilangkan kereta api, salju lebat, atau awan bergerak).
   - DILARANG menggunakan teknik "pause/freeze on scroll" (mematikan animasi saat layar disentuh/digulir) karena merusak kepuasan interaksi pengguna dan menimbulkan kesan aplikasi sering lag/macet.
3. **Mandat Zero-React-Diffing untuk Animasi Bergerak:**
   - Animasi kontinu (salju, partikel, awan, objek melintas) DILARANG KERAS digerakkan melalui React state loop (`useState` di dalam `requestAnimationFrame`).
   - Wajib menggunakan HTML5 Canvas 2D langsung, WebGL shader, atau CSS GPU transforms (`transform: translate3d()`, `@keyframes`) yang 100% independen dari siklus re-render Virtual DOM React.
4. **Imunitas Terhadap Dynamic Address Bar Mobile:**
   - Dimensi kanvas atau container animasi latar belakang wajib terkunci stabil di layar mobile untuk mencegah pembatalan loop render (`cancelAnimationFrame`) saat bilah alamat peramban naik atau turun saat scrolling.
5. **Standar Animasi Premium (Framer Motion & React Mandate):**
   - Setiap animasi transisi tab, container masuk (cascading entrance), dan kartu berkelas WAJIB menggunakan React dan Framer Motion (`motion.div`, `AnimatePresence`, spring physics) dengan GPU transforms (`opacity`, `y`, `scale`), BUKAN skrip manipulasi DOM JS murni (seperti manipulasi style manual di requestAnimationFrame).
   - Animasi transisi antar-halaman/rute DILARANG menggunakan CSS `filter: blur()` di container induk karena merusak stabilitas compositing layer kaca es (`backdrop-filter`) di peramban Chromium/WebKit.

## FRONTEND DESIGN & ANTI-AI SLOP (SIELLOMITA DESIGN)
Untuk seluruh perancangan antarmuka, styling komponen, dan review visual:
1. Gunakan skill `siellomita` (SielloMita Design System — powered by Mythra Radiant Anti-Slop Engine).
2. **Mandat Strict Zero-Tolerance (Veto Keras)**: AI WAJIB menegakkan 23 aturan Haram Mutlak berikut. Jika terdeteksi 1 saja tanda AI Slop di bawah ini pada kode/desain baru, tampilan tersebut dianggap cacat produksi dan AI wajib otomatis membatalkan/merefaktornya sebelum disajikan kepada pengguna:
   - **23 Tanda AI Slop yang Haram Mutlak**:
     1. *HARAM Gradien Ungu/Cyan pada Dark Mesh*: Wajib palet grounded berkarakter (warm slate, bone ivory `#F9F8F6`, obsidian `#121110`).
     2. *HARAM Hero Text 6-Baris (The 2-Line Iron Rule)*: Judul maksimal 2-3 baris, wajib container lebar (`max-w-5xl`/`max-w-6xl`) dengan `text-wrap: balance`.
     3. *HARAM Bentuk Pill di Semua Elemen*: Sudut terkontrol (`rounded-lg`/`rounded-xl`); bentuk pill HANYA untuk floating nav atau status tag tunggal.
     4. *HARAM Glassmorphism Berlebih & Frosted Mush*: Permukaan grounded solid (opasitas 92-96%), glass maksimal 1 elemen per viewport.
     5. *HARAM Bento Grid Berlubang & Kartu Pasif Teks*: Wajib `grid-flow-dense` + micro-widget interaktif nyata di setiap sel (Stageshow Protocol).
     6. *HARAM Badge Meta Hiasan ("FEATURE 01", "SECTION 02")*: Hapus tag dekoratif tanpa fungsi semantik nyata.
     7. *HARAM Monotoni Font Default Inter + Slate-900*: Wajib font berkarakter (Satoshi, Cabinet Grotesk, Instrument Serif, General Sans, Geist).
     8. *HARAM Drop Shadow Tebal & Lumpur (Muddy Shadows)*: Wajib bayangan terarah multi-layer atau 1px razor-thin rim border highlight.
     9. *HARAM Gerakan Kaku Linear / 0ms Abrupt*: Wajib kurva spring WWDC (`cubic-bezier(0.16, 1, 0.3, 1)`) dan staggered entrance 30-50ms.
     10. *HARAM Kontras Pudar (<4.5:1) & Target Sentuh Mini (<44px)*: Wajib kepatuhan WCAG AAA/AA dan touch target mobile minimal 44x44px.
     11. *HARAM Trope "3 Kartu Fitur Simetris"*: Wajib Asymmetric Bento Grid dengan 1 Hero Feature dominan yang memuat preview interaktif nyata.
     12. *HARAM Dual Competing Primary CTAs*: Tepat 1 tombol primer berbobot tinggi + maksimal 1 ghost button/text link.
     13. *HARAM Copywriting Hype AI ("Supercharge", "Unlock")*: Wajib salinan tenang, manusiawi, percaya diri, dan berorientasi utilitas nyata.
     14. *HARAM Background Denyut / Blob Berputar Tanpa Henti*: Permukaan tenang; animasi hanya dipicu interaksi pengguna (`:hover`, `:active`).
     15. *HARAM Card-in-Card Nesting Hell (The Anti-Nesting Law)*: Maksimal 1 tingkat container elevation per section. Elemen internal wajib flat rows/borderless.
     16. *HARAM Divider Line Clutter (The 80% Border Diet)*: Hapus 80% garis border mati; gunakan ritme spasi vertikal dan kontras tonal halus.
     17. *HARAM Icon Bintang Dekoratif Sparkles / Gemini (Mandat Anti-Sparkles AI)*: DILARANG KERAS menyematkan icon bintang 4-sudut (`Sparkles`, Gemini stars) sebagai pemanis heading/badge/tombol.
     18. *HARAM Karakter Emoji Unicode pada UI (Mandat Zero-Emoji Policy)*: HARAM menggunakan segala bentuk karakter emoji Unicode (`✨`, `🚀`, `🎉`, dll.) di seluruh antarmuka. Gunakan ikon vektor resmi (`@phosphor-icons/react` atau `lucide-react`).
     19. *HARAM Generic AI Placeholders (Craftwork Protocol)*: Dilarang *Lorem Ipsum*, avatar lingkaran abu-abu kosong, dan ikon monoline melayang sendirian tanpa konteks produk nyata. Wajib data domain kredibel.
     20. *HARAM Layout Thrashing (GSAP & Performance Law)*: Animasi wajib 100% GPU transforms (`x`, `y`, `scale`, `rotation`, `opacity`). Dilarang menganimasikan `top/left/width/height`, dan dilarang teknik "freeze on scroll".
     21. *HARAM Low-Effort AI Chat Bubbles (BoardUI Cockpit Protocol)*: Antarmuka AI wajib menyertakan reasoning accordion monospaced, visual pipeline tracker multi-step, dan model switcher compact.
     22. *HARAM Melanggar The Single Peak Budget Rule (Scroll-Craft)*: Tepat 1 visual peak emosional dan tepat 1 signature move per landing page; dilarang competing climaxes berturut-turut.
     23. *HARAM Navigasi Statis Tanpa Perubahan Bobot (Phosphor Weight Law)*: Navigasi wajib bertransformasi bobot (state inactive `regular`, state active/selected `fill`).
3. Terapkan prinsip:
   - **Mandat Anti-Sparkles AI (No Decorative AI Stars)**: DILARANG KERAS menyematkan icon bintang 4-sudut (`Sparkles`, `Sparkle`, Gemini star) sebagai pemanis/dekorasi heading section, judul modal, badge fitur, atau tombol. Gunakan icon semantik nyata sesuai konteks domain (misal: `Clock` untuk waktu terbaru, `FolderPlus` untuk berkas, `ShieldCheck` untuk kepatuhan sistem/WCAG, `Type` untuk pemformatan teks) atau terapkan *Ruthless Visual Subtraction* (tanpa icon dekoratif).
   - **Mandat Zero-Emoji Policy (Haram Menggunakan Seluruh Unicode Emoji)**: DILARANG KERAS menggunakan segala bentuk karakter emoji Unicode (seperti `✨`, `🎉`, `🚨`, `⚠️`, `💡`, `🚀`, `🔥`, dll.) di seluruh antarmuka, heading, label tombol, microcopy, toast notification, empty state banner, modal, maupun alert. Seluruh penanda visual wajib menggunakan ikon vektor semantik resmi (`@phosphor-icons/react` atau `lucide-react`) atau tipografi bersih tanpa emoji.
   - **Ruthless Visual Subtraction (oil-ui Protocol)**: Wajib menerapkan *The Subtraction Test* & *Card/Border Diet* — maksimal 1 tingkat elevation card per section, hapus 80% border pemisah, dan gunakan whitespace ritmis alih-alih garis mati.
   - **Awwwards Design DNA & Kinetic Choreography**: Kontras skala tipografi ekstrem (*oversized headline clamp* dipadu *micro monospaced data*), *rhythmic color band-mapping*, dan koreografi motion 3-tier (*micro-tactile 80-120ms*, *staggered entrance 150-300ms*, dan *spatial kinetic*).
   - **The 9-Pass Unslopping Protocol**: Setiap audit & refactor UI wajib mengikuti urutan 9 lapis redline (Spacing -> Color -> Icons -> Copy -> Type -> Layout -> Details -> Visuals -> Motion).
   - **WWDC Fluid Springs**: Semua interaksi aktif wajib responsif seketika pada pointer-down (`:active scale(0.97)`) dengan spring physics interruptible.
   - **Gapless Bento Grid (Stageshow Protocol)**: Bento grid wajib menggunakan `grid-flow-dense` dengan perhitungan `col-span` & `row-span` presisi, serta dilarang kartu pasif hanya-teks (setiap kartu wajib memuat artefak micro-widget produk nyata).
   - **Phosphor Dynamic Iconography**: Navigasi utama desktop & mobile wajib menggunakan `@phosphor-icons/react` dengan transisi state dinamis (unselected `regular`, selected `fill`) untuk sensasi aplikasi native.
   - **3-Direction Delivery & Interactive Sandbox**: Memberikan 3 opsi desain (Clean Apple Minimalist, Bold Editorial, Modern Fluid Bento) dan file artefak HTML interaktif mandiri via `/siellomita compare` atau `/siellomita redesign`.
   - **Agentic AI Cockpit & Composite Blocks (BoardUI & Watermelon Standard)**: Untuk fitur AI Copilot / Agent, wajib menggunakan reasoning accordion monospaced, multi-step pipeline status tracker, model selector compact, token heatmaps, dan arsitektur composite animated blocks via `/siellomita agentic`.
   - **Cinematic Scroll & Signature Move (Scroll-Craft & GSAP Standard)**: Memperlakukan scroll sebagai timeline sinematik dengan 8 Page Grammars, The Feeling Curve (Peak-End Rule: tepat 1 puncak emosional visual utama), tepat 1 Signature Move interaktif per landing page, kepatuhan Next.js `useGSAP` lifecycle guard, dan larangan mutlak *layout thrashing* (hanya menganimasikan GPU transforms: `xPercent`, `yPercent`, `scale`, `rotation`, `opacity`).
   - **Real Materiality & Anti-Default Assets (Craftwork Protocol)**: Larangan placeholder teks dummy (*Lorem Ipsum*), avatar kartun generik, atau ikon melayang sendirian; wajib menggunakan data domain nyata, razor-thin 1px rim highlight, dan kanvas *warm bone ivory* / *obsidian ink*.
   - **Design Consultation & Plan Review**: Gunakan `/siellomita consult` untuk membangun identitas visual dari nol dan `/siellomita plan-review` untuk mengaudit rencana UI/UX (rating 0-10, 5 state interaksi: idle, loading, actionable empty, error recovery, success) sebelum kode ditulis.

## REKAYASA KODE BERTAHAP & DISIPLIN (DISIPLIN AI)
Untuk pembuatan dan perbaikan kode:
1. Gunakan skill `disiplin-ai` (peleburan Obra Superpowers: alur kerja bertahap, systematic debugging, TDD, rencana atomic 1-by-1, dan verifikasi bukti terminal).
2. Terapkan prinsip:
   - **One Task at a Time**: Buat checklist terukur dan kerjakan 1 task per giliran tanpa melompat atau menggabungkan banyak file secara membabi buta.
   - **Systematic Debugging**: Lacak pesan error asli dan jalur data flow; dilarang menebak-nebak penyebab bug (*no shotgun debugging*).
   - **Evidence Before Assertions**: Dilarang mengklaim selesai tanpa bukti terminal (`npm run build`, `npm run lint`, atau `npm test`).

## 🚨 PROTOKOL KETAT: JAVASCRIPT VERIFICATION & SINGLE-FILE PATCH
1. **Halusinasi `npm run build` pada JavaScript Murni:**
   - AI DILARANG mengklaim kode selesai HANYA karena `npm run build` lolos (exit code 0). 
   - Pada project `.js` (tanpa TypeScript), `npm run build` TIDAK memvalidasi scope variabel/import.
   - AI WAJIB menggunakan pengecekan AST (Abstract Syntax Tree) statis atau memastikan tidak ada variabel JSX/state yang "undefined" sebelum melapor.
2. **Larangan Multi-File Patching (Borongan):**
   - Jika satu fitur menyentuh lebih dari 1 file, AI DILARANG menggunakan skrip *string-replace* otomatis ke semua file sekaligus.
   - AI WAJIB mengerjakannya **satu file per satu file** (Edit File A -> Verifikasi Import -> Lanjut File B).
3. **Pemeriksaan Diff Sebelum Lapor:**
   - Sebelum memberi laporan "COMPLETED", AI WAJIB menjalankan `git diff <nama_file>` untuk membaca ulang baris yang berubah.
   - Pastikan setiap komponen baru di JSX benar-benar ada di bagian `import` atas file.

## SUPER GRILL-ME: INTERVIEW & DEEP INTENT EXTRACTION (/super-grill & /grill-me)
Sebelum coding, merancang arsitektur, atau membuat prompt pada setiap penambahan fitur dan perbaikan bug:
1. **Mandat Wawancara Mendalam (Boleh Hingga 10 Pertanyaan):** AI DIIZINKAN dan DIWAJIBKAN banyak bertanya (bisa sampai 10 pertanyaan terarah) menggunakan skill `/super-grill` atau slash command `/grill-me` baik saat penambahan fitur baru maupun perbaikan bug. DILARANG berasumsi, mengira-ngira, atau mengeksekusi secara diam-diam.
2. **Prioritas Tool `ask_question`:** Gunakan tool `ask_question` secara proaktif untuk menyajikan pilihan terstruktur dan opsi rekomendasi sehingga user dapat merespons cepat.
3. **Cakupan Investigasi Ganda:**
   - *Fitur Baru:* Target persona, masalah nyata, wedge terkecil, kriteria sukses, batasan performa (desktop vs mobile), dan non-goals.
   - *Bug Fix:* Kronologi error, pemicu/state reproduksi, device/viewport terdampak, ekspektasi visual vs kenyataan, dan batas blast-radius.
4. **Kunci Statement of Intent:** AI dilarang menulis kode sebelum Statement of Intent atau ruang lingkup disetujui user dengan kata "Ya" atau "Setuju".

## SECURITY & DATABASE AUDIT (AEGIS BACKEND)
Untuk keamanan backend, API, dan database:
1. Gunakan skill `aegis-backend` (Unified Cloudflare 6-phase adversarial harness + OWASP Top 10:2025 Final standard + strict database shield).
2. Terapkan prinsip:
   - **OWASP Top 10:2025 Aligned**: Mencakup A01 (Access Control & SSRF), A02 (Security Misconfiguration), A03 (Software Supply Chain), A04 (Crypto Failures), A05 (Injection & Anti-sqlmap), A06 (Insecure Design), A07 (Auth Failures), A08 (Software & Data Integrity), A09 (Logging & Alerting), dan A10 (Mishandling of Exceptional Conditions & Fail-Open).
   - **Zero String SQL Concatenation**: Selalu gunakan query berparameter (`$1, $2` atau query builder Supabase) guna menangkal eksploitasi automated tool seperti `sqlmap`.
   - **Supabase RLS Mandate**: Semua tabel Supabase wajib memiliki `ENABLE ROW LEVEL SECURITY` dan policy eksplisit (`auth.uid() = user_id`).
   - **IDOR Prevention**: Semua update/delete/read di server actions atau API harus divalidasi kepemilikannya via session user ID.
   - **Data Sanitization**: Gunakan `DOMPurify` pada konten HTML/SVG sebelum dirender untuk mencegah Stored & Reflected XSS.
   - **Adversarial Validation**: Setiap celah potensial harus diuji pembuktiannya oleh verifier independen untuk mencegah false positive.
   - **Read-Only Audit**: Analisis audit menyeluruh menghasilkan laporan terstruktur `AEGIS_AUDIT_REPORT.md` tanpa memodifikasi kode secara diam-diam.

## ATURAN TERMINAL & DEV SERVER
1. AI DILARANG KERAS menyalakan `npm run dev` atau `npm run start` secara mandiri atau di background.
2. Hanya USER yang berhak menyalakan dan mematikan dev server.
3. AI hanya boleh menjalankan perintah terminal yang bersifat read-only (seperti `git status`, `npm run lint`) atau perintah penghapus cache (`Remove-Item .next`).
4. Jika AI butuh server menyala untuk tes, AI HARUS meminta izin user terlebih dahulu.
