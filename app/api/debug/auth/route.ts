import { NextRequest, NextResponse } from "next/server";
import { getUserById, getUserIdBySessionToken } from "../../tasks/storage";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("session")?.value ?? null;

  const userId = token ? await getUserIdBySessionToken(token) : null;
  const user = userId ? await getUserById(userId) : null;

  return NextResponse.json({ token: token ? "present" : null, userId, user }, { status: 200 });
}
