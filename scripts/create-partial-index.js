const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
let databaseUrl = null;

for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (trimmed.startsWith('DATABASE_URL=')) {
    databaseUrl = trimmed.substring('DATABASE_URL='.length).trim();
    if ((databaseUrl.startsWith('"') && databaseUrl.endsWith('"')) ||
        (databaseUrl.startsWith("'") && databaseUrl.endsWith("'"))) {
      databaseUrl = databaseUrl.slice(1, -1);
    }
    break;
  }
}

if (!databaseUrl) {
  console.error('[ERROR] DATABASE_URL tidak ditemukan di .env.local');
  process.exit(1);
}

const sql = `
CREATE INDEX IF NOT EXISTS idx_tasks_pending_reminders
ON public.tasks (deadline)
WHERE (selesai = false AND reminder_sent = false AND deadline IS NOT NULL);
`;

async function run() {
  console.log('[INFO] Menghubungkan ke database Supabase...');
  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('[SUCCESS] Terhubung ke Supabase PostgreSQL!');

    console.log('[INFO] Membuat Partial Index idx_tasks_pending_reminders...');
    await client.query(sql);
    console.log('[SUCCESS] Query DDL Partial Index berhasil dieksekusi!');

    // Verifikasi indeks
    const checkIndex = await client.query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'tasks' AND indexname = 'idx_tasks_pending_reminders';
    `);

    if (checkIndex.rows.length > 0) {
      console.log('[VERIFIKASI PASS] Indeks terverifikasi aktif:', checkIndex.rows[0]);
    } else {
      console.error('[FAIL] Indeks gagal terdaftar.');
      process.exit(1);
    }
  } catch (err) {
    console.error('[ERROR] Gagal membuat indeks:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
