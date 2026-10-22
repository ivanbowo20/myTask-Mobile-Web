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
  - `@magicui`: Magic UI modern elements (`https://magicui.design`).
  - `@react-bits`: React Bits animations & text effects (`https://reactbits.dev`).
- Ketika merencanakan atau menambahkan animasi, selalu gunakan referensi dari library ini untuk rekomendasi terbaik dan install komponen dengan format `npx shadcn@latest add @registry/component-name`.

## Frontend Design & Anti-AI Slop (SielloMita Design)
- Menggunakan standar skill `siellomita` (SielloMita Design System — powered by Mythra Radiant Anti-Slop Engine):
  - **Anti-AI Slop Enforcement**: Melarang 10 AI slop tells (gradien generik ungu, judul hero membungkus 6 baris, pill shapes di semua tombol/kartu, glassmorphism kabur berlebih, bento berlubang).
  - **Apple WWDC Fluid Motion**: Interaksi aktif wajib responsif seketika (`:active scale(0.97)`), interruptible springs.
  - **Gapless Dense Grid**: Wajib menggunakan `grid-flow-dense` untuk bento grid.
  - **Triage 3 Arah**: Analisa slop diagnostic + 3 arah alternatif desain + kode implementasi siap pakai.
  - **Design Consultation & Plan Review**: Gunakan `/siellomita consult` untuk konsultasi sistem desain dari nol dan `/siellomita plan-review` untuk audit rencana UI/UX (rating 0-10, 5 state interaksi wajib) sebelum penulisan kode.

## Rekayasa Kode Bertahap & Disiplin (Disiplin AI)
- Menggunakan standar skill `disiplin-ai` (Peleburan Obra Superpowers):
  - **Pengerjaan Bertahap (One Task at a Time)**: Breakdown checklist terukur, eksekusi 1 langkah per giliran, tanpa melompat.
  - **Systematic Debugging**: Lacak akar masalah dan data flow; dilarang menebak-nebak (*no shotgun debugging*).
  - **Evidence Before Assertions**: Wajib validasi terminal (`npm run build`, lint, test) sebelum mengklaim selesai.

## Wawancara Kebutuhan & Anti-Halusinasi (Grill-Me)
- Menggunakan standar skill `grill-me` (Peleburan Gstack YC Office Hours + interview-me):
  - Ajukan 1 pertanyaan per giliran dengan tebakan/hipotesis awal AI untuk mengonfirmasi: target pengguna, masalah nyata saat ini, wedge terkecil, kriteria sukses, batasan teknis, dan non-goals.
  - Dilarang membuat asumsi liar atau menulis kode sebelum Statement of Intent disetujui user.

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
