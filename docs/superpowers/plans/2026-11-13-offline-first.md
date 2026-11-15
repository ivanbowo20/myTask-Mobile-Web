# Offline-First (Tasks, Notebooks, Categories, Theme) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` (recommended) atau `executing-plans` untuk mengeksekusi plan ini task-by-task. Setiap step memakai checkbox (`- [ ]`). Jangan lompat fase: ada gate kontrak di antara Fase 0 dan Fase 1–3.

**Goal:** Membuat aplikasi tetap bisa dibuka, dibaca, dan dimutasi saat offline 7–14 hari, lalu menyinkronkan antrian perubahan ke PostgreSQL tanpa duplikasi, tanpa kehilangan sub-tugas, dan tanpa data hantu.

**Architecture:** Server-authoritative sync. Klien (Dexie/IndexedDB) menjadi sumber kebenaran tampilan; setiap mutasi menulis baris lokal + entri `outbox` dalam satu transaksi IndexedDB. `POST /api/sync` menerima batch 50 item, memprosesnya berurutan (`categories → notebook_categories → tasks → notebooks`) dalam satu transaksi PostgreSQL, mengembalikan status per-item, lalu mengirim delta pull berbasis cursor `(updated_at, id)`. Konflik diselesaikan LWW per-record dengan `updated_at` server, dan konflik dilaporkan ke UI, bukan disembunyikan.

**Tech Stack:** Next.js 15 (App Router, JS murni), React 19, PostgreSQL via `pg` Pool, Better Auth, Dexie.js 4, Service Worker (Cache API + Background Sync trigger), `node:test` untuk unit test pure function.

**Spec:** Dokumen ini + hasil audit read-only di sesi sebelumnya (`docs/superpowers/plans/2026-11-13-offline-first.md` adalah satu-satunya artefak baru; tidak ada file kode yang diubah saat plan disusun).

---

## Decision Log (TERKUNCI — 24 keputusan user)

