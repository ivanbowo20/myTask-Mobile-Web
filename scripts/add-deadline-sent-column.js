const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// 1. Baca DATABASE_URL dari .env.local
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
  ALTER TABLE public.tasks 
  ADD COLUMN IF NOT EXISTS deadline_sent boolean NOT NULL DEFAULT false;

  CREATE INDEX IF NOT EXISTS idx_tasks_deadline_dispatch 
  ON public.tasks(deadline, selesai, reminder_sent, deadline_sent);
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

    console.log('[INFO] Mengeksekusi SQL penambahan kolom deadline_sent...');
    await client.query(sql);
    console.log('[SUCCESS] Query DDL berhasil dieksekusi!');

    // Verifikasi kolom deadline_sent di tasks
    const checkColumn = await client.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'tasks' 
        AND column_name = 'deadline_sent';
    `);

    if (checkColumn.rows.length > 0) {
      console.log('[ALL PASS] Kolom public.tasks.deadline_sent terverifikasi aktif:', checkColumn.rows[0]);
    } else {
      console.error('[FAIL] Kolom deadline_sent belum terbuat.');
      process.exit(1);
    }
  } catch (err) {
    console.error('[ERROR] Gagal mengeksekusi SQL di Supabase:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
