import { NextRequest, NextResponse } from "next/server";
import { getUserIdBySessionToken, getUserById } from "../../tasks/storage";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("session")?.value ?? null;

  const allCookies = request.cookies.getAll().map((c) => c.name);

  const hasCookie = Boolean(token);
  const cookieLen = token ? token.length : 0;

  const userId = token ? getUserIdBySessionToken(token) : null;
  const user = userId ? getUserById(userId) : null;

  return NextResponse.json(
    {
      allCookies,
      hasCookie,
      cookieLen,
      userId,
      user,
    },
    { status: 200 }
  );
}
