import { NextRequest, NextResponse } from "next/server";
import { getUserById, getUserIdBySessionToken } from "../../tasks/storage";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("session")?.value;

  if (!token) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  const userId = await getUserIdBySessionToken(token);
  if (!userId) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  const user = await getUserById(userId);
  return NextResponse.json({ user }, { status: 200 });
}
