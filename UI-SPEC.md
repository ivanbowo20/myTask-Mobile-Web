# UI-SPEC.md — TaskFlow UI/UX Specification

## 0. Metadata & Skill Report

### 0.1 Info Audit
- **Project asal**: `c:\Tugas Bu Shinta\todoweb`
- **Nama aplikasi di UI**: **TaskFlow — Smart Task Management** (`resources/views/layouts/app.blade.php:8-10`, `resources/views/components/sidebar.blade.php:13-15`)
- **Tanggal audit**: 13 Oktober 2026 (`2026-10-13`)
- **Mode eksekusi**: `READ-ONLY AUDIT` (Sesuai §3 Mode A — Master Prompt Standard)
- **Total file view dianalisis**: **16 file `.blade.php`** (1 layout global, 5 komponen reusable, 9 halaman aktif, 1 halaman dead/bawaan Laravel `welcome.blade.php`)
- **Total komponen reusable**: **5 file komponen Blade** (`navbar`, `sidebar`, `task-card`, `add-task-modal`, `edit-task-modal`) + **1 sub-komponen mini-modal inline** (`#add-category-mini-modal` di dalam `add-task-modal.blade.php:137-244`)
- **File aset & konfigurasi UI yang dianalisis**:
  - `resources/css/app.css` (307 baris)
  - `resources/js/app.js` (471 baris)
  - `resources/js/bootstrap.js` (5 baris)
  - `public/build/manifest.json` (17 baris)
  - `package.json` (21 baris)
  - `vite.config.js` (19 baris)
  - `tailwind.config.js`: **TIDAK DITEMUKAN** (Proyek menggunakan Tailwind CSS v4.0.0 dengan konfigurasi CSS-first via `@import 'tailwindcss';` dan `@theme` di `resources/css/app.css:1-92`)

---

### 0.2 Daftar Skill Terpasang (Self-Report)

Berdasarkan pemeriksaan deklarasi environment (`<skills>`, `<mcp_servers>`, `<user_rules>`) serta pengecekan direktori workspace `c:\Tugas Bu Shinta\todoweb`:
- **Project-level skills (`c:\Tugas Bu Shinta\todoweb`)**: **TIDAK DITEMUKAN** (0 skill lokal di folder project; hanya terdapat index `.codegraph/` dan output `graphify-out/`).
- **Global & Built-in skills + MCP Tools**: Terdapat **115 skill aktif di katalog utama**, **43 skill tambahan yang terdeteksi di daftar pengecualian budget konteks (`excluded due to context budget limits`)**, serta **8 MCP Server** (termasuk `codegraph`).

#### A. Tabel MCP Servers & Global Rules Terpasang
| Nama MCP / Rule | Deskripsi / Fungsi | Scope | Sumber Info |
|---|---|---|---|
| `codegraph` (`codegraph_explore`) | Eksplorasi simbol, dependensi lintas file, dan pembacaan kode sumber terindeks melalui `.codegraph/` | Global MCP + Project Index (`.codegraph/`) | `<mcp_servers>` (`C:\Users\HP\.gemini\antigravity\mcp\codegraph`) & `<user_rules>` |
| `StitchMCP` | Pembuatan dan manajemen proyek/layar desain UI (`create_project`, `generate_screen_from_text`, `apply_design_system`, dll.) | Global MCP | `<mcp_servers>` (`C:\Users\HP\.gemini\antigravity\mcp\StitchMCP`) |
| `claude-mem` | Memori lintas sesi, pencarian observasi, dan korpus pengetahuan | Global MCP | `<mcp_servers>` (`C:\Users\HP\.gemini\antigravity\mcp\claude-mem`) |
| `context7` | Resolusi library ID dan pencarian dokumentasi resmi terkini (`resolve-library-id`, `query-docs`) | Global MCP | `<mcp_servers>` (`C:\Users\HP\.gemini\antigravity\mcp\context7`) |
| `dart-mcp-server` | Tooling analisis, hot reload, dan inspeksi paket Dart | Global MCP | `<mcp_servers>` (`C:\Users\HP\.gemini\antigravity\mcp\dart-mcp-server`) |
| `flutter_dart-mcp-server` | Tooling pengembangan dan widget inspector Flutter/Dart | Global MCP | `<mcp_servers>` (`C:\Users\HP\.gemini\antigravity\mcp\flutter_dart-mcp-server`) |
| `firebase-mcp-server` | Manajemen proyek, autentikasi, security rules, dan deployment Firebase | Global MCP | `<mcp_servers>` (`C:\Users\HP\.gemini\antigravity\mcp\firebase-mcp-server`) |
| `gemini-api_gemini-api-docs` | Pencarian dan pembacaan dokumentasi resmi Google Gemini API & SDK | Global MCP | `<mcp_servers>` (`C:\Users\HP\.gemini\antigravity\mcp\gemini-api_gemini-api-docs`) |

#### B. Tabel Skill Built-in Antigravity (`C:\Users\HP\.gemini\antigravity\builtin\skills\*`)
| No | Nama Skill (Persis) | Deskripsi Singkat / Fungsinya | Scope | Sumber Info |
|---|---|---|---|---|
| 1 | `agy-customizations` | Panduan sistem kustomisasi Antigravity (skills, rules, plugins, hooks, MCP) | Global (Built-in) | `<skills>` (`...\builtin\skills\agy-customizations\SKILL.md`) |
| 2 | `antigravity-guide` | Panduan lengkap penggunaan Antigravity IDE, CLI `agy`, dan SDK | Global (Built-in) | `<skills>` (`...\builtin\skills\antigravity_guide\SKILL.md`) |
| 3 | `automation` | Panduan interaktif pembuatan jadwal otomasi latar belakang (cron/timer) | Global (Built-in) | `<skills>` (`...\builtin\skills\automation\SKILL.md`) |
| 4 | `generative_ui` | Pembuatan widget HTML interaktif inline maupun artefak visualisasi | Global (Built-in) | `<skills>` (`...\builtin\skills\generative_ui\SKILL.md`) |
| 5 | `migrate-workflows` | Migrasi workflow lama ke format modern `SKILL.md` | Global (Built-in) | `<skills>` (`...\builtin\skills\migrate-workflows\SKILL.md`) |
| 6 | `ui-extension` | Pembuatan dan debugging panel ekstensi UI untuk Antigravity | Global (Built-in) | `<skills>` (`...\builtin\skills\ui-extension\SKILL.md`) |
| 7 | `ui-plugin-navigation` | Navigasi cepat untuk membuka panel plugin UI yang relevan di side pane | Global (Built-in) | `<skills>` (`...\builtin\skills\ui-plugin-navigation\SKILL.md`) |

#### C. Tabel Skill Global — Anti-Slop, UI/UX, Frontend & Design (`C:\Users\HP\.gemini\config\skills\*`)
| No | Nama Skill (Persis) | Deskripsi Singkat / Fungsinya | Scope | Sumber Info |
|---|---|---|---|---|
| 8 | `antislop` | Filter inti aturan anti-AI-slop (R-01 s/d R-38, Purpose-Gate, Craftsmanship C-1..C-5, Delivery Gate) | Global | `<skills>` (`C:\Users\HP\.gemini\config\skills\antislop\SKILL.md` — **telah dibaca**) |
| 9 | `antislop-ui` | Aturan visual & UI untuk antislop: warna, layout, komponen, dekorasi, dashboard shell, dan motion | Global | `<skills>` (`C:\Users\HP\.gemini\config\skills\antislop-ui\SKILL.md` — **telah dibaca**) |
| 10 | `antislop-human` | Standar aksesibilitas & manusia untuk antislop: kontras WCAG AA, navigasi keyboard, focus ring, state UI | Global | `<skills>` (`C:\Users\HP\.gemini\config\skills\antislop-human\SKILL.md` — **telah dibaca**) |
| 11 | `antislop-layoutmobile` | Aturan layout responsif mobile-ke-desktop: breakpoint, reflow grid, anti-overflow, tap target ≥ 44px | Global | `<skills>` (`C:\Users\HP\.gemini\config\skills\antislop-layoutmobile\SKILL.md` — **telah dibaca**) |
| 12 | `antislop-copywriting` | Standar penulisan copy UI, headline, CTA, dan penghapusan pola teks AI | Global | `<skills>` (`C:\Users\HP\.gemini\config\skills\antislop-copywriting\SKILL.md`) |
| 13 | `antislop-code` | Kebersihan komentar kode: hapus komentar generik AI, pertahankan komentar bernilai tanpa mengubah kode | Global | `<skills>` (`C:\Users\HP\.gemini\config\skills\antislop-code\SKILL.md`) |
| 14 | `avoid-ai-writing` | Audit dan tulis ulang teks untuk menghilangkan pola tulisan AI ("AI-isms") | Global | `<skills>` (`C:\Users\HP\.gemini\config\skills\avoid-ai-writing\SKILL.md`) |
| 15 | `humanizer` | Menulis ulang teks agar terdengar alami dan bebas tanda tulisan AI | Global | `<skills>` (`C:\Users\HP\.gemini\config\skills\humanizer\SKILL.md`) |
| 16 | `no-ai-slop` | Mengedit draf tulisan menjadi lebih tajam dan manusiawi atau mendeteksi pola AI-slop | Global | `<skills>` (`C:\Users\HP\.gemini\config\skills\no-ai-slop\SKILL.md`) |
| 17 | `design-system` | Arsitektur design token 3-layer (primitive → semantic → component), variabel CSS, skala tipografi/spacing | Global | `<skills>` (`C:\Users\HP\.gemini\config\skills\design-system\SKILL.md` — **telah dibaca**) |
| 18 | `frontend-ui-engineering` | Rekayasa UI kualitas produksi: arsitektur komponen, manajemen state, aksesibilitas WCAG 2.1 AA, responsif | Global | `<skills>` (`C:\Users\HP\.gemini\config\skills\frontend-ui-engineering\SKILL.md` — **telah dibaca**) |
| 19 | `design-taste-frontend` | Skill frontend anti-slop untuk arah desain, kalibrasi warna/tipografi, dan audit redesign | Global | `<skills>` (`C:\Users\HP\.gemini\config\skills\design-taste-frontend\SKILL.md` — **telah dibaca**) |
| 20 | `frontend-design` | Panduan desain visual intensional, pemilihan tipografi, palet warna, dan struktur hirarki | Global | `<skills>` (`C:\Users\HP\.gemini\config\skills\frontend-design\SKILL.md` — **telah dibaca**) |
| 21 | `apple-design` | Pendekatan desain antarmuka bergaya Apple: fluid motion, spring physics, material translusen, tipografi | Global | `<skills>` (`C:\Users\HP\.gemini\config\skills\apple-design\SKILL.md`) |
| 22 | `emil-design-eng` | Filosofi detail polesan UI, desain komponen, dan keputusan animasi oleh Emil Kowalski | Global | `<skills>` (`C:\Users\HP\.gemini\config\skills\emil-design-eng\SKILL.md`) |
| 23 | `find-animation-opportunities` | Analisis read-only untuk mencari titik UI yang layak diberi animasi dan menolak animasi tanpa tujuan | Global | `<skills>` (`C:\Users\HP\.gemini\config\skills\find-animation-opportunities\SKILL.md`) |
| 24 | `ask-sonner` | Panduan integrasi, styling, dark mode, dan troubleshooting library toast React `sonner` | Global | `<skills>` (`C:\Users\HP\.gemini\config\skills\ask-sonner\SKILL.md`) |
| 25 | `brand` | Kerangka kerja identitas visual, brand voice, dan kepatuhan style guide | Global | `<skills>` (`C:\Users\HP\.gemini\config\skills\brand\SKILL.md`) |
| 26 | `prototype` | Pembuatan prototipe cepat untuk menguji model state atau eksplorasi tampilan UI | Global | `<skills>` (`C:\Users\HP\.gemini\config\skills\prototype\SKILL.md`) |
| 27 | `slides` | Pembuatan presentasi HTML strategis menggunakan Chart.js dan design tokens | Global | `<skills>` (`C:\Users\HP\.gemini\config\skills\slides\SKILL.md`) |

#### D. Tabel Skill Global — Arsitektur, Audit, Engineering & Workflow (`C:\Users\HP\.gemini\config\skills\*`)
| No | Nama Skill (Persis) | Deskripsi Singkat / Fungsinya | Scope | Sumber Info |
|---|---|---|---|---|
| 28 | `graphify` | Membangun dan melakukan query knowledge graph proyek (`graphify-out/GRAPH_REPORT.md`, `graph.json`) | Global | `<skills>` (`C:\Users\HP\.gemini\config\skills\graphify\SKILL.md` — **telah dibaca**) |
| 29 | `api-and-interface-design` | Desain kontrak API REST/GraphQL dan batas modul frontend-backend | Global | `<skills>` (`...\skills\api-and-interface-design\SKILL.md`) |
| 30 | `api-endpoint-builder` | Pembuatan endpoint REST API produksi dengan validasi, autentikasi, dan penanganan error | Global | `<skills>` (`...\skills\api-endpoint-builder\SKILL.md`) |
| 31 | `before-you-build` | Evaluasi risiko produk sebelum coding | Global | `<skills>` (`...\skills\before-you-build\SKILL.md`) |
| 32 | `brainstorming` | Eksplorasi intent user, kebutuhan, dan desain sebelum implementasi fitur | Global | `<skills>` (`...\skills\brainstorming\SKILL.md`) |
| 33 | `browser-testing-with-devtools` | Pengujian di browser nyata via Chrome DevTools MCP | Global | `<skills>` (`...\skills\browser-testing-with-devtools\SKILL.md`) |
| 34 | `bug-hunter` | Pelacakan bug sistematis dari gejala ke akar masalah | Global | `<skills>` (`...\skills\bug-hunter\SKILL.md`) |
| 35 | `ci-cd-and-automation` | Otomasi pipeline build, test, dan deployment CI/CD | Global | `<skills>` (`...\skills\ci-cd-and-automation\SKILL.md`) |
| 36 | `code-review` | Review perubahan kode berdasarkan dua sumbu: Standards & Spec | Global | `<skills>` (`...\skills\code-review\SKILL.md`) |
| 37 | `code-review-and-quality` | Review kualitas kode multi-dimensi sebelum merge | Global | `<skills>` (`...\skills\code-review-and-quality\SKILL.md`) |
| 38 | `code-simplification` | Penyederhanaan kode untuk kejelasan tanpa mengubah perilaku | Global | `<skills>` (`...\skills\code-simplification\SKILL.md`) |
| 39 | `codebase-audit-pre-push` | Audit menyeluruh kode sebelum push ke GitHub (file sampah, dead code, celah keamanan) | Global | `<skills>` (`...\skills\codebase-audit-pre-push\SKILL.md`) |
| 40 | `codebase-design` | Kosakata dan panduan desain modul dalam (deep modules) dan batas antarmuka | Global | `<skills>` (`...\skills\codebase-design\SKILL.md`) |
| 41 | `coderabbit-autofix` | Penerapan aman umpan balik PR CodeRabbit dengan persetujuan per perubahan | Global | `<skills>` (`...\skills\coderabbit-autofix\SKILL.md`) |
| 42 | `coderabbit-review` | Menjalankan review CodeRabbit CLI pada kode lokal atau PR | Global | `<skills>` (`...\skills\coderabbit-review\SKILL.md`) |
| 43 | `context-engineering` | Optimasi setup konteks agen dan file rules proyek | Global | `<skills>` (`...\skills\context-engineering\SKILL.md`) |
| 44 | `continuous-learning` | Ekstraktor skill sesi lama (deprecated, digantikan v2) | Global | `<skills>` (`...\skills\continuous-learning\SKILL.md`) |
| 45 | `debugging-and-error-recovery` | Debugging akar masalah secara sistematis saat build/test gagal | Global | `<skills>` (`...\skills\debugging-and-error-recovery\SKILL.md`) |
| 46 | `delivery-gate` | Stop hook pemeriksa gerbang kualitas sebelum pekerjaan dinyatakan selesai | Global | `<skills>` (`...\skills\delivery-gate\SKILL.md`) |
| 47 | `deprecation-and-migration` | Manajemen depresiasi sistem lama dan migrasi bertahap (termasuk skema DB) | Global | `<skills>` (`...\skills\deprecation-and-migration\SKILL.md`) |
| 48 | `diagnosing-bugs` | Loop diagnosis untuk bug berat dan regresi performa | Global | `<skills>` (`...\skills\diagnosing-bugs\SKILL.md`) |
| 49 | `diagnosing-superpowers` | Diagnosis sesi kerja agen yang bermasalah atau lambat | Global | `<skills>` (`...\skills\diagnosing-superpowers\SKILL.md`) |
| 50 | `dispatching-parallel-agents` | Orkestrasi sub-agen paralel untuk tugas-tugas independen | Global | `<skills>` (`...\skills\dispatching-parallel-agents\SKILL.md`) |
| 51 | `documentation-and-adrs` | Pencatatan Architecture Decision Records (ADR) dan dokumentasi teknis | Global | `<skills>` (`...\skills\documentation-and-adrs\SKILL.md`) |
| 52 | `domain-modeling` | Pemodelan domain proyek dan penyusunan terminologi bisnis | Global | `<skills>` (`...\skills\domain-modeling\SKILL.md`) |
| 53 | `effective-agent-skills` | Panduan penulisan dan evaluasi skill agen berkualitas tinggi | Global | `<skills>` (`...\skills\effective-agent-skills\SKILL.md`) |
| 54 | `executing-plans` | Eksekusi rencana implementasi secara terstruktur di sesi saat ini | Global | `<skills>` (`...\skills\executing-plans\SKILL.md`) |
| 55 | `finishing-a-development-branch` | Penyelesaian branch pengembangan setelah seluruh tes lulus | Global | `<skills>` (`...\skills\finishing-a-development-branch\SKILL.md`) |
| 56 | `git-guardrails-claude-code` | Konfigurasi hook pelindung perintah git destruktif | Global | `<skills>` (`...\skills\git-guardrails-claude-code\SKILL.md`) |
| 57 | `grilling` | Menguji ketahanan rencana atau keputusan melalui sesi tanya-jawab kritis | Global | `<skills>` (`...\skills\grilling\SKILL.md`) |
| 58 | `gstack` | Sistem engineering & delivery startup bergaya YC oleh Garry Tan | Global | `<skills>` (`...\skills\gstack\SKILL.md`) |
| 59 | `idea-refine` | Penajaman ide mentah melalui pemikiran divergen dan konvergen | Global | `<skills>` (`...\skills\idea-refine\SKILL.md`) |
| 60 | `incremental-implementation` | Implementasi fitur secara bertahap dalam irisan tipis yang dapat diverifikasi | Global | `<skills>` (`...\skills\incremental-implementation\SKILL.md`) |
| 61 | `logic-lens` | Review kode mendalam berbasis logika formal untuk mendeteksi bug dan risiko keamanan | Global | `<skills>` (`...\skills\logic-lens\SKILL.md`) |
| 62 | `migrate-to-shoehorn` | Migrasi type assertion `as` pada file tes ke `@total-typescript/shoehorn` | Global | `<skills>` (`...\skills\migrate-to-shoehorn\SKILL.md`) |
| 63 | `observability-and-instrumentation` | Penambahan logging, metrik, tracing, dan alerting pada kode produksi | Global | `<skills>` (`...\skills\observability-and-instrumentation\SKILL.md`) |
| 64 | `performance-optimization` | Optimasi performa frontend, Core Web Vitals, query N+1, dan database | Global | `<skills>` (`...\skills\performance-optimization\SKILL.md`) |
| 65 | `performance-optimizer` | Identifikasi dan perbaikan bottleneck performa dengan pengukuran sebelum/sesudah | Global | `<skills>` (`...\skills\performance-optimizer\SKILL.md`) |
| 66 | `planning-and-task-breakdown` | Pemecahan spesifikasi menjadi daftar tugas berurutan yang siap diimplementasikan | Global | `<skills>` (`...\skills\planning-and-task-breakdown\SKILL.md`) |
| 67 | `ponytail` | Mode senior developer pragmatis (perubahan terkecil yang menyelesaikan masalah secara tuntas) | Global | `<skills>` (`...\skills\ponytail\SKILL.md`) |
| 68 | `ponytail-audit` | Audit kualitas seluruh repositori secara ringkas dan terperingkat (one-shot report, read-only) | Global | `<skills>` (`...\skills\ponytail-audit\SKILL.md`) |
| 69 | `ponytail-debt` | Pelaporan daftar utang teknis (`shortcut:` / `ponytail:`) di repositori | Global | `<skills>` (`...\skills\ponytail-debt\SKILL.md`) |
| 70 | `ponytail-gain` | Menampilkan penghematan kode/biaya/kecepatan dari benchmark ponytail | Global | `<skills>` (`...\skills\ponytail-gain\SKILL.md`) |
| 71 | `ponytail-help` | Referensi cepat level dan perintah ponytail | Global | `<skills>` (`...\skills\ponytail-help\SKILL.md`) |
| 72 | `ponytail-review` | Review kualitas perubahan kode beserta kode yang terhubung | Global | `<skills>` (`...\skills\ponytail-review\SKILL.md`) |
| 73 | `pr` | Panduan penulisan deskripsi Pull Request | Global | `<skills>` (`...\skills\pr\SKILL.md`) |
| 74 | `prd` | Pembuatan dokumen Product Requirements Document (PRD) | Global | `<skills>` (`...\skills\prd\SKILL.md`) |
| 75 | `production-audit` | Audit kesiapan produksi (RLS, webhook, secret, mobile UX, kesehatan deployment) | Global | `<skills>` (`...\skills\production-audit\SKILL.md`) |
| 76 | `ralph` | Konversi PRD ke format `prd.json` untuk sistem agen otonom Ralph | Global | `<skills>` (`...\skills\ralph\SKILL.md`) |
| 77 | `receiving-code-review` | Evaluasi teknis secara objektif terhadap umpan balik code review | Global | `<skills>` (`...\skills\receiving-code-review\SKILL.md`) |
| 78 | `requesting-code-review` | Prosedur verifikasi sebelum meminta code review atau merge | Global | `<skills>` (`...\skills\requesting-code-review\SKILL.md`) |
| 79 | `research` | Investigasi topik terhadap sumber primer tepercaya dan dokumentasi ke file Markdown | Global | `<skills>` (`...\skills\research\SKILL.md`) |
| 80 | `resolving-merge-conflicts` | Penyelesaian konflik merge/rebase git secara aman | Global | `<skills>` (`...\skills\resolving-merge-conflicts\SKILL.md`) |
| 81 | `scaffold-exercises` | Pembuatan struktur direktori latihan kursus | Global | `<skills>` (`...\skills\scaffold-exercises\SKILL.md`) |
| 82 | `security-review` | Checklist dan pola keamanan untuk autentikasi, input user, secret, dan endpoint API | Global | `<skills>` (`...\skills\security-review\SKILL.md`) |
| 83 | `setup-pre-commit` | Konfigurasi Husky pre-commit hooks, lint-staged, typecheck, dan test | Global | `<skills>` (`...\skills\setup-pre-commit\SKILL.md`) |
| 84 | `shipping-and-launch` | Checklist pra-rilis produksi, strategi rollout, dan rollback | Global | `<skills>` (`...\skills\shipping-and-launch\SKILL.md`) |
| 85 | `skill-repair` | Perbaikan instalasi skill agen dan pembaruan `manifest.json` | Global | `<skills>` (`...\skills\skill-repair\SKILL.md`) |
| 86 | `source-driven-development` | Menambatkan setiap keputusan implementasi pada dokumentasi resmi terbaru | Global | `<skills>` (`...\skills\source-driven-development\SKILL.md`) |
| 87 | `subagent-driven-development` | Eksekusi rencana implementasi menggunakan sub-agen untuk tugas independen | Global | `<skills>` (`...\skills\subagent-driven-development\SKILL.md`) |
| 88 | `systematic-debugging` | Prosedur investigasi bug sebelum mengajukan perbaikan | Global | `<skills>` (`...\skills\systematic-debugging\SKILL.md`) |
| 89 | `tdd` | Pengembangan berbasis Test-Driven Development (red-green-refactor) | Global | `<skills>` (`...\skills\tdd\SKILL.md`) |
| 90 | `technical-change-tracker` | Pelacakan perubahan kode dengan catatan JSON terstruktur untuk handoff sesi AI | Global | `<skills>` (`...\skills\technical-change-tracker\SKILL.md`) |
| 91 | `test-driven-development` | Penulisan tes sebelum kode implementasi fitur atau perbaikan bug | Global | `<skills>` (`...\skills\test-driven-development\SKILL.md`) |
| 92 | `tree-ring-memory` | Manajemen siklus hidup memori agen AI berbasis lokal | Global | `<skills>` (`...\skills\tree-ring-memory\SKILL.md`) |
| 93 | `unified-memory` | Berbagi konteks dan handoff antar agen melalui ECC Memory Vault | Global | `<skills>` (`...\skills\unified-memory\SKILL.md`) |
| 94 | `using-agent-skills` | Meta-skill untuk memilih dan memanggil skill yang tepat sesuai tugas | Global | `<skills>` (`...\skills\using-agent-skills\SKILL.md`) |
| 95 | `using-git-worktrees` | Isolasi workspace pengembangan menggunakan git worktree | Global | `<skills>` (`...\skills\using-git-worktrees\SKILL.md`) |
| 96 | `using-superpowers` | Konvensi aktivasi skill di awal percakapan | Global | `<skills>` (`...\skills\using-superpowers\SKILL.md`) |
| 97 | `verification-before-completion` | Kewajiban menjalankan verifikasi bukti sebelum mengklaim pekerjaan selesai | Global | `<skills>` (`...\skills\verification-before-completion\SKILL.md`) |
| 98 | `vibecode-production-qa-validator` | 13 fase QA produksi khusus untuk aplikasi fullstack Next.js (build, SEO, route, API auth, UI/UX, DB) | Global | `<skills>` (`...\skills\vibecode-production-qa-validator\SKILL.md`) |
| 99 | `wizard` | Pembuatan wizard bash interaktif untuk langkah-langkah yang hanya bisa dilakukan manusia | Global | `<skills>` (`...\skills\wizard\SKILL.md`) |
| 100 | `writing-for-agents` | Panduan penulisan dokumen instruksi (`AGENTS.md`, `CLAUDE.md`, `SKILL.md`) | Global | `<skills>` (`...\skills\writing-for-agents\SKILL.md`) |
| 101 | `writing-plans` | Penyusunan rencana langkah demi langkah sebelum menyentuh kode | Global | `<skills>` (`...\skills\writing-plans\SKILL.md`) |
| 102 | `writing-skills` | Pembuatan, pengeditan, dan verifikasi skill baru | Global | `<skills>` (`...\skills\writing-skills\SKILL.md`) |

