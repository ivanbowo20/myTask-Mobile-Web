import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

// Custom metrics
const ttfbTrend = new Trend('custom_ttfb');
const errorRate = new Rate('custom_error_rate');

// Target URL: Default ke localhost:3000 atau lewat environment variable:
// Contoh: k6 run -e BASE_URL=https://your-app.vercel.app tests/k6-load-test.js
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  stages: [
    { duration: '10s', target: 5 },   // Ramp-up: 5 concurrent users
    { duration: '20s', target: 20 },  // Steady state: 20 concurrent users
    { duration: '10s', target: 0 },   // Ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1500'], // 95% request harus selesai di bawah 1.5 detik
    http_req_failed: ['rate<0.02'],    // Error rate maksimal 2%
    custom_ttfb: ['p(90)<800'],        // TTFB p90 di bawah 800ms
  },
};

export default function () {
  // 1. Test Homepage / Landing Page Speed
  const homeRes = http.get(`${BASE_URL}/`, {
    headers: { 'Accept': 'text/html,application/xhtml+xml' },
  });

  ttfbTrend.add(homeRes.timings.waiting);
  const homeCheck = check(homeRes, {
    'Home status 200 or 307': (r) => r.status === 200 || r.status === 307,
    'Home TTFB < 1000ms': (r) => r.timings.waiting < 1000,
  });
  errorRate.add(!homeCheck);

  sleep(1);

  // 2. Test Login Page (Client bundle & auth route)
  const loginRes = http.get(`${BASE_URL}/login`, {
    headers: { 'Accept': 'text/html' },
  });

  const loginCheck = check(loginRes, {
    'Login status 200': (r) => r.status === 200,
  });
  errorRate.add(!loginCheck);

  sleep(1);
}
