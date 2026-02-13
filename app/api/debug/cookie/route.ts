import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const res = NextResponse.json(
    {
      ok: true,
      note: "Set cookie_test=1. Потом открой /api/debug/cookie?mode=read",
    },
    { status: 200 }
  );

  // Ставим простую тестовую cookie
  res.cookies.set({
    name: "cookie_test",
    value: "1",
    httpOnly: false,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 60 * 60, // 1 час
  });

  return res;
}

// Чтение cookie: /api/debug/cookie?mode=read
export async function POST(request: NextRequest) {
  const all = request.cookies.getAll().map((c) => ({ name: c.name, value: c.value }));
  return NextResponse.json(
    {
      ok: true,
      cookies: all,
    },
    { status: 200 }
  );
}
