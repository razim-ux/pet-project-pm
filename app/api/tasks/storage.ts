import crypto from "crypto";
import * as bcrypt from "bcryptjs";
import { Pool } from "pg";

export type Task = { id: number; title: string; completed: boolean; userId: number };
export type User = { id: number; username: string };

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is missing. Set it in Vercel Environment Variables (Production).");
}

declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
}

const pool =
  global.__pgPool ??
  new Pool({
    connectionString: DATABASE_URL,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
  });

if (!global.__pgPool) global.__pgPool = pool;

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function nowMs() {
  return Date.now();
}

// --- init/migrations (минимально) ---
let initialized = false;

async function init() {
  if (initialized) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at BIGINT NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      created_at BIGINT NOT NULL,
      expires_at BIGINT NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id BIGSERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      completed BOOLEAN NOT NULL DEFAULT FALSE,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  await pool.query(`CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_tasks_user_completed ON tasks(user_id, completed);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);`);

  initialized = true;
}

// --- AUTH: users ---
export async function createUser(username: string, password: string): Promise<User> {
  await init();

  const u = username.trim();
  if (!u) throw new Error("username_required");
  if (u.length < 3 || u.length > 32) throw new Error("username_length");
  if (password.length < 6 || password.length > 100) throw new Error("password_length");

  const passwordHash = bcrypt.hashSync(password, 10);
  const createdAt = nowMs();

  try {
    const res = await pool.query(
      `INSERT INTO users (username, password_hash, created_at)
       VALUES ($1, $2, $3)
       RETURNING id, username`,
      [u, passwordHash, createdAt]
    );

    return { id: Number(res.rows[0].id), username: String(res.rows[0].username) };
  } catch (e: any) {
    if (e?.code === "23505") throw new Error("username_taken");
    throw e;
  }
}

export async function findUserByUsername(
  username: string
): Promise<(User & { passwordHash: string }) | null> {
  await init();

  const u = username.trim();
  const res = await pool.query(
    `SELECT id, username, password_hash
     FROM users
     WHERE username = $1
     LIMIT 1`,
    [u]
  );
  if (res.rowCount === 0) return null;

  const row = res.rows[0];
  return {
    id: Number(row.id),
    username: String(row.username),
    passwordHash: String(row.password_hash),
  };
}

export async function getUserById(id: number): Promise<User | null> {
  await init();

  const res = await pool.query(
    `SELECT id, username
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [id]
  );
  if (res.rowCount === 0) return null;

  const row = res.rows[0];
  return { id: Number(row.id), username: String(row.username) };
}

export function verifyPassword(password: string, passwordHash: string): boolean {
  return bcrypt.compareSync(password, passwordHash);
}

// --- AUTH: sessions ---
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 дней

export async function createSession(userId: number): Promise<{ token: string; expiresAt: number }> {
  await init();

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = sha256(token);
  const createdAt = nowMs();
  const expiresAt = createdAt + SESSION_TTL_MS;

  await pool.query(
    `INSERT INTO sessions (user_id, token_hash, created_at, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [userId, tokenHash, createdAt, expiresAt]
  );

  return { token, expiresAt };
}

export async function getUserIdBySessionToken(token: string): Promise<number | null> {
  await init();

  const tokenHash = sha256(token);

  const res = await pool.query(
    `SELECT user_id, expires_at
     FROM sessions
     WHERE token_hash = $1
     LIMIT 1`,
    [tokenHash]
  );

  if (res.rowCount === 0) return null;

  const row = res.rows[0];
  const expiresAt = Number(row.expires_at);

  if (expiresAt < nowMs()) {
    await pool.query(`DELETE FROM sessions WHERE token_hash = $1`, [tokenHash]);
    return null;
  }

  return Number(row.user_id);
}

export async function deleteSession(token: string): Promise<void> {
  await init();

  const tokenHash = sha256(token);
  await pool.query(`DELETE FROM sessions WHERE token_hash = $1`, [tokenHash]);
}

// --- TASKS ---
export async function getAllByUser(userId: number): Promise<Task[]> {
  await init();

  const res = await pool.query(
    `SELECT id, title, completed, user_id
     FROM tasks
     WHERE user_id = $1
     ORDER BY id DESC`,
    [userId]
  );

  return res.rows.map((r) => ({
    id: Number(r.id),
    title: String(r.title),
    completed: Boolean(r.completed),
    userId: Number(r.user_id),
  }));
}

export async function createForUser(userId: number, title: string): Promise<Task> {
  await init();

  const res = await pool.query(
    `INSERT INTO tasks (title, completed, user_id)
     VALUES ($1, FALSE, $2)
     RETURNING id, title, completed, user_id`,
    [title, userId]
  );

  const r = res.rows[0];
  return { id: Number(r.id), title: String(r.title), completed: Boolean(r.completed), userId: Number(r.user_id) };
}

export async function removeByIdForUser(userId: number, id: number): Promise<boolean> {
  await init();

  const res = await pool.query(
    `DELETE FROM tasks
     WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  return (res.rowCount ?? 0) > 0;
}

export async function updateByIdForUser(userId: number, id: number, title: string): Promise<Task | null> {
  await init();

  const res = await pool.query(
    `UPDATE tasks
     SET title = $1
     WHERE id = $2 AND user_id = $3
     RETURNING id, title, completed, user_id`,
    [title, id, userId]
  );

  if ((res.rowCount ?? 0) === 0) return null;

  const r = res.rows[0];
  return { id: Number(r.id), title: String(r.title), completed: Boolean(r.completed), userId: Number(r.user_id) };
}

export async function toggleCompletedForUser(userId: number, id: number): Promise<Task | null> {
  await init();

  const res = await pool.query(
    `UPDATE tasks
     SET completed = NOT completed
     WHERE id = $1 AND user_id = $2
     RETURNING id, title, completed, user_id`,
    [id, userId]
  );

  if ((res.rowCount ?? 0) === 0) return null;

  const r = res.rows[0];
  return { id: Number(r.id), title: String(r.title), completed: Boolean(r.completed), userId: Number(r.user_id) };
}

export async function completeAllForUser(userId: number): Promise<number> {
  await init();

  const res = await pool.query(
    `UPDATE tasks
     SET completed = TRUE
     WHERE user_id = $1 AND completed = FALSE`,
    [userId]
  );
  return res.rowCount ?? 0;
}

export async function clearCompletedForUser(userId: number): Promise<number> {
  await init();

  const res = await pool.query(
    `DELETE FROM tasks
     WHERE user_id = $1 AND completed = TRUE`,
    [userId]
  );
  return res.rowCount ?? 0;
}
