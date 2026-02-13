"use client";

import Link from "next/link";

type User = { id: number; username: string } | null;

export function AuthHeader({
  user,
  onLogout,
  loading,
  telegramUrl,
}: {
  user: User;
  onLogout: () => void;
  loading: boolean;
  telegramUrl: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        marginBottom: 12,
      }}
    >
      <div>
        <h1 style={{ margin: 0, fontSize: 22 }}>Задачи</h1>
        <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
          Пользователь: <b>{user?.username ?? "—"}</b>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <Link
          href="/profile"
          style={{
            textDecoration: "none",
            padding: "8px 12px",
            borderRadius: 999,
            background: "#fff",
            border: "1px solid #ddd",
            fontSize: 12,
            color: "#111",
            whiteSpace: "nowrap",
          }}
        >
          👤 Профиль
        </Link>

        <a
          href={telegramUrl}
          target="_blank"
          rel="noreferrer"
          style={{
            textDecoration: "none",
            padding: "8px 12px",
            borderRadius: 999,
            background: "#f2f4ff",
            border: "1px solid #ddd",
            fontSize: 12,
            color: "#111",
            whiteSpace: "nowrap",
          }}
        >
          ✈ Telegram
        </a>

        <button
          onClick={onLogout}
          disabled={loading}
          style={{
            border: "1px solid #ddd",
            background: "#fff",
            padding: "8px 10px",
            borderRadius: 10,
            cursor: loading ? "not-allowed" : "pointer",
            fontSize: 12,
          }}
        >
          {loading ? "..." : "Выйти"}
        </button>
      </div>
    </div>
  );
}
