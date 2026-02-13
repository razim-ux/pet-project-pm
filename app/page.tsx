"use client";

import { useEffect, useMemo, useState, KeyboardEvent } from "react";
import { AuthHeader } from "./components/AuthHeader";

type Task = { id: number; title: string; completed: boolean };
type Filter = "all" | "active" | "completed";
type User = { id: number; username: string } | null;

const TELEGRAM_URL = "https://t.me/qvorn1";

async function safeJson(res: Response): Promise<any | null> {
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    try {
      return await res.json();
    } catch {
      return null;
    }
  }
  return null;
}

async function apiFetch(input: RequestInfo | URL, init?: RequestInit) {
  return fetch(input, {
    ...init,
    credentials: "same-origin",
    cache: "no-store",
  });
}

export default function Home() {
  const [user, setUser] = useState<User>(null);

  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");

  const [filter, setFilter] = useState<Filter>("all");

  async function loadMe(): Promise<User> {
    const res = await apiFetch("/api/auth/me");
    const data = await safeJson(res);
    const me = (data?.user ?? null) as User;
    setUser(me);
    return me;
  }

  async function refetch() {
    const res = await apiFetch("/api/tasks");
    if (res.status === 401) {
      setTasks([]);
      return;
    }
    const data = await safeJson(res);
    setTasks(Array.isArray(data?.tasks) ? data.tasks : []);
  }

  useEffect(() => {
    loadMe();
  }, []);

  useEffect(() => {
    if (user) refetch();
  }, [user]);

  async function loginOrRegister() {
    setAuthError(null);

    const u = username.trim();
    const p = password;

    if (!u || !p) {
      setAuthError("Введите логин и пароль");
      return;
    }

    setLoading(true);
    try {
      const endpoint =
        authMode === "login" ? "/api/auth/login" : "/api/auth/register";

      const res = await apiFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: u, password: p }),
      });

      const data = await safeJson(res);

      if (!res.ok) {
        const code = String(data?.error ?? "unknown");
        if (code === "invalid_credentials") setAuthError("Неверный логин или пароль");
        else if (code === "username_taken") setAuthError("Логин занят");
        else if (code === "password_length") setAuthError("Пароль: минимум 6 символов");
        else if (code === "username_length") setAuthError("Логин: 3–32 символа");
        else setAuthError("Ошибка авторизации");
        return;
      }

      const me = await loadMe();
      if (!me) {
        setAuthError("Cookie-сессия не установилась.");
        return;
      }

      setUsername("");
      setPassword("");
      await refetch();
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    setLoading(true);
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }

  async function addTask() {
    const title = input.trim();
    if (!title) return;

    setLoading(true);
    try {
      await apiFetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      setInput("");
      await refetch();
    } finally {
      setLoading(false);
    }
  }

  async function removeTask(id: number) {
    setLoading(true);
    try {
      await apiFetch(`/api/tasks?id=${id}`, { method: "DELETE" });
      await refetch();
    } finally {
      setLoading(false);
    }
  }

  async function toggleTask(id: number) {
    const prev = tasks;
    const next = tasks.map((t) =>
      t.id === id ? { ...t, completed: !t.completed } : t
    );
    setTasks(next);

    try {
      const res = await apiFetch(`/api/tasks?id=${id}`, { method: "PUT" });
      if (!res.ok) throw new Error();
    } catch {
      setTasks(prev);
    }
  }

  async function runBulk(action: "completeAll" | "clearCompleted") {
    setLoading(true);
    try {
      const res = await apiFetch("/api/tasks/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await safeJson(res);
      setTasks(Array.isArray(data?.tasks) ? data.tasks : []);
    } finally {
      setLoading(false);
    }
  }

  const filteredTasks = useMemo(() => {
    if (filter === "active") return tasks.filter((t) => !t.completed);
    if (filter === "completed") return tasks.filter((t) => t.completed);
    return tasks;
  }, [tasks, filter]);

  const counts = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.completed).length;
    return { total, done, active: total - done };
  }, [tasks]);

  if (!user) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <h1>Вход</h1>
          <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Логин" style={styles.input} />
          <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Пароль" type="password" style={styles.input} />
          {authError && <div style={styles.error}>{authError}</div>}
          <button onClick={loginOrRegister} style={styles.primaryBtn}>
            {authMode === "login" ? "Войти" : "Регистрация"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={{ ...styles.card, position: "relative" }}>
        {loading && <div style={styles.loadingBar} />}

        <AuthHeader
          user={user}
          onLogout={logout}
          loading={loading}
          telegramUrl={TELEGRAM_URL}
        />

        <div style={{ marginBottom: 12, fontSize: 13 }}>
          Активных: {counts.active} · Завершённых: {counts.done}
        </div>

        <div style={styles.inputRow}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Новая задача..."
            style={styles.input}
            onKeyDown={(e) => e.key === "Enter" && addTask()}
          />
          <button onClick={addTask} style={styles.addBtn}>➕</button>
        </div>

        <div style={styles.toolbar}>
          <button onClick={() => setFilter("all")}>Все ({counts.total})</button>
          <button onClick={() => setFilter("active")}>Активные</button>
          <button onClick={() => setFilter("completed")}>Завершённые</button>
        </div>

        <ul style={styles.list}>
          {filteredTasks.length === 0 ? (
            <li style={styles.empty}>Нет задач</li>
          ) : (
            filteredTasks.map((t) => (
              <li key={t.id} style={styles.item}>
                <label style={styles.taskLeft}>
                  <input
                    type="checkbox"
                    checked={t.completed}
                    onChange={() => toggleTask(t.id)}
                  />
                  <span style={{
                    textDecoration: t.completed ? "line-through" : "none",
                    opacity: t.completed ? 0.6 : 1,
                  }}>
                    {t.title}
                  </span>
                </label>

                <button onClick={() => removeTask(t.id)}>🗑</button>
              </li>
            ))
          )}
        </ul>

        <div style={styles.hint}>Сессия хранится в cookie</div>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #667eea, #764ba2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  card: {
    background: "#fff",
    padding: 24,
    borderRadius: 14,
    width: 600,
    boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
  },
  inputRow: { display: "flex", gap: 8, marginBottom: 12 },
  input: { flex: 1, padding: 10, borderRadius: 8, border: "1px solid #ddd" },
  addBtn: { padding: "10px 12px", borderRadius: 8, border: "none", background: "#667eea", color: "white" },
  toolbar: { display: "flex", gap: 8, marginBottom: 12 },
  list: { listStyle: "none", padding: 0, margin: 0 },
  item: { display: "flex", justifyContent: "space-between", padding: 8, borderBottom: "1px solid #eee" },
  taskLeft: { display: "flex", alignItems: "center", gap: 8 },
  empty: { padding: 16, textAlign: "center", opacity: 0.6 },
  hint: { marginTop: 12, fontSize: 12, opacity: 0.7 },
  primaryBtn: { padding: 10, borderRadius: 8, border: "none", background: "#667eea", color: "white", marginTop: 8 },
  error: { color: "red", fontSize: 12 },
  loadingBar: {
    position: "absolute",
    top: 0,
    left: 0,
    height: 3,
    width: "100%",
    background: "#667eea",
  },
};
