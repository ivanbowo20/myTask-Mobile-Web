# TRINITY CODE AUDIT REPORT — MODUL NOTEBOOK (COPY & EDIT UX)

**Target:** `components/notebook/NotebookPreviewModal.js`, `components/notebook/NotebookCard.js`, `components/notebook/EditNotebookModal.js`, `components/ui/Modal.js`, `lib/notebook-context.js`, `lib/utils.js`  
**Arsitektur & Ruang Lingkup:** Modul Catatan Materi (Notebook) pada Next.js 15 App Router + React 19 dengan pola offline-first (Dexie + sync engine) dan modal responsif (fullscreen native di mobile `< lg`, centered dialog di desktop `lg+`).  
**Indeks yang Digunakan:** CodeGraph: Ya (`.codegraph/`) | Graphify: Tidak relevan (indeks lama Laravel) | Native AST / File Inspection: Ya  
**Mode:** READ-ONLY Deep Macro-to-Micro Audit (Fase 1).

---

## 1. MUST FIX (Bug, Logika Rusak, UX Menghambat)

### [1] Judul Catatan Ikut Tersalin pada Seluruh 3 Titik Aksi Salin (`handleCopy`)
- **Lokasi Berkas:**
  - [NotebookPreviewModal.js](file:///c:/MY%20project%20Website/todowebb%20V2/components/notebook/NotebookPreviewModal.js#L76-L87)
  - [NotebookCard.js](file:///c:/MY%20project%20Website/todowebb%20V2/components/notebook/NotebookCard.js#L83-L95)
  - [EditNotebookModal.js](file:///c:/MY%20project%20Website/todowebb%20V2/components/notebook/EditNotebookModal.js#L155-L164)
- **Fungsi Kode:** Menyalin teks catatan ke clipboard dengan format ramah chat/WhatsApp menggunakan `htmlToChatFormattedText`.
- **Akar Masalah (Bug/Logic):**
  1. Ketiga komponen secara eksplisit menggabungkan judul di depan isi catatan sebelum menulis ke clipboard:
     ```javascript
     const fullText = `${notebook.judul}\n\n${formattedText}`.trim();
     await navigator.clipboard.writeText(fullText);
     ```
  2. Ketika isi catatan (`konten`) kosong, `formattedText` bernilai `""`. Jika judul dihapus tanpa guard kosong, `navigator.clipboard.writeText("")` akan tetap dijalankan dan menampilkan toast sukses palsu.
  3. Di `NotebookCard.js:L90` dan `NotebookPreviewModal.js:L83`, `setTimeout(() => setIsCopied(false), 2000)` tidak dibersihkan pada unmount maupun di-reset saat tombol ditekan berulang.
- **Reality Check & Bukti Pemicu:**
  - Terverifikasi langsung di 3 jalur klik: ikon salin di kartu catatan (`NotebookCard`), ikon salin di header preview (`NotebookPreviewModal`), dan tombol "Salin Teks Bersih" di editor (`EditNotebookModal`). Semuanya pasti menyertakan judul + dua baris kosong di awal hasil paste.
- **Blast Radius & Caller:**
  - `NotebookCard` -> `handleCopy`
  - `NotebookPreviewModal` -> `handleCopy`
  - `EditNotebookModal` -> `handleCopy`
- **Saran Perbaikan Minimal (Ponytail Fix):**
  Salin hanya `formattedText.trim()` dan tambahkan guard isi kosong (serta satu helper bersama agar DRY jika disetujui):
  ```javascript
  const contentOnly = formattedText.trim();
  if (!contentOnly) {
    toast.info('Isi catatan masih kosong.');
    return;
  }
  await navigator.clipboard.writeText(contentOnly);
  ```
- **Dampak jika Diabaikan:** Pengguna harus selalu menghapus judul secara manual setiap kali menempelkan (paste) isi catatan ke aplikasi lain.

---

### [2] Tombol "Edit Catatan" di `NotebookPreviewModal` Terdorong ke Bawah Viewport & Terpotong Scroll (Double-Header + Nested Scroll Trap)
- **Lokasi Berkas:**
  - [NotebookPreviewModal.js](file:///c:/MY%20project%20Website/todowebb%20V2/components/notebook/NotebookPreviewModal.js#L123-L308)
  - [Modal.js](file:///c:/MY%20project%20Website/todowebb%20V2/components/ui/Modal.js#L168-L202)
- **Fungsi Kode:** Menampilkan pratinjau penuh catatan materi serta kontrol aksi cepat (Edit, Salin, Sematkan, Hapus, Tutup).
- **Akar Masalah (Bug/Logic & Layout):**
  1. `NotebookPreviewModal` hanya menempatkan tombol **Salin** dan **Sematkan (Star)** di header atas (`L196-L232`), meskipun komentar kode di `L195` sebenarnya sudah bertuliskan `Header Action Buttons (Quick Edit, Pin, Copy)`. Tombol **Edit Catatan** justru diletakkan di footer paling bawah (`L290-L304`).
  2. Pembungkus `children` pada [Modal.js](file:///c:/MY%20project%20Website/todowebb%20V2/components/ui/Modal.js#L200) adalah container scroll biasa (`overflow-y-auto flex-1 min-h-0`) — bukan `overflow-hidden flex flex-col`.
  3. Di dalam `NotebookPreviewModal`, `Modal.js` tetap merender bar header kosong (karena `title=""`) setinggi ~56px hanya untuk tombol `X`, lalu di bawahnya ada custom header preview (~110-140px), ditambah area baca dengan `max-h-[calc(100dvh-180px)]`. Akumulasi tinggi elemen melebihi `100dvh` sehingga **footer berisi tombol Edit terdorong keluar layar** dan memaksa pengguna menggulir sampai bawah untuk menekan Edit.
- **Reality Check & Bukti Pemicu:**
  - Buka catatan materi apa pun yang berisi lebih dari 1 layar teks di HP ($\le 640\text{px}$) maupun layar laptop dengan viewport pendek: bar atas hanya menampilkan tombol `X`, lalu di bawahnya ikon Salin & Bintang; tombol Edit tidak terlihat sebelum menggulir container modal ke paling bawah.
- **Blast Radius & Caller:**
  - `DashboardShell.js:L179` -> `<NotebookPreviewModal />`
  - Jika `Modal.js` ikut diubah, berdampak ke semua modal aplikasi (`AddTaskModal`, `EditTaskModal`, `AddCategoryModal`, `AddNotebookModal`, `EditNotebookModal`, dll.) — wajib opt-in prop atau ditangani aman agar tidak memicu regresi modal lain.
- **Saran Perbaikan Minimal (Ponytail Fix):**
  Pindahkan tombol **Edit** ke header atas `NotebookPreviewModal` (sejajar & mudah dijangkau langsung tanpa scroll), rapikan struktur scroll/header agar tidak ada double-scroll atau footer terdorong keluar layar, dan pastikan touch target $\ge 44\times44\text{px}$ di mobile.
- **Dampak jika Diabaikan:** Alur baca -> edit catatan panjang sangat melelahkan terutama di perangkat mobile.

---

### [3] `NotebookCard` Memo Comparator Mengabaikan Perubahan `kategori` dan `pending`
- **Lokasi Berkas:** [NotebookCard.js](file:///c:/MY%20project%20Website/todowebb%20V2/components/notebook/NotebookCard.js#L371-L380)
- **Fungsi Kode:** Mencegah re-render kartu catatan yang tidak berubah saat kartu lain diperbarui.
- **Akar Masalah (Bug/Logic):**
  Custom comparator `React.memo` hanya memeriksa `id`, `judul`, `konten`, `penting`, `warna`, dan `diperbaruiPada`, tetapi **tidak memeriksa `kategori` maupun `pending`**.
- **Reality Check & Bukti Pemicu:**
  - Pada [notebook-context.js](file:///c:/MY%20project%20Website/todowebb%20V2/lib/notebook-context.js#L365-L371) dan [notebook-context.js](file:///c:/MY%20project%20Website/todowebb%20V2/lib/notebook-context.js#L401-L409), fungsi `deleteCustomCategory` mengosongkan `n.kategori = ""` tanpa mengubah `diperbaruiPada`.
  - Saat kategori dihapus atau status `pending` selesai sinkronisasi (`1 -> 0`), kartu catatan tetap menampilkan badge kategori lama / titik kuning pending hingga reload.
- **Blast Radius & Caller:** `app/(dashboard)/notebook/page.js` yang merender daftar `NotebookCard`.
- **Saran Perbaikan Minimal (Ponytail Fix):**
  Tambahkan `prevProps.notebook.kategori === nextProps.notebook.kategori && prevProps.notebook.pending === nextProps.notebook.pending` pada comparator `memo`.
- **Dampak jika Diabaikan:** UI kartu menampilkan kategori usang atau indikator sync palsu setelah hapus kategori / selesai sync.

---

## 2. SHOULD FIX (Ergonomi Mobile, Robustness, & Arsitektur)

### [4] Target Sentuh Mini (`< 44x44px`) pada Tombol Aksi Mobile di `NotebookPreviewModal` & `NotebookCard`
- **Lokasi Berkas:**
  - [NotebookPreviewModal.js](file:///c:/MY%20project%20Website/todowebb%20V2/components/notebook/NotebookPreviewModal.js#L198-L231) (`p-2` + `w-4 h-4` = 32×32px)
  - [NotebookCard.js](file:///c:/MY%20project%20Website/todowebb%20V2/components/notebook/NotebookCard.js#L187-L232) (`p-1.5` + `w-3.5 h-3.5` = 26×26px)
- **Akar Masalah:** Melanggar standar touch target mobile minimum 44×44px; pada kartu catatan di HP, pengguna mudah salah tekan dan malah memicu `openPreviewNotebook`.
- **Saran Perbaikan Minimal:** Naikkan area sentuh tombol aksi header preview minimal `min-h-[44px] min-w-[44px]` di mobile (atau tombol aksi kompak berlabel jelas) dan perbesar hit-area ikon kartu.

### [5] Potensi Kehilangan Perubahan Terakhir & Race Condition Auto-Save di `EditNotebookModal`
- **Lokasi Berkas:** [EditNotebookModal.js](file:///c:/MY%20project%20Website/todowebb%20V2/components/notebook/EditNotebookModal.js#L96-L152)
- **Akar Masalah:**
  1. Saat user mengetik lalu langsung menekan "Selesai Edit" dalam waktu `< 1.5 detik`, `handleSubmit` tidak membatalkan `autoSaveTimerRef.current` terlebih dahulu, sehingga dua mutasi `updateNotebook` berpotensi berjalan berdekatan.
  2. Jika user menekan "Tutup" sebelum debounce 1.5 detik selesai, cleanup effect menghapus timer sehingga perubahan terakhir batal tersimpan tanpa peringatan.
- **Saran Perbaikan Minimal:** Batalkan `autoSaveTimerRef.current` di awal `handleSubmit`.

### [6] `htmlToChatFormattedText` Mengubah Ordered List (`<ol>`) Menjadi Bullet (`•`)
- **Lokasi Berkas:** [utils.js](file:///c:/MY%20project%20Website/todowebb%20V2/lib/utils.js#L247)
- **Akar Masalah:** Regex `<li\b[^>]*>...</li>` mengonversi seluruh item list baik `<ul>` maupun `<ol>` menjadi `\n• $1`, sehingga daftar bernomor (1, 2, 3) kehilangan penomoran saat disalin.
- **Saran Perbaikan Minimal:** Tangani blok `<ol>...</ol>` terlebih dahulu sebelum fallback `<li>` menjadi bullet.

---

## 3. NICE TO HAVE (Lean, DRY & SRP)

### [7] Duplikasi Logika `handleCopy` di 3 Komponen Notebook
- **Lokasi Berkas:** `NotebookCard.js`, `NotebookPreviewModal.js`, `EditNotebookModal.js`
- **Saran Perbaikan:** Ekstrak helper ringan `copyNotebookContentToClipboard(konten)` di `lib/utils.js` (atau helper kecil terfokus) agar format salin, guard isi kosong, dan fallback clipboard konsisten di satu sumber kebenaran.

### [8] Ukuran File `lib/notebook-context.js` (1085 Baris) & Duplikasi Form Add/Edit Modal
- **Lokasi Berkas:** [notebook-context.js](file:///c:/MY%20project%20Website/todowebb%20V2/lib/notebook-context.js), [AddNotebookModal.js](file:///c:/MY%20project%20Website/todowebb%20V2/components/notebook/AddNotebookModal.js), [EditNotebookModal.js](file:///c:/MY%20project%20Website/todowebb%20V2/components/notebook/EditNotebookModal.js)
- **Catatan YAGNI:** Tidak perlu direfaktor besar dalam pembaruan bedah ini kecuali user meminta, agar blast radius tetap minimal.

---

## KESIMPULAN AUDIT
- **Total Temuan:** 8 (Must Fix: 3 | Should Fix: 3 | Nice to Have: 2)
- **Akar Masalah Permintaan User:**
  1. Judul ikut tersalin disebabkan string template `` `${judul}\n\n${formattedText}` `` di **3 komponen sekaligus** (`NotebookCard`, `NotebookPreviewModal`, `EditNotebookModal`).
  2. Tombol Edit di bawah & ribet di-scroll disebabkan tombol Edit hanya ada di footer `NotebookPreviewModal` sementara header `NotebookPreviewModal` + header kosong `Modal.js` + container scroll luar mendorong footer keluar dari layar.
- **Area yang Tidak Diperiksa:** Skema database Supabase production secara langsung (hanya memeriksa API route & migrasi lokal).
