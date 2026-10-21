# MyTask (TaskFlow v2)

> *Aplikasi manajemen tugas modern dengan Progressive Web App (PWA), Web Push Notification, dan desain glassmorphism eksklusif dark mode.*

[![Next.js](https://img.shields.io/badge/Next.js-15.5.0-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0.0-149eca?style=for-the-badge&logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.0-38bdf8?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)
[![Better Auth](https://img.shields.io/badge/Better_Auth-1.7.10-orange?style=for-the-badge)](https://www.better-auth.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![Framer Motion](https://img.shields.io/badge/Framer_Motion-14.1.0-e11d48?style=for-the-badge&logo=framer)](https://www.framer.com/motion/)

[🚀 BUKA LIVE DEMO DI SINI](https://URL-VERCEL-LO.vercel.app)

---

## ✨ Fitur Utama
- **PWA & Notifikasi Background (Web Push):** Akses instan di mobile/desktop layaknya aplikasi native dengan notifikasi pengingat tenggat waktu secara real-time via Service Worker.
- **Desain Glassmorphism (Celestial Sky Theme) & Dark Mode:** Tampilan modern berkelas dengan frosted glass (`backdrop-blur-xl`), WebGL cloud shader ambient, dan palet gelap yang nyaman di mata.
- **Email Notifications (Resend):** Pengiriman notifikasi dan reminder otomatis langsung ke inbox email pengguna.
- **Anti-AI Slop UI (Bento Grid & Apple Spring Physics):** Tata letak bento grid presisi tanpa celah kosong, interaksi aktif responsif seketika (`:active scale(0.97)`), dan fluid interruptible springs.
- **Manajemen Tugas Lengkap:** Dukungan sub-tugas (checklist), reminder picker interaktif, penanda prioritas (starred), dan smart filters (*Hari Ini*, *Penting*, *Selesai*).
- **Kategori Fleksibel:** Pengelompokan tugas berdasarkan ranah aktivitas lengkap dengan preset palet warna aksen.

---

## 🛠️ Tech Stack
- **Framework:** Next.js 15 (App Router, React 19)
- **Database & Auth:** Supabase (PostgreSQL) & Better Auth
- **Styling:** Tailwind CSS v4 & Framer Motion
- **Deploy:** Vercel & GitHub Actions

---

## 💻 Cara Menjalankan Secara Lokal (Untuk Developer)

### 1. Prasyarat Sistem
- **Node.js:** Versi 18.18+ atau versi 20+ (disarankan Node.js LTS).
- **npm:** Versi 9+ atau versi 10+.
- Akun dan proyek **Supabase** (PostgreSQL).

### 2. Kloning Repositori & Instalasi
```bash
# Klon repositori
git clone https://github.com/ivanbowo20/myTask-Mobile-Web.git

# Masuk ke direktori proyek
cd myTask-Mobile-Web

# Instal seluruh dependensi
npm install
```

### 3. Konfigurasi Environment Variables
Salin file `.env.example` menjadi `.env.local`:
```bash
cp .env.example .env.local
```

Lengkapi variabel berikut pada `.env.local`:
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# PostgreSQL Direct Connection (Supabase)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.your-project-ref.supabase.co:5432/postgres

# Better Auth Configuration
BETTER_AUTH_SECRET=generate-random-32-character-secret-key
BETTER_AUTH_URL=http://localhost:3000

# Google OAuth Credentials (Opsional, untuk login Google)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Web Push Notifications (VAPID Keys)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_SUBJECT=mailto:admin@example.com

# Email Service (Resend)
RESEND_API_KEY=your-resend-api-key
EMAIL_FROM=onboarding@resend.dev
```

### 4. Setup Database Supabase
Jalankan skrip migrasi untuk mengeksekusi DDL pada `supabase/schema.sql`:
```bash
# Eksekusi migrasi skema database ke Supabase
npm run migrate:supabase

# Uji koneksi database
npm run ping:supabase
```

### 5. Menjalankan Server Development

> ⚠️ **Catatan Penting Pengembangan (Cache Isolation):**  
> Next.js menggunakan folder cache `.next/` yang sama antara perintah `dev` dan `build`. Sangat disarankan menggunakan skrip `dev:clean` agar cache selalu bersih dan terhindar dari konflik asset.

```bash
# Jalankan mode pengembangan dengan cache bersih (Direkomendasikan)
npm run dev:clean

# Atau jalankan dev server standar
npm run dev
```

Buka peramban di `http://localhost:3000`.

---

## 📜 Skrip NPM yang Tersedia

| Perintah | Deskripsi |
| :--- | :--- |
| `npm run dev:clean` | Menghapus folder `.next` lalu menjalankan server dev (**Rekomendasi Utama**). |
| `npm run dev` | Menjalankan server dev Next.js biasa. |
| `npm run build:safe` | Membersihkan cache `.next` lalu melakukan kompilasi production build. |
| `npm run build` | Menjalankan kompilasi production standar. |
| `npm run start` | Menjalankan server Next.js mode production. |
| `npm run lint` | Menjalankan analisis statis ESLint pada kode. |
| `npm run test` | Menjalankan suite verifikasi integrasi komponen & layout. |
| `npm run ping:supabase` | Menguji konektivitas pool PostgreSQL ke Supabase. |
| `npm run migrate:supabase` | Menjalankan migrasi DDL schema database ke Supabase. |

---

## 📁 Struktur Direktori Utama

```text
todowebb-v2/
├── app/                      # Next.js 15 App Router
│   ├── (auth)/               # Rute autentikasi publik (/login & /register)
│   │   ├── login/page.js
│   │   ├── register/page.js
│   │   └── layout.js
│   ├── (dashboard)/          # Rute terlindungi (Protected Routes)
│   │   ├── dashboard/page.js
│   │   ├── tugas/            # Semua Tugas & Smart Filters (hari-ini, penting, selesai)
│   │   ├── kategori/page.js
│   │   ├── notifikasi/page.js
│   │   └── pengaturan/page.js
│   ├── api/                  # Backend Route Handlers
│   │   ├── auth/[...all]/    # Better Auth endpoint handler
│   │   ├── tasks/route.js    # API CRUD tugas & filter query
│   │   └── categories/route.js # API kategori
│   ├── globals.css           # Token desain & konfigurasi Tailwind CSS v4
│   └── layout.js             # Root layout aplikasi
├── components/               # Komponen Modular & UI Kit
│   ├── auth/                 # Komponen AuthSlider (Dual-slider login & register)
│   ├── layout/               # Navbar, Sidebar, BottomNav, DashboardShell
│   ├── tugas/                # AddTaskModal, EditTaskModal, TaskCard, ReminderPicker
│   ├── kategori/             # CategoryCard, AddCategoryModal, EditCategoryModal
│   ├── theme/                # ThemeModal & 3 Ambient Backgrounds + Celestial Sky
│   └── ui/                   # Button, Input, DynamicIslandToast, Modal, DateTimePicker
├── lib/                      # Utilitas & Konfigurasi Inti
│   ├── auth.js               # Konfigurasi Better Auth Server
│   ├── auth-client.js        # Konfigurasi Better Auth Client
│   ├── db.js                 # PostgreSQL Pool & Supabase IPv4 Pooler Resolver
│   ├── task-context.js       # State Management Tugas & Kategori
│   ├── theme-context.js      # State & persistensi tema
│   └── rate-limit.js         # In-memory security rate limiting
├── supabase/                 # Skema & Migrasi Database
│   └── schema.sql            # DDL PostgreSQL lengkap (Better Auth + Tasks + RLS)
├── scripts/                  # Skrip pemeliharaan & pengujian
├── middleware.js             # Edge middleware autentikasi & redirect rute
├── package.json              # Daftar dependensi & npm scripts
└── PROJECT_CONTEXT.md        # Konteks rancangan & arsitektur proyek
```

---

## 🛡️ Standar Rekayasa & Keamanan

Proyek ini dikembangkan dengan mematuhi disiplin:
1. **Aturan Anti-AI-Slop (SielloMita Design)**: Mengedepankan tipografi terukur (*The 2-Line Heading Rule*), gapless dense bento grid, serta interaksi mikro spring Apple WWDC yang responsif.
2. **Keamanan Backend (Aegis Backend Protocol)**: 100% Parameterized queries (Zero SQL Injection), Row Level Security (RLS) pada seluruh tabel database, perlindungan IDOR di setiap mutasi, dan pencegahan perintah destruktif.
3. **No Light Mode Policy**: Desain visual terkalibrasi khusus pada *Pure Dark Mode & Celestial Sky Glassmorphism* untuk kenyamanan fokus dan estetika premium.

---

## 📄 Lisensi
Proyek ini dilisensikan di bawah lisensi privat / proprietary untuk pengembangan aplikasi produktivitas personal.
