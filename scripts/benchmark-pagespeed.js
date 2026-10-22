#!/usr/bin/env node

/**
 * TaskFlow v2 - Native Server & PageSpeed Benchmark Runner
 * 
 * Penggunaan:
 *   node scripts/benchmark-pagespeed.js [URL]
 * 
 * Contoh:
 *   node scripts/benchmark-pagespeed.js http://localhost:3000
 *   node scripts/benchmark-pagespeed.js https://mytask.vercel.app
 */

const http = require('http');
const https = require('https');
const { performance } = require('perf_hooks');

const targetUrl = process.argv[2] || process.env.TARGET_URL || 'http://localhost:3000';

async function measureRequest(urlStr) {
  const parsed = new URL(urlStr);
  const client = parsed.protocol === 'https:' ? https : http;

  return new Promise((resolve) => {
    const start = performance.now();
    let dnsTime = 0;
    let tcpTime = 0;
    let ttfbTime = 0;
    let totalTime = 0;
    let bytesReceived = 0;

    const req = client.get(
      urlStr,
      {
        headers: {
          'User-Agent': 'TaskFlow-PageSpeed-Benchmarker/1.0',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
        },
      },
      (res) => {
        ttfbTime = performance.now() - start;

        res.on('data', (chunk) => {
          bytesReceived += chunk.length;
        });

        res.on('end', () => {
          totalTime = performance.now() - start;
          resolve({
            url: urlStr,
            status: res.statusCode,
            ttfbMs: Math.round(ttfbTime),
            totalMs: Math.round(totalTime),
            bytes: bytesReceived,
            error: null,
          });
        });
      }
    );

    req.on('socket', (socket) => {
      socket.on('lookup', () => {
        dnsTime = performance.now() - start;
      });
      socket.on('connect', () => {
        tcpTime = performance.now() - start;
      });
    });

    req.on('error', (err) => {
      resolve({
        url: urlStr,
        status: 0,
        ttfbMs: 0,
        totalMs: Math.round(performance.now() - start),
        bytes: 0,
        error: err.message,
      });
    });

    req.setTimeout(10000, () => {
      req.destroy();
      resolve({
        url: urlStr,
        status: 408,
        ttfbMs: 0,
        totalMs: 10000,
        bytes: 0,
        error: 'Timeout (10s)',
      });
    });
  });
}

async function runBenchmark() {
  console.log('='.repeat(70));
  console.log(`🚀 TASKFLOW V2 - SERVER PAGESPEED & LATENCY BENCHMARK`);
  console.log(`🎯 Target URL: ${targetUrl}`);
  console.log(`⏰ Waktu: ${new Date().toISOString()}`);
  console.log('='.repeat(70));

  // 1. Warm-up ping
  console.log('\n[1/3] Melakukan Warm-up Ping ke target...');
  const warmup = await measureRequest(targetUrl);
  if (warmup.error) {
    console.error(`❌ Gagal terhubung ke ${targetUrl}: ${warmup.error}`);
    console.log('\n💡 Catatan: Pastikan dev server sudah dinyalakan (`npm run dev`) atau URL valid.');
    process.exit(1);
  }
  console.log(`✅ Warm-up selesai: Status ${warmup.status} | TTFB: ${warmup.ttfbMs}ms | Total: ${warmup.totalMs}ms`);

  // 2. Sequential Latency Test (3 runs)
  console.log('\n[2/3] Mengukur Latensi Pembukaan Halaman (3x Sequential Run)...');
  const sequentialResults = [];
  const endpoints = ['/', '/login'];

  for (const ep of endpoints) {
    const fullUrl = `${targetUrl.replace(/\/$/, '')}${ep}`;
    console.log(`\n  Menguji rute: ${ep}`);
    for (let i = 1; i <= 3; i++) {
      const res = await measureRequest(fullUrl);
      sequentialResults.push({ endpoint: ep, ...res });
      const speedStatus = res.totalMs <= 1000 ? '⚡ SANGAT CEPAT' : (res.totalMs <= 3000 ? '✅ IDEAL (<3s)' : '⚠️ LAMBAT (>3s)');
      console.log(`    Run #${i}: Status ${res.status} | TTFB: ${res.ttfbMs.toString().padStart(4)}ms | Total: ${res.totalMs.toString().padStart(4)}ms | Ukuran: ${(res.bytes / 1024).toFixed(1)} KB | ${speedStatus}`);
    }
  }

  // 3. Concurrency Stress Test (10 concurrent requests)
  console.log('\n[3/3] Menguji Concurrency Load (10 Permintaan Bersamaan)...');
  const concurrentPromises = Array.from({ length: 10 }, (_, i) =>
    measureRequest(`${targetUrl.replace(/\/$/, '')}/`)
  );
  const concurrentResults = await Promise.all(concurrentPromises);

  const successful = concurrentResults.filter((r) => r.status >= 200 && r.status < 400);
  const avgTtfb = Math.round(concurrentResults.reduce((acc, r) => acc + r.ttfbMs, 0) / concurrentResults.length);
  const avgTotal = Math.round(concurrentResults.reduce((acc, r) => acc + r.totalMs, 0) / concurrentResults.length);
  const maxTotal = Math.max(...concurrentResults.map((r) => r.totalMs));

  console.log('\n' + '='.repeat(70));
  console.log('📊 RANGKUMAN HASIL AUDIT PERFORMA SERVER');
  console.log('='.repeat(70));
  console.log(`• Sukses Concurrency: ${successful.length}/10 request`);
  console.log(`• Rata-rata TTFB     : ${avgTtfb} ms`);
  console.log(`• Rata-rata Total    : ${avgTotal} ms`);
  console.log(`• Max Latency (Peak) : ${maxTotal} ms`);
  console.log(`• Ambang Batas Ideal : Target <= 3000 ms (3 detik)`);
  
  if (avgTotal <= 3000) {
    console.log(`\n🎉 KESIMPULAN: Kecepatan respon server SUDAH IDEAL (di bawah 3 detik)!`);
  } else {
    console.log(`\n⚠️ KESIMPULAN: Server melebihi 3 detik saat beban puncak.`);
  }
  console.log('='.repeat(70));
}

runBenchmark().catch((err) => {
  console.error('Error saat menjalankan benchmark:', err);
});
