export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export async function GET() {
  const r = await pool.query("select 1 as ok");
  return NextResponse.json({ ok: r.rows[0].ok === 1 });
}
