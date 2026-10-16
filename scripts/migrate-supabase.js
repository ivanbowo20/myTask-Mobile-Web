const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const password = process.env.DB_PASS || process.argv[2];
  if (!password) {
    console.error('Error: DB_PASS is required');
    process.exit(1);
  }

  const projectRef = 'mkkntidwlbajxqwmswof';
  // Try direct host first, then pooler host if IPv4 fallback needed
  const hosts = [
    `db.${projectRef}.supabase.co`,
    `aws-0-ap-southeast-2.pooler.supabase.com`
  ];

  let client = null;
  let connected = false;

  for (const host of hosts) {
    try {
      console.log(`Connecting to ${host}...`);
      const user = host.includes('pooler') ? `postgres.${projectRef}` : 'postgres';
      const port = host.includes('pooler') ? 6543 : 5432;

      client = new Client({
        host,
        port,
        database: 'postgres',
        user,
        password,
        ssl: { rejectUnauthorized: false }
      });

      await client.connect();
      console.log(`[SUCCESS] Connected to PostgreSQL on ${host}:${port}!`);
      connected = true;
      break;
    } catch (err) {
      console.log(`[RETRY] Failed to connect on ${host}: ${err.message}`);
    }
  }

  if (!connected || !client) {
    console.error('All connection attempts failed.');
    process.exit(1);
  }

  try {
    const schemaSql = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'schema.sql'), 'utf8');
    console.log('Executing database schema migration...');
    await client.query(schemaSql);
    console.log('[SUCCESS] All SQL schema queries executed successfully!');

    // Verify tables
    const tableRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    console.log('\nVerified tables in public schema:');
    tableRes.rows.forEach(r => console.log(`  - ${r.table_name}`));

    // Verify RLS
    const rlsRes = await client.query(`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' AND tablename IN ('categories', 'tasks');
    `);
    console.log('\nRow Level Security (RLS) Status:');
    rlsRes.rows.forEach(r => console.log(`  - ${r.tablename}: RLS active = ${r.rowsecurity}`));

  } catch (err) {
    console.error('Migration error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
