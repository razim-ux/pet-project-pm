import { NextRequest, NextResponse } from "next/server";
import { createSession, findUserByUsername, verifyPassword } from "../../tasks/storage";

export const runtime = "nodejs";

async function readBody(request: NextRequest) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const body = await readBody(request);
  const username = String(body?.username ?? "").trim();
  const password = String(body?.password ?? "");

  const user = findUserByUsername(username);
  if (!user) return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });

  const ok = verifyPassword(password, user.passwordHash);
  if (!ok) return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });

  const session = createSession(user.id);

  const res = NextResponse.json(
    {
      ok: true,
      tokenLen: session.token.length, // чтобы исключить “слишком длинный токен”
      user: { id: user.id, username: user.username },
    },
    { status: 200 }
  );

  // 1) основной cookie (как должно быть в проде)
  res.cookies.set({
    name: "session",
    value: session.token,
    httpOnly: true,
    sameSite: "lax",
    secure: false, // localhost
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  // 2) видимый cookie для диагностики (ПОТОМ УДАЛИМ)
  res.cookies.set({
    name: "session_visible",
    value: session.token,
    httpOnly: false,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return res;
}
