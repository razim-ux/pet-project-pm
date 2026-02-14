'use client';

import { useEffect, useState } from 'react';

type Task = {
  id: number;
  title: string;
  completed: boolean;
};

export default function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState('');

  async function loadTasks() {
    const res = await fetch('/api/tasks');
    if (!res.ok) return;
    const data = await res.json();
    setTasks(data.tasks || []);
  }

  async function addTask() {
    if (!title.trim()) return;

    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', title }),
    });

    if (res.ok) {
      setTitle('');
      loadTasks();
    }
  }

  async function toggle(id: number) {
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle', id }),
    });
    loadTasks();
  }

  async function remove(id: number) {
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'remove', id }),
    });
    loadTasks();
  }

  async function logout() {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/login';
  }

  useEffect(() => {
    loadTasks();
  }, []);

  return (
    <div style={{ maxWidth: 600, margin: '40px auto' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1>Мои задачи</h1>
        <button onClick={logout}>Выйти</button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Новая задача..."
          style={{ flex: 1 }}
        />
        <button onClick={addTask}>Добавить</button>
      </div>

      <ul style={{ listStyle: 'none', padding: 0 }}>
        {tasks.map((task) => (
          <li
            key={task.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 8,
            }}
          >
            <span
              onClick={() => toggle(task.id)}
              style={{
                cursor: 'pointer',
                textDecoration: task.completed ? 'line-through' : 'none',
              }}
            >
              {task.title}
            </span>
            <button onClick={() => remove(task.id)}>Удалить</button>
          </li>
        ))}
      </ul>

    </div>
  );
}