#### E. Tabel Skill Global — Data, GCP, Mobile/Flutter & Sains (`C:\Users\HP\.gemini\config\*`)
| Kategori | Daftar Nama Skill (Persis) | Deskripsi Singkat | Scope | Sumber Info |
|---|---|---|---|---|
| **Data & GCP** (9 skill) | `bigquery-data-transfer-service`, `bigquery-sql`, `data-autocleaning`, `dataform-bigquery`, `dbt-bigquery`, `enforcing-resource-attribution`, `gcp-data-pipelines`, `gcp-pipeline-orchestration`, `google-cloud-auth-verification` | Pipeline data BigQuery, Dataform, dbt, Cloud Composer, dan autentikasi GCP | Global | `<skills>` (`C:\Users\HP\.gemini\config\skills\*`) |
| **Plugin: CodeRabbit, Android, AGY SDK, GSlides** (5 skill) | `android-cli`, `autofix`, `code-review` (plugin coderabbit), `google-antigravity-sdk`, `gslides` | Pengembangan Android CLI, review/autofix CodeRabbit, SDK Antigravity, dan Google Slides | Global (Plugin) | `<skills>` (`C:\Users\HP\.gemini\config\plugins\*`) |
| **Plugin: Flutter & Dart** (22 skill) | `dart-add-unit-test`, `dart-build-cli-app`, `dart-collect-coverage`, `dart-fix-runtime-errors`, `dart-generate-test-mocks`, `dart-migrate-to-checks-package`, `dart-resolve-package-conflicts`, `dart-run-static-analysis`, `dart-use-ffigen`, `dart-use-pattern-matching`, `dart-use-primary-constructors`, `dart-write-documentation`, `flutter-add-integration-test`, `flutter-add-widget-preview`, `flutter-add-widget-test`, `flutter-apply-architecture-best-practices`, `flutter-build-responsive-layout`, `flutter-fix-layout-issues`, `flutter-implement-json-serialization`, `flutter-setup-declarative-routing`, `flutter-setup-localization`, `flutter-use-http-package` | Pengembangan aplikasi, pengujian, arsitektur, dan tata letak responsif Dart/Flutter | Global (Plugin) | `<skills>` (`C:\Users\HP\.gemini\config\plugins\flutter\skills\*`) |
| **Plugin: Science / Bioinformatics** (35 skill) | `alphafold-database-fetch-and-analyze`, `alphagenome-variant-impact-score`, `chembl-database`, `clinical-trials-database`, `clinvar-database`, `credentials`, `dbsnp-database`, `embl-ebi-ols`, `encode-ccres-database`, `ensembl-database`, `foldseek-structural-search`, `gtex-database`, `human-protein-atlas-database`, `interpro-database`, `jaspar-database`, `literature-search-arxiv`, `literature-search-biorxiv`, `literature-search-europepmc`, `ncbi-sequence-fetch`, `openfda-database`, `opentargets-database`, `pdb-database`, `predictingthepast`, `protein-sequence-similarity-search`, `pubchem-database`, `pubmed-database`, `pymol`, `quickgo-database`, `reactome-database`, `string-database`, `ucsc-conservation-and-tfbs`, `unibind-database`, `uniprot-database`, `uv`, `workflow-skill-creator` | Riset bioinformatika, genomik, struktur protein, dan literatur ilmiah | Global (Plugin) | `<skills>` (`C:\Users\HP\.gemini\config\plugins\science\skills\*`) |
| **Skill Terdaftar Namun Dikecualikan dari Konteks Otomatis (`excluded due to context budget limits`)** (43 skill) | `accidental-data-loss-prevention`, `alphagenome-atlas-website-links`, `alphagenome-single-variant-analysis`, `animate`, `animate-expo`, `animation-vocabulary`, `banner-design`, `building-data-apps`, `chrome-extensions`, `constraint-driven-development`, `dart-setup-ffi-assets`, `design`, `discovering-gcp-data-assets`, `doubt-driven-development`, `gcp-dataflow`, `gcp-pipeline-resource-provisioning`, `gcp-spark`, `gcp-spark-troubleshooting`, `gdocs`, `gemini-api-dev`, `gemini-live-api-dev`, `gemini-omni-flash-api`, `git-workflow-and-versioning`, `gnomad-database`, `google-maps-platform`, `impeccable`, `improve-animations`, `interview-me`, `literature-search-openalex`, `managing-python-dependencies`, `ml-best-practices`, `mobile-native`, `modern-web-guidance`, `notebook-guidance`, `plugin`, `protein-sequence-msa`, `schema-mapping`, `security-and-hardening`, `spec-driven-development`, `taste-application`, `ui-styling`, `ui-ux-pro-max`, `write-swift` | Terpasang di sistem global namun path lengkapnya dikecualikan dari header konteks karena batas token (`PERLU KONFIRMASI USER` jika ingin dipanggil spesifik) | Global (Excluded Context) | Footer `<skills>` |

---

### 0.3 Skill yang Dipakai di Task Ini

| Nama Skill / Tool | Kategori Wajib | Bagian Audit yang Dibantu | Cara Pakai & Hasil Nyata |
|---|---|---|---|
| `codegraph` (`codegraph_explore` MCP + `.codegraph/`) | **Wajib — Peta Struktur File** | Pemetaan relasi Controller → View → Model dan verifikasi kode sumber berbaris | Dijalankan pada workspace `c:/Tugas Bu Shinta/todoweb` (56 file terindeks, 269 node, 306 edge). Memetakan 30 simbol utama di `DashboardController`, `TaskController`, `CategoryController`, `AuthController`, dan `resources/js/app.js`. |
| `graphify` (`SKILL.md` + `graphify-out/GRAPH_REPORT.md`) | **Wajib — Knowledge Graph** | Identifikasi God Nodes, kohesi antar modul, dan pengelompokan komunitas komponen UI | Mengekstrak 278 node, 355 edge, dan 38 komunitas. Mengidentifikasi **Community 12** (kohesi `0.40`) sebagai klaster komponen Blade utama (`components.navbar`, `components.sidebar`, `components.add-task-modal`, `components.edit-task-modal`) serta God Nodes `Task` (22 edge) dan `TaskController` (15 edge). |
| `antislop` + `antislop-ui` + `antislop-human` + `antislop-layoutmobile` | **Wajib — Anti AI Slop, Aksesibilitas & Mobile Layout** | Bagian 1 (Token & Kontras WCAG), Bagian 2 (Responsif & Tap Target), Bagian 8 (Temuan Inkonsistensi UI) | Membaca `SKILL.md` ke-4 skill dan menerapkan rumus kontras WCAG 2.x (`antislop-human:60-65`), audit tap target `44x44px` (`antislop-layoutmobile:114-118`), serta audit konsistensi tema (`R-21`, `R-25`, `R-34`). Menemukan masalah kontras kritis pada tombol `.btn-primary` di Dark Mode (`2.15:1`) dan ketiadaan dukungan Light Mode di halaman `/login` & `/register`. |
| `design-system` | **Wajib — Design Token & Spesifikasi Komponen** | Bagian 1 (Design Token) & Bagian 4 (Spesifikasi Komponen Reusable) | Membaca `SKILL.md` dan memetakan sistem token `resources/css/app.css` ke struktur 3-layer: Primitive (`:root` & `:root.dark` L10–L64) → Semantic (`@theme` L66–L92) → Component (`.sidebar-link`, `.task-card`, `.stats-card`, `.custom-checkbox`, `.task-checkbox`, `.btn-primary` L118–L248). |
| `frontend-ui-engineering` + `design-taste-frontend` + `frontend-design` | **Wajib — Design Frontend & UI/UX Rebuild Blueprint** | Bagian 5 (Spesifikasi Halaman), Bagian 6 (Interaksi), Bagian 8 (Inkonsistensi), Bagian 9 (Catatan Rebuild Next.js) | Membaca `SKILL.md` ketiga skill untuk membedah state komponen (default, hover, active, empty, error, loading), isolasi interaktivitas Client vs Server Component untuk Next.js, serta pemetaan struktur komponen Blade ke React. |

---

## 1. Design Token

Seluruh token desain bersumber dari `resources/css/app.css` (baris 1–307), ditambah warna inline hardcoded pada halaman autentikasi (`resources/views/auth/login.blade.php` & `register.blade.php`), komponen modal (`add-task-modal.blade.php` & `edit-task-modal.blade.php`), dan palet kategori di `CategoryController.php`.

> **Catatan Konfigurasi Tailwind v4 (`resources/css/app.css:1-8`)**:
> Proyek tidak menggunakan `tailwind.config.js`. Sebagai gantinya, `resources/css/app.css` memuat:
> - Baris 1: `@import 'tailwindcss';`
> - Baris 2: `@plugin 'flowbite/plugin';`
> - Baris 4–8: Direktif `@source` yang memindai pagination Laravel, compiled views, `../**/*.blade.php`, `../**/*.js`, dan `../../node_modules/flowbite/**/*.js`.

### 1.1 Palet Warna

#### A. CSS Custom Properties & Mapping `@theme` (`resources/css/app.css:10-92`)
| Nama Token CSS (`:root`) | Token Tailwind v4 (`@theme`) | Class Utility Tailwind | Nilai Light Mode (`:root` L10–36) | Nilai Dark Mode (`:root.dark` L38–64) | Digunakan Untuk |
|---|---|---|---|---|---|
| `--bg-main` | `--color-bg-main` | `bg-bg-main` | `#F4F6F9` | `#080C14` | Background utama `<body>`, input form, hover tombol sekunder, track scrollbar |
| `--navbar-bg` | `--color-navbar-bg` | `bg-navbar-bg`, `border-navbar-bg` | `#0B2240` (Very deep navy) | `#0F1626` (Dark slate-blue) | Background navbar atas & border cincin badge notifikasi merah |
| `--sidebar-bg` | `--color-sidebar-bg` | `bg-sidebar-bg` | `#112F56` (Rich navy) | `#0F1626` | Background `<aside id="sidebar-drawer">` |
| `--card-bg` | `--color-card-bg` | `bg-card-bg` | `#FFFFFF` | `#172033` (Dark card blue) | Background card tugas, stats card, modal dialog, dropdown menu, select filter |
| `--border-custom` | `--color-border-custom` | `border-border-custom` | `#E2E8F0` | `#24324F` | Border card, modal, input, divider tabel/section, thumb scrollbar |
| `--text-main` | `--color-text-main` | `text-text-main` | `#1E293B` | `#F8FAFC` | Teks judul halaman, judul tugas, angka statistik, label input |
| `--text-muted` | `--color-text-muted` | `text-text-muted` | `#64748B` | `#94A3B8` | Subjudul halaman, deskripsi tugas, tanggal biasa, teks empty state |
| `--text-sidebar` | `--color-text-sidebar` | `text-text-sidebar` | `#E2E8F0` | `#94A3B8` | Teks item navigasi sidebar normal & tombol ikon di navbar |
| `--text-sidebar-muted` | `--color-text-sidebar-muted` | `text-text-sidebar-muted` | `#94A3B8` | `#64748B` | Heading seksi sidebar (`MAIN MENU`, `ORGANIZE`), ikon search, subteks logo, footer sidebar |
| `--text-sidebar-active` | `--color-text-sidebar-active` | `text-text-sidebar-active` | `#FFFFFF` | `#38BDF8` (Radiant sky blue) | Teks & ikon item sidebar yang sedang aktif atau di-hover, teks badge angka `Today` |
| `--sidebar-active-bg` | `--color-sidebar-active-bg` | `bg-sidebar-active-bg` | `rgba(255, 255, 255, 0.12)` | `rgba(56, 189, 248, 0.12)` | Background item sidebar yang sedang aktif (`.sidebar-link.active`) |
| `--accent-custom` | `--color-accent-custom` | `text-accent-custom` | `#112F56` | `#38BDF8` | Warna aksen sekunder pada SVG & kata `Flow` di identitas dalam sidebar (`sidebar.blade.php:7,13`) |
| `--accent-hover` | `--color-accent-hover` | `hover:bg-accent-hover` | `#1A4275` | `#7DD3FC` | Didefinisikan di `:root` & `@theme` (`app.css:26,54,84`), namun **tidak dipakai** di file Blade manapun |
| `--accent-vivid` | `--color-accent-vivid` | `bg-accent-vivid`, `text-accent-vivid`, `border-accent-vivid`, `focus:ring-accent-vivid` | `#2563EB` | `#38BDF8` | Warna aksen utama: tombol utama (`.btn-primary`), ikon judul halaman, border kiri sidebar aktif, checkbox tercentang, focus ring input, border hover card |
| `--accent-vivid-hover` | `--color-accent-vivid-hover` | `hover:bg-accent-vivid-hover` | `#1D4ED8` | `#7DD3FC` | Warna background saat hover pada semua tombol utama (`bg-accent-vivid`) |
| `--accent-light` | `--color-accent-light` | `bg-accent-light` | `rgba(37, 99, 235, 0.1)` | `rgba(56, 189, 248, 0.15)` | Background ikon kartu statistik `Total Tasks`, badge counter `Today` di sidebar, header grup `Deadline Besok` di dropdown notifikasi, dan glow `.btn-primary:hover` |
| `--danger` | `--color-danger-custom` | `text-danger-custom`, `bg-danger-custom/10`, `border-danger-custom` | `#EF4444` | `#F87171` | Ikon & badge `Important` di stats card dashboard, badge `X active` di `/tasks/important`, tombol hapus tugas/kategori, alert error validasi global |
| `--success` | `--color-success-custom` | `text-success-custom`, `bg-success-custom/10`, `border-success-custom` | `#22C55E` | `#4ADE80` | Flash message sukses (`layouts/app.blade.php:41-57`), stats card `Completed`, teks `Done X ago` di task card, halaman `/tasks/completed` |
| `--warning` | `--color-warning-custom` | `text-warning-custom` | `#F59E0B` | `#FBBF24` | Didefinisikan di `:root` & `@theme` (`app.css:33,61,91`), namun di Blade kreator selalu memakai class bawaan Tailwind `amber-500` / `amber-400` |

