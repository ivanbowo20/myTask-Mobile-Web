import { Pool } from "pg";


function getResolvedConnectionString() {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) return rawUrl;

  try {
    const parsed = new URL(rawUrl);
    // If connecting directly to Supabase db.<ref>.supabase.co, route through IPv4 pooler to prevent ENOENT/timeout
    const match = parsed.hostname.match(/^db\.([a-z0-9]+)\.supabase\.co$/);
    if (match) {
      const projectRef = match[1];
      const poolerRegion = process.env.DATABASE_POOLER_HOST || "aws-0-ap-southeast-1.pooler.supabase.com";
      return `postgresql://postgres.${projectRef}:${encodeURIComponent(parsed.password || "")}@${poolerRegion}:6543/postgres`;
    }
  } catch {
    // Return original if parsing fails
  }
  return rawUrl;
}

export function getDbPool() {
  if (!globalThis._pgPool) {
    const connectionString = getResolvedConnectionString();
    globalThis._pgPool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: process.env.NODE_ENV === "production" ? 10 : 2,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
    // Prevent unhandled error event crash on idle database client
    globalThis._pgPool.on("error", (err) => {
      console.error("Unexpected error on idle pg client:", err);
    });
  }
  return globalThis._pgPool;
}

export async function query(text, params) {
  const p = getDbPool();
  return p.query(text, params);
}

