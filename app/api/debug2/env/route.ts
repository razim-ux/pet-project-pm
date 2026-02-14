import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    nodeEnv: process.env.NODE_ENV ?? null,
    hasDbUrl: Boolean(process.env.DATABASE_URL),
    dbUrlPrefix: process.env.DATABASE_URL
      ? process.env.DATABASE_URL.slice(0, 20)
      : null,
  });
}
