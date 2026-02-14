'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); // ← добавили
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setMsg(data?.error || `Ошибка: ${res.status}`);
        return;
      }

      setMsg('Успешный вход');
      router.push('/dashboard');
    } catch (err: any) {
      setMsg(err?.message || 'Ошибка сети');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <h1>Вход</h1>

      <form onSubmit={onSubmit}>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </label>

        <label>
          Password
          <input
            type={showPassword ? 'text' : 'password'}   // ← переключаем тип
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        {/* Чекбокс показать/скрыть */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
          <input
            type="checkbox"
            checked={showPassword}
            onChange={(e) => setShowPassword(e.target.checked)}
          />
          Показать пароль
        </label>

        <button type="submit" disabled={loading}>
          {loading ? '...' : 'Войти'}
        </button>

        {msg && <div>{msg}</div>}

        <p style={{ marginTop: 20 }}>
          Нет аккаунта? <a href="/register">Зарегистрироваться</a>
        </p>
      </form>
    </div>
  );
}
