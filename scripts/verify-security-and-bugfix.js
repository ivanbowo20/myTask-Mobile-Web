const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== VERIFY SECURITY HARDENING & BUG FIX SUITE ===\n');
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${name} -> ${err.message}`);
    failed++;
  }
}

// 1. Check DateTimePicker for CalendarIcon ReferenceError
test('DateTimePicker.jsx has 0 occurrences of undefined CalendarIcon', () => {
  const code = fs.readFileSync('components/ui/DateTimePicker.jsx', 'utf8');
  assert(!code.includes('CalendarIcon'), 'Found CalendarIcon in DateTimePicker.jsx!');
  assert(code.includes('Calendar className'), 'Missing Calendar component in DateTimePicker.jsx!');
});

// 2. Database Security & Schema Hardening
test('supabase/schema.sql enables RLS on all 9 tables', () => {
  const schema = fs.readFileSync('supabase/schema.sql', 'utf8');
  const expectedTables = [
    '"user"',
    '"session"',
    '"account"',
    '"verification"',
    'profiles',
    'categories',
    'tasks',
    'subtasks',
    'notifications'
  ];
  for (const t of expectedTables) {
    const rlsRegex = new RegExp(`alter table public\\.${t} enable row level security;`, 'i');
    assert(rlsRegex.test(schema), `RLS not enabled on table ${t}!`);
  }
});

test('supabase/schema.sql revokes PostgREST permissions from anon & authenticated', () => {
  const schema = fs.readFileSync('supabase/schema.sql', 'utf8');
  assert(schema.includes('revoke all on all tables in schema public from anon, authenticated;'), 'Missing tables revoke!');
  assert(schema.includes('revoke all on all sequences in schema public from anon, authenticated;'), 'Missing sequences revoke!');
});

test('supabase/schema.sql locks purge_old_completed_tasks() to service_role', () => {
  const schema = fs.readFileSync('supabase/schema.sql', 'utf8');
  assert(schema.includes('revoke all on function public.purge_old_completed_tasks() from public, anon, authenticated;'), 'Function execute permission not revoked!');
  assert(schema.includes('grant execute on function public.purge_old_completed_tasks() to service_role;'), 'Function execute permission not granted to service_role!');
});

// 3. Dead code deletion
test('app/auth/callback/route.js is completely removed', () => {
  assert(!fs.existsSync('app/auth/callback/route.js'), 'app/auth/callback/route.js still exists!');
  assert(!fs.existsSync('app/auth'), 'app/auth folder still exists!');
});

// 4. Connection Pool & Crash Fixes in lib/db.js
test('lib/db.js has singleton pool and safe password encoding', () => {
  const dbCode = fs.readFileSync('lib/db.js', 'utf8');
  assert(dbCode.includes('globalThis._pgPool'), 'Singleton pool missing globalThis._pgPool!');
  assert(!dbCode.includes('${password}'), 'Found unhandled ${password} reference!');
  assert(dbCode.includes('encodeURIComponent(parsed.password || "")'), 'Missing password URI encoding!');
  assert(dbCode.includes('globalThis._pgPool.on("error"'), 'Missing error event handler on pgPool!');
});

// 5. Frozen Date (WAKTU_ACUAN) & utils.js logic
test('lib/utils.js WAKTU_ACUAN is null and dynamic time is enforced', () => {
  const utils = require('../lib/utils.js');
  assert.strictEqual(utils.WAKTU_ACUAN, null, 'WAKTU_ACUAN is not null!');

  // Test dynamic deadline calculations
  const pastTask = { deadline: new Date(Date.now() - 3600000).toISOString(), selesai: false };
  assert.strictEqual(utils.hitungStatusDeadline(pastTask), 'terlewat');

  const futureTask = { deadline: new Date(Date.now() + 86400000 * 5).toISOString(), selesai: false };
  assert.strictEqual(utils.hitungStatusDeadline(futureTask), 'akan-datang');

  // Test invalid acuan gracefully falls back
  assert.strictEqual(utils.hitungStatusDeadline(futureTask, 'invalid-date'), 'akan-datang');

  // Test stubs
  assert.strictEqual(utils.isTaskExpired({ selesai: true }), false);
  assert.strictEqual(utils.hitungSisaWaktuHapus(), null);
});

// 6. Retention Policy & 15-Minute Purge Banner Removal
test('15-Minute warning banners removed from UI pages', () => {
  const tugasPage = fs.readFileSync('app/(dashboard)/tugas/page.js', 'utf8');
  assert(!tugasPage.includes('15 menit'), 'app/(dashboard)/tugas/page.js still has 15 menit banner!');

  const selesaiPage = fs.readFileSync('app/(dashboard)/tugas/selesai/page.js', 'utf8');
  assert(!selesaiPage.includes('15 menit'), 'app/(dashboard)/tugas/selesai/page.js still has 15 menit banner!');

  const taskCard = fs.readFileSync('components/tugas/TaskCard.js', 'utf8');
  assert(!taskCard.includes('sisaHapus'), 'components/tugas/TaskCard.js still has sisaHapus badge!');
});

// 7. CRUD Query Efficiency
test('GET /api/tasks and server-data have 0 DELETE queries', () => {
  const tasksRoute = fs.readFileSync('app/api/tasks/route.js', 'utf8');
  const getSection = tasksRoute.slice(tasksRoute.indexOf('export async function GET'), tasksRoute.indexOf('export async function POST'));
  assert(!getSection.includes('DELETE FROM'), 'GET /api/tasks contains DELETE query!');

  const serverData = fs.readFileSync('lib/server-data.js', 'utf8');
  assert(!serverData.includes('DELETE FROM'), 'lib/server-data.js contains DELETE query!');
});

test('app/api/categories/route.js DELETE relies on ON DELETE SET NULL', () => {
  const catRoute = fs.readFileSync('app/api/categories/route.js', 'utf8');
  assert(!catRoute.includes('UPDATE public.tasks SET kategori_id = NULL'), 'Manual UPDATE query still present in category DELETE!');
});

// 8. Optimistic UI Rollback in lib/task-context.js
test('lib/task-context.js has rollback on all 8 mutation actions', () => {
  const contextCode = fs.readFileSync('lib/task-context.js', 'utf8');
  const mutations = [
    'addTask',
    'updateTask',
    'deleteTask',
    'toggleComplete',
    'toggleImportant',
    'addCategory',
    'updateCategory',
    'deleteCategory'
  ];

  for (const m of mutations) {
    assert(contextCode.includes(`async function ${m}`), `Missing function ${m}!`);
  }

  // Ensure rollback toast error messages exist
  assert(contextCode.includes('Gagal menyimpan tugas ke cloud server.'), 'Missing addTask rollback toast!');
  assert(contextCode.includes('Gagal memperbarui tugas di cloud server.'), 'Missing updateTask rollback toast!');
  assert(contextCode.includes('Gagal menghapus tugas dari cloud server.'), 'Missing deleteTask rollback toast!');
  assert(contextCode.includes('Gagal memperbarui status tugas di cloud server.'), 'Missing toggle rollback toast!');
  assert(contextCode.includes('Gagal menambah kategori ke cloud server.'), 'Missing addCategory rollback toast!');
  assert(contextCode.includes('Gagal memperbarui kategori di cloud server.'), 'Missing updateCategory rollback toast!');
  assert(contextCode.includes('Gagal menghapus kategori di cloud server.'), 'Missing deleteCategory rollback toast!');
});

console.log(`\n=== RESULTS: ${passed} PASSED, ${failed} FAILED ===`);
process.exit(failed > 0 ? 1 : 0);
