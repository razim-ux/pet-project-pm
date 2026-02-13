import { NextRequest, NextResponse } from "next/server";
import {
  createForUser,
  getAllByUser,
  removeByIdForUser,
  toggleCompletedForUser,
  updateByIdForUser,
  getUserIdBySessionToken,
} from "./storage";

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

function extractTitle(body: any) {
  return String(body?.title ?? body?.task ?? "").trim();
}

function extractIdFromUrl(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("id");
  const id = raw ? Number(raw) : NaN;
  return Number.isFinite(id) ? id : null;
}

function requireUserId(request: NextRequest): number | null {
  const token = request.cookies.get("session")?.value;
  if (!token) return null;
  return getUserIdBySessionToken(token);
}

export async function GET(request: NextRequest) {
  const userId = requireUserId(request);
  if (!userId) return json({ error: "unauthorized" }, { status: 401 });

  const tasks = getAllByUser(userId);
  return json({ tasks }, { status: 200 });
}

export async function POST(request: NextRequest) {
  const userId = requireUserId(request);
  if (!userId) return json({ error: "unauthorized" }, { status: 401 });

  const body = await readBody(request);
  const title = extractTitle(body);
  if (!title) return json({ error: "title is required" }, { status: 400 });

  const task = createForUser(userId, title);
  return json({ task }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const userId = requireUserId(request);
  if (!userId) return json({ error: "unauthorized" }, { status: 401 });

  const id = extractIdFromUrl(request);
  if (id === null) return json({ error: "id query param is required" }, { status: 400 });

  const removed = removeByIdForUser(userId, id);
  if (!removed) return json({ error: "task not found" }, { status: 404 });

  return json({ ok: true }, { status: 200 });
}

export async function PATCH(request: NextRequest) {
  const userId = requireUserId(request);
  if (!userId) return json({ error: "unauthorized" }, { status: 401 });

  const id = extractIdFromUrl(request);
  if (id === null) return json({ error: "id query param is required" }, { status: 400 });

  const body = await readBody(request);
  const title = extractTitle(body);
  if (!title) return json({ error: "title is required" }, { status: 400 });

  const updated = updateByIdForUser(userId, id, title);
  if (!updated) return json({ error: "task not found" }, { status: 404 });

  return json({ task: updated }, { status: 200 });
}

export async function PUT(request: NextRequest) {
  const userId = requireUserId(request);
  if (!userId) return json({ error: "unauthorized" }, { status: 401 });

  const id = extractIdFromUrl(request);
  if (id === null) return json({ error: "id query param is required" }, { status: 400 });

  const updated = toggleCompletedForUser(userId, id);
  if (!updated) return json({ error: "task not found" }, { status: 404 });

  return json({ task: updated }, { status: 200 });
}
