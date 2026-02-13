import { NextRequest, NextResponse } from "next/server";
import {
  clearCompletedForUser,
  completeAllForUser,
  getAllByUser,
  getUserIdBySessionToken,
} from "../storage";

export const runtime = "nodejs";

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

async function readBody(request: NextRequest) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function requireUserId(request: NextRequest): number | null {
  const token = request.cookies.get("session")?.value;
  if (!token) return null;
  return getUserIdBySessionToken(token);
}

export async function POST(request: NextRequest) {
  const userId = requireUserId(request);
  if (!userId) return json({ error: "unauthorized" }, { status: 401 });

  const body = await readBody(request);
  const action = String(body?.action ?? "");

  if (action === "completeAll") {
    const changed = completeAllForUser(userId);
    return json({ ok: true, changed, tasks: getAllByUser(userId) }, { status: 200 });
  }

  if (action === "clearCompleted") {
    const changed = clearCompletedForUser(userId);
    return json({ ok: true, changed, tasks: getAllByUser(userId) }, { status: 200 });
  }

  return json({ error: "unknown action" }, { status: 400 });
}
