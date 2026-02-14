import { NextRequest, NextResponse } from "next/server";
import { getUserIdBySessionToken, completeAllForUser, clearCompletedForUser } from "../storage";

export const runtime = "nodejs";

async function getUserIdFromRequest(request: NextRequest): Promise<number | null> {
  const token = request.cookies.get("session")?.value;
  if (!token) return null;
  return await getUserIdBySessionToken(token);
}

export async function POST(request: NextRequest) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const action = body?.action;

  if (action === "complete_all") {
    const updated = await completeAllForUser(userId);
    return NextResponse.json({ updated }, { status: 200 });
  }

  if (action === "clear_completed") {
    const deleted = await clearCompletedForUser(userId);
    return NextResponse.json({ deleted }, { status: 200 });
  }

  return NextResponse.json({ error: "bad_request" }, { status: 400 });
}
