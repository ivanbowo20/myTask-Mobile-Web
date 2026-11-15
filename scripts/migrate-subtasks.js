/**
 * Migration Script: Add 'subtasks' column to 'public.tasks' table
 * Run with: node scripts/migrate-subtasks.js
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

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
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  });
}

function getConnectionString() {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) return null;

  try {
    const parsed = new URL(rawUrl);
    const match = parsed.hostname.match(/^db\.([a-z0-9]+)\.supabase\.co$/);
    if (match) {
      const projectRef = match[1];
      const poolerRegion = process.env.DATABASE_POOLER_HOST || 'aws-0-ap-southeast-1.pooler.supabase.com';
      return `postgresql://postgres.${projectRef}:${encodeURIComponent(parsed.password || '')}@${poolerRegion}:6543/postgres`;
    }
  } catch (err) {
    // Ignore error
  }
  return rawUrl;
}

async function runMigration() {
  loadLocalEnv();
  const connectionString = getConnectionString();
  if (!connectionString) {
    console.error('DATABASE_URL not found in .env.local');
    process.exit(1);
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  try {
    await client.connect();
    console.log('Connected to database.');

    // Add subtasks column to tasks table if it does not exist
    await client.query(`
      ALTER TABLE public.tasks 
      ADD COLUMN IF NOT EXISTS subtasks JSONB NOT NULL DEFAULT '[]'::jsonb;
    `);
    console.log('Successfully ensured column "subtasks" in table "public.tasks".');

    // Verify column exists
    const res = await client.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'tasks' 
        AND column_name = 'subtasks';
    `);

    if (res.rows.length > 0) {
      console.log('Verification passed:', res.rows[0]);
    } else {
      console.error('Verification failed: column "subtasks" not found!');
      process.exit(1);
    }
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
