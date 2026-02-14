'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setMsg(data?.error || `Ошибка: ${res.status}`);
        return;
      }

      setMsg('Успешно зарегистрирован');
      // если есть страница логина:
      // router.push('/login');
    } catch (err: any) {
      setMsg(err?.message || 'Ошибка сети');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: '40px auto', padding: 16 }}>
      <h1 style={{ fontSize: 24, marginBottom: 16 }}>Регистрация</h1>

      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
        <label style={{ display: 'grid', gap: 6 }}>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
        </label>

        <button type="submit" disabled={loading}>
          {loading ? '...' : 'Зарегистрироваться'}
        </button>

        {msg && <div>{msg}</div>}
        <p style={{ marginTop: 20 }}>
  Уже есть аккаунт? <a href="/login">Войти</a>
</p>

      </form>
    </div>
  );
}