#### B. Warna Semantik Bawaan Tailwind & Hardcoded Inline di Blade/JS
| Konteks Komponen | Nilai / Class Warna | Lokasi File + Baris | Keterangan |
|---|---|---|---|
| **Task Card: Completed** | `border-emerald-500/50 bg-emerald-500/5 dark:bg-emerald-950/20` | `components/task-card.blade.php:8` | Status `$task->deadline_status === 'completed'` |
| **Task Card: Overdue** | `border-2 border-red-500/70 bg-red-500/10 dark:bg-red-950/30` | `components/task-card.blade.php:9` | Status `$task->deadline_status === 'overdue'` |
| **Task Card: Reminder** | `border-2 border-amber-500/70 bg-amber-500/10 dark:bg-amber-950/30 shadow-md` | `components/task-card.blade.php:10` | Status `$task->deadline_status === 'reminder'` |
| **Badge Overdue** | `bg-red-500/20 text-red-500 border border-red-500/30` | `components/task-card.blade.php:43` | Pill `🔴 Overdue` |
| **Badge Reminder** | `bg-amber-500/20 text-amber-500 border border-amber-500/30 animate-pulse` | `components/task-card.blade.php:47` | Pill `⚠️ Reminder (...)` |
| **Tombol Quick Done** | `bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500 hover:text-white border border-emerald-500/30` | `components/task-card.blade.php:56`, `dashboard.blade.php:128` | Di dropdown notifikasi (`app.js:284,303,322`) memakai `bg-emerald-500/20` tanpa border |
| **Ikon Bintang Important** | `text-amber-500 fill-current` (aktif) / `text-text-muted hover:text-amber-500` (non-aktif) | `components/task-card.blade.php:35,114` | Ikon bintang prioritas |
| **Alert & Toast Deadline Invalid** | `background-color: #1E293B; border-color: #10B981; color: #FFFFFF;` + judul `text-amber-400` + isi `text-gray-200` | `components/add-task-modal.blade.php:102`, `components/edit-task-modal.blade.php:98`, `resources/js/app.js:136` | ⚠️ Border menggunakan hijau `#10B981` meskipun ini pesan peringatan/error deadline |
| **Halaman Login & Register (Hardcoded Dark)** | Body bg `#0F172A`, Card bg `#1E293B`, Card border `#334155`, Input bg `#0F172A`, Input border `#475569`, Text `#F1F5F9`, Muted `#94A3B8`, Footer `#64748B`, Accent/Button bg `#38BDF8`, Button text `#0F172A`, Error `#EF4444`/`#F87171`, Register Success bg `rgba(16,185,129,0.12)` border `#10B981` title `#34D399` text `#6EE7B7` | `auth/login.blade.php:17-138`, `auth/register.blade.php:17-145` | Tidak memakai variabel CSS dari `app.css` |
| **Palet Warna Kategori** | Default input color picker: `#2563EB` (`categories/index.blade.php:32`); Default kolom DB: `#38BDF8` (`create_categories_table.php:15`); Palet acak AJAX mini-modal: `['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#14b8a6']` (`CategoryController.php:45`) | `categories/index.blade.php:32,58,73,78`, `components/task-card.blade.php:73,75` | Badge kategori menggunakan hex + alpha suffix `20` (`style="background-color: {{ $color }}20; color: {{ $color }};"`) |

#### C. Audit Kontras Warna WCAG 2.1 AA (Berdasarkan Skill `antislop-human`)
| Pasangan Warna (Teks di atas Background) | Mode | Rasio Kontras | Standar WCAG AA (Normal ≥ 4.5:1, Large ≥ 3.0:1) | Status |
|---|---|---|---|---|
| `--text-main` (`#1E293B`) di atas `--bg-main` (`#F4F6F9`) | Light | **13.62 : 1** | Lulus AA & AAA | ✅ PASS |
| `--text-main` (`#1E293B`) di atas `--card-bg` (`#FFFFFF`) | Light | **14.68 : 1** | Lulus AA & AAA | ✅ PASS |
| `--text-muted` (`#64748B`) di atas `--card-bg` (`#FFFFFF`) | Light | **4.88 : 1** | Lulus AA Normal Text | ✅ PASS |
| `--text-muted` (`#64748B`) di atas `--bg-main` (`#F4F6F9`) | Light | **4.49 : 1** | Ambang batas bawah Normal Text (4.5:1) | ⚠️ BORDERLINE |
| `--text-main` (`#F8FAFC`) di atas `--bg-main` (`#080C14`) | Dark | **18.36 : 1** | Lulus AA & AAA | ✅ PASS |
| `--text-main` (`#F8FAFC`) di atas `--card-bg` (`#172033`) | Dark | **15.54 : 1** | Lulus AA & AAA | ✅ PASS |
| `--text-muted` (`#94A3B8`) di atas `--card-bg` (`#172033`) | Dark | **6.45 : 1** | Lulus AA Normal Text | ✅ PASS |
| `--text-sidebar-muted` (`#64748B`) di atas `--sidebar-bg` (`#0F1626`) | Dark | **3.67 : 1** | Gagal untuk teks kecil (`text-xs` 12px) di sidebar | ⚠️ FAIL AA Normal |
| Teks tombol `.btn-primary` (`#FFFFFF`) di atas `--accent-vivid` (`#2563EB`) | Light | **5.17 : 1** | Lulus AA Normal Text | ✅ PASS |
| Teks tombol `.btn-primary` (`#FFFFFF`) di atas `--accent-vivid` (`#38BDF8`) | Dark | **2.15 : 1** | Gagal WCAG AA (putih di atas biru langit terang) | ⚠️ FAIL AA (`antislop` R-25) |
| Teks tombol Sign In/Up (`#0F172A`) di atas `#38BDF8` (`login.blade.php:126`) | Dark (Auth) | **9.27 : 1** | Lulus AA & AAA | ✅ PASS |

---

### 1.2 Tipografi

- **Font Family Utama**: `'Inter'`, dimuat dari Google Fonts CDN (`https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap`) pada:
  - `resources/views/layouts/app.blade.php:21-24`
  - `resources/views/auth/login.blade.php:9-12`
  - `resources/views/auth/register.blade.php:9-12`
- **Deklarasi CSS (`resources/css/app.css:67-68, 98`)**:
  ```css
  --font-sans: 'Inter', ui-sans-serif, system-ui, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji';
  ```
- **Font Weights yang Digunakan di View**:
  - `font-medium` (`500`): item navigasi sidebar (`sidebar.blade.php:23`), label form auth (`login.blade.php:85`), tombol submit auth (`login.blade.php:125`), flash message (`layouts/app.blade.php:48`).
  - `font-semibold` (`600`): judul task card (`task-card.blade.php:30`), tombol CTA utama (`navbar.blade.php:45,57`), label form modal (`add-task-modal.blade.php:38`), heading seksi sidebar (`sidebar.blade.php:20`), judul card login/register (`login.blade.php:50`).
  - `font-bold` (`700`): judul halaman `h1` (`dashboard.blade.php:10`), angka statistik `text-3xl` (`dashboard.blade.php:29`), judul seksi `h2` (`dashboard.blade.php:82,147,178`), logo `TaskFlow` (`navbar.blade.php:25`), badge status `Overdue`/`Reminder`/`Done` (`task-card.blade.php:43,47,56`).
  - *(Catatan: weight `300`, `400`, dan `800` ikut diunduh dari Google Fonts namun class `font-light` dan `font-extrabold` tidak pernah dipakai di view).*

#### Tabel Skala Ukuran Font (Typography Scale)
| Class Tailwind | Ukuran (px / rem) | Line-Height Default Tailwind | Tracking / Transform | Lokasi & Penggunaan |
|---|---|---|---|---|
| `text-[10px]` | `10px` (`0.625rem`) | `1.4` | Normal | Badge counter merah di bell navbar (`navbar.blade.php:76`), badge `🔴 Overdue`, `⚠️ Reminder`, tombol `Done` di task card (`task-card.blade.php:43,47,56`), badge kategori & jam di Upcoming Deadline (`dashboard.blade.php:110,121,128`), item dropdown notifikasi (`app.js:283,284`) |
| `text-xs` | `12px` (`0.75rem`) | `1rem` (`16px`) | `uppercase tracking-wider` pada label seksi sidebar (`sidebar.blade.php:20,81`); normal pada lainnya | Subteks sidebar (`sidebar.blade.php:15`), deskripsi task card (`task-card.blade.php:67`), badge kategori & tanggal di task card (`task-card.blade.php:72,80,89`), label kartu statistik (`dashboard.blade.php:27,30`), link `View All →` (`dashboard.blade.php:154,185`), pesan error form (`register.blade.php:89`) |
| `text-sm` | `14px` (`0.875rem`) | `1.25rem` (`20px`) | Normal | Ukuran teks dominan: item navigasi sidebar (`sidebar.blade.php:23`), input & tombol navbar (`navbar.blade.php:39,45`), judul task card `h3` (`task-card.blade.php:30`), seluruh label & input form modal/kategori/auth, subjudul halaman (`dashboard.blade.php:11`), baris info di Settings (`settings.blade.php:40-53`) |
| `text-base` | `16px` (`1rem`) | `1.5rem` (`24px`) | Normal | Judul modal di layar mobile (`add-task-modal.blade.php:11`, `edit-task-modal.blade.php:8`), judul mini-modal kategori (`add-task-modal.blade.php:169`), sub-heading seksi di halaman Notification Center (`notifications/index.blade.php:23,41,62`) |
| `text-lg` | `18px` (`1.125rem`) | `1.75rem` (`28px`) | Normal | Judul modal di layar `sm:` ke atas (`add-task-modal.blade.php:11`), judul seksi card di Dashboard (`Upcoming Deadline`, `Today's Tasks`, `Recent Tasks` — `dashboard.blade.php:82,147,178`), judul seksi di Settings (`settings.blade.php:22,37,60`), judul empty state (`tasks/index.blade.php:58`) |
| `text-xl` | `20px` (`1.25rem`) | `1.75rem` (`28px`) | Normal | Teks logo `TaskFlow` di navbar (`navbar.blade.php:25`), sub-judul kartu auth `Welcome back` / `Create your account` (`login.blade.php:50`, `register.blade.php:50`) |
| `text-2xl` | `24px` (`1.5rem`) | `2rem` (`32px`) | Normal | Judul utama `<h1>` di semua halaman dashboard/app (`dashboard.blade.php:10`, `tasks/index.blade.php:10`, `tasks/today.blade.php:9`, `tasks/important.blade.php:9`, `tasks/completed.blade.php:9`, `categories/index.blade.php:9`, `notifications/index.blade.php:10`, `settings.blade.php:8`), serta inisial avatar besar di Settings (`settings.blade.php:24`) |
| `text-3xl` | `30px` (`1.875rem`) | `2.25rem` (`36px`) | Normal | Angka utama pada 4 kartu statistik Dashboard (`dashboard.blade.php:29,44,59,74`) dan teks logo `TaskFlow` di halaman Login & Register (`login.blade.php:41`, `register.blade.php:41`) |

---

### 1.3 Spacing & Sizing

| Elemen / Area | Nilai Class Tailwind / CSS | Ukuran Eksak | Lokasi File + Baris |
|---|---|---|---|
| **Tinggi Navbar Desktop** | `min-h-[4rem] py-3 px-2 sm:px-4` | Min tinggi `64px` (`4rem`) pada desktop `lg:`; pada mobile membungkus (wrap) menjadi 2–3 baris (~`140px–176px`) | `components/navbar.blade.php:3` |
| **Offset Top Kontainer Utama** | `pt-44 lg:pt-16` | Mobile/Tablet (`< 1024px`): `176px` (`11rem`); Desktop (`>= 1024px`): `64px` (`4rem`) | `layouts/app.blade.php:33` |
| **Lebar & Posisi Sidebar** | `fixed left-0 top-16 bottom-0 w-64 p-4` | Lebar `256px` (`16rem`), offset atas `64px` (`4rem`), padding dalam `16px` (`1rem`) | `components/sidebar.blade.php:2-3` |
| **Margin Kiri & Padding `<main>`** | `ml-0 lg:ml-64 p-4 md:p-6 lg:p-8 min-h-[calc(100vh-4rem)]` | Margin kiri `0` (`<1024px`) / `256px` (`>=1024px`); Padding `16px` (mobile) → `24px` (`md:`) → `32px` (`lg:`) | `layouts/app.blade.php:38` |
| **Jarak Vertikal Antar Seksi Halaman** | `space-y-6` | `24px` (`1.5rem`) antar blok utama di setiap halaman | `dashboard.blade.php:6`, `tasks/index.blade.php:6`, dll. |
| **Ukuran Kartu Statistik (Dashboard)** | `w-[220px] md:w-auto p-5` + container `gap-4` | Lebar tetap `220px` di mobile carousel (`<768px`), lebar otomatis di grid `md:grid-cols-2 xl:grid-cols-4`, padding `20px` (`1.25rem`), gap `16px` | `dashboard.blade.php:17-77` |
| **Padding & Gap Task Card** | `p-4` (`16px`), internal flex `gap-3` (`12px`), grid halaman `gap-4` (`16px`) or list `space-y-3` (`12px`) | Padding `16px` di semua sisi | `components/task-card.blade.php:15-16` |
| **Padding Section Card (Dashboard / Notifications / Categories)** | `p-5` (`20px`) pada Dashboard, Categories, Notifications; `p-6` (`24px`) pada Settings; `p-8` (`32px`) pada Login/Register card | `20px` / `24px` / `32px` | `dashboard.blade.php:80,145,176`, `settings.blade.php:21,36,59`, `auth/login.blade.php:48` |
| **Ukuran Modal Utama (Add / Edit Task)** | Wrapper `p-3 sm:p-4 w-[95%] sm:w-full max-w-2xl max-h-[90vh]` | Lebar maks `672px` (`42rem`), tinggi maks `90vh`, header `p-4 sm:p-5`, body `p-4 sm:p-5 space-y-4`, footer `p-4 gap-3` | `components/add-task-modal.blade.php:6-126`, `components/edit-task-modal.blade.php:4-121` |
| **Ukuran Mini-Modal Kategori** | `width: calc(100% - 3rem); max-width: 480px;` | Header `px-7 pt-6 pb-5`, body `px-7 py-6`, footer `px-7 pb-7 pt-1 gap-3` | `components/add-task-modal.blade.php:153-243` |
| **Tap Target Minimum Kontrol Interaktif** | `min-h-[44px]` (dan `min-w-[44px]` pada tombol ikon) | `44px × 44px` pada input/tombol navbar & modal; ⚠️ namun tombol aksi di `task-card.blade.php:102,113,126` hanya `p-1.5` (`28px × 28px`) | `navbar.blade.php:39,45,57,67,112,128`, `task-card.blade.php:102-132` |

---

### 1.4 Border & Radius

| Elemen | Class / Nilai CSS | Radius / Ketebalan Eksak | Lokasi File + Baris |
|---|---|---|---|
| **Scrollbar Thumb** | `border-radius: 3px;` | `3px` (lebar scrollbar `6px`) | `resources/css/app.css:104, 111` |
| **Checkbox Remember Me (Login)** | `rounded` | `4px` (`0.25rem`) | `auth/login.blade.php:120` |
| **Custom Checkbox (`Mark as Important`)** | `.custom-checkbox` (`border: 2px solid var(--border-custom); border-radius: 6px;`) | `6px`, ukuran `20px × 20px` | `resources/css/app.css:188-202` |
| **Tombol Quick Done** | `rounded` (`4px` di dropdown notifikasi) / `rounded-md` (`6px` di task card & upcoming deadline) | `4px` / `6px` | `app.js:284`, `task-card.blade.php:56`, `dashboard.blade.php:128` |
| **Input, Select, Textarea, Tombol Utama, Item Sidebar, User Dropdown, Flash Message** | `rounded-lg` | `8px` (`0.5rem`) | `navbar.blade.php:39,45,139`, `sidebar.blade.php:23`, `layouts/app.blade.php:41,61` |
| **Sidebar Active Indicator** | `.sidebar-link.active { border-left: 3px solid var(--accent-vivid); }` | Border kiri `3px solid` (transparan saat tidak aktif) | `resources/css/app.css:121, 126` |
| **Task Card, Stats Card, Section Container, Add/Edit Task Modal, Notification Dropdown, Login/Register Card** | `rounded-xl` | `12px` (`0.75rem`), border `1px solid var(--border-custom)` (atau `border-2` pada task card `overdue` & `reminder`) | `task-card.blade.php:9-15`, `dashboard.blade.php:19,80`, `add-task-modal.blade.php:7,199` |
| **Add Category Mini-Modal Panel** | `rounded-2xl` | `16px` (`1rem`) | `components/add-task-modal.blade.php:165` |
| **Task Complete Checkbox, Avatar User, Status Pill, Category Pill, Progress Bar** | `rounded-full` / `border-radius: 50%` (`.task-checkbox`) | `9999px` / `50%` lingkaran penuh | `resources/css/app.css:219`, `navbar.blade.php:76,129`, `task-card.blade.php:43,47,72`, `categories/index.blade.php:76-78` |

---

### 1.5 Shadow & Effect

