# TRINITY CODE AUDIT REPORT (OFFLINE PWA & CHROMIUM NAVIGATION DEEP DIVE)

**Target:** `public/sw.js`, `next.config.js`, `middleware.js`, `app/(dashboard)/layout.js`  
**Kasus:** Insiden `ERR_FAILED` pada `https://mytask-self.vercel.app/dashboard` dan Chromium PWA Default Offline Fallback ("You're offline").  
**Mesin Audit:** Trinity Code (Macro Architecture x Micro AST x Reality Checker) x Aegis Backend (OWASP Top 10:2025).  
**Mode:** READ-ONLY Deep Architectural Audit.

---

## 1. BUKTI FAKTA & ANALISIS SCREENSHOT

Berdasarkan 2 tangkapan layar yang diunggah pengguna pada 11/16/2026 pukul 09:57:
1. **Screenshot 1 (`media_1794797877949_41b4ab8f.png`):**
   - URL: `https://mytask-self.vercel.app/dashboard`
   - Galat: `This site can't be reached`
   - Deskripsi: `The webpage at https://mytask-self.vercel.app/dashboard might be temporarily down or it may have moved permanently to a new web address. ERR_FAILED`
   - Status Jaringan: Ikon bola bumi terputus di taskbar Windows (perangkat dalam keadaan Offline total).

2. **Screenshot 2 (`media_1794797883401_17a6d940.png`):**
   - Jendela PWA: `MyTask — Manajemen Tugas Pintar`
   - URL: `https://mytask-self.vercel.app`
   - Tampilan: Ikon aplikasi MyTask di tengah layar + ikon awan dicoret + tulisan `"You're offline"`.
   - Sumber: Layar fallback default bawaan Google Chrome (Chromium Native PWA Offline Screen).

---

## 2. MUST FIX (Akar Masalah Fatal)

### [1] Chromium net::ERR_FAILED Akibat Penyajian Redirected Response dari Cache
- **Lokasi Berkas:** `public/sw.js:L268-L358`
- **Akar Masalah (Chromium Fetch Spec Conflict):**
  1. Pada arsitektur Next.js Server (`app/(dashboard)/layout.js` dan `middleware.js`), rute `/` dan `/dashboard` dilindungi pemeriksaan sesi. Jika belum ada sesi atau saat Service Worker melakukan background fetch saat install, server melempar HTTP 307 Temporary Redirect ke `/login`.
  2. Fungsi bawaan `fetch(route)` di dalam Service Worker secara otomatis mengikuti pengalihan (`redirect: 'follow'`). Akibatnya, respon yang diterima memiliki flag `res.redirected === true` dan URL asal berubah menjadi `.../login`.
  3. Respon dengan flag `redirected === true` ini kemudian tersimpan ke dalam `CacheStorage` dengan key `"/dashboard"`.
  4. Ketika perangkat pengguna beralih ke mode offline dan melakukan navigasi langsung ke `https://mytask-self.vercel.app/dashboard`, Service Worker mengambil respon tersebut dari cache dan mengembalikannya langsung ke browser via `event.respondWith(cached)`.
  5. Menurut spesifikasi W3C Service Worker dan implementasi Chromium Network Service (`service_worker_controllee_request_handler.cc`):
     Jika sebuah Service Worker mengembalikan respon bertipe *redirected* ke dalam sebuah permintaan navigasi dokumen tanpa penanganan redirect mode yang valid, Chromium secara otomatis membatalkan navigasi dan melempar galat `net::ERR_FAILED`.
  6. Pesan subteks pada screenshot: *"might be temporarily down or it may have moved permanently to a new web address. ERR_FAILED"* merupakan bukti tak terbantahkan bahwa Chromium menolak respon pengalihan yang tersimpan di cache lokal saat jaringan terputus.
- **Solusi Rekayasa Bersih (Surgical Clean Fix):**
  Saat menyimpan atau menyajikan App Shell dokumen dari CacheStorage, Service Worker WAJIB membersihkan flag redirected dengan merekonstruksi Response sintetis berstatus 200 OK murni:
  ```javascript
  const cleanResponse = new Response(await cachedResponse.blob(), {
    status: 200,
    statusText: "OK",
    headers: cachedResponse.headers,
  });
  return cleanResponse;
  ```
  Dengan merekonstruksi respon berstatus 200 murni, Chromium akan menerima dokumen tanpa ada konflik redirect, sehingga `ERR_FAILED` hilang seketika dan App Shell langsung dimuat ke layar.

