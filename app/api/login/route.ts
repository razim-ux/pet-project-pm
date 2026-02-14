// app/api/login/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const email = String(body?.email ?? '').trim().toLowerCase();
    const password = String(body?.password ?? '').trim();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'email и password обязательны' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `SELECT id, email, password
       FROM users
       WHERE email = $1
       LIMIT 1`,
      [email]
    );

    const user = result.rows[0];
    if (!user) {
      return NextResponse.json({ error: 'Неверные данные' }, { status: 401 });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return NextResponse.json({ error: 'Неверные данные' }, { status: 401 });
    }

    return NextResponse.json(
      { success: true, user: { id: user.id, email: user.email } },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Ошибка логина' },
      { status: 500 }
    );
  }
}