| # | Keputusan |
|---|---|
| 1 | LWW per-record memakai `updated_at` yang diisi server |
| 2 | Sub-tugas: merge per-item by `id` + flag tombstone per sub-item |
| 3 | Dexie.js di atas IndexedDB |
| 4 | Endpoint baru `/api/sync` |
| 5 | Kategori: transaksi server-side + remap temp id → id server |
| 6 | Batch 50/request, lanjut walau sebagian gagal, status per-item |
| 7 | Notebook disimpan offline sebagai HTML utuh |
| 8 | `client_uuid` unik per user + upsert idempoten |
| 9 | `deleted_at` di tasks, notebooks, categories, dan `notebook_categories` (keputusan #24) |
| 10 | Timestamp server-authoritative + clamp ±5 menit |
| 11 | Snapshot sesi di IndexedDB + mode read-only sampai online |
| 12 | Badge pending per-item + ikon Cloud-Off global + tombol sync di Navbar |
| 13 | `persist()` saat penulisan offline pertama + banner penuh, prune hanya data tersinkron |
| 14 | 4 sub-agent/fase: Kontrak+SQL → Sync API → Dexie+SW → Frontend |
| 15 | Migrasi Dexie aditif dengan `version().upgrade()` |
| 16 | `notebooks` mendapat `updated_at` kanonik; trigger juga mengisi `diperbarui_pada` |
| 17 | Satu DB Dexie + field `userId` di setiap row + purge saat logout |
| 18 | Service Worker hanya **memicu** sync (trigger-only); eksekusi di halaman |
| 19 | Harness test: `node:test` untuk pure function + script integrasi manual |
| 20 | Kill switch `NEXT_PUBLIC_OFFLINE_SYNC` (default `0`) |
| 21 | Konflik LWW diberitahukan via toast, server menang |
| 22 | Tombstone >90 hari dibersihkan `pg_cron` harian |
| 23 | Auto-save notebook: debounce 800ms + coalescing outbox |
| 24 | `notebook_categories` ikut `client_uuid` + `deleted_at` |

## Global Constraints

- **Dilarang** menyalakan `npm run dev` / `npm run start`. Verifikasi hanya `npm run lint`, `npm run build`, `node --test`.
- Semua query SQL wajib parameterized (`$1, $2, ...`). Tidak ada string concatenation.
- Setiap mutasi tetap memvalidasi kepemilikan via `session.user.id` (IDOR guard).
- Tidak menambah dependency selain `dexie` (dan `fake-indexeddb` hanya bila unit test IndexedDB benar-benar dibutuhkan).
- Mobile-first: kontrol sync & indikator pending harus terlihat di ≤640px, touch target ≥44px.
- Tidak memakai emoji Unicode di UI; ikon dari `@phosphor-icons/react` atau `lucide-react`.
- Semua timestamp yang dikirim ke klien adalah ISO-8601 UTC (`toISOString()`).
- Timeout/abort: tidak ada retry loop tanpa backoff; backoff maksimum 5 menit.

## Review Focus (5 kelas input paling mungkin menggigit)

1. **Ganti akun di perangkat yang sama saat offline** → HTML shell ter-cache bisa menampilkan tugas user sebelumnya. Wajib purge cache + DB lokal saat `signOut`.
2. **Auto-save notebook (debounce) membanjiri outbox** → coalescing per `clientUuid` harus terbukti, bukan diasumsikan.
3. **Rename/hapus kategori saat offline** → tugas harus ikut ter-remap lewat `clientUuid`, bukan nama teks.
4. **Kuota IndexedDB penuh di tengah transaksi** → baris lokal dan entri outbox harus all-or-nothing.
5. **429 dari `/api/sync`** → antrian tidak boleh hilang dan tidak boleh retry storm.

## Non-Goals (tegas tidak dikerjakan di plan ini)

- Sinkronisasi tema lintas perangkat (`profiles.theme_preference`) — tema sudah 100% offline.
- Realtime Supabase (publication `supabase_realtime` tetap ada tetapi tidak dipakai sync engine).
- Offline mode untuk halaman Notifikasi/Pengaturan/Auth.
- Multi-tab outbox locking tingkat lanjut (cukup `BroadcastChannel` untuk notifikasi sync).
- Migrasi `tasks.subtasks` JSONB ke tabel `public.subtasks`.

---

## File Structure

**Create**

| File | Tanggung jawab |
|---|---|
| `supabase/migrations/20261113_offline_first.sql` | Kolom `client_uuid`, `updated_at`, `deleted_at`, trigger, index, rewrite purge |
| `scripts/migrate-offline-first.js` | Runner migrasi + verifikasi kolom (read-only check setelah apply) |
| `lib/sync/contract.js` | Konstanta & enum bersama klien-server (limit, status, entity) |
| `lib/sync/subtasks.js` | `mergeSubtasks()` + `normalizeSubtasks()` (pure, teruji) |
| `lib/sync/ordering.js` | `sortSyncItems()` — urutan dependensi + deteksi referensi hilang |
| `lib/modules/sync/sync.service.js` | Orkestrasi transaksi, validasi, LWW, hasil per-item |
| `lib/modules/sync/sync.repository.js` | Query upsert/tombstone/pull per entity |
| `app/api/sync/route.js` | HTTP handler `/api/sync` (auth, rate limit, size guard) |
| `lib/local/db.js` | Dexie schema v1 + `version().upgrade()` |
| `lib/local/feature-flag.js` | Kill switch `NEXT_PUBLIC_OFFLINE_SYNC` |
| `lib/local/storage.js` | `ensurePersisted()`, `isQuotaError()`, `pruneSyncedNotebooks()` |
| `lib/local/outbox.js` | `enqueue()`, `coalesce()`, `takeBatch()`, `ack()` |
| `lib/local/sync-engine.js` | `flushOutbox()`, `pullChanges()`, `syncAll()` |
| `lib/local/session-snapshot.js` | Simpan/baca snapshot sesi offline |
| `lib/use-online-status.js` | Hook `online`, `pendingCount`, `lastSyncAt` |
| `components/pwa/OfflineStatusBadge.js` | Ikon Cloud-Off + badge pending + tombol sync |
| `public/offline.html` | Fallback statis tanpa JS saat navigasi gagal |
| `tests/offline/subtasks.test.mjs` | Unit test merge sub-tugas |
| `tests/offline/outbox.test.mjs` | Unit test coalescing (fake-indexeddb bila perlu) |
| `tests/offline/ordering.test.mjs` | Unit test urutan dependensi |
| `scripts/verify-sync-endpoint.mjs` | Integrasi manual (butuh server hidup dari user) |

**Modify**

| File | Perubahan |
|---|---|
| `lib/db.js` | Tambah `withTransaction(fn)` |
| `lib/modules/tasks/task.repository.js` | Filter `deleted_at`, set `updated_at`, upsert by `client_uuid`, merge subtasks |
| `lib/modules/tasks/task.schemas.js` | Pertahankan id sub-tugas dari klien; kirim `diperbaruiPada` |
| `lib/server-data.js` | Filter `deleted_at IS NULL`, sertakan `clientUuid`/`updatedAt` |
| `app/api/tasks/route.js` | Teruskan `clientUuid` opsional, DELETE jadi soft delete |
| `app/api/categories/route.js` | Soft delete + unassign tasks + filter + partial unique |
| `app/api/notebooks/route.js` | Soft delete + filter + `clientUuid`/`updatedAt` di mapper |
| `app/api/notebook-categories/route.js` | Soft delete + filter + `clientUuid` |
| `supabase/schema.sql` | Rekonsiliasi: `notebook_categories`, `notebooks.kategori_id`, kolom sinkron |
| `lib/task-context.js` | Baca/tulis lewat Dexie + outbox, `liveQuery` |
| `lib/notebook-context.js` | Baca/tulis lewat Dexie + outbox; auto-save debounce 800ms + coalescing |
| `public/sw.js` | Rewrite: app shell, navigasi network-first, sync trigger, purge saat logout |
| `components/layout/Navbar.js` | Slot `OfflineStatusBadge` |
| `components/tugas/TaskCard.js` | Badge pending |
| `components/notebook/NotebookCard.js` | Badge pending |
| `components/layout/DashboardShell.js` | Pasang listener `online/offline` + sync awal |
| `app/api/notifications/dispatch/route.js` | Filter `deleted_at is null` + `updated_at` (blast radius soft delete) |
| `lib/notifications/reengagement.js` | Filter `deleted_at is null` |
| `lib/auth-client.js` | Purge `localDb` + cache SW sebelum `signOut()` |
| `package.json` | `dexie`, script `test:offline`, script `migrate:offline` |

---

## FASE 0 — Kontrak & Database (GATE)

> Tidak ada task Fase 1–3 yang boleh dimulai sebelum Task 0.4 (kontrak) di-review dan disetujui.

### Task 0.1: Migrasi skema PostgreSQL

**Files:**
- Create: `supabase/migrations/20261113_offline_first.sql`
- Create: `scripts/migrate-offline-first.js`
- Modify: `supabase/schema.sql`

**Interfaces:**
- Produces: kolom `client_uuid uuid not null default gen_random_uuid()`, `updated_at timestamptz not null default now()`, `deleted_at timestamptz null` pada `tasks`, `categories`, `notebooks`, `notebook_categories`.

- [ ] **Step 1: Tulis migrasi idempoten**

```sql
-- 20261113_offline_first.sql
alter table public.categories   add column if not exists client_uuid uuid not null default gen_random_uuid();
alter table public.tasks        add column if not exists client_uuid uuid not null default gen_random_uuid();
alter table public.notebooks    add column if not exists client_uuid uuid not null default gen_random_uuid();
alter table public.notebook_categories add column if not exists client_uuid uuid not null default gen_random_uuid();

alter table public.categories   add column if not exists updated_at timestamptz not null default timezone('utc', now());
alter table public.tasks        add column if not exists updated_at timestamptz not null default timezone('utc', now());
alter table public.notebooks    add column if not exists updated_at timestamptz not null default timezone('utc', now());
alter table public.notebook_categories add column if not exists updated_at timestamptz not null default timezone('utc', now());

alter table public.categories   add column if not exists deleted_at timestamptz;
alter table public.tasks        add column if not exists deleted_at timestamptz;
alter table public.notebooks    add column if not exists deleted_at timestamptz;
alter table public.notebook_categories add column if not exists deleted_at timestamptz;

-- Backfill baris lama yang mungkin lahir sebelum default terpasang
update public.categories   set client_uuid = gen_random_uuid() where client_uuid is null;
update public.tasks        set client_uuid = gen_random_uuid() where client_uuid is null;
update public.notebooks    set client_uuid = gen_random_uuid() where client_uuid is null;
update public.notebook_categories set client_uuid = gen_random_uuid() where client_uuid is null;

-- Idempotency: satu client_uuid hanya boleh sekali per user
create unique index if not exists uq_categories_user_client_uuid          on public.categories(user_id, client_uuid);
create unique index if not exists uq_tasks_user_client_uuid               on public.tasks(user_id, client_uuid);
create unique index if not exists uq_notebooks_user_client_uuid           on public.notebooks(user_id, client_uuid);
create unique index if not exists uq_notebook_categories_user_client_uuid on public.notebook_categories(user_id, client_uuid);

-- Cursor pull
create index if not exists idx_tasks_user_updated     on public.tasks(user_id, updated_at, id);
create index if not exists idx_categories_user_updated on public.categories(user_id, updated_at, id);
create index if not exists idx_notebooks_user_updated on public.notebooks(user_id, updated_at, id);
create index if not exists idx_notebook_categories_user_updated on public.notebook_categories(user_id, updated_at, id);

-- Nama kategori unik hanya untuk baris hidup (agar nama yang dihapus bisa dipakai lagi)
drop index if exists idx_categories_user_nama;
create unique index if not exists idx_categories_user_nama
  on public.categories(user_id, lower(nama)) where deleted_at is null;

-- Server-authoritative clock
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := timezone('utc', now());
  if tg_table_name = 'notebooks' then
    new.diperbarui_pada := timezone('utc', now());
  end if;
  return new;
end $$;

drop trigger if exists trg_tasks_touch on public.tasks;
create trigger trg_tasks_touch before insert or update on public.tasks
for each row execute function public.touch_updated_at();

drop trigger if exists trg_categories_touch on public.categories;
create trigger trg_categories_touch before insert or update on public.categories
for each row execute function public.touch_updated_at();

drop trigger if exists trg_notebooks_touch on public.notebooks;
create trigger trg_notebooks_touch before insert or update on public.notebooks
for each row execute function public.touch_updated_at();

drop trigger if exists trg_notebook_categories_touch on public.notebook_categories;
create trigger trg_notebook_categories_touch before insert or update on public.notebook_categories
for each row execute function public.touch_updated_at();

-- Purge lama: jangan hard delete, ubah jadi tombstone
create or replace function public.purge_old_completed_tasks()
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
declare purged integer;
begin
  update public.tasks
     set deleted_at = timezone('utc', now())
   where selesai = true
     and selesai_pada is not null
     and selesai_pada < (now() - interval '3 days')
     and deleted_at is null;
  get diagnostics purged = row_count;
  return purged;
end $$;

-- Retensi tombstone: lebih lama dari skenario offline maksimum (90 hari)
create or replace function public.purge_expired_tombstones()
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
declare purged integer := 0; n integer;
begin
  delete from public.tasks where deleted_at is not null and deleted_at < now() - interval '90 days';
  get diagnostics n = row_count; purged := purged + n;
  delete from public.notebooks where deleted_at is not null and deleted_at < now() - interval '90 days';
  get diagnostics n = row_count; purged := purged + n;
  delete from public.categories where deleted_at is not null and deleted_at < now() - interval '90 days';
  get diagnostics n = row_count; purged := purged + n;
  delete from public.notebook_categories where deleted_at is not null and deleted_at < now() - interval '90 days';
  get diagnostics n = row_count; purged := purged + n;
  return purged;
end $$;
```

- [ ] **Step 2: Jadwalkan pembersihan tombstone (opsional, aman jika pg_cron absen)**

```sql
do $do$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('mytask-purge-tombstones')
      where exists (select 1 from cron.job where jobname = 'mytask-purge-tombstones');
    perform cron.schedule(
      'mytask-purge-tombstones',
      '17 3 * * *',
      'select public.purge_expired_tombstones()'
    );
  end if;
end
$do$;
```

Jika `pg_cron` tidak aktif, migrasi tetap sukses dan tombstone dibersihkan manual. Jangan pernah menjadwalkan `purge_old_completed_tasks()` dan `purge_expired_tombstones()` pada jam yang sama.

- [ ] **Step 3: Tulis runner migrasi**

`scripts/migrate-offline-first.js` harus: baca file SQL, jalankan via `pg` Client (bukan Pool), lalu `SELECT column_name FROM information_schema.columns WHERE table_name = 'tasks'` dan pastikan `client_uuid`, `updated_at`, `deleted_at` ada. Exit code non-zero jika verifikasi gagal.

- [ ] **Step 4: Rekonsiliasi `supabase/schema.sql`**

Tambahkan definisi `public.notebook_categories` dan kolom `notebooks.kategori`/`kategori_id` ke schema kanonik, plus kolom baru dari Step 1. File schema harus bisa dijalankan ulang tanpa error (`if not exists`).

- [ ] **Step 5: User menjalankan migrasi**

Tambahkan script di `package.json`: `"migrate:offline": "node scripts/migrate-offline-first.js"`.

Run (dijalankan user, bukan agent): `npm run migrate:offline`
Expected: `OK: client_uuid/updated_at/deleted_at terverifikasi di 4 tabel`.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20261113_offline_first.sql scripts/migrate-offline-first.js supabase/schema.sql package.json
git commit -m "feat(db): add client_uuid, updated_at, deleted_at for offline sync"
```

---

### Task 0.2: Helper murni `mergeSubtasks` + `sortSyncItems`

**Files:**
- Create: `lib/sync/subtasks.js`
- Create: `lib/sync/ordering.js`
- Test: `tests/offline/subtasks.test.mjs`, `tests/offline/ordering.test.mjs`
- Modify: `package.json` (script `test:offline`)

**Interfaces:**
- Produces:
  - `normalizeSubtasks(raw) -> Array<{id:string, judul:string, selesai:boolean, deleted:boolean}>`
  - `mergeSubtasks(serverArr, clientArr) -> Array<{id,judul,selesai,deleted}>`
  - `sortSyncItems(items) -> {categories, notebookCategories, tasks, notebooks}`
  - `assertNoDanglingRefs(payload) -> Array<{entity, clientUuid, reason}>`

- [ ] **Step 1: Tulis test yang gagal**

```js
// tests/offline/subtasks.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { mergeSubtasks } from "../../lib/sync/subtasks.js";

test("client menambah sub-tugas baru tanpa menghapus milik server", () => {
  const server = [{ id: "s1", judul: "Baca bab 1", selesai: true, deleted: false }];
  const client = [{ id: "s2", judul: "Baca bab 2", selesai: false, deleted: false }];
  const merged = mergeSubtasks(server, client);
  assert.deepEqual(merged.map((s) => s.id), ["s1", "s2"]);
});

test("tombstone sub-tugas tidak hilang setelah merge berikutnya", () => {
  const server = [
    { id: "s1", judul: "A", selesai: false, deleted: false },
    { id: "s2", judul: "B", selesai: false, deleted: true },
  ];
  const client = [{ id: "s1", judul: "A", selesai: true, deleted: false }];
  const merged = mergeSubtasks(server, client);
  assert.equal(merged.find((s) => s.id === "s2").deleted, true);
  assert.equal(merged.find((s) => s.id === "s1").selesai, true);
});

test("id sub-tugas tidak pernah di-generate dari Date.now()", () => {
  const client = [{ judul: "Tanpa id", selesai: false }];
  const merged = mergeSubtasks([], client);
  assert.equal(merged.length, 1);
  assert.match(merged[0].id, /^[0-9a-f-]{36}$/);
});
```

- [ ] **Step 2: Jalankan dan pastikan gagal**

Run: `node --test tests/offline/subtasks.test.mjs`
Expected: FAIL karena `lib/sync/subtasks.js` belum ada.

- [ ] **Step 3: Implementasi minimal**

```js
// lib/sync/subtasks.js
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function newId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function normalizeSubtasks(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 15).map((item) => {
    const id = typeof item?.id === "string" && UUID_RE.test(item.id) ? item.id : newId();
    return {
      id,
      judul: typeof item?.judul === "string" ? item.judul.trim().slice(0, 150) : "",
      selesai: Boolean(item?.selesai),
      deleted: Boolean(item?.deleted),
    };
  }).filter((s) => s.judul.length > 0 || s.deleted);
}