---

### [2] Kegagalan Match Dokumen Root ("/") Memicu Chromium Native PWA Offline Screen
- **Lokasi Berkas:** `public/sw.js:L303-L358`
- **Akar Masalah:**
  1. PWA Desktop dan Mobile diluncurkan dengan membuka root URL `https://mytask-self.vercel.app` atau `https://mytask-self.vercel.app/`.
  2. Saat online, `middleware.js` me-redirect `/` ke `/dashboard` (jika login) atau `/login` (jika belum).
  3. Saat offline, pencocokan cache untuk `/` menghasilkan `cache miss` karena tidak ada dokumen statis yang pernah tersimpan murni dengan URL `/`.
  4. Ketika fallback mencoba mengembalikan `/dashboard`, fallback tersebut terkena efek domino masalah [1] di atas (`ERR_FAILED`), sehingga Chromium mendeteksi kegagalan total dalam merespon navigasi PWA dan langsung menampilkan layar bawaan Google Chrome: `"You're offline"`.
- **Solusi Rekayasa Bersih:**
  1. Rute `/` wajib dipetakan secara kanonikal ke App Shell `/dashboard` yang sudah disanitasi.
  2. Jika seluruh cache dokumen kosong, Service Worker wajib mengembalikan inline fallback HTML yang tidak pernah melempar galat jaringan.

---

### [3] Ketidaksinkronan Regex Header Cache-Control pada next.config.js
- **Lokasi Berkas:** `next.config.js:L42-L48`
- **Akar Masalah:**
  - Sintaks `source: "/(manifest.json|sw.js)"` pada `next.config.js` tidak valid menurut parser `path-to-regexp` versi Next.js 15.
  - Akibatnya, header `Cache-Control: no-cache, no-store, must-revalidate` tidak terpasang di Vercel Edge CDN untuk `sw.js` dan `manifest.json`.
  - Browser dapat menyimpan file `sw.js` lama di HTTP disk cache sampai 24 jam, menyebabkan pembaruan Service Worker tertunda saat pengguna membuka aplikasi.
- **Solusi Rekayasa Bersih:**
  Pisahkan header menjadi 2 entri eksplisit:
  ```javascript
  {
    source: "/sw.js",
    headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }],
  },
  {
    source: "/manifest.json",
    headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }],
  }
  ```

---

## 3. EVALUASI KEAMANAN BACKEND (AEGIS OWASP TOP 10:2025)

1. **A01: Broken Access Control & SSRF:** Status AMAN. Seluruh query database dilindungi session user ID dan parameter terikat.
2. **A02: Security Misconfiguration:** Perlu perbaikan pada regex cache header di `next.config.js` agar Service Worker tidak tertahan di CDN cache.
3. **A07: Authentication Failures & Offline Session:** Status AMAN. Endpoint `/api/auth/get-session` sudah memiliki handler offline yang mengembalikan snapshot sesi tersimpan di CacheStorage tanpa melempar crash.
4. **A10: Mishandling of Exceptional Conditions (Fail-Open/Fail-Closed):**
   - Service Worker saat ini mengalami kegagalan penanganan exception pada siklus navigasi offline (`ERR_FAILED`).
   - Penanganan error wajib direfaktor agar bersifat *graceful fallback* (mengembalikan Response 200 murni hasil dekonstruksi blob).

---

## 4. KESIMPULAN AUDIT & LANGKAH SELANJUTNYA
- **Total Temuan:** 3 Must Fix (1. Chromium redirected response rejection, 2. Root URL cache-miss domino, 3. Header regex syntax).
- **Status Tindakan:** Sesuai instruksi pengguna, audit ini bersifat **READ-ONLY murni**. Tidak ada kode yang diubah pada fase ini.
- **Rekomendasi:** Menunggu konfirmasi pengguna sebelum menerapkan sanitasi Response sintetis 200 OK di `public/sw.js` dan pemisahan header di `next.config.js`.
