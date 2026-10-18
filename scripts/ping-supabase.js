/**
 * Script Pengujian Ping Supabase Lokal
 * Mengirim permintaan HTTP GET ringan ke PostgREST API Supabase
 * Memastikan koneksi database aktif dan tidak terkena auto-pause.
 *
 * Jalankan: npm run ping:supabase
 */

const fs = require('fs');
const path = require('path');

// Fungsi pembantu untuk membaca file .env.local jika env vars belum ada di process.env
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
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  });
}

async function pingSupabase() {
  loadLocalEnv();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  const authKey = serviceKey || anonKey;

  if (!supabaseUrl || !authKey) {
    console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY tidak ditemukan di .env.local!');
    process.exitCode = 1;
    return;
  }

  const endpoint = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/rpc/purge_old_completed_tasks`;
  console.log(`📡 Mengirim ping & maintenance auto-purge ke Supabase RPC:`);
  console.log(`   URL: ${supabaseUrl}`);
  console.log(`   Endpoint: /rest/v1/rpc/purge_old_completed_tasks`);
  console.log(`   Key Type: ${serviceKey ? 'Service Role Key (Admin)' : 'Anon Key (Public)'}\n`);

  const startTime = Date.now();

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'apikey': authKey,
        'Authorization': `Bearer ${authKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });

    const duration = Date.now() - startTime;
    const data = await response.text();

    console.log(`📊 Status Code : ${response.status} ${response.statusText}`);
    console.log(`⏱️ Durasi      : ${duration} ms`);
    console.log(`📦 Data Return : ${data.trim() || '[]'} (tugas lama terhapus)`);

    if (response.ok) {
      console.log('\n✅ [BERHASIL] Supabase RPC purge_old_completed_tasks merespons dengan sukses!');
      console.log('   Koneksi PostgreSQL aktif, auto-pause terhindar, dan cleanup otomatis berjalan.');
    } else {
      console.error(`\n❌ [GAGAL] Supabase merespons dengan error: ${response.status}`);
      if (response.status === 401 || response.status === 403) {
        console.error('   Catatan Keamanan: Izin eksekusi anon telah dicabut di schema.sql.');
        console.error('   Harap sertakan SUPABASE_SERVICE_ROLE_KEY di .env.local untuk mengeksekusi RPC ini.');
      }
      process.exitCode = 1;
      return;
    }
  } catch (err) {
    console.error('\n❌ [ERROR] Gagal menghubungi Supabase:');
    console.error(`   ${err.message}`);
    process.exitCode = 1;
    return;
  }
}

pingSupabase();
