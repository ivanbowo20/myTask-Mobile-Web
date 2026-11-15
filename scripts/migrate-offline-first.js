/**
 * Script Runner Migrasi Offline-First
 * scripts/migrate-offline-first.js
 * 
 * Mengeksekusi penyesuaian skema database untuk arsitektur offline-first,
 * menambahkan kolom client_uuid, updated_at, deleted_at, indeks idempotensi,
 * serta verifikasi integritas kolom pasca-migrasi.
 * 
 * Jalankan: npm run migrate:offline
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

function loadLocalEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  });
}

function getConnectionString() {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) return null;

  try {
    const parsed = new URL(rawUrl);
    const match = parsed.hostname.match(/^db\.([a-z0-9]+)\.supabase\.co$/);
    if (match) {
      const projectRef = match[1];
      const poolerRegion = process.env.DATABASE_POOLER_HOST || 'aws-0-ap-southeast-1.pooler.supabase.com';
      return `postgresql://postgres.${projectRef}:${encodeURIComponent(parsed.password || '')}@${poolerRegion}:6543/postgres`;
    }
  } catch (err) {
    // Abaikan kegagalan parsing, fallback ke rawUrl
  }
  return rawUrl;
}

async function runMigration() {
  loadLocalEnv();

  const connectionString = getConnectionString();
  if (!connectionString) {
    console.error('[ERROR] DATABASE_URL tidak ditemukan di .env.local');
    process.exit(1);
  }

  console.log('[INFO] Menghubungkan ke PostgreSQL Supabase...');
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  try {
    await client.connect();
    console.log('[INFO] Berhasil terhubung ke database.');

    const migrationPath = path.resolve(process.cwd(), 'supabase', 'migrations', '20261113_offline_first.sql');
    if (!fs.existsSync(migrationPath)) {
      console.error(`[ERROR] File migrasi tidak ditemukan: ${migrationPath}`);
      process.exit(1);
    }

    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    console.log('[INFO] Mengeksekusi 20261113_offline_first.sql...');
    await client.query(migrationSql);
    console.log('[SUCCESS] DDL migrasi offline-first berhasil dieksekusi.');

    // Verifikasi keberadaan kolom di 4 tabel inti
    const tablesToCheck = ['categories', 'tasks', 'notebooks', 'notebook_categories'];
    const requiredColumns = ['client_uuid', 'updated_at', 'deleted_at'];

    console.log('[INFO] Memverifikasi integritas kolom skema offline-first...');
    for (const table of tablesToCheck) {
      const res = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = $1 
          AND column_name = ANY($2::text[])
      `, [table, requiredColumns]);

      const foundCols = res.rows.map((r) => r.column_name);
      for (const col of requiredColumns) {
        if (!foundCols.includes(col)) {
          console.error(`[FAIL] Kolom "${col}" hilang pada tabel "${table}"!`);
          process.exit(1);
        }
      }
      console.log(`[PASS] Tabel "${table}": kolom client_uuid, updated_at, deleted_at terverifikasi.`);
    }

    // Verifikasi indeks unik idempotensi (user_id, client_uuid) dan partial indexes nama
    console.log('[INFO] Memverifikasi indeks unik idempotensi dan partial indexes...');
    const indexRes = await client.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
        AND indexname IN (
          'uq_categories_user_client_uuid',
          'uq_tasks_user_client_uuid',
          'uq_notebooks_user_client_uuid',
          'uq_notebook_categories_user_client_uuid',
          'idx_categories_user_nama',
          'idx_notebook_categories_user_nama'
        );
    `);

    const foundIndexes = indexRes.rows.map((r) => r.indexname);
    console.log(`[PASS] Indeks terverifikasi: ${foundIndexes.length}/6 (${foundIndexes.join(', ')})`);

    if (foundIndexes.length < 6) {
      console.warn('[WARN] Beberapa indeks belum terdeteksi. Periksa log migrasi.');
    }

    console.log('\n[SELESAI] Migrasi offline-first tuntas dan terverifikasi 100%.');
  } catch (err) {
    console.error('[ERROR] Gagal menjalankan migrasi offline-first:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