| Nama Token / Class | Nilai CSS Eksak | Lokasi & Penggunaan |
|---|---|---|
| `--shadow-premium` | Light: `0 4px 20px rgba(15, 45, 87, 0.05)`<br>Dark: `0 4px 20px rgba(0, 0, 0, 0.4)` | Diterapkan pada `.task-card` (`app.css:143`) dan `.stats-card` (`app.css:174`) |
| `--shadow-card-hover` | Light: `0 10px 30px rgba(15, 45, 87, 0.08)`<br>Dark: `0 10px 30px rgba(56, 189, 248, 0.15)` | Diterapkan pada `.task-card:hover` (`app.css:166`) dan `.stats-card:hover` (`app.css:178`) |
| Checkbox Checked Glow | `box-shadow: 0 0 10px var(--accent-light);` | `.custom-checkbox:checked` (`app.css:210`) dan `.task-checkbox:checked` (`app.css:231`) |
| `.btn-primary:hover` Glow | `box-shadow: 0 0 20px var(--accent-light);` | Hover pada semua tombol dengan class `.btn-primary` (`app.css:243`) |
| `shadow-sm` | Tailwind default `0 1px 2px 0 rgb(0 0 0 / 0.05)` | Container seksi di Dashboard, Categories, Notifications, Settings, serta avatar kecil di navbar |
| `shadow-md` | Tailwind default `0 4px 6px -1px rgb(0 0 0 / 0.1)` | Tombol `Add Task` / `Create Task`, avatar di Settings, dan `.task-card` berstatus `reminder` (`task-card.blade.php:10`) |
| `shadow-xl` | Tailwind default `0 20px 25px -5px rgb(0 0 0 / 0.1)` | Menu dropdown user (`navbar.blade.php:139`) |
| `shadow-2xl` | Tailwind default `0 25px 50px -12px rgb(0 0 0 / 0.25)` | Modal Add Task (`add-task-modal.blade.php:7`), Edit Task (`edit-task-modal.blade.php:5`), Mini-Modal Kategori (`add-task-modal.blade.php:165`), Dropdown Notifikasi (`navbar.blade.php:83`), Toast Deadline (`app.js:135`), serta inline di Login/Register card (`0 25px 50px -12px rgba(0, 0, 0, 0.5)`) |
| **Backdrop Blur** | `backdrop-blur-xs` (`#sidebar-backdrop` di `sidebar.blade.php:114`), `backdrop-blur-sm` (`#edit-modal-backdrop` di `app.js:106`), `backdrop-filter: blur(3px)` (`#add-cat-overlay` di `add-task-modal.blade.php:145`), `backdrop-filter: blur(8px)` (`.modal-backdrop` di `app.css:253` — tidak dipakai di HTML) | Efek buram pada latar belakang overlay drawer dan modal |
| **Radial Gradient Orbs (Auth)** | `background: radial-gradient(circle, #38BDF8, transparent);` pada 2 div `w-80 h-80 rounded-full opacity-10` di `-top-40 -right-40` dan `-bottom-40 -left-40` | Elemen dekoratif latar belakang halaman Login (`auth/login.blade.php:20-25`) & Register (`auth/register.blade.php:20-25`) |

---

### 1.6 Animasi & Transisi

| Nama Class / Keyframe | Properti, Durasi, Easing & Trigger | Lokasi File + Baris | Status Pemakaian |
|---|---|---|---|
| **Body Theme Transition** | `transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;` saat class `.dark` di `<html>` berubah | `resources/css/app.css:99` | Aktif global |
| **`.sidebar-link`** | `transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);` | `resources/css/app.css:125` | Aktif di `sidebar.blade.php` |
| **`.task-card` & `::after` Shimmer Sweep** | Card: `transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);` → saat hover: `transform: translateY(-3px) scale(1.01); border-color: var(--accent-vivid);`<br>Pseudo `::after`: `linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)` bergeser dari `translateX(-100%)` ke `translateX(100%)` selama `0.6s ease` saat hover | `resources/css/app.css:140-168` | Aktif di `task-card.blade.php:15` dan kartu kategori `categories/index.blade.php:55` |
| **`.stats-card`** | `transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);` → saat hover: `transform: translateY(-4px); box-shadow: var(--shadow-card-hover); border-color: var(--accent-vivid);` | `resources/css/app.css:171-180` | Aktif di 4 kartu statistik `dashboard.blade.php:19,34,49,64` |
| **`.custom-checkbox` & `.task-checkbox`** | `transition: all 0.25s ease;` → saat hover: `border-color: var(--accent-vivid); transform: scale(1.08);` | `resources/css/app.css:197,221,233-236` | Aktif di `task-card.blade.php:22`, `add-task-modal.blade.php:89`, `edit-task-modal.blade.php:86` |
| **`.btn-primary` & Active Feedback** | `.btn-primary`: `transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);` → hover: `translateY(-1px)` + glow.<br>Global `button:active, a.btn-primary:active`: `transform: scale(0.96) !important;` | `resources/css/app.css:239-248, 304-306` | Aktif di seluruh `<button>` dan `.btn-primary` |
| **`@keyframes fadeIn` (`.fade-in`)** | `from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); }` selama `0.3s ease forwards` | `resources/css/app.css:258-264` | Aktif di flash message (`layouts/app.blade.php:41,61`), `.task-card` (`task-card.blade.php:15`), logo & card Login/Register (`login.blade.php:29,48`, `register.blade.php:29,48`) |
| **`@keyframes slideInLeft` (`.slide-in-left`)** | `from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); }` selama `0.3s ease forwards` | `resources/css/app.css:267-273` | ⚠️ **Tidak terpakai (Dead CSS)** |
| **`.theme-icon-transition`** | `transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);` → saat hover: `transform: rotate(45deg) scale(1.1);` | `resources/css/app.css:276-281` | Aktif pada tombol toggle tema di `navbar.blade.php:112` |
| **`@keyframes skeletonPulse` (`.skeleton`)** | `0%, 100% { opacity: 1; } 50% { opacity: 0.4; }` selama `1.5s ease-in-out infinite` | `resources/css/app.css:293-301` | ⚠️ **Tidak terpakai (Dead CSS)** |
| **Tailwind `animate-pulse`** | Animasi pulse bawaan Tailwind | `navbar.blade.php:76` (badge merah notifikasi), `task-card.blade.php:47` (badge `⚠️ Reminder`), `dashboard.blade.php:104` (kartu Upcoming Deadline yang masuk waktu reminder) | Aktif |
| **Tailwind `animate-ping`** | Animasi ping memancar bawaan Tailwind | `app.js:274` & `notifications/index.blade.php:24` (titik merah di samping judul `🔴 Deadline Terlewat`) | Aktif |
| **Tailwind `animate-spin`** | Animasi putar spinner SVG `#save-cat-spinner` | `components/add-task-modal.blade.php:231` | Aktif saat tombol `Simpan` kategori sedang memproses request AJAX |
| **Progress Bar Kategori** | `transition-all duration-500` pada lebar bar (`width: min(tasks_count * 10, 100)%`) | `categories/index.blade.php:77-78` | Aktif |
| **`@keyframes fadeInAlert` & `fadeOutAlert`** | Masuk/keluar `translateY(-6px)` ↔ `translateY(0)` selama `0.4s` / `0.5s ease forwards` (auto-dismiss setelah `4000ms`) | Inline `<style>` di `auth/login.blade.php:143-163` | Aktif saat `session('register_success')` tersedia |

---

## 2. Breakpoint & Aturan Responsif

Proyek menggunakan breakpoint standar Tailwind CSS v4 (`sm: 640px`, `md: 768px`, `lg: 1024px`, `xl: 1280px`). Tidak ada `@media` query manual di `resources/css/app.css`.

| Komponen / Elemen | `< 640px` (Mobile Default) | `sm:` (`>= 640px`) | `md:` (`>= 768px`) | `lg:` (`>= 1024px`) | `xl:` (`>= 1280px`) |
|---|---|---|---|---|---|
| **Navbar Container** (`navbar.blade.php:3`) | `px-2 py-3 flex-wrap gap-y-3` (terbagi 2 baris: baris 1 Logo + Actions; baris 2 Search + Tombol Add Task) | `px-4` | Sama dengan `sm:` | `flex-nowrap gap-y-0` (1 baris penuh: Logo kiri `w-64`, Search tengah `flex-1 max-w-xl mx-8`, Actions kanan) | Sama dengan `lg:` |
| **Hamburger Button** (`navbar.blade.php:7`) | Tampil (`inline-flex`) | Tampil | Tampil | Disembunyikan (`lg:hidden`) | Disembunyikan |
| **Search Bar & Mobile Add Task** (`navbar.blade.php:30,45,57`) | `order-3 w-full flex-col gap-3` (Input search di atas, tombol `Add Task` `w-full` di bawahnya) | `sm:flex-row` (Input search `flex-1` berdampingan dengan tombol `Add Task` `sm:w-auto`) | Sama dengan `sm:` | `lg:order-2 lg:flex-1 lg:max-w-xl lg:mx-8`; tombol `Add Task` mobile `lg:hidden`, digantikan tombol `Add Task` desktop (`hidden lg:flex`) di grup kanan | Sama dengan `lg:` |
| **Notification Dropdown** (`navbar.blade.php:83`) | `w-[calc(100vw-2rem)] right-0` | `sm:w-80 max-w-sm sm:-right-4` | Sama dengan `sm:` | Sama dengan `sm:` | Sama dengan `sm:` |
| **User Profile Button** (`navbar.blade.php:128-135`) | Hanya lingkaran inisial `w-8 h-8` (`px-2`) | Tambah ikon chevron bawah (`hidden sm:block`, `sm:px-3`) | Tambah teks nama lengkap user (`hidden md:block`) | Sama dengan `md:` | Sama dengan `md:` |
| **Sidebar (`#sidebar-drawer`)** (`sidebar.blade.php:2`) | Off-canvas tersembunyi di kiri (`fixed top-16 bottom-0 w-64 -translate-x-full`), dibuka via JS dengan backdrop gelap `#sidebar-backdrop` | Sama dengan mobile | Sama dengan mobile | Permanen tampil di kiri (`lg:translate-x-0`), `#sidebar-backdrop` disembunyikan (`lg:hidden`) | Sama dengan `lg:` |
| **Wrapper & `<main>` Content** (`layouts/app.blade.php:33,38`) | Wrapper `pt-44` (`176px`); `<main>` `ml-0 p-4` (`16px`) | Sama dengan mobile | `<main>` `md:p-6` (`24px`) | Wrapper `lg:pt-16` (`64px`); `<main>` `lg:ml-64 lg:p-8` (`32px`) | Sama dengan `lg:` |
| **Dashboard Stats Cards** (`dashboard.blade.php:17-77`) | Carousel horizontal (`flex overflow-x-auto snap-x snap-mandatory gap-4 pb-3 scrollbar-none`), tiap kartu `w-[220px] flex-shrink-0 snap-start` | Sama dengan mobile | Berubah menjadi CSS Grid 2 kolom (`md:grid md:grid-cols-2 md:overflow-x-visible md:snap-none md:pb-0`), tiap kartu `md:w-auto` | Tetap 2 kolom | Grid 4 kolom (`xl:grid-cols-4`) |
| **Dashboard Upcoming Deadlines** (`dashboard.blade.php:99`) | Grid 1 kolom (`grid-cols-1 gap-3`) | Grid 2 kolom (`sm:grid-cols-2`) | Tetap 2 kolom | Grid 5 kolom (`lg:grid-cols-5`) | Tetap 5 kolom |
| **Dashboard Two-Column Lists (`Today's Tasks` & `Recent Tasks`)** (`dashboard.blade.php:143`) | Grid 1 kolom bertumpuk (`grid-cols-1 gap-6`) | Tetap 1 kolom | Tetap 1 kolom | Tetap 1 kolom | Grid 2 kolom berdampingan (`xl:grid-cols-2`) |
| **Grid Task Cards (`/tasks`, `/tasks/today`, `/tasks/important`, `/tasks/completed`, `/notifications`) & Grid Kategori (`/categories`)** | Grid 1 kolom (`grid-cols-1 gap-4`) | Tetap 1 kolom | Grid 2 kolom (`md:grid-cols-2`) | Grid 3 kolom (`lg:grid-cols-3`) | Tetap 3 kolom |
| **Form Modal Add/Edit Task** (`add-task-modal.blade.php:6,50,117`) | Wrapper `p-3 w-[95%]`; field `Due Date` & `Reminder Before` `grid-cols-1`; tombol footer `flex-col-reverse` (`w-full`, tombol Cancel di bawah Create Task) | Wrapper `sm:p-4 sm:w-full max-w-2xl`; tombol footer `sm:flex-row justify-end` (`sm:w-auto`) | Field `Due Date` & `Reminder Before` berdampingan 2 kolom (`md:grid-cols-2`) | Sama dengan `md:` | Sama dengan `md:` |

---

## 3. Layout Global

File sumber: `resources/views/layouts/app.blade.php` (baris 1–95).
Digunakan oleh **8 halaman** (`dashboard`, `tasks.index`, `tasks.today`, `tasks.important`, `tasks.completed`, `categories.index`, `notifications.index`, `settings`) melalui `@extends('layouts.app')`.
*(Halaman `auth/login.blade.php` dan `auth/register.blade.php` adalah dokumen HTML mandiri dan **tidak** menggunakan layout ini).*

### 3.1 Struktur Kerangka Global (Diagram ASCII)
```
+-----------------------------------------------------------------------------------+
| <html lang="en" class="[dark]">                                                   |
| <head>                                                                            |
|   - Meta CSRF token (<meta name="csrf-token">)                                    |
|   - <title>@yield('title', 'Dashboard') — TaskFlow</title>                        |
|   - Inline <script> deteksi tema awal (localStorage 'theme' / prefers-color)      |
|   - Google Fonts 'Inter' (300..800) + @vite(['app.css', 'app.js'])                |
| </head>                                                                           |
| <body class="min-h-screen bg-bg-main text-text-main font-sans antialiased         |
|              overflow-x-hidden">                                                  |
|                                                                                   |
| +-------------------------------------------------------------------------------+ |
| | FIXED NAVBAR (@include('components.navbar')) — z-50, top-0, min-h-[4rem]      | |
| | [Hamburger (lg:hidden)] [Logo TaskFlow] | [Search Form] | [+Add] [Bell] [🌙] [U]| |
| +-------------------------------------------------------------------------------+ |
|                                                                                   |
| <div class="flex pt-44 lg:pt-16">                                                 |
| +----------------------+ +------------------------------------------------------+ |
| | FIXED SIDEBAR        | | <main class="flex-1 w-full max-w-full min-w-0        | |
| | (@include('sidebar'))| |        ml-0 lg:ml-64 p-4 md:p-6 lg:p-8               | |
| | z-40, top-16, w-64   | |        min-h-[calc(100vh-4rem)]">                    | |
| | -translate-x-full    | |                                                      | |
| | lg:translate-x-0     | |  [Conditional: #flash-message (session('success'))]  | |
| |                      | |  [Conditional: Validation Errors ($errors->any())]   | |
| | - App Identity       | |                                                      | |
| | - MAIN MENU:         | |  +------------------------------------------------+  | |
| |   * Dashboard        | |  | @yield('content')                              |  | |
| |   * All Tasks        | |  | (Konten spesifik per halaman)                  |  | |
| |   * Notifications    | |  +------------------------------------------------+  | |
| |   * Today [badge]    | |                                                      | |
| |   * Important        | +------------------------------------------------------+ |
| |   * Completed        |                                                          |
| | - ORGANIZE:          |                                                          |
| |   * Categories       |                                                          |
| |   * Settings         |                                                          |
| | - Footer v1.0 © 2026 |                                                          |
| +----------------------+                                                          |
| [#sidebar-backdrop (fixed inset-0 z-30 bg-black/50 lg:hidden)]                    |
| </div>                                                                            |
|                                                                                   |
| [Global Modal 1: @include('components.add-task-modal') — z-[60]]                  |
|   └── [Portal ke <body> saat DOMContentLoaded: #add-category-mini-modal — z-9999] |
| [Global Modal 2: @include('components.edit-task-modal') — z-[60]]                 |
| [Inline <script>: Auto-hide #flash-message setelah 4000ms (fade opacity 0.5s)]    |
| [@stack('scripts'): Script drawer sidebar & script mini-modal kategori]           |
+-----------------------------------------------------------------------------------+
```

### 3.2 Detail Komponen Inline di `layouts/app.blade.php`
1. **Early Theme Initializer (`L12-L19`)**:
   Menjalankan pengecekan sinkron sebelum body dirender untuk mencegah FOUC (Flash of Unstyled Content):
   ```javascript
   if (localStorage.getItem('theme') === 'dark' || (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
       document.documentElement.classList.add('dark');
   } else {
       document.documentElement.classList.remove('dark');
   }
   ```
2. **Flash Message Sukses (`L40-L58`)**:
   - Muncul jika `session('success')` bernilai truthy.
   - Elemen: `<div id="flash-message" class="mb-4 p-4 rounded-lg border bg-success-custom/10 border-success-custom text-success-custom-500 flex items-center justify-between fade-in">`.
   - Berisi ikon centang bulat (`w-5 h-5 text-success-custom`), teks `<span class="text-success-custom font-medium">{{ session('success') }}</span>`, dan tombol close `×` (`onclick="document.getElementById('flash-message').remove()"`).
   - Otomatis menghilang setelah **4000ms** (`L82-L89`) dengan transisi `opacity 0.5s ease` lalu `.remove()` setelah 500ms.
3. **Banner Error Validasi Server (`L60-L68`)**:
   - Muncul jika `$errors->any()` bernilai true.
   - Elemen: `<div class="mb-4 p-4 rounded-lg border bg-danger-custom/10 border-danger-custom text-danger-custom flex flex-col fade-in">` berisi `<ul class="list-disc list-inside space-y-1 font-medium">` untuk setiap pesan `$error`.

---

## 4. Spesifikasi Komponen Reusable

