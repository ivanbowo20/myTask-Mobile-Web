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
3. **Magic UI (`@magicui`)**: Animated beam, marquee, confetti, border-beam, number-ticker.
4. **React Bits (`@react-bits`)**: Split-text, blur-text, hyperspeed, magnet, star-border.

Saat user meminta rekomendasi atau penambahan animasi, AI HARUS merujuk pada katalog di atas atau skill `animation-components-registry` untuk memberikan opsi visual terbaik yang sesuai dengan konteks desain.

## FRONTEND DESIGN & ANTI-AI SLOP (SIELLOMITA DESIGN)
Untuk seluruh perancangan antarmuka, styling komponen, dan review visual:
1. Gunakan skill `siellomita` (SielloMita Design System — powered by Mythra Radiant Anti-Slop Engine).
2. Terapkan prinsip:
   - **Banned AI Slop Tells**: Dilarang menggunakan gradien ungu default tanpa identitas brand, tombol pill berlebih pada semua elemen, bento berlubang/kosong, dan judul hero 6-baris (wajib max 2-3 baris dalam container ultra-wide).
   - **WWDC Fluid Springs**: Semua interaksi aktif wajib responsif seketika pada pointer-down (`:active scale(0.97)`) dengan spring physics interruptible.
   - **Gapless Bento Grid**: Bento grid wajib menggunakan `grid-flow-dense` dengan perhitungan `col-span` & `row-span` yang presisi.
   - **3-Direction Delivery**: Memberikan 3 opsi desain (Clean Apple Minimalist, Bold Editorial, Modern Fluid Bento) dan kode implementasi siap pakai tanpa placeholder.
   - **Design Consultation & Plan Review**: Gunakan `/siellomita consult` untuk membangun identitas visual dari nol dan `/siellomita plan-review` untuk mengaudit rencana UI/UX (rating 0-10, 5 state interaksi: idle, loading, actionable empty, error recovery, success) sebelum kode ditulis.

## REKAYASA KODE BERTAHAP & DISIPLIN (DISIPLIN AI)
Untuk pembuatan dan perbaikan kode:
1. Gunakan skill `disiplin-ai` (peleburan Obra Superpowers: alur kerja bertahap, systematic debugging, TDD, rencana atomic 1-by-1, dan verifikasi bukti terminal).
2. Terapkan prinsip:
   - **One Task at a Time**: Buat checklist terukur dan kerjakan 1 task per giliran tanpa melompat atau menggabungkan banyak file secara membabi buta.
   - **Systematic Debugging**: Lacak pesan error asli dan jalur data flow; dilarang menebak-nebak penyebab bug (*no shotgun debugging*).
   - **Evidence Before Assertions**: Dilarang mengklaim selesai tanpa bukti terminal (`npm run build`, `npm run lint`, atau `npm test`).

## INTERVIEW & INTENT EXTRACTION (GRILL-ME)
Sebelum coding ketika fitur masih abstrak atau ambigu:
1. Jalankan `/grill-me` (peleburan Gstack YC Office Hours + interview-me).
2. AI wajib menanyakan 1 pertanyaan per giliran disertai hipotesis/tebakan awal AI untuk mengonfirmasi: target pengguna, masalah nyata saat ini, wedge terkecil, kriteria sukses, batasan teknis, dan non-goals (out-of-scope).
3. AI dilarang menulis kode sebelum Statement of Intent dikonfirmasi oleh user dengan eksplisit "Ya".

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