export function mergeSubtasks(serverArr, clientArr) {
  const map = new Map();
  for (const s of normalizeSubtasks(serverArr)) map.set(s.id, s);
  for (const s of normalizeSubtasks(clientArr)) {
    const prev = map.get(s.id);
    map.set(s.id, prev ? { ...prev, ...s } : s);
  }
  return [...map.values()];
}
```

- [ ] **Step 4: Tambah test urutan dependensi**

```js
// tests/offline/ordering.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { sortSyncItems } from "../../lib/sync/ordering.js";

test("kategori selalu sebelum tugas, notebook_categories sebelum notebooks", () => {
  const out = sortSyncItems({
    tasks: [{ clientUuid: "t1" }],
    notebooks: [{ clientUuid: "n1" }],
    categories: [{ clientUuid: "c1" }],
    notebookCategories: [{ clientUuid: "nc1" }],
  });
  assert.deepEqual(Object.keys(out), ["categories", "notebookCategories", "tasks", "notebooks"]);
});
```

- [ ] **Step 5: Implementasi `sortSyncItems` + `assertNoDanglingRefs`**

`sortSyncItems` mengembalikan objek dengan urutan kunci tetap. `assertNoDanglingRefs` memeriksa setiap task dengan `kategoriClientUuid` yang tidak ada di `categories` batch **maupun** di payload pull terakhir; item seperti itu dikembalikan sebagai `{ entity: "tasks", clientUuid, reason: "missing_category" }` agar bisa ditunda, bukan digagalkan.

- [ ] **Step 6: Daftarkan script test di `package.json`**

Tambahkan ke `"scripts"`:

```json
"test:offline": "node --test tests/offline/"
```

Jangan mengubah script yang sudah ada (`test`, `build`, `lint`, `migrate:offline`).

- [ ] **Step 7: Jalankan test, lalu commit**

Run: `npm run test:offline`
Expected: PASS semua.
```bash
git add lib/sync tests/offline package.json
git commit -m "feat(sync): add pure subtask merge and dependency ordering"
```

---

### Task 0.3: `withTransaction` di `lib/db.js`

**Files:**
- Modify: `lib/db.js`
- Test: manual via `node -e` (read-only check) setelah migrasi

**Interfaces:**
- Produces: `withTransaction(async (client) => result) -> Promise<result>` yang `BEGIN`/`COMMIT`/`ROLLBACK` dan selalu `client.release()`.

- [ ] **Step 1: Tambahkan helper**

```js
export async function withTransaction(fn) {
  const pool = getDbPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    try { await client.query("ROLLBACK"); } catch (_) {}
    throw err;
  } finally {
    client.release();
  }
}
```

- [ ] **Step 2: Verifikasi tidak memecahkan pemanggil lama**

Run: `npm run lint`
Expected: 0 error baru. `lib/db.js` tidak mengubah signature `query()`.

- [ ] **Step 3: Commit**

```bash
git add lib/db.js
git commit -m "feat(db): add withTransaction helper"
```

---

### Task 0.4: Kontrak sync dibekukan (GATE)

**Files:**
- Create: `lib/sync/contract.js`

**Interfaces:**
- Produces konstanta yang dipakai server **dan** klien:
  - `SYNC_BATCH_SIZE = 50`, `PULL_PAGE_SIZE = 200`, `SYNC_MAX_BODY_BYTES = 2_097_152`, `MAX_CLOCK_SKEW_MS = 300_000`, `TOMBSTONE_RETENTION_DAYS = 90`
  - `ENTITY_ORDER = ["categories", "notebookCategories", "tasks", "notebooks"]`
  - `ITEM_STATUS = { CREATED, UPDATED, DELETED, CONFLICT, REJECTED, DUPLICATE_NAME, NOOP }`
  - `ITEM_STATUS` nilai string: `"created" | "updated" | "deleted" | "conflict" | "rejected" | "duplicate_name" | "noop"`

- [ ] **Step 1: Tulis kontrak**

```js
// lib/sync/contract.js
export const SYNC_BATCH_SIZE = 50;
export const PULL_PAGE_SIZE = 200;
export const SYNC_MAX_BODY_BYTES = 2_097_152;
export const MAX_CLOCK_SKEW_MS = 300_000;
export const TOMBSTONE_RETENTION_DAYS = 90;

export const ENTITY_ORDER = ["categories", "notebookCategories", "tasks", "notebooks"];