### 4.1 Navbar (`resources/views/components/navbar.blade.php`)
- **File & Baris**: `resources/views/components/navbar.blade.php` (baris 1–170).
- **Props / Data yang Diterima**: Tidak menerima `@props` eksplisit. Mengakses state global Laravel: `request('search')` (`L38`), `Auth::user()->name` (`L130, 132, 141`), dan `Auth::user()->email` (`L142`).
- **Struktur DOM & Class**:
  - `<nav class="fixed top-0 left-0 right-0 z-50 w-full max-w-full border-b bg-navbar-bg border-border-custom/20 transition-colors duration-300">` (`L2`)
  - Inner container: `<div class="px-2 sm:px-4 py-3 min-h-[4rem] flex flex-wrap lg:flex-nowrap items-center justify-between gap-y-3 lg:gap-y-0">` (`L3`)
  - **Zona 1 — Kiri (`order-1 w-auto lg:w-64 flex items-center gap-1 sm:gap-3`, `L5-L27`)**:
    - Tombol Hamburger (`L7-L12`): `data-drawer-target="sidebar-drawer" data-drawer-toggle="sidebar-drawer"`, tampil hanya di `< 1024px` (`lg:hidden`).
    - Link Logo (`L14-L26`): Mengarah ke `route('dashboard')`, berisi ikon SVG kotak checklist `w-8 h-8` dengan warna `var(--accent-vivid)` dan teks `<span class="text-xl font-bold text-white">Task<span class="text-accent-vivid">Flow</span></span>`.
  - **Zona 2 — Tengah (`order-3 lg:order-2 w-full lg:flex-1 lg:max-w-xl lg:mx-8 flex flex-col sm:flex-row gap-3`, `L30-L51`)**:
    - Form Pencarian (`L31-L41`): `GET` ke `route('tasks.index')`, berisi `<input type="text" name="search" placeholder="Search tasks..." value="{{ request('search') }}">` dengan ikon kaca pembesar di kiri (`left-3`). Submit dilakukan dengan menekan tombol `Enter`.
    - Tombol `Add Task` Mobile/Tablet (`L44-L50`): `lg:hidden w-full sm:w-auto min-h-[44px]`, atribut Flowbite `data-modal-target="add-task-modal" data-modal-toggle="add-task-modal"`.
  - **Zona 3 — Kanan (`order-2 lg:order-3 flex items-center gap-0.5 sm:gap-2 ml-auto lg:ml-0`, `L54-L169`)**:
    - Tombol `Add Task` Desktop (`L56-L62`): `hidden lg:flex min-h-[44px]`, atribut `data-modal-target="add-task-modal" data-modal-toggle="add-task-modal"`.
    - **Notification Center Bell & Dropdown (`L65-L109`)**:
      - Trigger button `#notif-dropdown-btn` (`data-dropdown-toggle="notif-dropdown"`), berisi SVG lonceng putih `w-5 h-5` dan badge counter merah `<span id="notif-badge" class="hidden ... bg-red-500 ... animate-pulse"><span id="notif-badge-text">0</span></span>`.
      - Panel dropdown `#notif-dropdown` (`L82-L108`): lebar `w-[calc(100vw-2rem)] sm:w-80 max-w-sm`, memiliki header `"Notification Center"`, kontainer daftar `#notif-dropdown-list` (`max-h-80 overflow-y-auto`, default teks `"Loading notifications..."` yang diisi ulang oleh `renderNotificationDropdown()` di `app.js:265`), dan footer link `"View All Notifications →"` ke `route('notifications.index')`.
    - **Theme Toggle Button (`L112-L123`)**:
      - `<button onclick="toggleTheme()" class="... theme-icon-transition">`
      - Berisi 2 SVG: `.theme-sun-icon` (`text-amber-400`, tampil saat Dark Mode) dan `.theme-moon-icon` (`text-blue-200`, tampil saat Light Mode).
    - **User Profile Dropdown (`L126-L168`)**:
      - Trigger button `#user-dropdown-btn` (`data-dropdown-toggle="user-dropdown"`), menampilkan lingkaran avatar huruf pertama nama user (`strtoupper(substr(Auth::user()->name, 0, 1))`), nama lengkap (`hidden md:block`), dan ikon chevron bawah (`hidden sm:block`).
      - Panel `#user-dropdown` (`w-56 rounded-lg shadow-xl border bg-card-bg border-border-custom`): menampilkan nama + email (`truncate`), link ke `route('settings')` (`Settings`), dan form `POST` ke `route('logout')` dengan tombol merah `Logout` (`text-red-500 hover:bg-red-500/10`).
- **Dipakai di**: `resources/views/layouts/app.blade.php:31`.

---

### 4.2 Sidebar (`resources/views/components/sidebar.blade.php`)
- **File & Baris**: `resources/views/components/sidebar.blade.php` (baris 1–172).
- **Props / Data yang Diterima**: Tidak menerima `@props`. Menjalankan query Eloquent langsung di dalam template pada baris 56:
  ```php
  @php $todayCount = Auth::user()->tasks()->today()->pending()->count(); @endphp
  ```
  Serta memeriksa route aktif menggunakan `request()->routeIs(...)`.
- **Struktur DOM & Class**:
  - `<aside id="sidebar-drawer" aria-label="Sidebar" class="fixed left-0 top-16 bottom-0 z-40 w-64 border-r overflow-y-auto bg-sidebar-bg border-border-custom/20 transition-transform duration-300 -translate-x-full lg:translate-x-0">` (`L2`)
  - **Blok Identitas Aplikasi (`L5-L16`)**: Ikon SVG TaskFlow `w-5 h-5 text-accent-custom`, teks `TaskFlow` (`text-sm font-bold text-white` + `text-accent-custom`), dan subteks `Smart Task Management` (`text-xs pl-7 text-text-sidebar-muted`).
  - **Grup Navigasi 1 — `MAIN MENU` (`L19-L78`)**:
    1. **Dashboard** (`route('dashboard')`, aktif jika `request()->routeIs('dashboard')`) — ikon rumah.
    2. **All Tasks** (`route('tasks.index')`, aktif jika `request()->routeIs('tasks.index')`) — ikon clipboard list.
    3. **Notifications** (`route('notifications.index')`, aktif jika `request()->routeIs('notifications.index')`) — ikon lonceng.
    4. **Today** (`route('tasks.today')`, aktif jika `request()->routeIs('tasks.today')`) — ikon kalender + **conditional pill badge** di kanan (`ml-auto text-xs px-2 py-0.5 rounded-full font-semibold bg-accent-light text-text-sidebar-active`) yang hanya muncul jika `$todayCount > 0`.
    5. **Important** (`route('tasks.important')`, aktif jika `request()->routeIs('tasks.important')`) — ikon bintang.
    6. **Completed** (`route('tasks.completed')`, aktif jika `request()->routeIs('tasks.completed')`) — ikon lingkaran centang.
  - **Grup Navigasi 2 — `ORGANIZE` (`L80-L102`, dipisahkan oleh `pt-4 mt-4 border-t border-border-custom/20`)**:
    7. **Categories** (`route('categories.index')`, aktif jika `request()->routeIs('categories.*')`) — ikon folder.
    8. **Settings** (`route('settings')`, aktif jika `request()->routeIs('settings')`) — ikon roda gigi.
  - **Blok Footer Sidebar (`L106-L109`)**:
    - Kotak `mt-8 px-3 py-3 rounded-lg bg-white/5 border border-border-custom/10` berisi teks `TaskFlow v1.0` dan `© 2026 Smart Task Management`.
  - **Backdrop Drawer Mobile (`L114`)**:
    - `<div id="sidebar-backdrop" class="fixed inset-0 z-30 bg-black/50 backdrop-blur-xs transition-opacity duration-300 opacity-0 pointer-events-none lg:hidden"></div>`
  - **Inline Script (`@push('scripts')`, `L116-L172`)**: Mengatur fungsi `openDrawer()` dan `closeDrawer()` pada layar `< 1024px`.
- **Variasi State `.sidebar-link` (`resources/css/app.css:118-137`)**:
  - **Default**: `border-left: 3px solid transparent; color: var(--text-sidebar);`
  - **Hover**: Light mode `background-color: rgba(255, 255, 255, 0.05)`, Dark mode `background-color: rgba(56, 189, 248, 0.05)`, teks menjadi `var(--text-sidebar-active)`.
  - **Active (`.sidebar-link.active`)**: `background-color: var(--sidebar-active-bg); color: var(--text-sidebar-active); border-left: 3px solid var(--accent-vivid);`
- **Dipakai di**: `resources/views/layouts/app.blade.php:35`.

---

### 4.3 Task Card (`resources/views/components/task-card.blade.php`)
- **File & Baris**: `resources/views/components/task-card.blade.php` (baris 1–135).
- **Props yang Diterima**: `@props(['task'])` — instance model `App\Models\Task` (beserta relasi opsional `$task->category` dan accessor `$task->deadline_status`, `$task->human_time_remaining`).
- **4 Variasi Visual Berdasarkan `$task->deadline_status` (`L4-L13`)**:
  | Nilai `$task->deadline_status` | Kondisi di `Task.php:66-86` | Class Container Kartu (`$cardClasses`) | Elemen Tambahan di Kartu |
  |---|---|---|---|
  | `'completed'` | `$task->is_completed === true` | `border border-emerald-500/50 bg-emerald-500/5 dark:bg-emerald-950/20` | Judul diberi `line-through opacity-50`; tombol `Done` hijau disembunyikan; tampil label `Done {{ $task->completed_at->diffForHumans() }}` (`text-success-custom`) |
  | `'overdue'` | Belum selesai & `now()->greaterThan($task->due_date)` | `border-2 border-red-500/70 bg-red-500/10 dark:bg-red-950/30` | Muncul badge `🔴 Overdue` (`bg-red-500/20 text-red-500 border-red-500/30`); teks tanggal berwarna `text-red-500 font-bold` |
  | `'reminder'` | Belum selesai, belum lewat deadline, & `now()->greaterThanOrEqualTo($task->reminder_time)` | `border-2 border-amber-500/70 bg-amber-500/10 dark:bg-amber-950/30 shadow-md` | Muncul badge berkedip `⚠️ Reminder ({{ $task->human_time_remaining }})` (`bg-amber-500/20 text-amber-500 border-amber-500/30 animate-pulse`); teks tanggal `text-amber-500 font-bold` |
  | `'upcoming'` / `'no_deadline'` (default) | Belum masuk waktu reminder atau `due_date === null` | `border border-border-custom bg-card-bg` | Tampilan standar; teks tanggal `text-text-muted` |

- **Struktur Internal Kartu (`L15-L134`)**:
  1. **Kolom Kiri — Checkbox Bulat (`L18-L25`)**:
     - Form `PATCH` ke `route('tasks.toggle-complete', $task)` berisi `<input type="checkbox" class="task-checkbox" {{ $task->is_completed ? 'checked' : '' }} onclick="this.closest('form').submit()" readonly>`.
  2. **Kolom Tengah — Konten Tugas (`flex-1 min-w-0`, `L28-L97`)**:
     - **Baris Header (`L29-L64`)**:
       - Judul `<h3>` (`text-sm font-semibold truncate text-text-main`).
       - Ikon bintang kuning `w-4 h-4 text-amber-500` jika `$task->is_important` true (`L34-L39`).
       - Badge status `🔴 Overdue` atau `⚠️ Reminder (...)` (`L42-L50`).
       - Tombol cepat `✓ Done` (`L52-L63`, form `PATCH` ke `tasks.toggle-complete`) jika `!$task->is_completed`.
     - **Baris Deskripsi (`L66-L68`)**:
       - Jika `$task->description` ada, tampil `<p class="text-xs mb-2 line-clamp-2 text-text-muted">`.
     - **Baris Metadata Footer (`L70-L96`)**:
       - Pill Kategori (`L71-L78`): jika `$task->category` ada, tampil pill `rounded-full` dengan titik bulat `w-1.5 h-1.5` dan warna inline `style="background-color: {{ $task->category->color }}20; color: {{ $task->category->color }};"`.
       - Tanggal Deadline (`L79-L87`): jika `$task->due_date` ada, tampil ikon kalender `w-3.5 h-3.5` + format `M d, Y, H:i` (contoh: `Oct 13, 2026, 14:30`).
       - Waktu Selesai (`L88-L95`): jika `$task->is_completed && $task->completed_at`, tampil ikon centang + `Done {{ $task->completed_at->diffForHumans() }}`.
  3. **Kolom Kanan — 3 Tombol Aksi (`flex items-center gap-0.5`, `L100-L133`)**:
     - **Edit Button (`L102-L107`)**: `<button onclick="openEditModal({{ json_encode($task) }})">` dengan ikon pensil (`hover:text-accent-vivid`).
     - **Toggle Important Button (`L110-L119`)**: Form `PATCH` ke `route('tasks.toggle-important', $task)` dengan ikon bintang (`text-amber-500 fill-current` saat aktif).
     - **Delete Button (`L122-L132`)**: Form `DELETE` ke `route('tasks.destroy', $task)` dengan `onsubmit="return confirm('Delete this task?')"` dan ikon tempat sampah merah (`text-danger-custom hover:bg-red-500/10`).
- **Dipakai di 6 Halaman**:
  - `resources/views/dashboard.blade.php:169, 207`
  - `resources/views/tasks/index.blade.php:71`
  - `resources/views/tasks/today.blade.php:36`
  - `resources/views/tasks/important.blade.php:36`
  - `resources/views/tasks/completed.blade.php:36`
  - `resources/views/notifications/index.blade.php:33, 54, 75`

---

### 4.4 Add Task Modal & Add Category Mini-Modal (`resources/views/components/add-task-modal.blade.php`)
- **File & Baris**: `resources/views/components/add-task-modal.blade.php` (baris 1–522).
- **Props / Data yang Diterima**: Tidak menerima `@props`. Mengambil daftar kategori langsung di template via `Auth::user()->categories ?? []` (`L80`).
- **Bagian A — Modal Utama `#add-task-modal` (`L4-L130`)**:
  - Dikontrol oleh Flowbite (`data-modal-target="add-task-modal"`, `data-modal-toggle="add-task-modal"`, `data-modal-hide="add-task-modal"`).
  - Form `POST` ke `route('tasks.store')` (`L31`).
  - **Daftar Field Input**:
    1. `title` (`#task-title`, `type="text"`, `required`, placeholder `"What needs to be done?"`).
    2. `description` (`#task-desc`, `<textarea rows="3">`, opsional, placeholder `"Add details about this task..."`).
    3. `due_date` (`#task-date`, `type="datetime-local"`, opsional, divalidasi real-time oleh `validateDeadlineInput()`).
    4. `reminder_before` (`#task-reminder`, `<select>`, opsi: `15m` `"15 Menit Sebelum"`, `30m` `"30 Menit Sebelum"`, `1h` `"1 Jam Sebelum"` [default `selected`], `3h` `"3 Jam Sebelum"`, `6h` `"6 Jam Sebelum"`, `12h` `"12 Jam Sebelum"`, `24h` `"1 Hari Sebelum"`).
    5. `category_id` (`#task-category`, `<select>`, opsi default `""` `"No Category"`, diikuti seluruh kategori user, dan diakhiri opsi khusus `<option value="__new__">➕ Tambah Kategori Baru</option>` pada `L83`).
    6. `is_important` (`#task-important`, `type="checkbox" value="1" class="custom-checkbox"`, label `"Mark as Important"` dengan ikon bintang kuning).
  - **Alert Validasi Deadline Inline (`#add-task-deadline-alert`, `L101-L113`)**:
    - Default `hidden`. Muncul otomatis jika user memilih `due_date <= now()`. Menampilkan pesan `"⚠ Deadline tidak valid. Silakan pilih tanggal dan jam yang lebih besar dari waktu saat ini."` dan menonaktifkan tombol `#add-task-submit-btn`.
- **Bagian B — Sub-Komponen `#add-category-mini-modal` (`L137-L244`) + Script IIFE (`L246-L522`)**:
  - Saat DOM siap (`DOMContentLoaded`), elemen `#add-category-mini-modal` dipindahkan langsung ke `document.body` (`document.body.appendChild(miniModal)` pada `L258`) dengan `z-index: 9998` (overlay) dan `z-index: 9999` (panel) agar berada di atas modal Flowbite (`z-[60]`).
  - Saat user memilih opsi `➕ Tambah Kategori Baru` (`value="__new__"`), nilai select di-reset ke `""` dan `openAddCategoryModal()` dipanggil (`L264-L268`).
  - Berisi input `#new-category-name` (placeholder `"Contoh: Study, Work, Personal..."`, `maxlength="255"`), elemen error `#new-category-error`, tombol `"Batal"`, dan tombol `"Simpan"` (`#save-category-btn`) dengan spinner `#save-cat-spinner`.
- **Dipakai di**: `resources/views/layouts/app.blade.php:75`.

---

### 4.5 Edit Task Modal (`resources/views/components/edit-task-modal.blade.php`)
- **File & Baris**: `resources/views/components/edit-task-modal.blade.php` (baris 1–126).
- **Props / Data yang Diterima**: Tidak menerima `@props`. Mengambil daftar kategori via `Auth::user()->categories ?? []` (`L78`). Nilai form diisi secara dinamis oleh fungsi JS `window.openEditModal(task)` (`resources/js/app.js:32-110`).
- **Struktur & Perbedaan dengan Add Task Modal**:
  - Menggunakan `<form action="" method="POST">` dengan `@csrf` dan `@method('PUT')` (`L28-L30`). Atribut `action` diubah oleh JS menjadi `/tasks/${task.id}` (`app.js:39`).
  - Dikontrol secara manual via fungsi JS `openEditModal(task)` dan `closeEditModal()` (bukan atribut `data-modal-*` Flowbite), serta membuat elemen backdrop `#edit-modal-backdrop` secara dinamis di `document.body` (`app.js:102-109`).
  - Memiliki 6 field yang sama (`#edit-task-title`, `#edit-task-description`, `#edit-task-due-date`, `#edit-task-reminder`, `#edit-task-category`, `#edit-task-important`), alert `#edit-task-deadline-alert`, dan tombol submit `#edit-task-submit-btn` (`Save Changes`).
  - ⚠️ **Perbedaan Penting**: Dropdown `#edit-task-category` (`L75-L81`) **tidak memiliki** opsi `<option value="__new__">➕ Tambah Kategori Baru</option>`.
- **Dipakai di**: `resources/views/layouts/app.blade.php:78`.

---

## 5. Spesifikasi Per Halaman

### 5.1 Dashboard (`/dashboard`)
- **Route**: `GET /dashboard` → `DashboardController@index` (`name('dashboard')`, `routes/web.php:27`).
- **File View**: `resources/views/dashboard.blade.php` (baris 1–214).
- **Layout yang Dipakai**: `@extends('layouts.app')`, `@section('title', 'Dashboard')`.
- **Data dari Controller (`DashboardController.php:12-49`)**:
  - `$stats`: array `['total' => int, 'today' => int, 'important' => int, 'completed' => int]`.
  - `$todayTasks`: koleksi tugas jatuh tempo hari ini (`due_date` hari ini, diurutkan `is_completed ASC`, `is_important DESC`, `created_at DESC`).
  - `$recentTasks`: 10 tugas terbaru milik user (`with('category')->latest()->take(10)`).
  - `$upcomingDeadlines`: maks 5 tugas belum selesai yang memiliki `due_date >= now()`, diurutkan berdasarkan `due_date ASC`.
- **Struktur Visual (Atas ke Bawah)**:
  1. **Welcome Header (`L8-L14`)**:
     - Kiri: `<h1 class="text-2xl font-bold text-text-main">Welcome back, {{ Auth::user()->name }}! 👋</h1>` + subteks `"Here's an overview of your tasks for today."`
     - Kanan: Tanggal hari ini dengan format `{{ now()->format('l, F j, Y') }}` (contoh: `Tuesday, October 13, 2026`).
  2. **4 Kartu Statistik (`L17-L77`)**:
     - Mobile: horizontal scroll-snap carousel (`w-[220px]` per kartu); Tablet `md:`: grid 2 kolom; Desktop `xl:`: grid 4 kolom.
     - Kartu 1: **Total Tasks** (`$stats['total']`, badge `"All"`, warna `accent-vivid` / `accent-light`).
     - Kartu 2: **Due Today** (`$stats['today']`, badge `"Today"`, warna `amber-500`).
     - Kartu 3: **Important Tasks** (`$stats['important']`, badge `"Priority"`, warna `danger-custom`).
     - Kartu 4: **Completed** (`$stats['completed']`, badge `"Done"`, warna `success-custom`).
  3. **Seksi `Upcoming Deadline` (`L80-L140`)**:
     - Header: Ikon jam `amber-500` + judul `"Upcoming Deadline"` + keterangan kanan `"Maksimal 5 task terdekat"`.
     - **State Ada Data (`L99-L138`)**: Grid `grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3`. Setiap kartu menampilkan judul (`truncate`), pill kategori, sisa waktu (`$task->human_time_remaining`), jam deadline (`Jam: HH:mm`), dan tombol cepat `✓ Done`. Jika status tugas adalah `'reminder'`, kartu diberi `border-amber-500/60 bg-amber-500/10 dark:bg-amber-950/30 animate-pulse`.
     - **Empty State (`L94-L97`)**: Teks tengah `"Tidak ada deadline terdekat saat ini. ✨"`.
  4. **Grid 2 Kolom Bawah (`grid-cols-1 xl:grid-cols-2 gap-6`, `L143-L212`)**:
     - **Kolom Kiri — `Today's Tasks` (`L145-L173`)**:
       - Header dengan ikon kalender `amber-500` dan link `"View All →"` ke `route('tasks.today')`.
       - Menampilkan maksimal 5 item (`$todayTasks->take(5)`) menggunakan `@include('components.task-card')`.
       - **Empty State (`L157-L165`)**: Ikon lingkaran centang `w-12 h-12` + teks `"No tasks due today. Enjoy your day! 🎉"`.
     - **Kolom Kanan — `Recent Tasks` (`L176-L211`)**:
       - Header dengan ikon jam `accent-vivid` dan link `"View All →"` ke `route('tasks.index')`.
       - Menampilkan maksimal 5 item (`$recentTasks->take(5)`) menggunakan `@include('components.task-card')`.
       - **Empty State (`L188-L203`)**: Ikon clipboard `w-12 h-12` + teks `"No tasks yet. Get started by creating one!"` + tombol CTA `"Create Your First Task"` yang membuka `#add-task-modal`.

