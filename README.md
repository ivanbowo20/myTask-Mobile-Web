# ⚡ MyTask (TaskFlow v2)

> **Modern Personal Task Management Web App with Dark-Only Glassmorphism & Fluid Micro-Interactions.**

[![Next.js](https://img.shields.io/badge/Next.js-15.5.0-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0.0-149eca?style=for-the-badge&logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.0-38bdf8?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)
[![Better Auth](https://img.shields.io/badge/Better_Auth-1.7.10-orange?style=for-the-badge)](https://www.better-auth.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![Framer Motion](https://img.shields.io/badge/Framer_Motion-14.1.0-e11d48?style=for-the-badge&logo=framer)](https://www.framer.com/motion/)

---

## 📌 Tentang Website

**MyTask** (dikenal juga dalam arsitektur teknis sebagai **TaskFlow v2**) adalah aplikasi manajemen tugas (*task management*) modern yang dirancang khusus untuk meningkatkan produktivitas personal dengan standar estetika visual kelas atas.

Berbeda dari aplikasi to-do standar, MyTask dibangun dengan pendekatan **artisanal UI/UX (Awwwards-tier)**:
- **Eksklusif Dark Mode & Frosted Glassmorphism**: Visual gelap menenangkan dengan permukaan kaca transparan (`backdrop-blur-xl`), border hairline elegan, dan bayangan ambient difus tanpa silau.
- **Micro-Interactions Halus**: Transisi tata letak dinamis berbasis fisika pegas (*spring physics*) yang terinspirasi dari Apple iOS dan Arc Browser.
- **Bebas Distraksi & Ergonomis**: Navigasi cepat pada desktop melalui *Floating Navbar & Responsive Sidebar*, serta navigasi jempol yang nyaman di perangkat mobile menggunakan *Floating Bottom Dock*.

---

## 🚀 Fitur-Fitur Utama

### 1. 📊 Ringkasan Produktivitas (Dashboard — `/dashboard`)
- **Kartu Metrik Real-Time**: Pemantauan langsung untuk *Total Tugas*, *Tugas Hari Ini*, *Tugas Penting*, dan *Tugas Selesai*.
- **Rasio Produktivitas**: Indikator persentase penyelesaian tugas secara dinamis.
- **Banner Peringatan Batas Waktu (Deadline Alert)**: Notifikasi visual otomatis untuk tugas-tugas yang telah jatuh tempo atau mendekati tenggat waktu.
- **Quick Glance**: Daftar pratinjau tugas prioritas tinggi dan tugas hari ini.

### 2. 📝 Manajemen Tugas Lengkap (CRUD Tugas — `/tugas`)
- **Pencatatan Tugas Komprehensif**: Mendukung pengisian Judul, Deskripsi kaya konteks, Tenggat Waktu (*Deadline*), Kategori, dan Penanda Tugas Penting (*Starred*).
- **Sub-Tugas (Checklist Items)**: Pecah tugas besar menjadi langkah-langkah kecil dengan status ceklis mandiri.
- **Pemilih Pengingat (Reminder Picker)**: Opsi pengingat waktu (15 menit, 30 menit, 1 jam sebelum deadline, dst.).
- **Komponen Interaktif Kustom**: Menggunakan *Custom DateTimePicker* dan *OptionWheel* berbasis sentuhan/scroll interaktif.
- **Pencarian & Multi-Filter**: Cari tugas berdasarkan kata kunci, urutkan berdasarkan deadline/waktu buat, dan filter status (Semua, Selesai, Belum).

### 3. 🎯 Smart Filters Cepat
- 📅 **Hari Ini (`/tugas/hari-ini`)**: Filter fokus tugas harian yang wajib selesai pada hari berjalan.
- ⭐ **Penting (`/tugas/penting`)**: Kurasi tugas-tugas bertanda bintang / prioritas tinggi.
- ✅ **Selesai (`/tugas/selesai`)**: Arsip tugas-tugas yang telah dituntaskan lengkap dengan timestamp penyelesaian.

### 4. 🏷️ Kategori Fleksibel (`/kategori`)
- **Pengelompokan Ranah Hidup / Proyek**: Kelola tugas berdasarkan kategori (seperti *Kerja*, *Pribadi*, *Belajar*, dll.).
- **Sistem Warna Hex Terstandarisasi**: Dilengkapi dengan 8 preset warna aksen untuk identifikasi visual instan.
- **CRUD Kategori Penuh**: Tambah, edit nama/warna/ikon, dan hapus kategori beserta integrasi referensial ke tugas terkait.

### 5. 🔔 Sistem Notifikasi & Dynamic Island Toast (`/notifikasi`)
- **Bell Notification Dropdown**: Dropdown notifikasi cepat pada navbar header untuk meninjau reminder terbaru.
- **Pusat Riwayat Notifikasi**: Halaman log lengkap riwayat pemberitahuan dan reminder tugas.
- **Custom Dynamic Island Toast**: Komponen capsule mengambang di *bottom-center* layar dengan animasi morphing fisika pegas (dilengkapi mekanisme anti-duplikasi).

### 6. 🎨 Multi-Theme Ambient Engine (Dark-Only)
Tersedia 3 tema ambient gelap yang dapat dipilih melalui *Theme Switcher*:
1. **Soft Aurora**: Aksen hangat amber/oranye dengan ambient glow lembut.
2. **Dark Chocolate**: Nuansa monokromatik kopi/kakao berkelas dan minimalis.
3. **Abyssal Teal**: Kedalaman hijau toska / cyan gelap bergaya futuristik.

### 7. ⚙️ Profil & Preferensi Pengguna (`/pengaturan`)
- Pengaturan identitas profil pengguna (Nama, Email, Bio).
- Pemilihan preferensi tema default dan konfigurasi reminder.
- Manajemen sesi dan tombol *Keluar Akun (Sign Out)* yang aman.

---

## 🔐 Sistem Autentikasi & Keamanan (Login Pake Apa?)

Autentikasi pada MyTask **TIDAK** menggunakan mock memory atau library usang, melainkan diimplementasikan secara penuh menggunakan arsitektur modern:

### 1. Framework Autentikasi: **Better Auth (`better-auth`)**
Aplikasi menggunakan **Better Auth v1.7.10** yang dikonfigurasi pada:
- **Server:** [`lib/auth.js`](file:///c:/MY%20project%20Website/todowebb%20V2/lib/auth.js)
- **Client:** [`lib/auth-client.js`](file:///c:/MY%20project%20Website/todowebb%20V2/lib/auth-client.js)
- **API Route Handler:** [`app/api/auth/[...all]/route.js`](file:///c:/MY%20project%20Website/todowebb%20V2/app/api/auth/[...all]/route.js)

### 2. Metode Login yang Tersedia:
1. ✉️ **Email & Kata Sandi (Credentials)**:
   - Registrasi akun: Memvalidasi Nama Lengkap, format Email unik, dan Kata Sandi (minimal 8 karakter dengan konfirmasi).
   - Masuk akun: Login berbasis email dan kata sandi dengan dukungan opsi *"Ingat Saya" (Remember Me)*.
2. 🌐 **Google OAuth (Social Sign-In)**:
   - Otentikasi satu-klik (*One-Click Sign-In*) menggunakan akun Google resmi melalui `authClient.signIn.social({ provider: "google", callbackURL: "/dashboard" })`.

### 3. Keamanan Sesi & Database:
- **Penyimpanan Sesi**: Sesi disimpan secara terenkripsi dan divalidasi langsung ke database PostgreSQL Supabase pada tabel `session`, `user`, dan `account`.
- **Proteksi Rute via Next.js Middleware**: File [`middleware.js`](file:///c:/MY%20project%20Website/todowebb%20V2/middleware.js) memproteksi seluruh rute privat (`/dashboard`, `/tugas/*`, `/kategori`, `/notifikasi`, `/pengaturan`) berdasarkan cookie sesi `better-auth.session_token` atau `__Secure-better-auth.session_token`. Akses tanpa sesi otomatis dialihkan ke `/login`.
- **Server Component Session Verification**: Komponen server memverifikasi sesi menggunakan `auth.api.getSession()` untuk memastikan keabsahan data tanpa *waterfall* HTTP berlebih.
- **Koneksi Database PostgreSQL Supabase**: Menggunakan pool koneksi `pg` dengan *auto-resolver IPv4 pooler* (`aws-0-ap-southeast-1.pooler.supabase.com:6543`) pada [`lib/db.js`](file:///c:/MY%20project%20Website/todowebb%20V2/lib/db.js) untuk menjamin koneksi stabil bebas timeout.
- **Row Level Security (RLS)**: Seluruh tabel aplikasi pada [`supabase/schema.sql`](file:///c:/MY%20project%20Website/todowebb%20V2/supabase/schema.sql) diproteksi dengan RLS dan isolasi `user_id` untuk mencegah serangan IDOR *(Insecure Direct Object Reference)*.
- **Rate Limiting**: Diterapkan proteksi batas request (`lib/rate-limit.js`) pada endpoint sensitif untuk mencegah serangan *brute-force*.

---

## 🛠️ Tech Stack & Ekosistem

| Lapisan | Teknologi | Catatan Penggunaan |
| :--- | :--- | :--- |
| **Framework** | **Next.js 15 (App Router)** | React 19, Server Components & Route Handlers |
| **Styling** | **Tailwind CSS v4** | Modern CSS engine dengan PostCSS v8 |
| **Autentikasi** | **Better Auth v1.7** | Email/Password, Google OAuth, Session Management |
| **Database** | **Supabase (PostgreSQL)** | Skema tabel relasional lengkap & pooler connection |
| **Animasi** | **Framer Motion & GSAP** | Spring physics, double-bezel sliding layout, micro-interactions |
| **Ikonografi** | **Lucide Icons (`lucide-react`)** | Ikon clean dan konsisten di seluruh antarmuka |
| **Komponen UI** | **Custom Tailored Components** | Dynamic Island Toast, Sonner, Custom Select, OptionWheel |

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
│   ├── theme/                # ThemeModal & 3 Ambient Backgrounds
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

## 🚀 Panduan Memulai (Getting Started)

### 1. Prasyarat Sistem
- **Node.js**: Versi 18.18+ atau versi 20+ (disarankan Node.js LTS).
- **npm**: Versi 9+ atau versi 10+.
- Akun dan proyek **Supabase** (PostgreSQL).

### 2. Kloning Repositori & Instalasi
```bash
# Klon repositori
git clone https://github.com/username/todoweb-v2.git

# Masuk ke direktori proyek
cd todoweb-v2

# Instal seluruh dependensi
npm install
```

### 3. Konfigurasi Environment Variables
Salin file `.env.example` menjadi `.env.local`:
```bash
cp .env.example .env.local
```

Buka `.env.local` dan lengkapi variabel berikut:
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

## 🛡️ Standar Rekayasa & Keamanan

Proyek ini dikembangkan dengan mematuhi disiplin:
1. **Aturan Anti-AI-Slop & Awwwards Taste System**: Mengedepankan tipografi terukur (*The 2-Line Heading Rule*), double-bezel container, serta interaksi mikro yang presisi.
2. **Keamanan 100% Parameterized & Anti-IDOR**: Seluruh query data pengguna wajib diikat pada `user_id` sesi terotentikasi.
3. **No Light Mode Policy**: Desain visual terkunci pada *Pure Dark Mode* untuk mempertahankan kontras tinggi dan identitas premium.

---

## 📄 Lisensi
Proyek ini dilisensikan di bawah lisensi privat / proprietary untuk pengembangan aplikasi produktivitas personal.