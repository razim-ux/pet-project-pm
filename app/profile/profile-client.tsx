"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type User = { id: number; username: string };

export default function ProfileClient({ user }: { user: User }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      router.push("/");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        background: "linear-gradient(135deg, #667eea, #764ba2)",
      }}
    >
      <div
        style={{
          width: 640,
          background: "white",
          borderRadius: 14,
          padding: 24,
          boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22 }}>Профиль</h1>
            <div style={{ opacity: 0.7, marginTop: 6, fontSize: 13 }}>
              Вы вошли как: <b>{user.username}</b> (id: {user.id})
            </div>
          </div>

          <button
            onClick={logout}
            disabled={loading}
            style={{
              border: "1px solid #ddd",
              background: "#fff",
              padding: "8px 10px",
              borderRadius: 10,
              cursor: loading ? "not-allowed" : "pointer",
              fontSize: 12,
              height: 36,
              alignSelf: "flex-start",
            }}
          >
            {loading ? "..." : "Выйти"}
          </button>
        </div>

        <div style={{ marginTop: 16, fontSize: 13, opacity: 0.8 }}>
          Эта страница защищена: если cookie-сессии нет, сервер не отдаст её, а сделает redirect.
        </div>

        <div style={{ marginTop: 16 }}>
          <button
            onClick={() => router.push("/")}
            style={{
              border: "none",
              background: "#667eea",
              color: "white",
              padding: "10px 12px",
              borderRadius: 10,
              cursor: "pointer",
            }}
          >
            ← К задачам
          </button>
        </div>
      </div>
    </div>
  );
}

