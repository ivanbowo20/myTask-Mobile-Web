import { NextResponse } from "next/server";
import { isUsingRealDatabase, query } from "@/lib/db";
import { getAuthConfigStatus } from "@/lib/auth";

export const dynamic = "force-dynamic";

const REQUIRED_TABLES = [
  "user",
  "session",
  "account",
  "verification",
  "categories",
  "tasks",
  "notebook_categories",
  "notebooks",
  "push_subscriptions",
  "notifications",
];

export async function GET() {
  const realDb = isUsingRealDatabase();
  const authStatus = getAuthConfigStatus();

  if (!realDb) {
    return NextResponse.json(
      {
        ok: false,
        database: {
          mode: "mock",
          connected: false,
          schemaReady: false,
          missingTablesCount: REQUIRED_TABLES.length,
        },
        auth: authStatus,
      },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    await query("SELECT 1;");

    const tablesRes = await query(
      `SELECT tablename
       FROM pg_tables
       WHERE schemaname = 'public'
         AND tablename = ANY($1::text[]);`,
      [REQUIRED_TABLES]
    );
    const existing = new Set((tablesRes.rows || []).map((r) => r.tablename));
    const missingTables = REQUIRED_TABLES.filter((t) => !existing.has(t));

    // Verify notebooks.kategori column exists
    const colRes = await query(
      `SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'notebooks'
         AND column_name = 'kategori'
       LIMIT 1;`
    );
    const notebooksKategoriColumnReady = colRes.rows.length > 0;
    const schemaReady = missingTables.length === 0 && notebooksKategoriColumnReady;

    return NextResponse.json(
      {
        ok: schemaReady,
        database: {
          mode: "postgresql",
          connected: true,
          schemaReady,
          missingTablesCount: missingTables.length,
          notebooksKategoriColumnReady,
          ...(process.env.NODE_ENV !== "production" ? { missingTables } : {}),
        },
        auth: authStatus,
      },
      {
        status: schemaReady ? 200 : 500,
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (err) {
    console.error("[HEALTH] Database connectivity check failed:", err?.code || err?.message);
    return NextResponse.json(
      {
        ok: false,
        database: {
          mode: "postgresql",
          connected: false,
          schemaReady: false,
          errorCode: err?.code || "DB_CONNECT_ERROR",
        },
        auth: authStatus,
      },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
