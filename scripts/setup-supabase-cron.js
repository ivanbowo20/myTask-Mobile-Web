const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// 1. Baca konfigurasi dari .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

let databaseUrl = null;
let cronSecret = null;
let appUrl = 'https://mytask-self.vercel.app';

for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (trimmed.startsWith('DATABASE_URL=')) {
    databaseUrl = trimmed.substring('DATABASE_URL='.length).trim();
    if ((databaseUrl.startsWith('"') && databaseUrl.endsWith('"')) ||
        (databaseUrl.startsWith("'") && databaseUrl.endsWith("'"))) {
      databaseUrl = databaseUrl.slice(1, -1);
    }
  }
  if (trimmed.startsWith('CRON_SECRET=')) {
    cronSecret = trimmed.substring('CRON_SECRET='.length).trim();
    if ((cronSecret.startsWith('"') && cronSecret.endsWith('"')) ||
        (cronSecret.startsWith("'") && cronSecret.endsWith("'"))) {
      cronSecret = cronSecret.slice(1, -1);
    }
  }
}

if (!databaseUrl) {
  console.error('[ERROR] DATABASE_URL tidak ditemukan di .env.local');
  process.exit(1);
}

if (!cronSecret) {
  console.error('[ERROR] CRON_SECRET tidak ditemukan di .env.local');
  process.exit(1);
}

async function setupSupabaseCron() {
  console.log('[INFO] Menghubungkan ke Supabase PostgreSQL...');
  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('[SUCCESS] Terhubung ke database Supabase!');

    // 1. Pastikan ekstensi pg_net dan pg_cron aktif
    console.log('[INFO] Memverifikasi ekstensi pg_net & pg_cron...');
    await client.query(`CREATE EXTENSION IF NOT EXISTS pg_net;`);
    await client.query(`CREATE EXTENSION IF NOT EXISTS pg_cron;`);

    // 2. Buat tabel konfigurasi cron dispatcher
    console.log('[INFO] Membuat tabel public.cron_dispatch_config...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.cron_dispatch_config (
        id int PRIMARY KEY DEFAULT 1,
        app_url text NOT NULL DEFAULT 'https://mytask-self.vercel.app',
        cron_secret text NOT NULL,
        is_active boolean NOT NULL DEFAULT true,
        updated_at timestamp with time zone DEFAULT now()
      );
    `);

    // 3. Simpan atau perbarui data konfigurasi
    await client.query(`
      INSERT INTO public.cron_dispatch_config (id, app_url, cron_secret, is_active, updated_at)
      VALUES (1, $1, $2, true, now())
      ON CONFLICT (id) DO UPDATE SET
        app_url = EXCLUDED.app_url,
        cron_secret = EXCLUDED.cron_secret,
        is_active = true,
        updated_at = now();
    `, [appUrl, cronSecret]);
    console.log('[SUCCESS] Konfigurasi endpoint & secret tersimpan di database!');

    // 4. Buat fungsi pintar pengecek tugas
    // PENTING: Hanya panggil net.http_post JIKA ada tugas yang perlu dikirimi notifikasi.
    // Jika tidak ada tugas, 0 panggilan ke Vercel (hemat kuota Vercel 100%).
    console.log('[INFO] Membuat fungsi public.check_and_dispatch_task_reminders()...');
    await client.query(`
      CREATE OR REPLACE FUNCTION public.check_and_dispatch_task_reminders()
      RETURNS void
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      DECLARE
        task_count int;
        cfg record;
        target_endpoint text;
      BEGIN
        -- 1. Baca konfigurasi scheduler
        SELECT * INTO cfg FROM public.cron_dispatch_config WHERE id = 1 LIMIT 1;
        IF NOT FOUND OR cfg.is_active = false THEN
          RETURN;
        END IF;

        -- 2. Cek apakah ada tugas yang sudah jatuh tempo pengingat
        SELECT count(*) INTO task_count
        FROM public.tasks t
        WHERE t.selesai = false
          AND t.reminder_sent = false
          AND t.deadline IS NOT NULL
          AND (
            CASE t.reminder
              WHEN '15m' THEN t.deadline - INTERVAL '15 minutes'
              WHEN '30m' THEN t.deadline - INTERVAL '30 minutes'
              WHEN '1h'  THEN t.deadline - INTERVAL '1 hour'
              WHEN '3h'  THEN t.deadline - INTERVAL '3 hours'
              WHEN '6h'  THEN t.deadline - INTERVAL '6 hours'
              WHEN '1d'  THEN t.deadline - INTERVAL '1 day'
              ELSE t.deadline - INTERVAL '15 minutes'
            END
          ) <= NOW()
          AND t.deadline >= NOW() - INTERVAL '3 days';

        -- 3. HANYA bila ada tugas (task_count > 0), tembak panggilan HTTP via pg_net ke Vercel!
        -- Proteksi Kuota: Jika task_count == 0, tidak ada satupun request yang dikirim ke Vercel!
        IF task_count > 0 THEN
          target_endpoint := rtrim(cfg.app_url, '/') || '/api/notifications/dispatch?key=' || cfg.cron_secret;
          PERFORM net.http_post(
            url := target_endpoint,
            headers := '{"Content-Type": "application/json"}'::jsonb
          );
        END IF;
      END;
      $$;
    `);

    // 5. Daftarkan jadwal pg_cron setiap 1 menit
    console.log('[INFO] Mendaftarkan jadwal cron di pg_cron...');
    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'dispatch-task-reminders') THEN
          PERFORM cron.unschedule('dispatch-task-reminders');
        END IF;
      END $$;
    `);

    await client.query(`
      SELECT cron.schedule(
        'dispatch-task-reminders',
        '* * * * *',
        'SELECT public.check_and_dispatch_task_reminders();'
      );
    `);

    // 6. Verifikasi job di cron.job
    const verifyJob = await client.query(`
      SELECT jobid, schedule, command, nodename, nodeport, database, username, active, jobname
      FROM cron.job
      WHERE jobname = 'dispatch-task-reminders';
    `);

    if (verifyJob.rows.length > 0) {
      console.log('[ALL PASS] Supabase pg_cron aktif 100%!', verifyJob.rows[0]);
    } else {
      console.error('[FAIL] Job cron gagal terdaftar.');
      process.exit(1);
    }

  } catch (err) {
    console.error('[ERROR] Gagal mengatur Supabase cron:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

setupSupabaseCron();
