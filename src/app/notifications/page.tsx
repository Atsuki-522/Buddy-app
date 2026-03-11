'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiFetch } from '@/lib/api';

type Notification = {
  _id: string;
  title: string;
  body: string;
  createdAt: string;
  readAt: string | null;
};

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [marking, setMarking] = useState<string | null>(null);

  const load = useCallback(() => {
    setErrorMsg('');
    Promise.all([
      apiFetch<{ items: Notification[] }>('/notifications'),
      apiFetch<{ count: number }>('/notifications/unread-count'),
    ])
      .then(([notifRes, countRes]) => {
        setItems(notifRes.items);
        setUnreadCount(countRes.count);
      })
      .catch(() => setErrorMsg('Failed to load notifications.'));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function markRead(id: string) {
    setMarking(id);
    try {
      await apiFetch(`/notifications/${id}/read`, { method: 'PATCH' });
      load();
    } catch {
      setErrorMsg('Failed to mark as read.');
    } finally {
      setMarking(null);
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 560, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Notifications</h1>
      <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 20 }}>
        {unreadCount} unread
      </p>

      {errorMsg && (
        <p style={{ color: '#ef4444', fontSize: 14, marginBottom: 16 }}>Error: {errorMsg}</p>
      )}

      {items.length === 0 && !errorMsg && (
        <p style={{ color: '#6b7280', fontSize: 14 }}>No notifications yet.</p>
      )}

      <div style={{ display: 'grid', gap: 10 }}>
        {items.map((n) => (
          <div
            key={n._id}
            style={{
              padding: 14,
              borderRadius: 10,
              border: '1px solid #e5e7eb',
              background: n.readAt ? '#fff' : '#eff6ff',
              display: 'flex',
              gap: 12,
              alignItems: 'flex-start',
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{n.title}</div>
              <div style={{ fontSize: 13, color: '#374151', marginTop: 2 }}>{n.body}</div>
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>
                {new Date(n.createdAt).toLocaleString('en-CA')}
                {n.readAt ? ' · Read' : ' · Unread'}
              </div>
            </div>
            {!n.readAt && (
              <button
                onClick={() => markRead(n._id)}
                disabled={marking === n._id}
                style={{
                  flexShrink: 0,
                  padding: '5px 11px',
                  borderRadius: 6,
                  background: marking === n._id ? '#9ca3af' : '#3b82f6',
                  color: '#fff',
                  fontWeight: 600,
                  border: 'none',
                  cursor: marking === n._id ? 'not-allowed' : 'pointer',
                  fontSize: 12,
                }}
              >
                {marking === n._id ? '...' : 'Mark as read'}
              </button>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
