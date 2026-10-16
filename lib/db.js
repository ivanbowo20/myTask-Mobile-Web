import { Pool } from "pg";

let pool;

export function getDbPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 10,
    });
  }
  return pool;
}

export async function query(text, params) {
  const p = getDbPool();
  return p.query(text, params);
}

