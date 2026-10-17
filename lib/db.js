import { Pool } from "pg";

let pool;

function getResolvedConnectionString() {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) return rawUrl;

  try {
    const parsed = new URL(rawUrl);
    // If connecting directly to Supabase db.<ref>.supabase.co, route through IPv4 pooler to prevent ENOENT/timeout
    const match = parsed.hostname.match(/^db\.([a-z0-9]+)\.supabase\.co$/);
    if (match) {
      const projectRef = match[1];
      const password = parsed.password;
      return `postgresql://postgres.${projectRef}:${password}@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres`;
    }
  } catch {
    // Return original if parsing fails
  }
  return rawUrl;
}

export function getDbPool() {
  if (!pool) {
    const connectionString = getResolvedConnectionString();
    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }
  return pool;
}

export async function query(text, params) {
  const p = getDbPool();
  return p.query(text, params);
}

