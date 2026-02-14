export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body?.email || '').trim();
    const password = String(body?.password || '').trim();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'email и password обязательны' },
        { status: 400 }
      );
    }

    await pool.query(
      'INSERT INTO users (email, password) VALUES ($1, $2)',
      [email, password]
    );

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error: any) {
    if (error?.code === '23505') {
      return NextResponse.json(
        { error: 'Такой email уже существует' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: error?.message || 'Ошибка регистрации' },
      { status: 500 }
    );
  }
}
