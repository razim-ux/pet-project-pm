import { NextRequest, NextResponse } from "next/server";
import { createSession, createUser } from "../../tasks/storage";

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

  try {
    const user = createUser(username, password);
    const session = createSession(user.id);

    const res = NextResponse.json({ user }, { status: 201 });

    res.cookies.set({
      name: "session",
      value: session.token,
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return res;
  } catch (e: any) {
    const code = String(e?.message ?? "unknown");
    if (code === "username_taken") return NextResponse.json({ error: "username_taken" }, { status: 409 });
    if (code === "username_length") return NextResponse.json({ error: "username_length" }, { status: 400 });
    if (code === "password_length") return NextResponse.json({ error: "password_length" }, { status: 400 });
    if (code === "username_required") return NextResponse.json({ error: "username_required" }, { status: 400 });
    return NextResponse.json({ error: "register_failed" }, { status: 500 });
  }
}