export const ITEM_STATUS = {
  CREATED: "created",
  UPDATED: "updated",
  DELETED: "deleted",
  CONFLICT: "conflict",
  REJECTED: "rejected",
  DUPLICATE_NAME: "duplicate_name",
  NOOP: "noop",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function isUuid(value) {
  return typeof value === "string" && UUID_RE.test(value);
}
```

- [ ] **Step 2: Tulis kontrak HTTP (di komentar file yang sama, bukan file terpisah)**

```js
/**
 * POST /api/sync
 * Request:
 * {
 *   since: string|null,                 // ISO; null = full snapshot
 *   cursors?: { tasks?: {updatedAt,id}, categories?: {...}, notebooks?: {...}, notebookCategories?: {...} },
 *   clientTime: string,                 // ISO; hanya untuk clamp, server tetap otoritatif
 *   push: {
 *     categories?:          SyncItem[],
 *     notebookCategories?:  SyncItem[],
 *     tasks?:               SyncItem[],
 *     notebooks?:           SyncItem[]
 *   }
 * }
 * Response:
 * {
 *   serverTime: string,
 *   results: { categories?: ItemResult[], notebookCategories?: ItemResult[], tasks?: ItemResult[], notebooks?: ItemResult[] },
 *   pull: { categories: Row[], notebookCategories: Row[], tasks: Row[], notebooks: Row[] },
 *   cursors: { ... },
 *   hasMore: { categories: boolean, notebookCategories: boolean, tasks: boolean, notebooks: boolean }
 * }
 * Row wajib memuat: clientUuid, serverId, updatedAt, deletedAt.
 * Row tasks/notebooks wajib juga memuat kategoriClientUuid (hasil resolusi kategori_id),
 * agar klien offline tidak perlu menebak relasi lewat id bigint.
 */
```

- [ ] **Step 3: Review gate**

User mereview kontrak ini. **Jangan lanjut ke Fase 1 sebelum disetujui.**

- [ ] **Step 4: Commit**

```bash
git add lib/sync/contract.js
git commit -m "feat(sync): freeze sync contract and limits"
```

---

## FASE 1 — Backend Sync API

### Task 1.1: Repository upsert kategori & notebook_categories

**Files:**
- Create: `lib/modules/sync/sync.repository.js`
- Modify: `app/api/categories/route.js`, `app/api/notebook-categories/route.js`

**Interfaces:**
- Consumes: `withTransaction`, `contract.js`
- Produces:
  - `upsertCategory(client, { userId, item }) -> { status, serverId }`
  - `upsertNotebookCategory(client, { userId, item }) -> { status, serverId }`
  - `resolveCategoryId(client, userId, item) -> bigint|null`

- [ ] **Step 1: Implementasi upsert kategori**

```js
export async function upsertCategory(client, { userId, item }) {
  const existing = await client.query(
    `select * from public.categories where user_id = $1 and client_uuid = $2 for update`,
    [userId, item.clientUuid]
  );

  if (item.deleted) {
    if (existing.rows.length === 0) return { status: "noop", serverId: null };
    await client.query(
      `update public.categories set deleted_at = timezone('utc', now()) where user_id = $1 and client_uuid = $2`,
      [userId, item.clientUuid]
    );
    await client.query(
      `update public.tasks set kategori_id = null where user_id = $1 and kategori_id = $2`,
      [userId, existing.rows[0].id]
    );
    return { status: "deleted", serverId: Number(existing.rows[0].id) };
  }

  const conflict =
    existing.rows[0] && item.baseUpdatedAt &&
    new Date(existing.rows[0].updated_at).toISOString() !== new Date(item.baseUpdatedAt).toISOString();

  try {
    const res = await client.query(
      `insert into public.categories (user_id, client_uuid, nama, warna, icon, deleted_at)
       values ($1, $2, $3, $4, $5, null)
       on conflict (user_id, client_uuid) do update
         set nama = excluded.nama, warna = excluded.warna, icon = excluded.icon, deleted_at = null
       returning id`,
      [userId, item.clientUuid, item.nama, item.warna || "#38BDF8", item.icon || "Briefcase"]
    );
    return { status: conflict ? "conflict" : existing.rows.length ? "updated" : "created", serverId: Number(res.rows[0].id) };
  } catch (err) {
    if (err.code === "23505") return { status: "duplicate_name", serverId: null };
    throw err;
  }
}
```

- [ ] **Step 2: Ubah DELETE kategori existing menjadi soft delete + unassign**

Ganti `DELETE FROM public.categories ...` dengan:

```sql
update public.categories
   set deleted_at = timezone('utc', now())
 where id = $1 and user_id = $2 and deleted_at is null;

update public.tasks
   set kategori_id = null
 where user_id = $2 and kategori_id = $1;
```

Unassign wajib agar tugas menerima `updated_at` baru dan ikut ter-pull perangkat lain.

- [ ] **Step 3: Tambahkan filter `deleted_at is null`**

Semua SELECT/COUNT/duplicate-check di `categories` dan `notebook-categories` wajib memfilter `deleted_at is null`. Untuk unique name check, WHERE harus mencakup `deleted_at is null` agar konsisten dengan partial index.

- [ ] **Step 4: Verifikasi**

Run: `npm run lint` → 0 error. Lalu user memverifikasi manual: hapus satu kategori di UI, pastikan tugas terkait tidak lagi menampilkan kategori dan baris masih ada di DB dengan `deleted_at` terisi (query read-only).

- [ ] **Step 5: Commit**

```bash
git add lib/modules/sync/sync.repository.js app/api/categories/route.js app/api/notebook-categories/route.js
git commit -m "feat(sync): soft delete and idempotent upsert for categories"
```

---

### Task 1.2: Repository upsert tasks (merge sub-tugas + remap kategori)

**Files:**
- Modify: `lib/modules/sync/sync.repository.js`
- Modify: `lib/modules/tasks/task.repository.js`, `lib/modules/tasks/task.schemas.js`

**Interfaces:**
- Produces: `upsertTask(client, { userId, item }) -> { status, serverId, row }`
- Mengonsumsi: `mergeSubtasks`, `resolveCategoryId`

- [ ] **Step 1: Implementasi `resolveCategoryId` (remap temp id → id server)**

```js
export async function resolveCategoryId(client, userId, item) {
  if (item.kategoriClientUuid) {
    const res = await client.query(
      `select id from public.categories
        where user_id = $1 and client_uuid = $2 and deleted_at is null`,
      [userId, item.kategoriClientUuid]
    );
    return res.rows[0]?.id ?? null;
  }
  if (item.kategoriId) {
    const res = await client.query(
      `select id from public.categories
        where user_id = $1 and id = $2 and deleted_at is null`,
      [userId, item.kategoriId]
    );
    return res.rows[0]?.id ?? null;
  }
  return null;
}
```

Kategori yang belum ada di server menghasilkan `null` (bukan error) agar tugas tidak hilang; outbox akan mengirim ulang setelah kategori tercipta.

- [ ] **Step 2: Implementasi `upsertTask`**

```js
export async function upsertTask(client, { userId, item }) {
  const existing = await client.query(
    `select * from public.tasks where user_id = $1 and client_uuid = $2 for update`,
    [userId, item.clientUuid]
  );
  const prev = existing.rows[0];

  if (item.deleted) {
    if (!prev) return { status: "noop", serverId: null };
    await client.query(
      `update public.tasks set deleted_at = timezone('utc', now()) where id = $1 and user_id = $2`,
      [prev.id, userId]
    );
    return { status: "deleted", serverId: Number(prev.id) };
  }

  const kategoriId = await resolveCategoryId(client, userId, item);
  const mergedSubtasks = mergeSubtasks(prev?.subtasks, item.subtasks);
  const conflict =
    prev && item.baseUpdatedAt &&
    new Date(prev.updated_at).toISOString() !== new Date(item.baseUpdatedAt).toISOString();

  if (prev) {
    const res = await client.query(
      `update public.tasks
          set judul = $1, deskripsi = $2, deadline = $3, reminder = $4, kategori_id = $5,
              prioritas = $6, selesai = $7,
              selesai_pada = case when $7 then coalesce($8, timezone('utc', now())) else null end,
              subtasks = $9::jsonb, deleted_at = null
        where id = $10 and user_id = $11
        returning *`,
      [item.judul, item.deskripsi || "", item.deadline || null, item.reminder || null, kategoriId,
       Boolean(item.prioritas), Boolean(item.selesai), item.selesaiPada || null,
       JSON.stringify(mergedSubtasks), prev.id, userId]
    );
    return { status: conflict ? "conflict" : "updated", serverId: Number(prev.id), row: res.rows[0] };
  }

  const res = await client.query(
    `insert into public.tasks
       (user_id, client_uuid, kategori_id, judul, deskripsi, deadline, reminder, prioritas, selesai, selesai_pada, subtasks)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb)
     returning *`,
    [userId, item.clientUuid, kategoriId, item.judul, item.deskripsi || "", item.deadline || null,
     item.reminder || null, Boolean(item.prioritas), Boolean(item.selesai), item.selesaiPada || null,
     JSON.stringify(mergedSubtasks)]
  );
  return { status: "created", serverId: Number(res.rows[0].id), row: res.rows[0] };
}
```

- [ ] **Step 3: Perbaiki generator id sub-tugas yang tidak stabil**

Di `task.schemas.js`, ganti `sub_${Date.now()}_${index}` menjadi **id yang dikirim klien dipertahankan**, dan jika tidak ada id, gunakan `crypto.randomUUID()` (bukan timestamp). Jangan pernah men-generate ulang id yang sudah ada.

- [ ] **Step 4: Filter `deleted_at` di seluruh operasi tasks**

Wajib di: `findTasksByUserId`, `countTasksByUserId`, `checkCategoryOwnership` (kategori harus `deleted_at is null`), `findTaskDeadlineByIdAndUser`, `deleteTaskByIdAndUser` (ubah jadi soft delete), `deleteCompletedTasksByUserId` (soft delete), serta `SELECT` di `server-data.js`.

- [ ] **Step 5: Ekspos `clientUuid` + `updatedAt` di mapper**

`mapRowToTask` menambah `clientUuid: row.client_uuid` dan `diperbaruiPada: parseDbDate(row.updated_at)`. Lakukan hal yang sama pada `mapRowToNotebook` (`clientUuid`, `updatedAt`, `kategoriClientUuid`) dan `mapRowToCategory` (`clientUuid`, `updatedAt`).

- [ ] **Step 6: Verifikasi**

Run: `npm run lint` → 0 error. Unit test `node --test tests/offline/` → PASS (merge dipakai server).

- [ ] **Step 7: Commit**

```bash
git add lib/modules/sync/sync.repository.js lib/modules/tasks lib/server-data.js
git commit -m "feat(sync): task upsert with subtask merge and category remap"
```

---

### Task 1.3: Repository upsert notebook

**Files:**
- Modify: `lib/modules/sync/sync.repository.js`

**Interfaces:**
- Produces: `upsertNotebook(client, { userId, item }) -> { status, serverId, row }`

- [ ] **Step 1: Implementasi**

```js
export async function upsertNotebook(client, { userId, item }) {
  const existing = await client.query(
    `select * from public.notebooks where user_id = $1 and client_uuid = $2 for update`,
    [userId, item.clientUuid]
  );
  const prev = existing.rows[0];

  if (item.deleted) {
    if (!prev) return { status: "noop", serverId: null };
    await client.query(
      `update public.notebooks set deleted_at = timezone('utc', now()) where id = $1 and user_id = $2`,
      [prev.id, userId]
    );
    return { status: "deleted", serverId: Number(prev.id) };
  }

  const kategoriId = item.notebookKategoriClientUuid
    ? (await client.query(
        `select id from public.notebook_categories where user_id = $1 and client_uuid = $2 and deleted_at is null`,
        [userId, item.notebookKategoriClientUuid]
      )).rows[0]?.id ?? null
    : null;

  const conflict =
    prev && item.baseUpdatedAt &&
    new Date(prev.updated_at).toISOString() !== new Date(item.baseUpdatedAt).toISOString();

  const konten = typeof item.konten === "string" ? item.konten.slice(0, 100000) : "";

  if (prev) {
    const res = await client.query(
      `update public.notebooks
          set judul = $1, konten = $2, penting = $3, warna = $4, kategori = $5,
              kategori_id = $6, deleted_at = null
        where id = $7 and user_id = $8
        returning *`,
      [(item.judul || "").trim(), konten, Boolean(item.penting), item.warna || "#D97706",
       item.kategori || "", kategoriId, prev.id, userId]
    );
    return { status: conflict ? "conflict" : "updated", serverId: Number(prev.id), row: res.rows[0] };
  }

  const res = await client.query(
    `insert into public.notebooks
       (user_id, client_uuid, judul, konten, penting, warna, kategori, kategori_id)
     values ($1,$2,$3,$4,$5,$6,$7,$8)
     returning *`,
    [userId, item.clientUuid, (item.judul || "").trim(), konten, Boolean(item.penting),
     item.warna || "#D97706", item.kategori || "", kategoriId]
  );
  return { status: "created", serverId: Number(res.rows[0].id), row: res.rows[0] };
}
```

- [ ] **Step 2: Tolak judul kosong**

Jika `!item.judul?.trim()` → kembalikan `{ status: "rejected", reason: "judul_kosong" }`. Jangan biarkan satu notebook rusak menggagalkan transaksi batch.

- [ ] **Step 3: Commit**

```bash
git add lib/modules/sync/sync.repository.js
git commit -m "feat(sync): idempotent notebook upsert with category remap"
```

---

### Task 1.4: Pull delta + cursor

**Files:**
- Modify: `lib/modules/sync/sync.repository.js`

**Interfaces:**
- Produces: `pullEntity(client, { entity, userId, cursor, limit }) -> { rows, cursor, hasMore }`

- [ ] **Step 1: Implementasi query keyset**

```js
const TABLES = {
  categories: "public.categories",
  notebookCategories: "public.notebook_categories",
  tasks: "public.tasks",
  notebooks: "public.notebooks",
};

export async function pullEntity(client, { entity, userId, cursor, limit = 200 }) {
  const table = TABLES[entity];
  const after = cursor ? [cursor.updatedAt, cursor.id] : [new Date(0).toISOString(), 0];
  const res = await client.query(
    `select * from ${table}
      where user_id = $1
        and (updated_at > $2::timestamptz or (updated_at = $2::timestamptz and id > $3::bigint))
      order by updated_at asc, id asc
      limit $4`,
    [userId, after[0], after[1], limit]
  );
  const rows = res.rows;
  const last = rows[rows.length - 1];
  return {
    rows,
    cursor: last ? { updatedAt: new Date(last.updated_at).toISOString(), id: Number(last.id) } : cursor || null,
    hasMore: rows.length === limit,
  };
}
```

`table` berasal dari whitelist konstan — tidak pernah dari input user (anti SQL injection).

- [ ] **Step 2: Sertakan tombstone**

Query **tidak** memfilter `deleted_at`; tombstone wajib ikut terkirim. Klien yang memutuskan menyembunyikan baris ber-`deletedAt`.

- [ ] **Step 3: Resolusi `kategoriClientUuid`**

Relasi di server memakai `kategori_id bigint`, tetapi klien offline memakai `clientUuid`. Tambahkan resolusi batch setelah query:

```js
async function attachKategoriClientUuid(client, entity, userId, rows) {
  if (entity !== "tasks" && entity !== "notebooks") return rows;
  const ids = [...new Set(rows.map((r) => r.kategori_id).filter(Boolean))];
  if (ids.length === 0) return rows.map((r) => ({ ...r, kategori_client_uuid: null }));

  const table = entity === "tasks" ? "public.categories" : "public.notebook_categories";
  const res = await client.query(
    `select id, client_uuid from ${table} where user_id = $1 and id = any($2::bigint[])`,
    [userId, ids]
  );
  const map = new Map(res.rows.map((r) => [String(r.id), r.client_uuid]));
  return rows.map((r) => ({
    ...r,
    kategori_client_uuid: r.kategori_id ? map.get(String(r.kategori_id)) || null : null,
  }));
}
```

Panggil di `pullEntity` sebelum `return`. Nama tabel berasal dari cabang literal, bukan input user.

- [ ] **Step 4: Commit**

```bash
git add lib/modules/sync/sync.repository.js
git commit -m "feat(sync): keyset delta pull including tombstones"
```

---

### Task 1.5: Service orkestrasi + route `/api/sync`

**Files:**
- Create: `lib/modules/sync/sync.service.js`
- Create: `app/api/sync/route.js`

**Interfaces:**
- Produces: `runSync({ userId, body }) -> { serverTime, results, pull, cursors, hasMore }`
- Route: `POST /api/sync` → 200 / 400 / 401 / 413 / 429

- [ ] **Step 1: Implementasi service**

```js
export async function runSync({ userId, body }) {
  const push = body?.push || {};
  for (const key of Object.keys(push)) {
    if (!ENTITY_ORDER.includes(key)) return { error: "Entitas tidak dikenal", status: 400 };
    if (!Array.isArray(push[key]) || push[key].length > SYNC_BATCH_SIZE) {
      return { error: `Maksimal ${SYNC_BATCH_SIZE} item per entitas`, status: 400 };
    }
  }

  return withTransaction(async (client) => {
    const serverTime = new Date().toISOString();
    const results = {};

    for (const entity of ENTITY_ORDER) {
      const items = push[entity] || [];
      if (items.length === 0) continue;
      results[entity] = [];
      for (const item of items) {
        if (!isUuid(item.clientUuid)) {
          results[entity].push({ clientUuid: item.clientUuid || null, status: "rejected", reason: "invalid_client_uuid" });
          continue;
        }
        const out = entity === "tasks"
          ? await upsertTask(client, { userId, item })
          : entity === "categories"
            ? await upsertCategory(client, { userId, item })
            : entity === "notebookCategories"
              ? await upsertNotebookCategory(client, { userId, item })
              : await upsertNotebook(client, { userId, item });
        results[entity].push({ clientUuid: item.clientUuid, ...out });
      }
    }

    const pull = {};
    const cursors = {};
    const hasMore = {};
    for (const entity of ENTITY_ORDER) {
      const out = await pullEntity(client, {
        entity, userId,
        cursor: body?.cursors?.[entity] || null,
        limit: PULL_PAGE_SIZE,
      });
      pull[entity] = out.rows;
      cursors[entity] = out.cursor;
      hasMore[entity] = out.hasMore;
    }

    return { serverTime, results, pull, cursors, hasMore };
  });
}
```

- [ ] **Step 2: Implementasi route**

```js
export async function POST(request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const size = Number(request.headers.get("content-length") || 0);
  if (size > SYNC_MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload terlalu besar" }, { status: 413 });
  }

  const rl = checkRateLimit(`sync_${session.user.id}`, 30, 60000);
  if (!rl.allowed) return NextResponse.json({ error: "Terlalu banyak permintaan sync" }, { status: 429 });

  try {
    const body = await request.json();
    const out = await runSync({ userId: session.user.id, body });
    if (out?.error) return NextResponse.json({ error: out.error }, { status: out.status || 400 });
    return NextResponse.json(out);
  } catch (err) {
    console.error("POST /api/sync error:", err);
    return NextResponse.json({ error: "Gagal menyinkronkan data." }, { status: 500 });
  }
}
```

- [ ] **Step 3: Clamp timestamp klien**

`clientTime` hanya dipakai untuk mendeteksi drift: jika `|Date.now() - new Date(clientTime)| > MAX_CLOCK_SKEW_MS`, catat `warnings: ["clock_skew"]` di respons. **Jangan** pernah memakai `clientTime` sebagai `updated_at`.

- [ ] **Step 4: Verifikasi**

Run: `npm run lint` → 0 error.
Integrasi (setelah user menyalakan server): user menjalankan `node scripts/verify-sync-endpoint.mjs` dengan cookie sesi valid. Expected: dua POST berturut-turut dengan `clientUuid` sama menghasilkan satu baris DB (idempoten) dan `status: "created"` lalu `"updated"`.

- [ ] **Step 5: Commit**

```bash
git add lib/modules/sync/sync.service.js app/api/sync/route.js scripts/verify-sync-endpoint.mjs
git commit -m "feat(sync): add /api/sync with batching, idempotency and per-item results"
```

---

### Task 1.6: Migrasi endpoint lama ke soft delete

**Files:**
- Modify: `app/api/tasks/route.js`, `app/api/notebooks/route.js`, `app/api/notifications/dispatch/route.js`, `lib/notifications/reengagement.js`, `lib/server-data.js`

- [ ] **Step 1: Tasks DELETE → soft delete**

`taskService.deleteTask` memanggil `deleteTaskByIdAndUser` yang kini menjalankan `update ... set deleted_at = now()` dan mengembalikan `rowCount`. Jika `rowCount === 0`, tetap balas `{ success: true }` (idempoten) tetapi tanpa mengklaim data ada.

- [ ] **Step 2: Notebooks DELETE → soft delete**

Ganti `DELETE FROM public.notebooks ... RETURNING id` dengan:

```sql
update public.notebooks
   set deleted_at = timezone('utc', now())
 where id = $1 and user_id = $2 and deleted_at is null
 returning id;
```

Notebooks quota check harus `where deleted_at is null`.

- [ ] **Step 3: GET harus menyembunyikan tombstone**

Semua GET (tasks, notebooks, categories, notebook-categories) menambahkan `and deleted_at is null`. Ini wajib agar UI online tidak menampilkan data terhapus.

- [ ] **Step 4: Audit seluruh konsumen tabel (blast radius wajib)**

Tambahkan `and deleted_at is null` pada setiap query yang membaca `public.tasks`, `public.notebooks`, `public.categories`, `public.notebook_categories` di luar modul sync. Minimal:

- `app/api/notifications/dispatch/route.js` — `FROM public.tasks t` (tanpa filter ini, tugas yang dihapus user tetap memicu push/email).
- `lib/notifications/reengagement.js`.
- `lib/server-data.js` (SSR dashboard).
- Semua `COUNT(*)` kuota (tasks, notebooks, categories) agar kuota kembali setelah delete.
- `checkCategoryOwnership` (kategori terhapus tidak boleh dipakai tugas baru).

- [ ] **Step 5: Verifikasi**

Run: `npm run lint` → 0 error. Manual read-only: `select id, deleted_at from public.tasks where deleted_at is not null limit 5;` setelah user menghapus satu tugas dari UI. Pastikan tugas terhapus **tidak** muncul di notifikasi berikutnya.

- [ ] **Step 6: Commit**

```bash
git add app/api/tasks/route.js app/api/notebooks/route.js app/api/notifications/dispatch/route.js lib/notifications/reengagement.js lib/server-data.js
git commit -m "feat(api): switch deletes to soft delete and hide tombstones"
```

---

## FASE 2 — Dexie, Outbox, Service Worker

### Task 2.1: Skema Dexie v1

**Files:**
- Create: `lib/local/db.js`
- Modify: `package.json` (`dexie`)

**Interfaces:**
- Produces: `localDb` dengan store `tasks`, `categories`, `notebookCategories`, `notebooks`, `outbox`, `meta`.

- [ ] **Step 1: Tambah dependency**

Run: `npm install dexie@^4.0.0`
Expected: `package.json` + lockfile berubah, tidak ada dependency lain yang ikut berubah.

- [ ] **Step 2: Tulis skema**

```js
import Dexie from "dexie";

export const localDb = new Dexie("mytask_offline");

localDb.version(1).stores({
  tasks:               "clientUuid, userId, serverId, updatedAt, deleted, pending, kategoriClientUuid, [userId+pending]",
  categories:          "clientUuid, userId, serverId, updatedAt, deleted, pending, [userId+pending]",
  notebookCategories:  "clientUuid, userId, serverId, updatedAt, deleted, pending, [userId+pending]",
  notebooks:           "clientUuid, userId, serverId, updatedAt, deleted, pending, kategoriClientUuid, [userId+pending]",
  outbox:              "++seq, userId, entity, clientUuid, [entity+clientUuid], createdAt, nextAttemptAt, [userId+nextAttemptAt]",
  meta:                "key",
});
```

Setiap row wajib menyimpan `userId`. Semua query baca/tulis memakai `where("[userId+pending]")` atau filter `userId`.

**Purge saat logout** (`localDb.delete()`) adalah satu-satunya yang boleh menghapus seluruh DB; tidak ada operasi per-user yang menghapus data user lain.

Catatan teknis: IndexedDB tidak mengindeks boolean. `pending` dan `deleted` disimpan sebagai angka `0|1`.

- [ ] **Step 3: Siapkan jalur migrasi aditif**

Tambahkan komentar kontrak di atas `version(1)`:

```js
// Setiap perubahan skema WAJIB menambah localDb.version(n+1).stores({...}).upgrade(...)
// DILARANG menghapus version lama. Data user offline tidak boleh hilang.
```

- [ ] **Step 4: Verifikasi**

Run: `npm run lint` → 0 error. Build: `npm run build` → sukses (Dexie hanya diimpor di modul client).

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json lib/local/db.js
git commit -m "feat(local): add Dexie schema v1"
```

---

### Task 2.2: Outbox dengan coalescing

**Files:**
- Create: `lib/local/outbox.js`
- Test: `tests/offline/outbox.test.mjs`

**Interfaces:**
- Produces:
  - `enqueue(tx, { entity, clientUuid, op, payload, baseUpdatedAt })`
  - `coalesce(tx, entity, clientUuid, patch)` — entri pending terakhir digabung, bukan ditumpuk
  - `takeBatch(tx, limit)` — maksimal 50, urut `ENTITY_ORDER` lalu `seq`
  - `ack(tx, seqs)`
  - `markFailed(tx, seq, reason)`

- [ ] **Step 1: Tulis test yang gagal**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { planCoalesce } from "../../lib/local/outbox.js";

test("auto-save berulang pada entitas sama hanya menyisakan satu entri", () => {
  const existing = [{ seq: 1, entity: "notebooks", clientUuid: "n1", op: "upsert", payload: { konten: "a" } }];
  const next = planCoalesce(existing, "notebooks", "n1", { konten: "b" });
  assert.equal(next.length, 1);
  assert.equal(next[0].payload.konten, "b");
});

test("create lalu delete sebelum pernah sync membatalkan keduanya", () => {
  const existing = [{ seq: 1, entity: "tasks", clientUuid: "t1", op: "upsert", payload: {}, serverId: null }];
  const next = planCoalesce(existing, "tasks", "t1", { __delete: true }, { serverId: null });
  assert.equal(next.length, 0);
});

test("delete pada baris yang sudah pernah sync tetap dikirim", () => {
  const existing = [];
  const next = planCoalesce(existing, "tasks", "t1", { __delete: true }, { serverId: 42 });
  assert.equal(next.length, 1);
  assert.equal(next[0].op, "delete");
});
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `node --test tests/offline/outbox.test.mjs`
Expected: FAIL (`planCoalesce` belum ada).

- [ ] **Step 3: Implementasi `planCoalesce` sebagai fungsi murni**

`planCoalesce(existingEntries, entity, clientUuid, patch, { serverId })` mengembalikan array entri baru. Aturan:
- Jika `patch.__delete` dan `serverId == null` → hapus semua entri untuk `entity+clientUuid`, kembalikan array tanpa entri.
- Jika `patch.__delete` dan `serverId != null` → ganti entri menjadi `{ op: "delete", payload: {}, baseUpdatedAt }`.
- Selain itu → pertahankan `baseUpdatedAt` paling awal, ganti `payload` dengan patch terbaru.

- [ ] **Step 4: Bungkus dalam transaksi Dexie**

`enqueue` wajib menerima `tx` (transaksi aktif) agar penulisan baris lokal + outbox atomik:

```js
export async function enqueueWithRow(tx, { entity, clientUuid, op, payload, baseUpdatedAt, row }) {
  await tx.table(entity).put(row);
  const existing = await tx.table("outbox")
    .where("[entity+clientUuid]").equals([entity, clientUuid]).toArray();
  const next = planCoalesce(existing, entity, clientUuid, payload, { serverId: row.serverId });
  await tx.table("outbox").where("[entity+clientUuid]").equals([entity, clientUuid]).delete();
  for (const entry of next) await tx.table("outbox").add(entry);
}
```

- [ ] **Step 5: Jalankan test + commit**

Run: `node --test tests/offline/outbox.test.mjs`
Expected: PASS.
```bash
git add lib/local/outbox.js tests/offline/outbox.test.mjs
git commit -m "feat(local): coalescing outbox"
```

---

### Task 2.3: Sync engine klien

**Files:**
- Create: `lib/local/sync-engine.js`

**Interfaces:**
- Consumes: `contract.js`, `localDb`, `outbox.js`
- Produces:
  - `flushOutbox() -> { pushed, failed }`
  - `pullChanges() -> { applied, hasMore }`
  - `syncAll() -> { ok, pushed, failed, applied, error? }`
  - `getPendingCount() -> number`

- [ ] **Step 1: Implementasi flush**

```js
export async function flushOutbox() {
  let pushed = 0, failed = 0;

  for (;;) {
    const batch = await localDb.transaction("r", localDb.outbox, (tx) => takeBatch(tx, SYNC_BATCH_SIZE));
    if (batch.length === 0) break;

    const payload = { push: { categories: [], notebookCategories: [], tasks: [], notebooks: [] }, since: null, clientTime: new Date().toISOString() };
    for (const entry of batch) {
      payload.push[entry.entity].push(toSyncItem(entry));
    }

    const res = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.status === 401) return { pushed, failed: failed + batch.length, error: "unauthorized" };
    if (!res.ok) {
      const wait = backoffFor(batch[0].seq);
      await markFailedAll(batch, `http_${res.status}`, wait);
      return { pushed, failed: failed + batch.length, error: `http_${res.status}` };
    }

    const data = await res.json();
    const applied = [];
    for (const entry of batch) {
      const result = data.results?.[entry.entity]?.find((r) => r.clientUuid === entry.clientUuid);
      if (!result || result.status === "rejected" || result.status === "duplicate_name") {
        await keepForRetry(entry, result?.reason || "rejected");
        failed++;
        continue;
      }
      await applyServerResult(entry, result);
      applied.push(entry.seq);
      pushed++;
    }
    await localDb.transaction("rw", localDb.outbox, () => ack(localDb, applied));
  }

  return { pushed, failed };
}
```

- [ ] **Step 2: Backoff eksplisit**

```js
function backoffFor(seq) {
  const attempt = Math.min(6, Math.floor(seq % 7));
  return Math.min(5 * 60 * 1000, 1000 * 2 ** attempt);
}
```

Entri yang belum waktunya dicoba dilewati oleh `takeBatch` (filter `nextAttemptAt <= Date.now()`).

- [ ] **Step 3: Implementasi pull**

`pullChanges()` membaca `cursors` dari `meta`, memanggil `/api/sync` tanpa `push`, lalu `bulkPut` setiap row ke store-nya dengan konversi: `deleted_at != null → deleted: 1`, `updated_at → updatedAt`, `id → serverId`, `kategori_client_uuid → kategoriClientUuid`, `userId` dari sesi aktif, `pending: 0`. Ulangi selama `hasMore[entity] === true` (maksimal 10 halaman per entity untuk mencegah loop tak terbatas).

- [ ] **Step 4: Deteksi konflik untuk UI**

Sebelum `bulkPut`, bandingkan dengan baris lokal:

```js
async function detectConflict(tx, entity, serverRow) {
  const local = await tx.table(entity).get(serverRow.clientUuid);
  if (!local || local.pending !== 1) return null;
  if (new Date(local.updatedAt).toISOString() === new Date(serverRow.updated_at).toISOString()) return null;
  const conflict = { entity, clientUuid: serverRow.clientUuid, localUpdatedAt: local.updatedAt, serverUpdatedAt: serverRow.updated_at };
  await tx.table("meta").put({ key: `conflict:${entity}:${serverRow.clientUuid}`, value: conflict });
  return conflict;
}
```

Setelah transaksi, `window.dispatchEvent(new CustomEvent("mytask:conflict", { detail: conflicts }))`. **Jangan** menahan atau membatalkan outbox karena konflik; server tetap menang (LWW).

- [ ] **Step 5: Verifikasi**

Run: `npm run lint` → 0 error. Unit test tetap PASS (logika pure tidak berubah).

- [ ] **Step 6: Commit**

```bash
git add lib/local/sync-engine.js
git commit -m "feat(local): flush outbox and pull delta with backoff"
```

---

### Task 2.4: Persist storage + penanganan kuota

**Files:**
- Modify: `lib/local/sync-engine.js`
- Create: `lib/local/storage.js`

**Interfaces:**
- Produces:
  - `ensurePersisted() -> "granted" | "denied" | "unsupported"`
  - `isQuotaError(err) -> boolean`
  - `pruneSyncedNotebooks() -> number` (hanya `pending === 0` dan `deleted !== 1`)

- [ ] **Step 1: Implementasi persist sekali**

```js
export async function ensurePersisted() {
  if (!navigator.storage?.persist) return "unsupported";
  const already = await localDb.meta.get("persist_granted");
  if (already?.value === 1) return "granted";
  const granted = await navigator.storage.persist();
  await localDb.meta.put({ key: "persist_granted", value: granted ? 1 : 0 });
  return granted ? "granted" : "denied";
}
```

Dipanggil **saat penulisan offline pertama**, bukan saat load.

- [ ] **Step 2: Tangani kuota penuh**

Bungkus semua `db.transaction("rw", ...)` yang menulis baris+outbox dengan `try/catch`. Jika `isQuotaError(err)` (nama error `QuotaExceededError` atau `DOMException` code 22):

```js
const pruned = await pruneSyncedNotebooks();       // hanya data yang sudah aman di server
window.dispatchEvent(new CustomEvent("mytask:quota-full", { detail: { pruned } }));
```

UI menampilkan banner persistif dengan dua aksi: "Hapus catatan tersinkron" (panggil prune) dan "Buka Pengaturan Penyimpanan".

- [ ] **Step 3: Aturan prune**

`pruneSyncedNotebooks()` hanya boleh menghapus baris dengan `pending === 0`. Dilarang menyentuh `outbox`, `tasks`, atau entri `pending === 1`.

- [ ] **Step 4: Commit**

```bash
git add lib/local/storage.js lib/local/sync-engine.js
git commit -m "feat(local): request persistent storage and handle quota errors"
```

---

### Task 2.5: Rewrite Service Worker

**Files:**
- Modify: `public/sw.js`

**Interfaces:**
- Consumes: pesan `{type:'MYTASK_SYNC_REQUEST'}`, `{type:'MYTASK_PURGE_CACHES'}`
- Produces: cache `mytask-shell-v1`, `mytask-static-v1`

- [ ] **Step 1: Precache shell minimal**

```js
const SHELL_CACHE = "mytask-shell-v1";
const STATIC_CACHE = "mytask-static-v1";
const SHELL_URLS = ["/offline.html", "/manifest.json", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((c) => c.addAll(SHELL_URLS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== SHELL_CACHE && k !== STATIC_CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});
```

`/offline.html` wajib dibuat sebagai halaman statis sederhana (judul + pesan + tombol "Coba lagi") — bukan halaman React, agar tidak butuh JS bundle.

- [ ] **Step 2: Strategi fetch**

```js
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.method !== "GET" || url.pathname.startsWith("/api/")) return;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || caches.match("/offline.html")))
    );
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || /\.(css|js|woff2?|png|svg|jpg|webp)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(STATIC_CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      }))
    );
  }
});
```

- [ ] **Step 3: Sync trigger + purge**

```js
self.addEventListener("sync", (event) => {
  if (event.tag !== "mytask-sync") return;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      clients.forEach((c) => c.postMessage({ type: "MYTASK_SYNC_REQUEST" }));
    })
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "MYTASK_PURGE_CACHES") {
    event.waitUntil(caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))));
  }
});
```

Batasan yang harus didokumentasikan di komentar SW: Background Sync tidak didukung iOS, dan SW **tidak** membangun payload sendiri — sync sebenarnya dieksekusi di halaman. Jika tidak ada tab terbuka, sync ditunda sampai aplikasi dibuka lagi.

- [ ] **Step 4: Verifikasi**

Run: `npm run build` → sukses. Manual (user menyalakan server): buka DevTools → Application → Service Workers, pastikan status activated; matikan network → reload → halaman terbuka dari cache.

- [ ] **Step 5: Commit**

```bash
git add public/sw.js public/offline.html
git commit -m "feat(pwa): cache app shell, navigation fallback and sync trigger"
```

---

## FASE 3 — Frontend State & UI

### Task 3.0: Kill switch `NEXT_PUBLIC_OFFLINE_SYNC`

**Files:**
- Create: `lib/local/feature-flag.js`
- Modify: `lib/task-context.js`, `lib/notebook-context.js`

- [ ] **Step 1: Implementasi flag**

```js
export const OFFLINE_SYNC_ENABLED = process.env.NEXT_PUBLIC_OFFLINE_SYNC === "1";
```

Nilai default (tanpa env) = **nonaktif**, sehingga deploy pertama tidak mengubah perilaku apa pun.

- [ ] **Step 2: Dua jalur di context**

Di `task-context.js` dan `notebook-context.js`, pertahankan fungsi lama (`loadData` versi fetch, `addTask` versi fetch) dengan nama `loadDataLegacy`/`addTaskLegacy`, lalu:

```js
const loadData = OFFLINE_SYNC_ENABLED ? loadDataLocal : loadDataLegacy;
const addTask = OFFLINE_SYNC_ENABLED ? addTaskLocal : addTaskLegacy;
```

Terapkan pada **semua** mutasi. Jalur legacy tidak boleh dihapus pada plan ini — ia adalah rollback path.

- [ ] **Step 3: Verifikasi**

Run: `npm run build` dengan dan tanpa `NEXT_PUBLIC_OFFLINE_SYNC=1`.
Expected: keduanya sukses; flag nonaktif menghasilkan perilaku identik dengan sebelum plan.

- [ ] **Step 4: Commit**

```bash
git add lib/local/feature-flag.js lib/task-context.js lib/notebook-context.js
git commit -m "feat(sync): add offline sync kill switch"
```

---

### Task 3.1: Refactor `task-context.js` ke Dexie-first

**Files:**
- Modify: `lib/task-context.js`

**Interfaces:**
- Consumes: `localDb`, `enqueueWithRow`, `syncAll`, `getPendingCount`
- Produces: shape context **tidak berubah** (`tasks`, `categories`, `stats`, `addTask`, `updateTask`, `deleteTask`, `clearCompletedTasks`, `toggleComplete`, `toggleSubtask`, `toggleImportant`, `addCategory`, `updateCategory`, `deleteCategory`) agar semua pemanggil lama tetap jalan.

- [ ] **Step 1: Ganti `loadData`**

```js
const loadData = useCallback(async () => {
  if (!activeUserId) return;
  setIsLoading(true);
  const [localTasks, localCats] = await Promise.all([
    localDb.tasks.where("userId").equals(activeUserId).toArray(),
    localDb.categories.where("userId").equals(activeUserId).toArray(),
  ]);
  if (localTasks.length) setTasks(localTasks.filter((t) => t.deleted === 0).map(toUiTask));
  if (localCats.length) setCategories(localCats.filter((c) => c.deleted === 0).map(toUiCategory));
  setIsLoading(false);
  syncAll().catch(() => {});
}, [activeUserId]);
```

- [ ] **Step 2: Mutasi menulis lokal + outbox dalam satu transaksi**

```js
async function addTask(newTask) {
  const clientUuid = crypto.randomUUID();
  const now = new Date().toISOString();
  const row = { clientUuid, userId: activeUserId, serverId: null, judul: newTask.judul, deskripsi: newTask.deskripsi || "",
                deadline: newTask.deadline || null, reminder: newTask.reminder || null,
                kategoriClientUuid: newTask.kategoriClientUuid || null, prioritas: Number(Boolean(newTask.prioritas)),
                selesai: 0, selesaiPada: null, subtasks: newTask.subtasks || [], updatedAt: now,
                deleted: 0, pending: 1 };

  await localDb.transaction("rw", [localDb.tasks, localDb.outbox, localDb.meta], async (tx) => {
    await enqueueWithRow(tx, { entity: "tasks", clientUuid, op: "upsert", row, payload: row, baseUpdatedAt: null });
    await tx.table("meta").put({ key: "persist_attempted", value: 1 });
  });

  setTasks((prev) => [toUiTask(row), ...prev]);
  ensurePersisted().catch(() => {});
  schedulePush();
  return { success: true, task: toUiTask(row) };
}
```

**Dilarang** memakai `Date.now()` sebagai id. Semua id baru = `crypto.randomUUID()`.

- [ ] **Step 3: Terapkan pola yang sama ke SEMUA mutasi**

`updateTask`, `deleteTask`, `toggleComplete`, `toggleSubtask`, `toggleImportant`, `addCategory`, `updateCategory`, `deleteCategory` wajib mengikuti pola Step 2 (tulis baris lokal + outbox dalam satu `localDb.transaction`, lalu update state optimistis). Khusus `clearCompletedTasks`: tidak ada bulk endpoint di sync, jadi enqueue satu `delete` per tugas selesai (maksimal 50 per batch).

`toUiTask` wajib memetakan `kategoriClientUuid` → objek kategori lokal, dan **tidak** mengandalkan `kategoriId` server (baris offline belum punya id server).

- [ ] **Step 4: Hapus jalur rollback destruktif**

Semua `setTasks(prev => prev.filter(...))` pada catch dihapus. Mutasi offline tidak boleh membuang data; kegagalan hanya menaikkan `attempts` di outbox dan memunculkan toast "Akan dicoba lagi".

- [ ] **Step 5: `schedulePush`**

Debounce 1.5 detik → `flushOutbox()`; jika `navigator.onLine === false`, skip dan andalkan event `online`.

- [ ] **Step 6: Verifikasi**

Run: `npm run lint` → 0 error; `npm run build` → sukses. Manual: offline → tambah tugas → refresh halaman → tugas masih ada dan badge pending muncul.

- [ ] **Step 7: Commit**

```bash
git add lib/task-context.js
git commit -m "refactor(tasks): Dexie-first state with outbox writes"
```

---

### Task 3.2: Refactor `notebook-context.js`

**Files:**
- Modify: `lib/notebook-context.js`

- [ ] **Step 1: Ganti cache `localStorage` dengan Dexie**

Hapus `getStoredCache`/`setStoredCache` untuk notebook. `fetchNotebooks` menjadi `syncAll()` + baca Dexie. `customCategories` dibaca dari store `notebookCategories` (bukan `localStorage`).

- [ ] **Step 2: Auto-save wajib coalesce**

`updateNotebook` (termasuk `isSilentAutoSave`) menulis satu entri outbox per `clientUuid` dengan `op: "upsert"`. Coalescing dari Task 2.2 memastikan 20 kali auto-save tetap menjadi 1 kiriman.

Konstanta wajib:

```js
const NOTEBOOK_AUTOSAVE_DEBOUNCE_MS = 800;
```

Timer harus di-`clearTimeout` pada cleanup/unmount, dan tulisan terakhir wajib di- `flush` saat modal ditutup (jangan hanya mengandalkan timer).

- [ ] **Step 3: `moveNoteToCategory` / `deleteCustomCategory` offline**

Keduanya menulis lokal + outbox. Relasi catatan memakai `kategoriClientUuid`, **bukan** `kategori` (nama teks). Field `kategori` tetap dipertahankan untuk kompatibilitas tampilan, tetapi bukan kunci relasi.

- [ ] **Step 4: Verifikasi**

Run: `npm run lint`, `npm run build` → sukses. Manual: offline → edit catatan 5x → buka DevTools → Application → IndexedDB → `outbox` berisi tepat 1 baris untuk catatan itu.

- [ ] **Step 5: Commit**

```bash
git add lib/notebook-context.js
git commit -m "refactor(notebooks): Dexie-first state with coalesced autosave"
```

---

### Task 3.3: Snapshot sesi offline

**Files:**
- Create: `lib/local/session-snapshot.js`
- Modify: `lib/auth-client.js` (atau pemanggil `signOut`)

Catatan: `app/(dashboard)/layout.js` **tidak diubah**. Offline shell dilayani SW; layout server tetap memanggil `auth.api.getSession()` saat online.

- [ ] **Step 1: Simpan snapshot saat sesi valid**

Setelah `useSession()` mengembalikan user, simpan `{ userId, name, email, expiresAt }` ke `localDb.meta` (`key: "session_snapshot"`). **Jangan** menyimpan token sesi — hanya identitas tampilan.

- [ ] **Step 2: Jangan blokir render saat offline**

`DashboardLayout` tetap server component. Tidak ada perubahan pada `auth.api.getSession()`; offline shell dilayani SW dari cache. Saat offline, `TaskProvider`/`NotebookProvider` membaca snapshot; jika snapshot tidak ada atau `expiresAt` sudah lewat, tampilkan layar "Sesi kedaluwarsa — sambungkan internet untuk masuk".

- [ ] **Step 3: Purge saat logout**

Sebelum `signOut()`, panggil:
```js
await localDb.delete();
const reg = await navigator.serviceWorker?.getRegistration();
reg?.active?.postMessage({ type: "MYTASK_PURGE_CACHES" });
```

Ini menutup risiko Review Focus #1.

- [ ] **Step 4: Verifikasi**

Run: `npm run lint` → 0 error. Manual: login → logout → cek IndexedDB `mytask_offline` tidak ada dan cache kosong.

- [ ] **Step 5: Commit**

```bash
git add lib/local/session-snapshot.js lib/auth-client.js
git commit -m "feat(auth): offline session snapshot and purge on sign out"
```

---

### Task 3.4: Indikator offline & tombol sync manual

**Files:**
- Create: `lib/use-online-status.js`
- Create: `components/pwa/OfflineStatusBadge.js`
- Modify: `components/layout/Navbar.js`, `components/tugas/TaskCard.js`, `components/notebook/NotebookCard.js`, `components/layout/DashboardShell.js`

- [ ] **Step 1: Hook status**

`useOnlineStatus()` mengembalikan `{ online, pendingCount, lastSyncAt, syncNow }`. `pendingCount` dibaca dari `localDb.outbox.count()` dan diperbarui lewat event `mytask:outbox-changed` + `online`.

- [ ] **Step 2: Badge global**

`OfflineStatusBadge` menampilkan:
- `CloudOff` (Phosphor) + teks "Offline" saat `!online`.
- `ArrowsClockwise` + angka pending saat online dan `pendingCount > 0`.
- Tombol (≥44×44px) yang memanggil `syncNow()`; `aria-label="Sinkronkan sekarang"`.
- Toast hasil: `Sinkron: N berhasil, M gagal`.

- [ ] **Step 3: Badge per-item**

`TaskCard` dan `NotebookCard` menerima `pending` dari store lokal (bukan prop drilling baru) dan menampilkan titik kecil + `aria-label="Belum tersinkron"`. Dilarang memakai emoji; gunakan `Circle` terisi atau `CloudArrowUp`.

- [ ] **Step 4: Listener lifecycle**

`DashboardShell` memasang:
```js
window.addEventListener("online", syncNow);
window.addEventListener("mytask:outbox-changed", refreshPending);
window.addEventListener("mytask:quota-full", showQuotaBanner);
window.addEventListener("mytask:conflict", (e) => {
  const n = e.detail?.length || 0;
  if (n > 0) toast.info(`${n} item diperbarui dari perangkat lain.`);
});
```

Toast konflik maksimal sekali per siklus sync (gunakan `useRef` guard) agar 50 konflik tidak memunculkan 50 toast.

Semua listener dilepas pada cleanup.

- [ ] **Step 5: Registrasi Background Sync (progresif)**

```js
const reg = await navigator.serviceWorker?.ready;
if (reg?.sync) { try { await reg.sync.register("mytask-sync"); } catch {} }
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("message", (e) => {
    if (e.data?.type === "MYTASK_SYNC_REQUEST") syncNow();
  });
}
```

- [ ] **Step 6: Verifikasi**

Run: `npm run lint`, `npm run build` → sukses. Manual di ≤640px: badge terlihat, tidak overflow horizontal, touch target ≥44px.

- [ ] **Step 7: Commit**

```bash
git add lib/use-online-status.js components/pwa/OfflineStatusBadge.js components/layout/Navbar.js components/layout/DashboardShell.js components/tugas/TaskCard.js components/notebook/NotebookCard.js
git commit -m "feat(ui): offline status badge and manual sync"
```

---

### Task 3.5: Verifikasi tema offline + penutupan

**Files:**
- Modify: `docs/superpowers/plans/2026-11-13-offline-first.md` (checklist hasil)

- [ ] **Step 1: Konfirmasi tema tidak berubah**

`lib/theme-context.js` tidak disentuh. Uji manual: offline → ganti tema 5 kali → refresh → tema terakhir tetap aktif (`data-theme` pada `<html>`).

- [ ] **Step 2: Jalankan verifikasi penuh**

```bash
node --test tests/offline/
npm run lint
npm run build
```
Expected: semua PASS, 0 error.

- [ ] **Step 3: Matriks uji manual (user menjalankan, server hidup)**

| Skenario | Langkah | Ekspektasi |
|---|---|---|
| Tambah tugas offline | offline → tambah 3 tugas → online | 3 baris, tidak ada duplikat |
| Retry idempoten | offline → tambah tugas → online → matikan lagi → online | tetap 1 baris |
| Sub-tugas paralel | device A tambah sub 1, device B tambah sub 2, keduanya sync | kedua sub ada |
| Kategori + tugas baru | offline → buat kategori → buat tugas di kategori itu → online | tugas ter-link, bukan orphan |
| Hapus offline | offline → hapus tugas tersinkron → online → device lain sync | tugas hilang di kedua device, tidak resurrection |
| Rename kategori | online di A, offline di B | setelah sync, tugas B tetap menunjuk kategori yang benar |
| Notebook auto-save | offline → ketik 20 kali → cek outbox | 1 entri |
| Kuota | isi storage hingga penuh (DevTools) | banner muncul, data pending tidak terhapus |
| Ganti akun | offline → logout → login user lain | tidak ada data user lama |
| iOS manual sync | Safari iOS → offline → tambah → online → tap sync | antrian terkirim |

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/plans/2026-11-13-offline-first.md
git commit -m "docs: offline-first verification results"
```

---

## Risks & Mitigations

| Risiko | Mitigasi |
|---|---|
| Sync transaction terlalu lama (50 item + pull 4 entity) | Batasi 50/entitas, pull 200/entity, timeout query 10s, index `(user_id, updated_at, id)` |
| Rate limit 429 saat flush | Sync endpoint punya limit sendiri 30/menit; backoff eksponensial; antrian tidak dihapus saat gagal |
| HTML shell ter-cache membocorkan data antar user | Purge `localDb` + cache SW saat logout (Task 3.3) |
| Tombstone dibersihkan sebelum perangkat offline kembali | Retensi 90 hari > skenario 14 hari; cron purge hanya menyentuh `deleted_at < 90 hari` |
| Kategori soft-deleted masih dirujuk tugas | Unassign `kategori_id = null` saat soft delete; tugas menerima `updated_at` baru sehingga ikut ter-pull |
| `tasks` >300 baris tidak ter-mirror penuh | Pull memakai halaman 200 + cursor, tidak memakai cap 300 milik endpoint lama |
| Boolean tidak bisa diindeks IndexedDB | Simpan `pending`/`deleted` sebagai angka `0|1` |
| Auto-save membanjiri outbox | Coalescing `[entity+clientUuid]` + test regresi |

## Rollback

1. **Kill switch:** tambahkan `NEXT_PUBLIC_OFFLINE_SYNC` (default `0`). Jika `0`, `task-context`/`notebook-context` memakai jalur lama (fetch langsung). Kode Dexie tetap ada tetapi tidak diinisialisasi. Ini memungkinkan rollback tanpa revert SQL.
2. **SQL bersifat aditif** — kolom baru punya default, tidak ada `DROP`. Rollback aplikasi tidak merusak data.
3. **Tombstone** tidak boleh dibalik ke hard delete saat rollback; biarkan `deleted_at` dan filter di API lama.

## Keputusan Terkunci & Prasyarat (tidak ada asumsi terbuka)

Seluruh pertanyaan terbuka sudah dijawab user dan dikunci di Decision Log #16–24. Ringkasannya:

- `notebooks` mendapat `updated_at` kanonik; trigger `touch_updated_at()` mengisi `updated_at` **dan** `diperbarui_pada` sehingga sorting UI lama tetap bekerja.
- Satu database Dexie (`mytask_offline`), setiap row wajib punya `userId`, purge penuh hanya saat logout.
- Service Worker bersifat *trigger-only*: ia mengirim pesan `MYTASK_SYNC_REQUEST`, eksekusi sync tetap di halaman.
- Harness test: `node:test` untuk fungsi murni (`subtasks`, `ordering`, `outbox`) + script integrasi manual `scripts/verify-sync-endpoint.mjs`.
- Kill switch `NEXT_PUBLIC_OFFLINE_SYNC` default `0`; jalur legacy dipertahankan sebagai rollback path.
- Konflik LWW: server menang, UI memberi toast sekali per siklus sync (bukan per item).
- Tombstone >90 hari dibersihkan `pg_cron` harian pukul 03:17 (`purge_expired_tombstones`).
- Auto-save notebook: debounce 800ms + coalescing outbox; flush terakhir saat modal ditutup.
- `notebook_categories` ikut mendapat `client_uuid`, `updated_at`, `deleted_at`.

### Prasyarat sebelum eksekusi Task 0.1

1. **Akses DB langsung** (connection string Supabase yang diizinkan `ALTER TABLE` dan `CREATE EXTENSION`/`cron.schedule`). Migrasi dijalankan **oleh user**, bukan agent.
2. **`pg_cron` aktif** di project Supabase. Jika tidak, Step 2 Task 0.1 akan no-op (aman) dan tombstone dibersihkan manual — plan tetap valid tetapi tanpa pembersihan otomatis.
3. **Cookie sesi valid** untuk `scripts/verify-sync-endpoint.mjs` (Task 1.5 Step 4). Script membaca `COOKIE` dari environment variable, bukan hardcode.
4. **Server tidak dinyalakan agent.** Verifikasi integrasi dilakukan user setelah `npm run dev` miliknya sendiri.

### Definition of Done (plan dianggap tuntas)

- `npm run test:offline` PASS, `npm run lint` 0 error, `npm run build` sukses.
- Matriks uji manual 10 skenario di Task 3.5 Step 3 dijalankan user dan semua baris sesuai ekspektasi.
- `NEXT_PUBLIC_OFFLINE_SYNC` masih `0` pada commit terakhir; aktivasi dilakukan user terpisah setelah verifikasi.
- Tidak ada query SQL yang memakai string concatenation; tidak ada dependency baru selain `dexie`.
