export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

function getUserId(req: NextRequest): number | null {
  const token = req.cookies.get('session')?.value;
  if (!token) return null;

  const secret = process.env.JWT_SECRET;
  if (!secret) return null;

  try {
    const payload = jwt.verify(token, secret) as any;
    const id = Number(payload?.id);
    return Number.isFinite(id) ? id : null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const result = await pool.query(
    `SELECT id, title, completed, assignee, start_date, end_date, created_at
     FROM tasks
     WHERE user_id = $1
     ORDER BY id DESC
     LIMIT 200`,
    [userId]
  );

  return NextResponse.json({ tasks: result.rows }, { status: 200 });
}

export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const action = String(body?.action ?? '');

  if (action === 'create') {
    const title = String(body?.title ?? '').trim();
    const assignee = String(body?.assignee ?? '').trim() || null;
    const startDate = body?.start_date ? new Date(body.start_date) : null;
    const endDate = body?.end_date ? new Date(body.end_date) : null;

    if (!title) return NextResponse.json({ error: 'title_required' }, { status: 400 });

    const created = await pool.query(
      `INSERT INTO tasks (user_id, title, assignee, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, title, completed, assignee, start_date, end_date, created_at`,
      [userId, title, assignee, startDate, endDate]
    );

    return NextResponse.json({ task: created.rows[0] }, { status: 201 });
  }

  if (action === 'toggle') {
    const id = Number(body?.id);
    if (!Number.isFinite(id)) return NextResponse.json({ error: 'id_required' }, { status: 400 });

    const updated = await pool.query(
      `UPDATE tasks
       SET completed = NOT completed
       WHERE id = $1 AND user_id = $2
       RETURNING id, title, completed, assignee, start_date, end_date, created_at`,
      [id, userId]
    );

    if (updated.rowCount === 0) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    return NextResponse.json({ task: updated.rows[0] }, { status: 200 });
  }

  if (action === 'remove') {
    const id = Number(body?.id);
    if (!Number.isFinite(id)) return NextResponse.json({ error: 'id_required' }, { status: 400 });

    const del = await pool.query(
      `DELETE FROM tasks WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (del.rowCount === 0) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  }

  return NextResponse.json({ error: 'unknown_action' }, { status: 400 });
}
