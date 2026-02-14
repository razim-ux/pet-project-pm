import { NextRequest, NextResponse } from "next/server";
import { createSession, createUser } from "../../tasks/storage";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const username = body?.username ?? "";
  const password = body?.password ?? "";

  try {
    const user = await createUser(username, password);
    const session = await createSession(user.id);

    const res = NextResponse.json({ user }, { status: 201 });
    res.cookies.set("session", session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return res;
  } catch (e: any) {
    const msg = String(e?.message ?? "");
    // ожидаемые ошибки из storage.ts
    if (
      msg === "username_taken" ||
      msg === "username_required" ||
      msg === "username_length" ||
      msg === "password_length"
    ) {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
