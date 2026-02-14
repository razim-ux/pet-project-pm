import { NextRequest, NextResponse } from "next/server";
import { createSession, findUserByUsername, verifyPassword } from "../../tasks/storage";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const username = body?.username ?? "";
  const password = body?.password ?? "";

  const user = await findUserByUsername(username);
  if (!user) return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });

  const ok = verifyPassword(password, user.passwordHash);
  if (!ok) return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });

  const session = await createSession(user.id);

  const res = NextResponse.json({ ok: true }, { status: 200 });
  res.cookies.set("session", session.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return res;
}
