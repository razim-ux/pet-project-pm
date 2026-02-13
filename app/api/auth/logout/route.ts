import { NextRequest, NextResponse } from "next/server";
import { deleteSession } from "../../tasks/storage";

export const runtime = "nodejs";

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get("session")?.value;
  if (token) deleteSession(token);

  const res = json({ ok: true }, { status: 200 });
  res.cookies.set("session", "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  return res;
}
