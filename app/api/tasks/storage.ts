import crypto from "crypto";
import * as bcrypt from "bcryptjs";
import { Pool } from "pg";

export type Task = { id: number; title: string; completed: boolean; userId: number };
export type User = { id: number; username: string }; // username = email (для совместимости фронта)

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL is missing");

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
function isBcryptHash(s: string) {
  return typeof s === "string" && (s.startsWith("$2a$") || s.startsWith("$2b$") || s.startsWith("$2y$"));
}

// НИЧЕГО НЕ СОЗДАЁМ через CREATE TABLE — база уже существует и со своей схемой.

export async function createUser(username: string, password: string): Promise<User> {
  const email = username.trim().toLowerCase();
  if (!email) throw new Error("username_required");
  if (email.length < 3 || email.length > 64) throw new Error("username_length");
  if (password.length < 6 || password.length > 100) throw new Error("password_length");

  const passwordHash = bcrypt.hashSync(password, 10);

  try {
    // users: id, email, password, created_at(timestamp)
    const res = await pool.query(
      `INSERT INTO users (email, password, created_at)
       VALUES ($1, $2, NOW())
       RETURNING id, email`,
      [email, passwordHash]
    );

    return { id: Number(res.rows[0].id), username: String(res.rows[0].email) };
  } catch (e: any) {
    // unique violation
    if (e?.code === "23505") throw new Error("username_taken");
    throw e;
  }
}

export async function findUserByUsername(
  username: string
): Promise<(User & { passwordHash: string }) | null> {
  const email = username.trim().toLowerCase();

  const res = await pool.query(
    `SELECT id, email, password
     FROM users
     WHERE email = $1
     LIMIT 1`,
    [email]
  );

  if ((res.rowCount ?? 0) === 0) return null;

  const row = res.rows[0];
  return {
    id: Number(row.id),
    username: String(row.email),
    passwordHash: String(row.password),
  };
}

export async function getUserById(id: number): Promise<User | null> {
  const res = await pool.query(
    `SELECT id, email
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [id]
  );
  if ((res.rowCount ?? 0) === 0) return null;

  const row = res.rows[0];
  return { id: Number(row.id), username: String(row.email) };
}

export function verifyPassword(password: string, stored: string): boolean {
  // Если в базе лежит bcrypt — сравниваем корректно
  if (isBcryptHash(stored)) return bcrypt.compareSync(password, stored);

  // Если в базе лежит plain-text (плохая история) — даём зайти только при точном совпадении
  return password === stored;
}

// --- sessions (схема совпадает) ---
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

export async function createSession(userId: number): Promise<{ token: string; expiresAt: number }> {
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
  const tokenHash = sha256(token);

  const res = await pool.query(
    `SELECT user_id, expires_at
     FROM sessions
     WHERE token_hash = $1
     LIMIT 1`,
    [tokenHash]
  );

  if ((res.rowCount ?? 0) === 0) return null;

  const row = res.rows[0];
  const expiresAt = Number(row.expires_at);

  if (expiresAt < nowMs()) {
    await pool.query(`DELETE FROM sessions WHERE token_hash = $1`, [tokenHash]);
    return null;
  }

  return Number(row.user_id);
}

export async function deleteSession(token: string): Promise<void> {
  const tokenHash = sha256(token);
  await pool.query(`DELETE FROM sessions WHERE token_hash = $1`, [tokenHash]);
}

// --- tasks: в базе есть дополнительные поля, но мы работаем минимумом ---
export async function getAllByUser(userId: number): Promise<Task[]> {
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
  const res = await pool.query(`DELETE FROM tasks WHERE id = $1 AND user_id = $2`, [id, userId]);
  return (res.rowCount ?? 0) > 0;
}

export async function updateByIdForUser(userId: number, id: number, title: string): Promise<Task | null> {
  const res = await pool.query(
    `UPDATE tasks SET title = $1
     WHERE id = $2 AND user_id = $3
     RETURNING id, title, completed, user_id`,
    [title, id, userId]
  );

  if ((res.rowCount ?? 0) === 0) return null;

  const r = res.rows[0];
  return { id: Number(r.id), title: String(r.title), completed: Boolean(r.completed), userId: Number(r.user_id) };
}

export async function toggleCompletedForUser(userId: number, id: number): Promise<Task | null> {
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
  const res = await pool.query(
    `UPDATE tasks SET completed = TRUE
     WHERE user_id = $1 AND completed = FALSE`,
    [userId]
  );
  return res.rowCount ?? 0;
}

export async function clearCompletedForUser(userId: number): Promise<number> {
  const res = await pool.query(`DELETE FROM tasks WHERE user_id = $1 AND completed = TRUE`, [userId]);
  return res.rowCount ?? 0;
}
