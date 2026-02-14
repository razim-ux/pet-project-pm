'use client';

import { useEffect, useMemo, useState } from 'react';

type Task = {
  id: number;
  title: string;
  completed: boolean;
  assignee: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string | null;
};

function fmtDate(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString('ru-RU');
}

export default function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState('');
  const [startDate, setStartDate] = useState(''); // YYYY-MM-DD
  const [endDate, setEndDate] = useState(''); // YYYY-MM-DD
  const [tab, setTab] = useState<'active' | 'completed' | 'all'>('active');
  const [loading, setLoading] = useState(false);

  async function loadTasks() {
    const res = await fetch('/api/tasks', { method: 'GET' });
    if (!res.ok) return;
    const data = await res.json().catch(() => null);
    setTasks(data?.tasks || []);
  }

  async function addTask() {
    const t = title.trim();
    if (!t) return;

    setLoading(true);
    try {
      const payload: any = {
        action: 'create',
        title: t,
        assignee: assignee.trim() || undefined,
        start_date: startDate ? `${startDate}T00:00:00.000Z` : undefined,
        end_date: endDate ? `${endDate}T00:00:00.000Z` : undefined,
      };

      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setTitle('');
        setAssignee('');
        setStartDate('');
        setEndDate('');
        await loadTasks();
      }
    } finally {
      setLoading(false);
    }
  }

  async function toggle(id: number) {
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle', id }),
    });
    await loadTasks();
  }

  async function remove(id: number) {
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'remove', id }),
    });
    await loadTasks();
  }

  async function logout() {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/login';
  }

  useEffect(() => {
    loadTasks();
  }, []);

  const filtered = useMemo(() => {
    if (tab === 'all') return tasks;
    if (tab === 'active') return tasks.filter((t) => !t.completed);
    return tasks.filter((t) => t.completed);
  }, [tasks, tab]);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea, #764ba2)',
        padding: '60px 20px',
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          background: 'white',
          borderRadius: 16,
          padding: 32,
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            marginBottom: 20,
          }}
        >
          <h1 style={{ margin: 0 }}>Task Manager</h1>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              onClick={loadTasks}
              style={{
                background: '#111827',
                border: 'none',
                color: 'white',
                padding: '8px 14px',
                borderRadius: 8,
                cursor: 'pointer',
              }}
              type="button"
            >
              Обновить
            </button>

            <button
              onClick={logout}
              style={{
                background: '#ef4444',
                border: 'none',
                color: 'white',
                padding: '8px 14px',
                borderRadius: 8,
                cursor: 'pointer',
              }}
              type="button"
            >
              Выйти
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <button
            onClick={() => setTab('active')}
            style={{
              background: tab === 'active' ? '#2563eb' : '#e5e7eb',
              color: tab === 'active' ? 'white' : '#111',
              border: 'none',
              padding: '8px 12px',
              borderRadius: 10,
              cursor: 'pointer',
            }}
            type="button"
          >
            Активные
          </button>

          <button
            onClick={() => setTab('completed')}
            style={{
              background: tab === 'completed' ? '#2563eb' : '#e5e7eb',
              color: tab === 'completed' ? 'white' : '#111',
              border: 'none',
              padding: '8px 12px',
              borderRadius: 10,
              cursor: 'pointer',
            }}
            type="button"
          >
            Завершённые
          </button>

          <button
            onClick={() => setTab('all')}
            style={{
              background: tab === 'all' ? '#2563eb' : '#e5e7eb',
              color: tab === 'all' ? 'white' : '#111',
              border: 'none',
              padding: '8px 12px',
              borderRadius: 10,
              cursor: 'pointer',
            }}
            type="button"
          >
            Все
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            addTask();
          }}
          style={{
            display: 'grid',
            gap: 10,
            marginBottom: 22,
            gridTemplateColumns: '1.5fr 1fr 1fr 1fr auto',
            alignItems: 'end',
          }}
        >
          <div>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>Задача</div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: позвонить клиенту"
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd' }}
            />
          </div>

          <div>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>Исполнитель</div>
            <input
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              placeholder="Иван"
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd' }}
            />
          </div>

          <div>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>Старт</div>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTask();
                }
              }}
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd' }}
            />
          </div>

          <div>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>Дедлайн</div>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTask();
                }
              }}
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              background: '#2563eb',
              border: 'none',
              color: 'white',
              padding: '10px 16px',
              borderRadius: 10,
              cursor: 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? '...' : 'Добавить'}
          </button>
        </form>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #eee' }}>
                <th style={{ padding: '10px 8px' }}>Статус</th>
                <th style={{ padding: '10px 8px' }}>Задача</th>
                <th style={{ padding: '10px 8px' }}>Исполнитель</th>
                <th style={{ padding: '10px 8px' }}>Старт</th>
                <th style={{ padding: '10px 8px' }}>Дедлайн</th>
                <th style={{ padding: '10px 8px' }}></th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 8px', width: 110 }}>
                    <button
                      onClick={() => toggle(t.id)}
                      style={{
                        background: t.completed ? '#10b981' : '#e5e7eb',
                        color: t.completed ? 'white' : '#111',
                        border: 'none',
                        padding: '6px 10px',
                        borderRadius: 999,
                        cursor: 'pointer',
                      }}
                      type="button"
                    >
                      {t.completed ? 'Готово' : 'В работе'}
                    </button>
                  </td>

                  <td style={{ padding: '10px 8px' }}>
                    <div
                      style={{
                        fontWeight: 600,
                        textDecoration: t.completed ? 'line-through' : 'none',
                        opacity: t.completed ? 0.6 : 1,
                      }}
                    >
                      {t.title}
                    </div>
                  </td>

                  <td style={{ padding: '10px 8px', color: '#374151' }}>{t.assignee || '—'}</td>
                  <td style={{ padding: '10px 8px', color: '#374151' }}>{fmtDate(t.start_date)}</td>
                  <td style={{ padding: '10px 8px', color: '#374151' }}>{fmtDate(t.end_date)}</td>

                  <td style={{ padding: '10px 8px', width: 110 }}>
                    <button
                      onClick={() => remove(t.id)}
                      style={{
                        background: '#ef4444',
                        border: 'none',
                        color: 'white',
                        padding: '8px 10px',
                        borderRadius: 8,
                        cursor: 'pointer',
                      }}
                      type="button"
                    >
                      Удалить
                    </button>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: 16, color: '#6b7280' }}>
                    Нет задач в этом разделе
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
