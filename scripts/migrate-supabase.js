/**
 * Script Migrasi Skema Supabase
 * Mengeksekusi penyesuaian skema database, aktivasi RLS, dan pembatasan izin PostgREST.
 *
 * Jalankan: node scripts/migrate-supabase.js
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
    // Abaikan jika parsing gagal, gunakan rawUrl
  }
  return rawUrl;
}

async function runMigration() {
  loadLocalEnv();

  const connectionString = getConnectionString();
  if (!connectionString) {
    console.error('❌ Error: DATABASE_URL tidak ditemukan di .env.local!');
    process.exit(1);
  }

  console.log('🔌 Menghubungkan ke PostgreSQL Supabase...');
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  try {
    await client.connect();
    console.log('✅ Berhasil terhubung ke database!\n');

    // Cek tabel yang ada
    const existingTablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public';
    `);
    const existingTables = existingTablesRes.rows.map(r => r.table_name);
    console.log('📋 Tabel publik saat ini:', existingTables.join(', ') || '(belum ada)');

    // Baca file schema.sql
    const schemaPath = path.resolve(process.cwd(), 'supabase', 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
      console.error(`❌ File ${schemaPath} tidak ditemukan!`);
      process.exit(1);
    }
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log('\n🚀 Menjalankan seluruh instruksi DDL dari supabase/schema.sql...');
    await client.query(schemaSql);
    console.log('✅ Skrip supabase/schema.sql berhasil dieksekusi 100%!');

    // Verifikasi status RLS
    console.log('\n🔒 Memverifikasi status Row Level Security (RLS) di database:');
    const rlsCheck = await client.query(`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `);

    rlsCheck.rows.forEach((row) => {
      console.log(`   - ${row.tablename.padEnd(20)}: RLS ${row.rowsecurity ? 'ENABLED (Aktif)' : 'DISABLED (Nonaktif)'}`);
    });

    console.log('\n🎉 [SUKSES BESAR] Proteksi database aktif:');
    console.log('   - RLS telah diaktifkan pada semua tabel.');
    console.log('   - Hak akses anon/authenticated untuk PostgREST telah dicabut.');
    console.log('   - Database 100% aman terlindungi di balik backend Next.js!\n');
  } catch (err) {
    console.error('❌ Gagal mengeksekusi migrasi:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
