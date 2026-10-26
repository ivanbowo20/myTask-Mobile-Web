const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Baca DATABASE_URL dari .env.local
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

async function run() {
  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('[TEST 1] Verifikasi kolom deadline_sent di public.tasks...');
    const colRes = await client.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'tasks' 
        AND column_name = 'deadline_sent';
    `);
    if (colRes.rows.length === 0) {
      throw new Error('Kolom deadline_sent tidak ditemukan di tabel tasks!');
    }
    console.log(' -> Kolom deadline_sent OK:', colRes.rows[0]);

    console.log('[TEST 2] Verifikasi fungsi check_and_dispatch_task_reminders...');
    const funcRes = await client.query(`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_schema = 'public' 
        AND routine_name = 'check_and_dispatch_task_reminders';
    `);
    if (funcRes.rows.length === 0) {
      throw new Error('Fungsi check_and_dispatch_task_reminders tidak ditemukan!');
    }
    console.log(' -> Fungsi database OK:', funcRes.rows[0]);

    console.log('[TEST 3] Verifikasi syntax EXPLAIN query atomik dispatcher...');
    const explainSql = `
      EXPLAIN
      WITH eligible_tasks AS (
        SELECT 
          t.id,
          t.user_id,
          t.judul,
          t.deskripsi,
          t.deadline,
          t.reminder,
          CASE 
            WHEN t.deadline <= NOW() AND t.deadline_sent = false THEN 'deadline'
            WHEN t.deadline > NOW() AND t.reminder_sent = false THEN 'reminder'
            ELSE NULL
          END AS notif_type
        FROM public.tasks t
        WHERE t.selesai = false
          AND t.deadline IS NOT NULL
          AND t.deadline >= NOW() - INTERVAL '3 days'
          AND (
            (t.deadline_sent = false AND t.deadline <= NOW())
            OR
            (
              t.reminder_sent = false
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
              AND t.deadline > NOW()
            )
          )
        ORDER BY t.deadline ASC
        LIMIT 50
        FOR UPDATE SKIP LOCKED
      )
      UPDATE public.tasks t
      SET 
        reminder_sent = CASE 
          WHEN et.notif_type = 'reminder' THEN true 
          WHEN et.notif_type = 'deadline' THEN true 
          ELSE t.reminder_sent 
        END,
        deadline_sent = CASE 
          WHEN et.notif_type = 'deadline' THEN true 
          ELSE t.deadline_sent 
        END
      FROM eligible_tasks et
      WHERE t.id = et.id
      RETURNING t.id, t.user_id, t.judul, t.deskripsi, t.deadline, t.reminder, et.notif_type;
    `;
    const explainRes = await client.query(explainSql);
    console.log(' -> EXPLAIN query atomik valid, baris rencana eksekusi:', explainRes.rows.length);

    console.log('\n[KESIMPULAN] Seluruh 3 test database lulus 100%!');
  } catch (err) {
    console.error('[GAGAL]', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
