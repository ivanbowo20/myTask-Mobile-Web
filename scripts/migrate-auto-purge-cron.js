const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// 1. Baca konfigurasi dari .env.local
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
  }
}

if (!databaseUrl) {
  console.error('[ERROR] DATABASE_URL tidak ditemukan di .env.local');
  process.exit(1);
}

try {
  const parsed = new URL(databaseUrl);
  const match = parsed.hostname.match(/^db\.([a-z0-9]+)\.supabase\.co$/);
  if (match) {
    const projectRef = match[1];
    databaseUrl = `postgresql://postgres.${projectRef}:${encodeURIComponent(parsed.password || "")}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;
  }
} catch (e) {}

async function runMigration() {
  console.log('[INFO] Menghubungkan ke Supabase PostgreSQL...');
  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('[SUCCESS] Terhubung ke database Supabase!');

    // 1. Update fungsi purge_old_completed_tasks ke interval 3 days
    console.log('[INFO] Memperbarui fungsi public.purge_old_completed_tasks() ke interval 3 days...');
    await client.query(`
      CREATE OR REPLACE FUNCTION public.purge_old_completed_tasks()
      RETURNS integer
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public, pg_temp
      AS $$
      DECLARE
        deleted_count integer;
      BEGIN
        DELETE FROM public.tasks
        WHERE selesai = true
          AND selesai_pada IS NOT NULL
          AND selesai_pada < (now() - interval '3 days');
        GET DIAGNOSTICS deleted_count = row_count;
        RETURN deleted_count;
      END;
      $$;

      REVOKE ALL ON FUNCTION public.purge_old_completed_tasks() FROM public, anon, authenticated;
      GRANT EXECUTE ON FUNCTION public.purge_old_completed_tasks() TO service_role, postgres;
    `);
    console.log('[SUCCESS] Fungsi public.purge_old_completed_tasks() berhasil diperbarui!');

    // 2. Daftarkan jadwal harian di pg_cron (setiap hari jam 00:00 UTC / 07:00 WIB)
    console.log('[INFO] Memastikan ekstensi pg_cron aktif...');
    await client.query(`CREATE EXTENSION IF NOT EXISTS pg_cron;`);

    console.log('[INFO] Mendaftarkan job purge-completed-tasks-daily di pg_cron...');
    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-completed-tasks-daily') THEN
          PERFORM cron.unschedule('purge-completed-tasks-daily');
        END IF;
      END $$;
    `);

    await client.query(`
      SELECT cron.schedule(
        'purge-completed-tasks-daily',
        '0 0 * * *',
        'SELECT public.purge_old_completed_tasks();'
      );
    `);
    console.log('[SUCCESS] Job cron purge-completed-tasks-daily berhasil dijadwalkan (00:00 UTC setiap hari)!');

    // 3. Jalankan pembersihan langsung 1x untuk tugas yang sudah > 3 hari saat ini
    console.log('[INFO] Menjalankan pembersihan 1x saat ini...');
    const purgeRes = await client.query(`SELECT public.purge_old_completed_tasks() AS deleted;`);
    const deletedCount = purgeRes.rows[0]?.deleted || 0;
    console.log(`[SUCCESS] Pembersihan selesai! Jumlah tugas usang terhapus: ${deletedCount}`);

  } catch (err) {
    console.error('[ERROR] Migrasi gagal:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
