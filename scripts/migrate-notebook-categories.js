/**
 * Script Migrasi Kolom Kategori Notebooks
 * Menambahkan kolom 'kategori' dan indeks pendukung pada tabel public.notebooks.
 * 
 * Jalankan: node scripts/migrate-notebook-categories.js
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
    // Gunakan rawUrl jika parsing pooler gagal
  }
  return rawUrl;
}

const MIGRATION_SQL = `
-- 1. Tambah Kolom Kategori jika belum ada
ALTER TABLE public.notebooks
ADD COLUMN IF NOT EXISTS kategori text DEFAULT '';

-- 2. Indexing Performa Tinggi untuk Kategori per User
CREATE INDEX IF NOT EXISTS idx_notebooks_user_kategori 
ON public.notebooks (user_id, kategori);
`;

async function runMigration() {
  loadLocalEnv();

  const connectionString = getConnectionString();
  if (!connectionString) {
    console.error('ERROR: DATABASE_URL tidak ditemukan di .env.local');
    process.exit(1);
  }

  console.log('Menghubungkan ke PostgreSQL Supabase...');
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  try {
    await client.connect();
    console.log('Terhubung ke database.');

    console.log('Menjalankan migrasi kolom kategori...');
    await client.query(MIGRATION_SQL);
    console.log('Migrasi berhasil dijalankan!');

    // Verifikasi kolom ada
    const res = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' 
        AND table_name = 'notebooks'
        AND column_name = 'kategori';
    `);

    if (res.rows.length > 0) {
      console.log('Verifikasi kolom "kategori": TERBUKTI ADA.');
      console.log(JSON.stringify(res.rows[0], null, 2));
    } else {
      console.warn('Peringatan: Kolom tidak ditemukan pada information_schema.');
    }

  } catch (err) {
    console.error('Gagal menjalankan migrasi:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