---

### 5.2 All Tasks (`/tasks`)
- **Route**: `GET /tasks` → `TaskController@index` (`name('tasks.index')`, `routes/web.php:30`).
- **File View**: `resources/views/tasks/index.blade.php` (baris 1–81).
- **Layout yang Dipakai**: `@extends('layouts.app')`, `@section('title', 'All Tasks')`.
- **Data dari Controller (`TaskController.php:12-38`)**:
  - `$tasks`: `LengthAwarePaginator` (12 item per halaman, difilter berdasarkan query `?search=...` dan `?category=...`, diurutkan `is_completed ASC`, `is_important DESC`, `created_at DESC`).
  - `$categories`: koleksi kategori milik user untuk dropdown filter.
- **Struktur Visual**:
  1. **Header (`L8-L26`)**: Judul `"All Tasks"` dengan ikon clipboard + subteks `"Manage all your tasks in one place"`, serta tombol kanan `"+ New Task"` (`data-modal-toggle="add-task-modal"`).
  2. **Bar Filter (`L29-L48`)**:
     - `<form method="GET" action="{{ route('tasks.index') }}">` berisi hidden input `search` (jika sedang mencari) dan `<select name="category" onchange="this.form.submit()">` dengan opsi `"All Categories"` diikuti daftar kategori user.
     - Tombol `"Clear Filters"` (`L43-L47`) muncul secara kondisional jika `request('search') || request('category')` aktif.
  3. **Daftar Tugas / Empty State (`L51-L79`)**:
     - **Ada Data (`L69-L78`)**: Grid `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4` merender `components.task-card`, diikuti blok pagination `{{ $tasks->appends(request()->query())->links() }}` (`L76-L78`).
     - **Empty State (`L51-L67`)**: Kartu `py-16` dengan ikon clipboard `w-16 h-16`, judul `"No tasks found"`, subteks `"Start by creating your first task!"`, dan tombol `"+ Create Task"`.

---

