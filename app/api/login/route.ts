export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

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
      `SELECT id, email, password::text AS password_hash
       FROM users
       WHERE email = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [email]
    );

    const user = result.rows[0];

    if (!user) {
      return NextResponse.json(
        { error: 'Неверные данные' },
        { status: 401 }
      );
    }

    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      return NextResponse.json(
        { error: 'Неверные данные' },
        { status: 401 }
      );
    }

    const JWT_SECRET = process.env.JWT_SECRET;

    if (!JWT_SECRET) {
      return NextResponse.json(
        { error: 'JWT_SECRET is not set' },
        { status: 500 }
      );
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const response = NextResponse.json(
      { success: true },
      { status: 200 }
    );

    response.cookies.set('session', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;

  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Ошибка логина' },
      { status: 500 }
    );
  }
}
