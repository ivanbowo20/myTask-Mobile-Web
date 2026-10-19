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

  if (!supabaseUrl || (!serviceKey && !anonKey)) {
    console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY tidak ditemukan di .env.local!');
    process.exitCode = 1;
    return;
  }

  const cleanUrl = supabaseUrl.replace(/\/$/, '');

  // Tier 1: Coba RPC purge_old_completed_tasks jika serviceKey tersedia
  if (serviceKey) {
    console.log(`📡 [Tier 1] Menjalankan maintenance auto-purge via service_role:`);
    console.log(`   URL      : ${cleanUrl}`);
    console.log(`   Endpoint : /rest/v1/rpc/purge_old_completed_tasks`);
    console.log(`   Key Type : Service Role Key (Admin)\n`);

    const startTime = Date.now();
    try {
      const response = await fetch(`${cleanUrl}/rest/v1/rpc/purge_old_completed_tasks`, {
        method: 'POST',
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });

      const duration = Date.now() - startTime;
      const data = await response.text();

      console.log(`📊 Status Code : ${response.status} ${response.statusText}`);
      console.log(`⏱️ Durasi      : ${duration} ms`);
      console.log(`📦 Data Return : ${data.trim() || '0'} tugas lama terhapus`);

      if (response.ok) {
        console.log('\n✅ [BERHASIL] Supabase RPC purge_old_completed_tasks merespons dengan sukses!');
        console.log('   Koneksi PostgreSQL aktif, auto-pause terhindar, dan cleanup otomatis berjalan.');
        return;
      }
      console.warn(`⚠️ [Tier 1 Warning] Purge RPC mengembalikan status ${response.status}. Berpindah ke Tier 2 Keep-Alive Ping...`);
    } catch (err) {
      console.warn(`⚠️ [Tier 1 Warning] Gagal memanggil purge RPC: ${err.message}. Berpindah ke Tier 2 Keep-Alive Ping...`);
    }
  }

  // Tier 2: Jalankan Keep-Alive Ping via public RPC ping() menggunakan anonKey
  const activeKey = anonKey || serviceKey;
  console.log(`📡 [Tier 2] Menjalankan Keep-Alive Ping via RPC ping():`);
  console.log(`   URL      : ${cleanUrl}`);
  console.log(`   Endpoint : /rest/v1/rpc/ping`);
  console.log(`   Key Type : ${anonKey ? 'Anon Key (Public)' : 'Service Role Key (Admin)'}\n`);

  const startTime = Date.now();
  try {
    const response = await fetch(`${cleanUrl}/rest/v1/rpc/ping`, {
      method: 'POST',
      headers: {
        'apikey': activeKey,
        'Authorization': `Bearer ${activeKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });

    const duration = Date.now() - startTime;
    const data = await response.text();

    console.log(`📊 Status Code : ${response.status} ${response.statusText}`);
    console.log(`⏱️ Durasi      : ${duration} ms`);
    console.log(`📦 Data Return : ${data.trim()}`);

    if (response.ok) {
      console.log('\n✅ [BERHASIL] Supabase RPC ping merespons dengan sukses!');
      console.log('   Koneksi PostgreSQL aktif & timer inaktivitas Supabase Free Tier berhasil di-reset!');
      if (!serviceKey) {
        console.log('   💡 Tips: Tambahkan SUPABASE_SERVICE_ROLE_KEY di .env.local / GitHub Secrets jika ingin fitur auto-purge tugas lama berjalan otomatis.');
      }
    } else {
      console.error(`\n❌ [GAGAL] Supabase merespons dengan error: ${response.status}`);
      console.error(`   Respons: ${data}`);
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('\n❌ [ERROR] Gagal menghubungi Supabase:');
    console.error(`   ${err.message}`);
    process.exitCode = 1;
  }
}

pingSupabase();
