# TRINITY CODE AUDIT REPORT (TASK DEADLINE PERSISTENCE & NOTIFICATION DISPATCH)

**Target:** `lib/task-context.js`, `lib/modules/sync/sync.repository.js`, `lib/modules/sync/sync.service.js`, `app/api/notifications/dispatch/route.js`  
**Kasus:** Tenggat waktu (deadline tanggal & jam) tidak tersimpan saat membuat/mengubah tugas, data hilang setelah sinkronisasi/refresh, dan notifikasi pengingat pra-tenggat tidak muncul saat mendekati jadwal.  
**Mesin Audit:** Trinity Code (Macro Architecture x Micro AST x Reality Checker) x Disiplin AI.  
**Mode:** READ-ONLY Deep Architectural Audit (Fase 1).

---

## 1. MUST FIX (Akar Masalah Fatal)

### [1] Contract Discrepancy: Property Typo 'tenggatWaktu' vs 'deadline' pada Outbox Payload di TaskContext
- **Lokasi Berkas:** [task-context.js](file:///c:/MY%20project%20Website/todowebb%20V2/lib/task-context.js#L265-L274) dan [task-context.js](file:///c:/MY%20project%20Website/todowebb%20V2/lib/task-context.js#L349-L358)
- **Fungsi Kode:** Mengemas mutasi pembuatan tugas baru (`addTask`) dan pembaruan tugas (`updateTask`) ke dalam antrian `outbox` IndexedDB lokal untuk sinkronisasi offline-first.
- **Akar Masalah (Bug/Logic):**
  1. Komponen formulir UI ([AddTaskModal.js](file:///c:/MY%20project%20Website/todowebb%20V2/components/tugas/AddTaskModal.js#L87-L96) dan [EditTaskModal.js](file:///c:/MY%20project%20Website/todowebb%20V2/components/tugas/EditTaskModal.js#L112-L122)) mengemas objek tugas dengan properti `deadline` (ISO string) dan `reminder` (misal `"1h"`).
  2. Di dalam [task-context.js](file:///c:/MY%20project%20Website/todowebb%20V2/lib/task-context.js#L269), fungsi `addTask` mengoper payload outbox dengan menulis:
     ```javascript
     tenggatWaktu: newTask.tenggatWaktu || null,
     ```
     Variabel `newTask.tenggatWaktu` bernilai `undefined` karena input UI mengirimkan `newTask.deadline`. Akibatnya, payload outbox menyimpan `tenggatWaktu: null` dan properti `deadline` serta `reminder` sama sekali tidak disertakan ke dalam mutasi outbox!
  3. Hal serupa terjadi pada [task-context.js](file:///c:/MY%20project%20Website/todowebb%20V2/lib/task-context.js#L353) di fungsi `updateTask`: properti `deadline` dan `reminder` tidak dimasukkan ke dalam payload outbox, melainkan digantikan `tenggatWaktu`.
- **Reality Check & Bukti Pemicu (Data Flow Tracing):**
  - Langkah 1: Pengguna mengisi judul dan memilih tanggal 17 November 2026 jam 20:00 di UI.
  - Langkah 2: State lokal sementara menerima `deadline`, namun `enqueueWithRow` merekam outbox tanpa properti `deadline`.
  - Langkah 3: Saat background sync (`syncAll`) memicu `flushOutbox`, objek yang dikirim ke endpoint `/api/sync` hanya memiliki field `tenggatWaktu: null`.
  - Langkah 4: Fungsi `upsertTask` di server ([sync.repository.js](file:///c:/MY%20project%20Website/todowebb%20V2/lib/modules/sync/sync.repository.js#L509)) membaca `item.deadline`. Karena `item.deadline` tidak ada (`undefined`), server memasukkan `deadline = NULL` ke database PostgreSQL.
  - Langkah 5: Respon sinkronisasi (`pull`) mengirimkan data terbaru dari server dengan `deadline: null`.
  - Langkah 6: Client menjalankan `applyPullDelta` dan memancarkan event `mytask:synced`. Dexie lokal diperbarui dengan baris server (`deadline: null`), menimpa data memori client.
  - Langkah 7: Pengguna menutup aplikasi atau me-refresh tab; fungsi `loadData` mengambil data dari Dexie dan `/api/tasks`, keduanya mengembalikan `deadline: null`. Tugas tampil tanpa tenggat waktu.
- **Blast Radius & Caller:**
  - `useTasks().addTask`
  - `useTasks().updateTask`
  - Seluruh pengguna yang membuat atau mengubah tugas dalam kondisi offline maupun online.
- **Saran Perbaikan Minimal (Ponytail Fix):**
  Sertakan properti `deadline` dan `reminder` ke dalam payload outbox `enqueueWithRow` di `addTask` dan `updateTask`, serta petakan `kategoriClientUuid`:
  ```javascript
  await enqueueWithRow(localDb, activeUserId, "tasks", taskRow, {
    judul: newTask.judul,
    deskripsi: newTask.deskripsi || "",
    prioritas: newTask.prioritas || false,
    deadline: newTask.deadline || null,
    reminder: newTask.reminder || "1h",
    selesai: false,
    kategoriId: newTask.kategoriId || null,
    kategoriClientUuid: cat?.clientUuid || newTask.kategoriClientUuid || null,
    subtasks: newTask.subtasks || [],
    updatedAt: nowIso,
  });
  ```
- **Dampak jika Diabaikan:** Seluruh tugas baru dan pembaruan tugas kehilangan tanggal tenggat waktu dan pengaturan pengingat secara permanen setelah sinkronisasi pertama.

---

### [2] Kegagalan Eksekusi Notifikasi di Background Dispatcher
- **Lokasi Berkas:** [route.js](file:///c:/MY%20project%20Website/todowebb%20V2/app/api/notifications/dispatch/route.js#L149) dan [sync.service.js](file:///c:/MY%20project%20Website/todowebb%20V2/lib/modules/sync/sync.service.js#L164-L171)
- **Fungsi Kode:** Menjalankan pengecekan cron periodik dan instant push notification untuk tugas yang mendekati deadline.
- **Akar Masalah (Bug/Logic):**
  1. Kueri reservasi notifikasi di [route.js](file:///c:/MY%20project%20Website/todowebb%20V2/app/api/notifications/dispatch/route.js#L149) memfilter:
     ```sql
     WHERE t.selesai = false
       AND t.deleted_at IS NULL
       AND t.deadline IS NOT NULL
     ```
     Karena bug [1] menyebabkan `t.deadline` di database selalu bernilai `NULL`, kueri reservasi mengabaikan seluruh tugas pengguna. Akibatnya, notifikasi pengingat pra-tenggat maupun deadline habis tidak pernah terkirim.
  2. Selain itu, pada [sync.service.js](file:///c:/MY%20project%20Website/todowebb%20V2/lib/modules/sync/sync.service.js#L164), kondisi instant trigger `hasTaskDispatchCandidate` memeriksa `taskItem.deadline`. Karena item yang di-push tidak memiliki properti `deadline`, instant dispatch setelah sync juga dilewati.
- **Reality Check & Bukti Pemicu:**
  - Pengguna membuat tugas dengan tenggat 1 jam lagi.
  - Karena database menyimpan `deadline: NULL`, cron job GitHub Actions (setiap 10 menit) dan Supabase pg_cron tidak menemukan baris yang memenuhi syarat, sehingga push notification tidak pernah terkirim ke Service Worker browser.
- **Blast Radius & Caller:**
  - `GET /api/notifications/dispatch`
  - Instant dispatch pada `runSync`
- **Saran Perbaikan Minimal:**
  Memperbaiki bug [1] secara otomatis memulihkan nilai `deadline` di PostgreSQL, sehingga kueri reservasi notifikasi langsung mengenali tugas yang mendekati tenggat. Tambahkan penanganan fallback atribut `tenggatWaktu` pada `upsertTask` di `sync.repository.js` sebagai jaring pengaman backward-compatibility.
- **Dampak jika Diabaikan:** Pengguna tidak menerima pemberitahuan apa pun saat tenggat waktu mendekat ketika aplikasi ditutup.

---

## 2. SHOULD FIX (Risiko Skala, Blast Radius & Robustness)

### [3] Logika Null-Safety Penonaktifan Tenggat Waktu pada upsertTask di Sync Repository
- **Lokasi Berkas:** [sync.repository.js](file:///c:/MY%20project%20Website/todowebb%20V2/lib/modules/sync/sync.repository.js#L509-L510)
- **Fungsi Kode:** Rekonsiliasi mutasi tugas di sisi server database PostgreSQL.
- **Akar Masalah (Bug/Logic):**
  Kode saat ini menulis:
  ```javascript
  const cleanDeadline = item.deadline ? toIsoStringSafe(item.deadline) : (existing ? toIsoStringSafe(existing.deadline) : null);
  const cleanReminder = item.reminder ? String(item.reminder).trim().slice(0, 100) : (existing ? existing.reminder : null);
  ```
  Jika pengguna sengaja menghapus tenggat waktu dari tugas yang sudah ada (mengubah `deadline` menjadi `null`), evaluasi ternary `item.deadline ? ...` bernilai falsy. Akibatnya, kode jatuh ke cabang `(existing ? toIsoStringSafe(existing.deadline) : null)`, yang mengembalikan nilai deadline lama! Pengguna menjadi tidak bisa menghapus deadline setelah disetel.
- **Reality Check & Bukti Pemicu:**
  - Tugas A memiliki deadline 2026-11-20.
  - Pengguna mengedit tugas A dan mengosongkan tanggal tenggat (mengirim `deadline: null`).
  - Server tetap mempertahankan nilai 2026-11-20 karena ternary menganggap `null` falsy dan mengambil `existing.deadline`.
- **Saran Perbaikan Minimal:**
  Gunakan pengecekan eksplisit `item.deadline !== undefined`:
  ```javascript
  const cleanDeadline = item.deadline !== undefined
    ? (item.deadline ? toIsoStringSafe(item.deadline) : null)
    : (item.tenggatWaktu !== undefined
        ? (item.tenggatWaktu ? toIsoStringSafe(item.tenggatWaktu) : null)
        : (existing ? toIsoStringSafe(existing.deadline) : null));

  const cleanReminder = item.reminder !== undefined
    ? (item.reminder ? String(item.reminder).trim().slice(0, 100) : null)
    : (existing ? existing.reminder : null);
  ```
- **Dampak jika Diabaikan:** Pengguna tidak dapat membatalkan atau menghapus tenggat waktu tugas yang sudah terlanjur memiliki deadline.

---

### [4] Sinkronisasi kategoriClientUuid pada Outbox Task
- **Lokasi Berkas:** [task-context.js](file:///c:/MY%20project%20Website/todowebb%20V2/lib/task-context.js#L265) dan [task-context.js](file:///c:/MY%20project%20Website/todowebb%20V2/lib/task-context.js#L349)
- **Fungsi Kode:** Menyimpan relasi kategori tugas ke Dexie lokal dan server.
- **Akar Masalah:**
  Spesifikasi kontrak sinkronisasi ([contract.js](file:///c:/MY%20project%20Website/todowebb%20V2/lib/sync/contract.js#L103)) mewajibkan baris tasks menyertakan `kategoriClientUuid`. Di `task-context.js`, `taskRow` dan outbox payload hanya menyertakan `kategoriId`, tanpa meresolusi `kategoriClientUuid` dari state kategori.
- **Saran Perbaikan Minimal:**
  Petakan `cat = categories.find(c => String(c.id) === String(kategoriId))` dan sertakan `kategoriClientUuid: cat?.clientUuid || null` pada baris Dexie dan payload outbox.

---

## 3. NICE TO HAVE (Lean & Test Coverage)

### [5] Penambahan Unit Test untuk Deadline & Reminder pada Offline Sync Test Suite
- **Lokasi Berkas:** [sync-repository.test.mjs](file:///c:/MY%20project%20Website/todowebb%20V2/tests/offline/sync-repository.test.mjs)
- **Kondisi Saat Ini:** Seluruh skenario pengujian offline saat ini hanya menyertakan payload `deadline: null` dan `reminder: null`.
- **Saran:** Tambahkan unit test yang menguji penyimpanan tanggal tenggat waktu valid (ISO string) dan opsi reminder kustom (`30m`, `1h`, `1d`) serta skenario pengosongan deadline (`deadline: null`).

---

## KESIMPULAN AUDIT
- **Total Temuan:** 5 (Must Fix: 2 | Should Fix: 2 | Nice to Have: 1)
- **Akar Penyebab Utama Insiden:** Ketidaksinkronan nama properti (`tenggatWaktu` vs `deadline`) dan hilangnya field `reminder` pada outbox payload di `TaskContext`, yang memicu penimpaan data `NULL` dari server kembali ke client saat proses sinkronisasi latar belakang selesai.
- **Status Kode:** READ-ONLY (Belum ada baris kode produksi yang dimodifikasi sebelum konfirmasi).
