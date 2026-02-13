import Database from "better-sqlite3";
import path from "path";
import crypto from "crypto";
import * as bcrypt from "bcryptjs";

export type Task = { id: number; title: string; completed: boolean; userId: number };
export type User = { id: number; username: string };

const rootDir = process.cwd();
const dbPath = path.join(rootDir, "tasks.db");

console.log("[storage] rootDir:", rootDir);
console.log("[storage] dbPath:", dbPath);

const db = new Database(dbPath);

// --- базовые таблицы ---
db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    passwordHash TEXT NOT NULL,
    createdAt INTEGER NOT NULL
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    tokenHash TEXT NOT NULL UNIQUE,
    createdAt INTEGER NOT NULL,
    expiresAt INTEGER NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id)
  );
`);

// --- миграции ---
function hasColumn(table: string, col: string) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  return columns.some((c) => c.name === col);
}

if (!hasColumn("tasks", "completed")) {
  db.exec(`ALTER TABLE tasks ADD COLUMN completed INTEGER NOT NULL DEFAULT 0`);
  console.log("[storage] migrated: added tasks.completed");
}

if (!hasColumn("tasks", "userId")) {
  db.exec(`ALTER TABLE tasks ADD COLUMN userId INTEGER`);
  console.log("[storage] migrated: added tasks.userId (nullable)");
  // Старые задачи без userId станут "ничьи" и не будут видны после включения auth
}

// --- helpers ---
function rowToTask(r: any): Task {
  return {
    id: Number(r.id),
    title: String(r.title),
    completed: Boolean(r.completed),
    userId: Number(r.userId),
  };
}

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function nowMs() {
  return Date.now();
}

// --- AUTH: users ---
export function createUser(username: string, password: string): User {
  const u = username.trim();
  if (!u) throw new Error("username_required");
  if (u.length < 3 || u.length > 32) throw new Error("username_length");
  if (password.length < 6 || password.length > 100) throw new Error("password_length");

  const passwordHash = bcrypt.hashSync(password, 10);
  const createdAt = nowMs();

  try {
    const info = db
      .prepare("INSERT INTO users (username, passwordHash, createdAt) VALUES (?, ?, ?)")
      .run(u, passwordHash, createdAt);

    return { id: Number(info.lastInsertRowid), username: u };
  } catch (e: any) {
    if (String(e?.message ?? "").includes("UNIQUE")) throw new Error("username_taken");
    throw e;
  }
}

export function findUserByUsername(username: string): (User & { passwordHash: string }) | null {
  const u = username.trim();
  const row = db.prepare("SELECT id, username, passwordHash FROM users WHERE username = ?").get(u) as any;
  if (!row) return null;
  return { id: Number(row.id), username: String(row.username), passwordHash: String(row.passwordHash) };
}

export function getUserById(id: number): User | null {
  const row = db.prepare("SELECT id, username FROM users WHERE id = ?").get(id) as any;
  if (!row) return null;
  return { id: Number(row.id), username: String(row.username) };
}

export function verifyPassword(password: string, passwordHash: string): boolean {
  return bcrypt.compareSync(password, passwordHash);
}

// --- AUTH: sessions ---
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 дней

export function createSession(userId: number): { token: string; expiresAt: number } {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = sha256(token);
  const createdAt = nowMs();
  const expiresAt = createdAt + SESSION_TTL_MS;

  db.prepare("INSERT INTO sessions (userId, tokenHash, createdAt, expiresAt) VALUES (?, ?, ?, ?)")
    .run(userId, tokenHash, createdAt, expiresAt);

  return { token, expiresAt };
}

export function getUserIdBySessionToken(token: string): number | null {
  const tokenHash = sha256(token);
  const row = db.prepare("SELECT userId, expiresAt FROM sessions WHERE tokenHash = ?").get(tokenHash) as any;

  if (!row) return null;
  if (Number(row.expiresAt) < nowMs()) {
    db.prepare("DELETE FROM sessions WHERE tokenHash = ?").run(tokenHash);
    return null;
  }
  return Number(row.userId);
}

export function deleteSession(token: string): void {
  const tokenHash = sha256(token);
  db.prepare("DELETE FROM sessions WHERE tokenHash = ?").run(tokenHash);
}

// --- TASKS (только для userId) ---
export function getAllByUser(userId: number): Task[] {
  const rows = db
    .prepare("SELECT id, title, completed, userId FROM tasks WHERE userId = ? ORDER BY id DESC")
    .all(userId) as any[];
  return rows.map(rowToTask);
}

export function createForUser(userId: number, title: string): Task {
  const info = db.prepare("INSERT INTO tasks (title, completed, userId) VALUES (?, 0, ?)").run(title, userId);
  return { id: Number(info.lastInsertRowid), title, completed: false, userId };
}

export function removeByIdForUser(userId: number, id: number): boolean {
  const info = db.prepare("DELETE FROM tasks WHERE id = ? AND userId = ?").run(id, userId);
  return info.changes > 0;
}

export function updateByIdForUser(userId: number, id: number, title: string): Task | null {
  const info = db.prepare("UPDATE tasks SET title = ? WHERE id = ? AND userId = ?").run(title, id, userId);
  if (info.changes === 0) return null;

  const row = db
    .prepare("SELECT id, title, completed, userId FROM tasks WHERE id = ? AND userId = ?")
    .get(id, userId) as any;

  return row ? rowToTask(row) : null;
}

export function toggleCompletedForUser(userId: number, id: number): Task | null {
  const info = db
    .prepare("UPDATE tasks SET completed = CASE completed WHEN 0 THEN 1 ELSE 0 END WHERE id = ? AND userId = ?")
    .run(id, userId);

  if (info.changes === 0) return null;

  const row = db
    .prepare("SELECT id, title, completed, userId FROM tasks WHERE id = ? AND userId = ?")
    .get(id, userId) as any;

  return row ? rowToTask(row) : null;
}

export function completeAllForUser(userId: number): number {
  const info = db.prepare("UPDATE tasks SET completed = 1 WHERE userId = ? AND completed = 0").run(userId);
  return info.changes;
}

export function clearCompletedForUser(userId: number): number {
  const info = db.prepare("DELETE FROM tasks WHERE userId = ? AND completed = 1").run(userId);
  return info.changes;
}