### 5.3 Today's Tasks (`/tasks/today`)
- **Route**: `GET /tasks/today` → `TaskController@today` (`name('tasks.today')`, `routes/web.php:31`).
- **File View**: `resources/views/tasks/today.blade.php` (baris 1–41).
- **Layout yang Dipakai**: `@extends('layouts.app')`, `@section('title', "Today's Tasks")`.
- **Struktur Visual**:
  1. **Header (`L7-L21`)**: Judul `"Today's Tasks"` dengan ikon kalender `text-amber-500`, subteks tanggal hari ini (`l, F j, Y`), dan pill badge kanan `{{ $tasks->where('is_completed', false)->count() }} pending` (`bg-amber-500/10 text-amber-500 border-amber-500/20`).
  2. **Konten (`L23-L39`)**:
     - **Ada Data**: Grid 3 kolom (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`) berisi `components.task-card` (tanpa pagination).
     - **Empty State**: Kartu `py-16` dengan ikon lingkaran centang `w-16 h-16`, judul `"All clear for today!"`, subteks `"No tasks are due today. Enjoy your free time! 🎉"`.

---

### 5.4 Important Tasks (`/tasks/important`)
- **Route**: `GET /tasks/important` → `TaskController@important` (`name('tasks.important')`, `routes/web.php:32`).
- **File View**: `resources/views/tasks/important.blade.php` (baris 1–41).
- **Layout yang Dipakai**: `@extends('layouts.app')`, `@section('title', 'Important Tasks')`.
- **Struktur Visual**:
  1. **Header (`L7-L21`)**: Judul `"Important Tasks"` dengan ikon bintang `text-amber-500`, subteks `"Your high-priority tasks"`, dan pill badge kanan `{{ $tasks->where('is_completed', false)->count() }} active` (`bg-danger-custom/10 text-danger-custom border-danger-custom/20`).
  2. **Konten (`L23-L39`)**:
     - **Ada Data**: Grid 3 kolom berisi `components.task-card`.
     - **Empty State**: Kartu `py-16` dengan ikon bintang outline `w-16 h-16`, judul `"No important tasks"`, subteks `"Star a task to mark it as important"`.

---

### 5.5 Completed Tasks (`/tasks/completed`)
- **Route**: `GET /tasks/completed` → `TaskController@completed` (`name('tasks.completed')`, `routes/web.php:33`).
- **File View**: `resources/views/tasks/completed.blade.php` (baris 1–41).
- **Layout yang Dipakai**: `@extends('layouts.app')`, `@section('title', 'Completed Tasks')`.
- **Struktur Visual**:
  1. **Header (`L7-L21`)**: Judul `"Completed Tasks"` dengan ikon lingkaran centang `text-success-custom`, subteks `"Tasks you've accomplished"`, dan pill badge kanan `{{ $tasks->count() }} completed` (`bg-success-custom/10 text-success-custom border-success-custom/20`).
  2. **Konten (`L23-L39`)**:
     - **Ada Data**: Grid 3 kolom berisi `components.task-card` (diurutkan berdasarkan `completed_at DESC` dari controller).
     - **Empty State**: Kartu `py-16` dengan ikon lingkaran centang `w-16 h-16`, judul `"No completed tasks yet"`, subteks `"Complete a task and it will show up here"`.

---

### 5.6 Categories (`/categories`)
- **Route**: `GET /categories` → `CategoryController@index` (`name('categories.index')`, `routes/web.php:48`).
- **File View**: `resources/views/categories/index.blade.php` (baris 1–86).
- **Layout yang Dipakai**: `@extends('layouts.app')`, `@section('title', 'Categories')`.
- **Struktur Visual**:
  1. **Header (`L7-L18`)**: Judul `"Categories"` dengan ikon folder `text-accent-vivid` + subteks `"Organize your tasks into categories"`.
  2. **Form `Create New Category` (`L21-L39`)**:
     - Kartu `rounded-xl border bg-card-bg border-border-custom p-5 shadow-sm`.
     - Form `POST` ke `route('categories.store')` dengan layout `flex items-end gap-3`:
       - Input `name` (`#cat-name`, `required`, placeholder `"e.g., Work, Personal..."`, `flex-1`).
       - Input warna `color` (`#cat-color`, `type="color" value="#2563EB"`, `w-12 h-9 rounded-lg`).
       - Tombol submit `"Add"` (`px-4 py-2 bg-accent-vivid text-white btn-primary`).
  3. **Grid Kategori (`L42-L84`)**:
     - **Ada Data (`L53-L83`)**: Grid `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`. Setiap kartu kategori (`rounded-xl p-5 bg-card-bg border border-border-custom task-card`) menampilkan:
       - Titik warna bulat `w-4 h-4 rounded-full` (`style="background-color: {{ $category->color }};"`) + nama kategori `h3.font-bold`.
       - Form `DELETE` ke `route('categories.destroy', $category)` dengan konfirmasi `confirm('Delete this category?')` dan tombol ikon tempat sampah merah.
       - Jumlah tugas: `{{ $category->tasks_count }} {{ Str::plural('task', $category->tasks_count) }}`.
       - Progress bar visual (`L76-L80`): track `h-1.5 rounded-full bg-bg-main` dengan fill bar berwarna `{{ $category->color }}` dan lebar `width: {{ min($category->tasks_count * 10, 100) }}%` (10% per tugas, mentok di 10 tugas = 100%).
     - **Empty State (`L42-L51`)**: Kartu `py-16` dengan ikon folder `w-16 h-16`, judul `"No categories yet"`, subteks `"Create your first category above to organize tasks"`.

---

### 5.7 Notifications (`/notifications`)
- **Route**: `GET /notifications` → `TaskController@notificationsPage` (`name('notifications.index')`, `routes/web.php:42`).
- **File View**: `resources/views/notifications/index.blade.php` (baris 1–82).
- **Layout yang Dipakai**: `@extends('layouts.app')`, `@section('title', 'Notification Center')`.
- **Data dari Controller (`TaskController.php:185-218`)**:
  - `$overdueTasks`: tugas belum selesai yang sudah melewati `due_date`.
  - `$todayTasks`: tugas belum selesai yang jatuh tempo hari ini (`due_date >= now()`).
  - `$upcomingTasks`: tugas belum selesai yang jatuh tempo setelah hari ini (`due_date > todayEnd`), dibatasi `limit(15)`.
- **Struktur Visual (3 Seksi Kartu Bertumpuk `space-y-6`)**:
  1. **Header (`L8-L19`)**: Judul `"Notification Center"` dengan ikon lonceng + subteks `"Overview of all active deadline reminders & overdue tasks"`.
  2. **Seksi 1 — `🔴 Deadline Terlewat ({{ $overdueTasks->count() }})` (`L22-L37`)**:
     - Heading `text-base font-bold text-red-500` dengan titik merah beranimasi `animate-ping`.
     - Jika kosong: `<p class="text-xs text-text-muted">Tidak ada deadline yang terlewat. Mantap! 🎉</p>`.
     - Jika ada: Grid 3 kolom (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`) merender `components.task-card`.
  3. **Seksi 2 — `📌 Deadline Hari Ini ({{ $todayTasks->count() }})` (`L40-L58`)**:
     - Heading `text-base font-bold text-amber-500` dengan ikon kalender.
     - Jika kosong: `<p class="text-xs text-text-muted">Tidak ada task yang perlu diselesaikan hari ini.</p>`.
     - Jika ada: Grid 3 kolom merender `components.task-card`.
  4. **Seksi 3 — `📅 Deadline Mendatang ({{ $upcomingTasks->count() }})` (`L61-L79`)**:
     - Heading `text-base font-bold text-accent-vivid` dengan ikon jam.
     - Jika kosong: `<p class="text-xs text-text-muted">Tidak ada task mendatang.</p>`.
     - Jika ada: Grid 3 kolom merender `components.task-card`.

---

### 5.8 Settings (`/settings`)
- **Route**: `GET /settings` → Closure di `routes/web.php:55` (`name('settings')`).
- **File View**: `resources/views/settings.blade.php` (baris 1–71).
- **Layout yang Dipakai**: `@extends('layouts.app')`, `@section('title', 'Settings')`.
- **Struktur Visual (Bersifat Read-Only Info + Tombol Sign Out)**:
  1. **Header (`L7-L18`)**: Judul `"Settings"` dengan ikon roda gigi + subteks `"Manage your account and preferences"`.
  2. **Kartu 1 — `Profile Information` (`L21-L33`)**:
     - Avatar lingkaran besar `w-16 h-16 rounded-full bg-accent-vivid text-white text-2xl font-bold` berisi huruf pertama nama user.
     - Menampilkan nama (`Auth::user()->name`), email (`Auth::user()->email`), dan `"Member since {{ Auth::user()->created_at->format('F Y') }}"`. *(Tidak ada form edit profil).*
  3. **Kartu 2 — `About TaskFlow` (`L36-L56`)**:
     - Tabel key-value 4 baris dengan border bawah:
       - `Version`: `1.0.0`
       - `Framework`: `Laravel 11` *(⚠️ hardcoded teks statis, lihat Bagian 8)*
       - `UI Framework`: `TailwindCSS v4 + Flowbite`
       - `Theme`: `Dynamic (Light & Dark Support)`
  4. **Kartu 3 — `Danger Zone` (`L59-L69`)**:
     - Kartu dengan border merah tipis (`border-red-500/20`), judul `"Danger Zone"` (`text-red-500`), subteks `"Once you log out, you'll need to sign in again."`, dan form `POST` ke `route('logout')` dengan tombol outline merah `"Sign Out"` (`border border-red-500 text-red-500 hover:bg-red-500/10`).

---

### 5.9 Login (`/login`)
- **Route**: `GET /login` → `AuthController@showLogin` (`name('login')`), `POST /login` → `AuthController@login` (`routes/web.php:18-19`, middleware `guest`).
- **File View**: `resources/views/auth/login.blade.php` (baris 1–168).
- **Layout**: Dokumen HTML mandiri (`<!DOCTYPE html><html lang="en" class="dark">`), **tidak** menggunakan `layouts/app.blade.php`.
- **Struktur Visual**:
  - `<body>` full-screen tengah (`min-h-screen flex items-center justify-center`, inline `background-color: #0F172A`).
  - **2 Lingkaran Dekoratif Radial Gradient (`L20-L25`)**: `w-80 h-80 rounded-full opacity-10` di pojok kanan atas (`-top-40 -right-40`) dan kiri bawah (`-bottom-40 -left-40`) dengan warna `#38BDF8`.
  - **Container Tengah (`w-full max-w-md mx-4`, `L27-L139`)**:
    1. **Blok Logo (`L29-L45`)**: SVG kotak checklist `w-12 h-12` (`#38BDF8`) + `<h1>` `"TaskFlow"` (`text-3xl font-bold`) + subteks `"Smart Task Management"`.
    2. **Kartu Login (`rounded-xl border p-8 fade-in`, `background-color: #1E293B; border-color: #334155;`, `L48-L136`)**:
       - Heading `"Welcome back"` (`text-xl font-semibold`) + subteks `"Sign in to your account to continue"`.
       - **Conditional Flash `session('register_success')` (`L55-L69`)**: Alert hijau `#register-success-alert` dengan judul `"Registrasi Berhasil!"` dan pesan dari session, otomatis fade-out setelah 4000ms (`L142-L164`).
       - **Conditional Error Alert (`$errors->any()`, `L71-L78`)**: Kotak merah `rgba(239, 68, 68, 0.1)` border `#EF4444` menampilkan pesan error autentikasi (`"Email atau password salah."`).
       - **Form `POST /login` (`space-y-5`, `L81-L129`)**:
         - Input `email` (`type="email"`, `required`, `autofocus`, ikon `@` di kiri, placeholder `"you@example.com"`).
         - Input `password` (`type="password"`, `required`, ikon gembok di kiri, placeholder `"••••••••"`, dilengkapi tombol `#togglePassword` di kanan `right-3` dengan emoji `👁️` / `🙈`).
         - Checkbox `remember` (`name="remember"`, label `"Remember me"`, `accent-color: #38BDF8`).
         - Tombol Submit `"Sign In"` (`w-full py-2.5 rounded-lg text-sm font-medium btn-primary`, `background-color: #38BDF8; color: #0F172A;`).
       - Footer kartu: `"Don't have an account? Create one"` (link ke `route('register')`).
    3. **Footer Halaman (`L138`)**: `"© 2026 TaskFlow — Smart Task Management"`.

---

### 5.10 Register (`/register`)
- **Route**: `GET /register` → `AuthController@showRegister` (`name('register')`), `POST /register` → `AuthController@register` (`routes/web.php:20-21`, middleware `guest`).
- **File View**: `resources/views/auth/register.blade.php` (baris 1–149).
- **Layout**: Dokumen HTML mandiri (`<!DOCTYPE html><html lang="en" class="dark">`), identik dengan kerangka Login.
- **Struktur Visual & Perbedaan dengan Login**:
  - Heading kartu: `"Create your account"` + subteks `"Start managing your tasks effectively"` (`L50-L51`).
  - **Form `POST /register` (`space-y-5`, `L56-L137`)**:
    1. `name` (`#name`, `type="text"`, `required`, `autofocus`, ikon user di kiri, placeholder `"John Doe"`). *(⚠️ Tidak ada `@error('name')` di bawah input ini).*
    2. `email` (`#email`, `type="email"`, `required`, ikon `@` di kiri, placeholder `"you@example.com"`). Jika `$errors->has('email')`, border berubah menjadi `#EF4444` dan muncul pesan error inline `@error('email')` dengan ikon tanda seru (`L88-L93`).
    3. `password` (`#password`, `type="password"`, `required`, ikon gembok di kiri, placeholder `"Minimum 8 characters"`). *(⚠️ Tidak memiliki tombol show/hide password `👁️`).*
    4. `password_confirmation` (`#password_confirmation`, `type="password"`, `required`, ikon perisai centang di kiri, placeholder `"Re-enter your password"`). Di bawahnya terdapat blok `@error('password')` (`L125-L130`) yang menampilkan error validasi password (termasuk jika konfirmasi tidak cocok).
    5. Tombol Submit `"Create Account"` (`w-full py-2.5 rounded-lg`, `background-color: #38BDF8; color: #0F172A;`).
  - Footer kartu: `"Already have an account? Sign in"` (link ke `route('login')`).

---

### 5.11 Dead View: Welcome (`resources/views/welcome.blade.php`)
- ⚠️ **Status**: File `resources/views/welcome.blade.php` (226 baris) adalah halaman selamat datang bawaan asli instalasi Laravel. Di `routes/web.php:12-14`, route `/` langsung melakukan redirect ke `/dashboard` (`return redirect('/dashboard');`), sehingga `welcome.blade.php` **tidak pernah dirender** dan tidak perlu dimigrasikan ke Next.js.

---

## 6. Interaksi & Perilaku Dinamis

Seluruh logika JavaScript berada di `resources/js/app.js` (baris 1–471) dan 4 blok `<script>` inline di dalam file Blade (`layouts/app.blade.php`, `sidebar.blade.php`, `add-task-modal.blade.php`, `login.blade.php`).

### 6.1 Dark Mode Toggle
- **File & Baris**: `resources/views/layouts/app.blade.php:12-19` (init awal), `resources/js/app.js:4-29`, `resources/views/components/navbar.blade.php:112-123`.
- **Trigger**: Klik tombol `<button onclick="toggleTheme()">` di navbar, atau saat halaman pertama kali dimuat.
- **Alur Eksekusi**:
  1. Saat `<head>` dieksekusi, script membaca `localStorage.getItem('theme')`. Jika bernilai `'dark'`, atau belum ada di `localStorage` namun `window.matchMedia('(prefers-color-scheme: dark)').matches` bernilai `true`, class `'dark'` ditambahkan ke `document.documentElement` (`<html>`).
  2. Saat `DOMContentLoaded` (`app.js:413`), `updateThemeToggleIcons()` memeriksa apakah `<html>` memiliki class `'dark'`. Jika ya, `.theme-sun-icon` ditampilkan dan `.theme-moon-icon` disembunyikan (`hidden`), begitu pula sebaliknya.
  3. Saat user mengklik tombol tema, `window.toggleTheme()` membalikkan class `'dark'` di `<html>`, menyimpan `'light'` atau `'dark'` ke `localStorage.setItem('theme', ...)`, dan memanggil `updateThemeToggleIcons()`.

### 6.2 Sidebar Drawer (Mobile `< 1024px`)
- **File & Baris**: `resources/views/components/sidebar.blade.php:116-172` & `resources/views/components/navbar.blade.php:7`.
- **Trigger**: Klik tombol hamburger (`[data-drawer-toggle="sidebar-drawer"]`), klik `#sidebar-backdrop`, atau klik salah satu link `<a>` di dalam sidebar saat `window.innerWidth < 1024`.
- **Alur Eksekusi**:
  - `openDrawer()`: menghapus `-translate-x-full` dari `#sidebar-drawer`, mengubah `#sidebar-backdrop` dari `opacity-0 pointer-events-none` menjadi `opacity-100 pointer-events-auto`, dan menambahkan `overflow-hidden` ke `document.body`.
  - `closeDrawer()`: mengembalikan `-translate-x-full` pada `#sidebar-drawer`, menyembunyikan `#sidebar-backdrop`, dan menghapus `overflow-hidden` dari `document.body`.

### 6.3 Add Task Modal
- **File & Baris**: `resources/views/components/add-task-modal.blade.php:4-130`, `resources/js/app.js:2, 459-469`.
- **Trigger**: Klik tombol dengan atribut Flowbite `data-modal-target="add-task-modal" data-modal-toggle="add-task-modal"` (terdapat di Navbar mobile & desktop, Dashboard empty state, dan halaman All Tasks).
- **Alur Eksekusi**:
  - Library `flowbite` (`import 'flowbite'` di `app.js:2`) menangani pembukaan modal (mengubah `hidden` menjadi `flex` dan menyisipkan backdrop Flowbite) serta penutupan via atribut `data-modal-hide="add-task-modal"` (ditambah listener eksplisit di `app.js:462-468`).
  - Saat form disubmit (`POST /tasks`), request dikirim secara sinkron (full-page form submit), divalidasi oleh `TaskController@store`, lalu redirect kembali dengan `session('success', 'Task created successfully!')`.

### 6.4 Edit Task Modal
- **File & Baris**: `resources/js/app.js:31-122`, `resources/views/components/edit-task-modal.blade.php:1-126`, `resources/views/components/task-card.blade.php:102`.
- **Trigger**: Klik tombol ikon pensil pada `task-card` (`onclick="openEditModal({{ json_encode($task) }})"`).
- **Alur Eksekusi**:
  1. `window.openEditModal(task)` mengubah `form.action` menjadi `/tasks/${task.id}`.
  2. Mengisi nilai `#edit-task-title`, `#edit-task-description`, `#edit-task-due-date` (dikonversi ke format lokal `YYYY-MM-DDTHH:mm`), `#edit-task-reminder` (default `'1h'`), `#edit-task-category`, dan `#edit-task-important.checked`.
  3. Mereset state error validasi deadline (`#edit-task-deadline-alert` disembunyikan, tombol `#edit-task-submit-btn` diaktifkan).
  4. Menampilkan `#edit-task-modal` (`hidden` → `flex`) dan membuat elemen `<div id="edit-modal-backdrop" class="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300">` di `document.body` (klik pada backdrop memanggil `window.closeEditModal()`).

### 6.5 Add Category Mini-Modal (Inline AJAX)
- **File & Baris**: `resources/views/components/add-task-modal.blade.php:137-522` & `app/Http/Controllers/CategoryController.php:32-59`.
- **Trigger**: Memilih opsi `<option value="__new__">➕ Tambah Kategori Baru</option>` pada `<select id="task-category">` di dalam Add Task Modal.
- **Alur Eksekusi**:
  1. Listener `change` (`L263-L269`) mereset nilai select ke `""` dan memanggil `openAddCategoryModal()`.
  2. `openAddCategoryModal()` (`L305-L331`) mengubah `display: none` menjadi `block`, lalu menggunakan double `requestAnimationFrame` untuk menganimasikan `#add-cat-overlay` (`opacity: 1`) dan `#add-cat-panel` (`opacity: 1; transform: translate(-50%, -50%) scale(1)`), kemudian memfokuskan input `#new-category-name` setelah 280ms.
  3. Saat user menekan `Enter` atau klik tombol `"Simpan"`, `saveNewCategory()` (`L355-L413`) memvalidasi input di sisi klien (tidak boleh kosong, maks 255 karakter), mengaktifkan spinner loading (`showButtonLoading()`), lalu mengirim `fetch('POST /categories/ajax')` dengan header `X-CSRF-TOKEN` dan body JSON `{ name }`.
  4. Backend `CategoryController@storeAjax` memeriksa duplikasi nama kategori per user (case-insensitive `LOWER(name)`). Jika valid, kategori disimpan dengan warna acak dari 8 warna preset dan mengembalikan JSON HTTP 201 `{ success: true, category: { id, name, color }, message: 'Kategori berhasil ditambahkan!' }`.
  5. `addCategoryToDropdown(data.category)` (`L418-L432`) menyisipkan `<option>` baru tepat sebelum opsi `__new__` di `#task-category` dan langsung memilihnya (`select.value = String(category.id)`).
  6. Menampilkan toast melayang di kanan bawah (`#cat-success-toast`, `z-index: 99999`, hilang otomatis setelah 3200ms) dan menutup mini-modal (`closeAddCategoryModal()`).

### 6.6 Deadline Real-Time Validation
- **File & Baris**: `resources/js/app.js:128-214, 422-457`.
- **Trigger**: Event `input`, `change`, dan `submit` pada `#task-date` (Add Task Modal) dan `#edit-task-due-date` (Edit Task Modal).
- **Alur Eksekusi**:
  - Fungsi `window.validateDeadlineInput(inputEl, alertEl, submitBtnEl, triggerToastOnInvalid)`:
    - Jika input kosong (`!val`), dianggap valid (karena deadline bersifat opsional).
    - Jika diisi namun `selectedDate.getTime() <= now.getTime()`, maka:
      1. Menampilkan kotak alert inline (`#add-task-deadline-alert` atau `#edit-task-deadline-alert`).
      2. Menonaktifkan tombol submit (`disabled = true`, `opacity-50 cursor-not-allowed`).
      3. Menambahkan border merah `border-red-500 focus:ring-red-500` pada input.
      4. Memanggil `window.showDeadlineToast()` yang membuat toast `#deadline-toast-notification` di pojok kanan bawah (`fixed bottom-5 right-5 z-[99999]`, auto-remove setelah 4000ms).
    - Jika form tetap dipaksa submit saat tidak valid, `e.preventDefault()` memblokir pengiriman form (`app.js:433-436, 450-453`).

### 6.7 Notification Polling, Quick Done & Browser Push
- **File & Baris**: `resources/js/app.js:220-409, 414-420` & `app/Http/Controllers/TaskController.php:166-315`.
- **Trigger**: Saat `DOMContentLoaded` (`checkNotifications()`) dan berulang setiap **60.000 ms (60 detik)** melalui `setInterval(checkNotifications, 60000)` (`app.js:420`).
- **Alur Eksekusi**:
  1. Meminta izin Web Notification API (`Notification.requestPermission()`) jika statusnya masih `'default'`.
  2. Memanggil `GET /notifications/data` via `fetch()`. Response JSON berisi `{ overdue: [...], today: [...], tomorrow: [...], unread_count: int, triggers: [...] }`.
  3. `updateNotificationBadge(data.unread_count)` menampilkan/menyembunyikan `#notif-badge` di ikon lonceng navbar (menampilkan `'99+'` jika `> 99`).
  4. `renderNotificationDropdown(data)` merender HTML daftar tugas ke dalam `#notif-dropdown-list` (dikelompokkan menjadi `🔴 Deadline Terlewat`, `📌 Deadline Hari Ini`, dan `📅 Deadline Besok`), lengkap dengan sanitasi XSS `escapeHtml()` dan tombol `✓ Done` (`onclick="markTaskDone(task.id)"`).
  5. Jika tombol `✓ Done` di dalam dropdown diklik, `window.markTaskDone(taskId)` (`app.js:341-359`) mengirim `PATCH /tasks/${taskId}/toggle-complete`, memanggil `checkNotifications()`, lalu me-reload halaman (`window.location.reload()`).
  6. `handleDesktopTriggers(data.triggers)` (`app.js:361-396`): untuk setiap trigger baru (`'reminder'` atau `'overdue'`), jika browser mengizinkan notifikasi (`Notification.permission === 'granted'`), memunculkan `new Notification(trigger.title, { body: trigger.body, icon: '/favicon.ico', tag: ... })`, kemudian mengirim `POST /notifications/mark-sent` dengan `{ task_id, type }` agar flag `reminder_notified` atau `overdue_notified` di database diset ke `true` dan tidak berulang.

### 6.8 Password Visibility Toggle (Halaman Login)
- **File & Baris**: `resources/views/auth/login.blade.php:112-114`.
- **Trigger**: Klik tombol `#togglePassword` di sebelah kanan input password.
- **Alur Eksekusi**: Inline `onclick` mengubah atribut `pwd.type` antara `'password'` (ikon `👁️`) dan `'text'` (ikon `🙈`).

---

## 7. Daftar Semua SVG & Icon

Seluruh ikon di aplikasi menggunakan **inline `<svg>`** (gaya Heroicons outline `stroke-width="1.5"`/`"2"`/`"2.5"` dan solid `viewBox="0 0 20 20"`/`"0 0 24 24"`, ditambah 1 logo custom `viewBox="0 0 32 32"` serta beberapa emoji Unicode).

| No | Nama / Fungsi Icon | Lokasi File + Baris | Ukuran & ViewBox | Warna / Class | Rekomendasi Padanan Icon Library (`lucide-react` / `@phosphor-icons/react`) |
|---|---|---|---|---|---|
| 1 | **TaskFlow App Logo** (Kotak rounded dengan tanda centang & 2 garis) | `navbar.blade.php:15-24`, `sidebar.blade.php:7-12` (tanpa 2 garis), `auth/login.blade.php:31-40`, `auth/register.blade.php:31-40` | `w-8 h-8` (Navbar), `w-5 h-5` (Sidebar), `w-12 h-12` (Auth) — `viewBox="0 0 32 32"` | `var(--accent-vivid)` / `text-accent-custom` / `#38BDF8` | Pertahankan sebagai komponen `<TaskFlowLogo />` SVG custom |
| 2 | **Hamburger Menu** (3 garis horizontal) | `navbar.blade.php:9-11` | `w-6 h-6` — `viewBox="0 0 20 20"` (fill) | `text-text-sidebar` | `Menu` (`lucide-react`) / `List` (`@phosphor-icons/react`) |
| 3 | **Search Magnifying Glass** | `navbar.blade.php:33-37` | `w-4 h-4` — `viewBox="0 0 24 24"` | `text-text-sidebar-muted` | `Search` / `MagnifyingGlass` |
| 4 | **Plus (`+`) Icon** (Add / Create Task) | `navbar.blade.php:46-48, 58-60`, `add-task-modal.blade.php:13-15`, `dashboard.blade.php:198-200`, `tasks/index.blade.php:21-23, 62-64` | `w-4 h-4` (`w-5 h-5` di header modal) — `viewBox="0 0 24 24"` | `text-white` / `text-accent-vivid` | `Plus` |
| 5 | **Notification Bell** | `navbar.blade.php:69-72, 86-89`, `sidebar.blade.php:42-45`, `notifications/index.blade.php:11-14`, `app.js:331-333` | `w-5 h-5` (Navbar/Sidebar), `w-4 h-4` (Dropdown header), `w-6 h-6` (Page title), `w-8 h-8` (Empty dropdown) — `viewBox="0 0 24 24"` | `text-white` / `text-accent-vivid` / `text-text-muted` | `Bell` |
| 6 | **Sun Icon** (Dark Mode aktif) | `navbar.blade.php:114-117` | `w-5 h-5` — `viewBox="0 0 24 24"` | `text-amber-400` | `Sun` |
| 7 | **Moon Icon** (Light Mode aktif) | `navbar.blade.php:119-122` | `w-5 h-5` — `viewBox="0 0 24 24"` | `text-blue-200` | `Moon` |
| 8 | **Chevron Down** (User dropdown arrow) | `navbar.blade.php:133-135` | `w-4 h-4` — `viewBox="0 0 24 24"` | `text-text-sidebar-muted` | `ChevronDown` / `CaretDown` |
| 9 | **Settings Cog / Gear** | `navbar.blade.php:147-152`, `sidebar.blade.php:94-99`, `settings.blade.php:9-14` | `w-4 h-4` (Dropdown), `w-5 h-5` (Sidebar), `w-6 h-6` (Page title) — `viewBox="0 0 24 24"` | `currentColor` / `text-accent-vivid` | `Settings` / `Gear` |
| 10 | **Logout / Sign Out Arrow** | `navbar.blade.php:159-162` | `w-4 h-4` — `viewBox="0 0 24 24"` | `text-red-500` | `LogOut` / `SignOut` |
| 11 | **Home / Dashboard Icon** | `sidebar.blade.php:24-27` | `w-5 h-5` — `viewBox="0 0 24 24"` | `currentColor` | `Home` / `House` |
| 12 | **Clipboard Task List** | `sidebar.blade.php:33-36`, `dashboard.blade.php:22-25, 190-194`, `tasks/index.blade.php:11-14, 53-57` | `w-5 h-5`, `w-6 h-6`, `w-12 h-12`, `w-16 h-16` — `viewBox="0 0 24 24"` | `text-accent-vivid` / `text-text-muted` | `ClipboardList` / `ClipboardText` |
| 13 | **Calendar Icon** (Today / Due Date) | `sidebar.blade.php:51-54`, `task-card.blade.php:81-84`, `dashboard.blade.php:37-40, 148-151`, `tasks/today.blade.php:10-13`, `notifications/index.blade.php:42-45` | `w-3.5 h-3.5` (Task card), `w-5 h-5`, `w-6 h-6` — `viewBox="0 0 24 24"` | `text-amber-500` / `text-red-500` / `text-text-muted` | `Calendar` |
| 14 | **Star Icon** (Important / Priority) | `sidebar.blade.php:64-67`, `task-card.blade.php:35-38, 114-117`, `add-task-modal.blade.php:92-95`, `edit-task-modal.blade.php:88-91`, `dashboard.blade.php:52-55`, `tasks/important.blade.php:10-13, 25-29` | `w-4 h-4`, `w-5 h-5`, `w-6 h-6`, `w-16 h-16` — `viewBox="0 0 24 24"` | `text-amber-500` (`fill="currentColor"` saat aktif) / `text-danger-custom` | `Star` |
| 15 | **Check Circle Outline** (Completed) | `sidebar.blade.php:73-76`, `dashboard.blade.php:67-70, 159-163`, `tasks/today.blade.php:25-29`, `tasks/completed.blade.php:10-13, 25-29` | `w-5 h-5`, `w-6 h-6`, `w-12 h-12`, `w-16 h-16` — `viewBox="0 0 24 24"` | `text-success-custom` / `text-text-muted` | `CheckCircle2` / `CheckCircle` |
| 16 | **Folder Icon** (Categories) | `sidebar.blade.php:85-88`, `add-task-modal.blade.php:171-174`, `categories/index.blade.php:10-13, 44-48` | `w-4 h-4`, `w-5 h-5`, `w-6 h-6`, `w-16 h-16` — `viewBox="0 0 24 24"` | `text-accent-vivid` / `text-text-muted` | `Folder` |
| 17 | **Check Circle Solid** (Flash / Alert Success) | `layouts/app.blade.php:43-47`, `auth/login.blade.php:61-63` | `w-5 h-5` — `viewBox="0 0 20 20"` (fill) | `text-success-custom` / `#6EE7B7` | `CheckCircle` (solid) |
| 18 | **Checkmark Tick** (`✓`) | `task-card.blade.php:57-59, 90-92`, `dashboard.blade.php:129-131`, `add-task-modal.blade.php:237-239, 500-502`, serta data-URI checkbox di `app.css:206, 227` | `w-3 h-3`, `w-3.5 h-3.5`, `w-4 h-4` — `viewBox="0 0 24 24"` / `"0 0 20 20"` | `text-emerald-500` / `text-success-custom` / `white` | `Check` |
| 19 | **Close (`×`) Icon** | `layouts/app.blade.php:51-55`, `add-task-modal.blade.php:22-26, 181-185`, `edit-task-modal.blade.php:19-23`, `app.js:150-152` | `w-4 h-4` — `viewBox="0 0 20 20"` (fill) | `text-text-muted` / `text-success-custom` | `X` |
| 20 | **Pencil / Edit Icon** | `task-card.blade.php:103-106`, `edit-task-modal.blade.php:10-13` | `w-4 h-4` (Card), `w-5 h-5` (Modal header) — `viewBox="0 0 24 24"` | `text-text-muted` / `text-accent-vivid` | `Pencil` / `Edit3` |
| 21 | **Trash / Delete Icon** | `task-card.blade.php:127-130`, `categories/index.blade.php:66-69` | `w-4 h-4` — `viewBox="0 0 24 24"` | `text-danger-custom` | `Trash2` / `Trash` |
| 22 | **Clock Icon** (Upcoming / Recent / Deadline) | `dashboard.blade.php:84-87, 179-182`, `notifications/index.blade.php:63-66` | `w-5 h-5` — `viewBox="0 0 24 24"` | `text-amber-500` / `text-accent-vivid` | `Clock` |
| 23 | **Warning Triangle (`⚠`)** | `add-task-modal.blade.php:105-107`, `edit-task-modal.blade.php:101-103`, `app.js:141-143` | `w-5 h-5` — `viewBox="0 0 24 24"` | `text-amber-400` | `AlertTriangle` / `Warning` |
| 24 | **Exclamation Circle Solid** (Field Error) | `add-task-modal.blade.php:207-211`, `auth/register.blade.php:90, 127` | `w-3.5 h-3.5` — `viewBox="0 0 20 20"` (fill) | `text-red-500` / `#F87171` | `AlertCircle` |
| 25 | **Loading Spinner (`#save-cat-spinner`)** | `add-task-modal.blade.php:231-236` | `w-4 h-4 animate-spin` — `viewBox="0 0 24 24"` | `currentColor` (`text-white`) | `Loader2` / `CircleNotch` |
| 26 | **User Icon** (Input Full Name) | `auth/register.blade.php:62-66` | `w-4 h-4` — `viewBox="0 0 24 24"` | `#94A3B8` | `User` |
| 27 | **At-Sign (`@`) Icon** (Input Email) | `auth/login.blade.php:88-92`, `auth/register.blade.php:78-82` | `w-4 h-4` — `viewBox="0 0 24 24"` | `#94A3B8` | `AtSign` |
| 28 | **Lock Icon** (Input Password) | `auth/login.blade.php:104-108`, `auth/register.blade.php:100-104` | `w-4 h-4` — `viewBox="0 0 24 24"` | `#94A3B8` | `Lock` |
| 29 | **Shield Check Icon** (Confirm Password) | `auth/register.blade.php:115-119` | `w-4 h-4` — `viewBox="0 0 24 24"` | `#94A3B8` | `ShieldCheck` |

---

## 8. Temuan Inkonsistensi UI (⚠️)

Berikut adalah daftar seluruh inkonsistensi visual, perilaku, aksesibilitas, dan kode mati yang ditemukan langsung dari pembacaan file sumber:

| No | Kategori | Temuan Inkonsistensi (⚠️) | Lokasi File + Baris | Dampak pada UI/UX |
|---|---|---|---|---|
| 1 | ⚠️ **Versi Framework Salah Tulis** | Halaman Settings menampilkan teks statis `Framework: Laravel 11`, padahal proyek menggunakan `"laravel/framework": "^13.0"` di `composer.json:10`. | `resources/views/settings.blade.php:45` | Informasi sistem di UI tidak akurat dengan backend aktual. |
| 2 | ⚠️ **Campuran Bahasa (Bilingual UI Inggris + Indonesia)** | Heading, navigasi, dan label utama berbahasa Inggris (`Dashboard`, `All Tasks`, `Create New Task`, `Mark as Important`), tetapi opsi reminder (`15 Menit Sebelum`), mini-modal kategori (`➕ Tambah Kategori Baru`, `Simpan`, `Batal`), seksi notifikasi (`Deadline Terlewat`, `Deadline Hari Ini`), dan pesan validasi/error (`Email atau password salah.`) berbahasa Indonesia. | `add-task-modal.blade.php:63-70, 83, 109-110, 176`, `notifications/index.blade.php:25, 46, 67`, `dashboard.blade.php:91, 96`, `AuthController.php:31, 56` | Voice & tone produk tidak konsisten antara bahasa Inggris dan Indonesia. |
| 3 | ⚠️ **Kontras Tombol Utama Gagal WCAG AA di Dark Mode** | Pada Dark Mode (`:root.dark`), `--accent-vivid` bernilai `#38BDF8` (biru muda terang), sedangkan seluruh tombol `.btn-primary` di dalam dashboard menggunakan `text-white` (`#FFFFFF`), menghasilkan rasio kontras hanya **`2.15 : 1`** (di bawah batas minimum WCAG AA `4.5 : 1`). Sebaliknya, tombol di `login.blade.php:126` menggunakan teks gelap `#0F172A` di atas `#38BDF8` (`9.27 : 1`). | `resources/css/app.css:55` + `navbar.blade.php:45,57`, `add-task-modal.blade.php:123,229`, `edit-task-modal.blade.php:118`, `tasks/index.blade.php:20,61`, `categories/index.blade.php:35` | Teks putih di atas tombol biru langit terang sulit dibaca di Dark Mode. |
| 4 | ⚠️ **Halaman Login & Register Tidak Mendukung Light Mode & Tidak Memakai Token CSS** | `login.blade.php` dan `register.blade.php` memaksa `<html lang="en" class="dark">` dan menggunakan inline style hardcoded (`#0F172A`, `#1E293B`, `#334155`, `#38BDF8`), sehingga mengabaikan pilihan tema terang (`light`) di `localStorage`. | `resources/views/auth/login.blade.php:2, 17-138`, `resources/views/auth/register.blade.php:2, 17-145` | User yang memilih Light Mode tetap dipaksa melihat tampilan gelap saat login/register. |
| 5 | ⚠️ **Fitur `➕ Tambah Kategori Baru` Absen di Edit Task Modal** | Dropdown kategori di `add-task-modal.blade.php:83` memiliki opsi `<option value="__new__">➕ Tambah Kategori Baru</option>`, namun dropdown `#edit-task-category` di `edit-task-modal.blade.php:75-81` tidak memilikinya. Selain itu, fungsi `addCategoryToDropdown()` (`add-task-modal.blade.php:418-432`) hanya menambahkan opsi baru ke `#task-category` tanpa meng-update `#edit-task-category`. | `resources/views/components/edit-task-modal.blade.php:75-81` & `add-task-modal.blade.php:418-432` | User tidak bisa membuat kategori baru saat mengedit tugas, dan kategori yang baru dibuat via AJAX tidak muncul di modal Edit sebelum halaman di-refresh. |
| 6 | ⚠️ **Fitur Edit Kategori Ada di Backend, Tidak Ada di UI** | Route `PUT /categories/{category}` (`routes/web.php:51`) dan method `CategoryController@update` (`CategoryController.php:62-76`) sudah selesai dibuat, namun `categories/index.blade.php` hanya memiliki form tambah dan tombol hapus tanpa tombol/modal edit kategori. | `resources/views/categories/index.blade.php:54-82` vs `app/Http/Controllers/CategoryController.php:62-76` | User tidak dapat mengubah nama atau warna kategori yang sudah dibuat dari UI. |
| 7 | ⚠️ **Bug UX Saat Mengedit Task yang Sudah Overdue** | Validator JS `validateDeadlineInput()` (`app.js:192`) dan validator backend `TaskController@update` (`TaskController.php:108-113`) mewajibkan `due_date > now()`. Akibatnya, jika user membuka modal Edit pada tugas yang sudah lewat deadline hanya untuk mengubah judul/deskripsi/kategori, form akan ditolak kecuali user menghapus atau memajukan tanggal deadline. | `resources/js/app.js:192` & `app/Http/Controllers/TaskController.php:108-113` | Tugas overdue tidak bisa diedit judul/deskripsinya tanpa mengubah tanggal deadline. |
| 8 | ⚠️ **Border Hijau pada Alert & Toast Error Deadline** | Kotak peringatan `#add-task-deadline-alert`, `#edit-task-deadline-alert`, dan toast `#deadline-toast-notification` menggunakan inline style `border-color: #10B981` (hijau emerald/success) meskipun isinya adalah pesan error `"⚠ Deadline tidak valid"`. | `add-task-modal.blade.php:102`, `edit-task-modal.blade.php:98`, `resources/js/app.js:136` | Sinyal warna semantik bertabrakan (border hijau sukses untuk pesan error/warning). |
| 9 | ⚠️ **Inkonstistensi Input Password & Error Field di Register vs Login** | `login.blade.php:112-114` memiliki tombol toggle show/hide password (`👁️`/`🙈`), sedangkan kedua field password di `register.blade.php:105-124` tidak memilikinya. Selain itu, `register.blade.php:60-72` tidak memiliki blok `@error('name')` di bawah input Full Name. | `resources/views/auth/register.blade.php:60-72, 105-124` | Pengalaman pengisian password dan umpan balik error tidak seragam antara Login dan Register. |
| 10 | ⚠️ **Class Tailwind Tidak Valid `text-success-custom-500`** | Elemen `#flash-message` menggunakan class `text-success-custom-500`, padahal token di `@theme` (`app.css:90`) bernama `--color-success-custom` (tanpa suffix `-500`). Teks tetap hijau hanya karena elemen `<span>` di dalamnya memakai `text-success-custom`. | `resources/views/layouts/app.blade.php:41` | Class `text-success-custom-500` tidak menghasilkan deklarasi CSS apapun. |
| 11 | ⚠️ **Padding Atas `<main>` Terlalu Lebar di Tablet (`sm:` & `md:`)** | Wrapper utama di `layouts/app.blade.php:33` menggunakan `pt-44 lg:pt-16` (`176px` di bawah `1024px`). Pada layar `sm:` (`640px–1023px`), baris pencarian dan tombol `Add Task` di navbar sudah menyatu menjadi 1 baris (`sm:flex-row` di `navbar.blade.php:30`), sehingga tinggi navbar hanya ~`112px` dan menyisakan ruang kosong berlebih ~`64px` di atas konten utama. | `resources/views/layouts/app.blade.php:33` & `components/navbar.blade.php:30` | Ruang kosong vertikal berlebih di bagian atas halaman pada layar tablet (`640px–1023px`). |
| 12 | ⚠️ **Tap Target Tombol Aksi di Task Card Di Bawah 44px** | Tombol Edit, Toggle Important, dan Delete di `task-card.blade.php:102,113,126` serta tombol Delete di `categories/index.blade.php:65` hanya berukuran `p-1.5` dengan ikon `w-4 h-4` (`28px × 28px`) dan jarak `gap-0.5` (`2px`), di bawah standar tap target mobile `44px × 44px` (`antislop-layoutmobile` R-03). | `components/task-card.blade.php:100-133`, `categories/index.blade.php:65` | Rawan salah sentuh (mis-tap) antara tombol bintang dan tombol hapus di layar sentuh. |
| 13 | ⚠️ **Dead CSS Classes, Dead Blade View & Favicon 0-Byte** | 1) Class `.modal-backdrop` (`app.css:251`), `.slide-in-left` (`app.css:271`), dan `.skeleton` (`app.css:297`) serta variabel `--accent-hover` (`app.css:26`) dan `--warning` (`app.css:33`) tidak pernah dipakai di HTML.<br>2) `resources/views/welcome.blade.php` tidak memiliki route aktif.<br>3) `public/favicon.ico` berukuran **0 byte** (kosong), padahal direferensikan sebagai ikon notifikasi browser di `app.js:372`. | `resources/css/app.css:26,33,251,271,297`, `resources/views/welcome.blade.php`, `public/favicon.ico`, `resources/js/app.js:372` | File/aturan mati dan ikon notifikasi desktop gagal menampilkan gambar. |
| 14 | ⚠️ **Query Database Langsung di Dalam View Komponen** | `sidebar.blade.php:56` menjalankan query `Auth::user()->tasks()->today()->pending()->count()`, serta `add-task-modal.blade.php:80` dan `edit-task-modal.blade.php:78` memanggil `Auth::user()->categories` langsung di dalam view. | `sidebar.blade.php:56`, `add-task-modal.blade.php:80`, `edit-task-modal.blade.php:78` | Saat dimigrasikan ke Next.js, data ini tidak boleh diambil lewat query ORM di komponen klien, melainkan harus dikirim lewat layout Server Component / API context. |

