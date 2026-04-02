'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';

type Notification = {
  _id: string;
  title: string;
  body: string;
  createdAt: string;
  readAt: string | null;
  sessionId?: string | null;
  meta?: { deeplink?: string };
};

export default function NotificationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [marking, setMarking] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  function getDestination(n: Notification): string | null {
    if (n.meta?.deeplink) return n.meta.deeplink;
    if (n.sessionId) return `/sessions/${n.sessionId}`;
    return null;
  }

  function handleCardClick(n: Notification) {
    const dest = getDestination(n);
    if (dest) router.push(dest);
  }

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

  async function deleteNotification(id: string) {
    setDeleting(id);
    try {
      await apiFetch(`/notifications/${id}`, { method: 'DELETE' });
      setItems((prev) => prev.filter((n) => n._id !== id));
      setUnreadCount((prev) => {
        const wasUnread = items.find((n) => n._id === id)?.readAt == null;
        return wasUnread ? Math.max(0, prev - 1) : prev;
      });
    } catch {
      setErrorMsg('Failed to delete notification.');
    } finally {
      setDeleting(null);
    }
  }

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
    <main>
      <style>{`
        .notif-card { padding: 14px 16px; border-radius: 14px; border: 1px solid #e5e7eb; background: #fff; box-shadow: 0 1px 4px rgba(0,0,0,0.06); display: flex; gap: 14px; align-items: flex-start; }
        .notif-buttons { display: flex; flex-direction: column; gap: 6px; flex-shrink: 0; }
        @media (max-width: 400px) { .notif-buttons button { font-size: 11px !important; padding: 5px 8px !important; } }
      `}</style>
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
            onClick={() => handleCardClick(n)}
            className="notif-card"
            style={{
              borderLeft: n.readAt ? '3px solid transparent' : '3px solid #3b82f6',
              cursor: getDestination(n) ? 'pointer' : 'default',
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: n.readAt ? '#374151' : '#111827' }}>{n.title}</div>
              <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4, lineHeight: 1.5 }}>{n.body}</div>
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 8 }}>
                {new Date(n.createdAt).toLocaleString('en-CA')}
                {!n.readAt && <span style={{ marginLeft: 8, color: '#3b82f6', fontWeight: 600 }}>● Unread</span>}
              </div>
            </div>
            <div className="notif-buttons">
              {!n.readAt && (
                <button
                  onClick={(e) => { e.stopPropagation(); markRead(n._id); }}
                  disabled={marking === n._id}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    background: marking === n._id ? '#e5e7eb' : '#f3f4f6',
                    color: marking === n._id ? '#9ca3af' : '#374151',
                    fontWeight: 600,
                    border: '1px solid #e5e7eb',
                    cursor: marking === n._id ? 'not-allowed' : 'pointer',
                    fontSize: 12,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {marking === n._id ? '...' : 'Mark as read'}
                </button>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); deleteNotification(n._id); }}
                disabled={deleting === n._id}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  background: deleting === n._id ? '#e5e7eb' : '#f3f4f6',
                  color: deleting === n._id ? '#9ca3af' : '#6b7280',
                  fontWeight: 600,
                  border: '1px solid #e5e7eb',
                  cursor: deleting === n._id ? 'not-allowed' : 'pointer',
                  fontSize: 12,
                  whiteSpace: 'nowrap',
                }}
              >
                {deleting === n._id ? '...' : 'Delete'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