---

## 9. Catatan untuk Rebuild (Next.js + JavaScript Blueprint)

### 9.1 Yang WAJIB Dipertahankan (Parity 1:1 sesuai §2 Master Prompt Standard)
1. **Sistem Dual-Theme & Palet Warna (`resources/css/app.css:10-92`)**:
   - Seluruh variabel CSS `:root` (Light Mode: Navy `#0B2240` / `#112F56` & White `#F4F6F9` / `#FFFFFF`) dan `:root.dark` (Dark Mode: Deep Dark `#080C14` / `#0F1626` / `#172033` & Sky Blue `#38BDF8`) wajib dipertahankan persis di `app/globals.css`.
   - Mekanisme penyimpanan tema di `localStorage.getItem('theme')` + fallback `prefers-color-scheme: dark` dengan toggle class `.dark` pada `<html>`.
2. **Struktur Navigasi & Layout Global**:
   - Fixed Top Navbar (`z-50`, tinggi desktop `4rem` / `64px`) berisi: Hamburger (mobile), Logo `TaskFlow`, Search Bar (`GET /tasks?search=...`), tombol `+ Add Task`, Notification Bell + Dropdown (`max-h-80`), Theme Toggle (Sun/Moon dengan rotasi hover `45deg`), dan User Avatar Dropdown (`Settings`, `Logout`).
   - Fixed Left Sidebar (`w-64`, `top-16`) berisi: App Identity, grup `MAIN MENU` (`Dashboard`, `All Tasks`, `Notifications`, `Today` + badge angka pending hari ini, `Important`, `Completed`), grup `ORGANIZE` (`Categories`, `Settings`), dan footer `TaskFlow v1.0 © 2026`.
3. **Seluruh 10 Halaman Aktif & Rute URL-nya**:
   - `/login`, `/register`, `/dashboard`, `/tasks`, `/tasks/today`, `/tasks/important`, `/tasks/completed`, `/categories`, `/notifications`, `/settings`.
4. **4 State Visual `TaskCard` & Perilaku Hover-nya**:
   - State `'completed'` (emerald), `'overdue'` (red `border-2` + pill `🔴 Overdue`), `'reminder'` (amber `border-2` + pill `⚠️ Reminder (...)` `animate-pulse`), dan default `'upcoming'`/`'no_deadline'`.
   - Efek hover `.task-card` (`translateY(-3px) scale(1.01)` + kilau shimmer `::after` `0.6s ease`) dan `.stats-card` (`translateY(-4px)`).
5. **Seluruh Interaksi Dinamis & Validasi**:
   - Add Task Modal + inline `➕ Tambah Kategori Baru` (`#add-category-mini-modal` via AJAX tanpa reload halaman + pemilihan otomatis kategori baru + toast sukses).
   - Edit Task Modal dengan prefill data tugas.
   - Validasi deadline real-time (`due_date > now()`) yang menampilkan alert di dalam modal + toast di pojok kanan bawah dan menonaktifkan tombol submit.
   - Polling notifikasi setiap **60 detik**, pengelompokan 3 seksi (`Deadline Terlewat`, `Deadline Hari Ini`, `Deadline Besok`), tombol cepat `✓ Done`, serta pemicu Web Notification API (`new Notification(...)`) dengan penanda `reminder_notified` / `overdue_notified`.

---

### 9.2 Yang BOLEH Diperbaiki Saat Rebuild (Setelah Konfirmasi User)
1. **Perbaikan Kontras Tombol `.btn-primary` di Dark Mode**: Mengubah warna teks tombol utama saat Dark Mode dari `text-white` menjadi `text-slate-900` (`#0F172A`, seperti yang sudah diterapkan di tombol `Sign In` pada `login.blade.php:126`) agar kontras di atas `#38BDF8` naik dari `2.15:1` menjadi `9.27:1` (Lulus WCAG AAA).
2. **Sinkronisasi Kategori Baru ke Edit Task Modal**: Memastikan state daftar kategori dipakai bersama (shared state/context) antara `AddTaskModal` dan `EditTaskModal`, serta menyertakan opsi `➕ Tambah Kategori Baru` di `EditTaskModal`.
3. **Menghapus ketergantungan DOM Imperatif Flowbite**: Mengganti manipulasi DOM manual (`document.getElementById`, `document.body.appendChild`, atribut `data-modal-*` / `data-dropdown-*`) menjadi state React deklaratif (`useState`, `useEffect`, React Portal `createPortal`) dengan tampilan visual dan animasi CSS yang tetap 100% identik.
4. **Memperbaiki Bug Edit Tugas Overdue**: Mengizinkan penyimpanan perubahan pada `EditTaskModal` apabila user tidak mengubah nilai `due_date` yang memang sudah lewat, atau hanya memvalidasi `due_date > now()` saat tanggal deadline diubah.
5. **Menampilkan UI Edit Kategori (Opsional)**: Karena endpoint update kategori sudah ada di backend (`CategoryController@update`), user dapat memilih apakah ingin tetap menyembunyikannya (1:1 dengan UI lama) atau memunculkan tombol edit di kartu kategori.
6. **Memperbaiki Label Statis di `/settings`**: Mengupdate teks informasi framework di halaman Settings agar sesuai dengan stack baru (atau mempertahankan informasi versi aplikasi).

---

### 9.3 Mapping Blade → Komponen React / Next.js (App Router + JavaScript)

| File Laravel Blade / Asset Asal | Target File Next.js (App Router + JS) | Tipe Komponen (`Server` / `'use client'`) | Tanggung Jawab Utama |
|---|---|---|---|
| `resources/css/app.css` | `src/app/globals.css` | Global Stylesheet | Menyimpan seluruh token `:root`, `:root.dark`, `@theme`, `.sidebar-link`, `.task-card`, `.stats-card`, `.custom-checkbox`, `.task-checkbox`, `.btn-primary`, `.fade-in` |
| `resources/views/layouts/app.blade.php` | `src/app/(dashboard)/layout.jsx` | Server Layout + Client Shell | Membungkus seluruh halaman terautentikasi dengan `Navbar`, `Sidebar`, `FlashBanner`, `AddTaskModal`, dan `EditTaskModal` |
| `resources/views/components/navbar.blade.php` | `src/components/layout/Navbar.jsx` | `'use client'` | Mengelola input search (`useRouter` / `<form>`), pemicu buka `AddTaskModal`, dropdown lonceng notifikasi, tombol `ThemeToggle`, dan dropdown profil user |
| `resources/views/components/sidebar.blade.php` | `src/components/layout/Sidebar.jsx` | `'use client'` | Navigasi aktif dengan `usePathname()`, menampilkan badge `todayCount`, serta mengelola state drawer mobile (`isOpen`) dan backdrop |
| `resources/views/components/task-card.blade.php` | `src/components/tasks/TaskCard.jsx` | `'use client'` | Merender kartu tugas berdasarkan `deadline_status`, menangani toggle complete, toggle important, delete (dengan `confirm()`), dan pemicu `openEditModal(task)` |
| `resources/views/components/add-task-modal.blade.php` (Modal Utama) | `src/components/modals/AddTaskModal.jsx` | `'use client'` | Modal form tambah tugas dengan validasi real-time `due_date > now()` dan pemicu pembuka `AddCategoryMiniModal` saat memilih `__new__` |
| `resources/views/components/add-task-modal.blade.php` (`#add-category-mini-modal`) | `src/components/modals/AddCategoryMiniModal.jsx` | `'use client'` (via `createPortal`) | Mini-modal pembuatan kategori via `fetch('/api/categories')`, menampilkan spinner loading, memperbarui daftar kategori di state, dan memunculkan toast sukses |
| `resources/views/components/edit-task-modal.blade.php` | `src/components/modals/EditTaskModal.jsx` | `'use client'` | Modal form edit tugas yang terhubung ke state `editingTask` dan validator deadline real-time |
| `resources/js/app.js` (Deadline Toast & Notification Polling) | `src/context/TaskFlowUIContext.jsx` + `src/hooks/useNotificationPolling.js` | `'use client'` | Menyediakan state global untuk modal Add/Edit, daftar kategori, tema Light/Dark, toast deadline, dan polling `/api/notifications/data` setiap 60 detik + Web Notification API |
| `resources/views/dashboard.blade.php` | `src/app/(dashboard)/dashboard/page.jsx` | Server / Client Page | Merender Welcome Header, 4 Stats Cards (carousel mobile / grid desktop), seksi `Upcoming Deadline` (maks 5), serta 2 kolom `Today's Tasks` & `Recent Tasks` |
| `resources/views/tasks/index.blade.php` | `src/app/(dashboard)/tasks/page.jsx` | Server / Client Page | Merender daftar tugas dengan filter `?search=` & `?category=`, tombol `Clear Filters`, grid 3 kolom `TaskCard`, dan pagination (12 per halaman) |
| `resources/views/tasks/today.blade.php` | `src/app/(dashboard)/tasks/today/page.jsx` | Server / Client Page | Merender tugas jatuh tempo hari ini + badge `X pending` |
| `resources/views/tasks/important.blade.php` | `src/app/(dashboard)/tasks/important/page.jsx` | Server / Client Page | Merender tugas prioritas (`is_important = true`) + badge `X active` |
| `resources/views/tasks/completed.blade.php` | `src/app/(dashboard)/tasks/completed/page.jsx` | Server / Client Page | Merender tugas selesai (`is_completed = true`) + badge `X completed` |
| `resources/views/categories/index.blade.php` | `src/app/(dashboard)/categories/page.jsx` | Server / Client Page | Merender form `Create New Category` (nama + color picker `#2563EB`) dan grid 3 kolom kartu kategori dengan progress bar (`min(tasks_count * 10, 100)%`) |
| `resources/views/notifications/index.blade.php` | `src/app/(dashboard)/notifications/page.jsx` | Server / Client Page | Merender 3 seksi kartu: `🔴 Deadline Terlewat`, `📌 Deadline Hari Ini`, dan `📅 Deadline Mendatang` |
| `resources/views/settings.blade.php` | `src/app/(dashboard)/settings/page.jsx` | Server / Client Page | Merender kartu `Profile Information`, `About TaskFlow`, dan `Danger Zone` (`Sign Out`) |
| `resources/views/auth/login.blade.php` | `src/app/(auth)/login/page.jsx` | `'use client'` | Halaman login mandiri bertema gelap (`#0F172A`), orb radial gradient `#38BDF8`, banner `register_success` auto-dismiss 4 detik, dan toggle password `👁️`/`🙈` |
| `resources/views/auth/register.blade.php` | `src/app/(auth)/register/page.jsx` | `'use client'` | Halaman registrasi mandiri bertema gelap (`#0F172A`) dengan validasi field `name`, `email`, `password`, dan `password_confirmation` |
