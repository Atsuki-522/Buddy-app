'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { getToken } from '@/lib/auth';

const NAV_LINKS = [
  { href: '/sessions', label: 'Sessions' },
  { href: '/notifications', label: 'Notifications' },
  { href: '/sessions/new', label: 'Create' },
];

export default function Header() {
  const pathname = usePathname();
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!getToken()) {
      setDisplayName(null);
      setPhotoUrl(null);
      setUnreadCount(0);
      return;
    }
    apiFetch<{ user: { displayName: string; photoUrl?: string | null } }>('/auth/me')
      .then((res) => { setDisplayName(res.user.displayName); setPhotoUrl(res.user.photoUrl ?? null); })
      .catch(() => setDisplayName(null));
    apiFetch<{ count: number }>('/notifications/unread-count')
      .then((res) => setUnreadCount(res.count))
      .catch(() => setUnreadCount(0));
  }, [pathname]);

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      background: '#fff',
      borderBottom: '1px solid #e5e7eb',
    }}>
      <div style={{
        maxWidth: 720,
        margin: '0 auto',
        padding: '0 24px',
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <Link href="/" style={{ fontWeight: 800, fontSize: 16, color: '#111827', textDecoration: 'none', letterSpacing: '-0.3px' }}>
          Event Buddy
        </Link>

        <nav style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {NAV_LINKS.map(({ href, label }) => {
            const active = pathname === href || (href !== '/' && pathname.startsWith(href) && !(href === '/sessions' && pathname.startsWith('/sessions/new')));
            const isNotifications = href === '/notifications';
            return (
              <Link
                key={href}
                href={href}
                style={{
                  position: 'relative',
                  padding: '6px 12px',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: active ? 600 : 400,
                  color: active ? '#111827' : '#6b7280',
                  background: active ? '#f3f4f6' : 'transparent',
                  textDecoration: 'none',
                  transition: 'background 0.1s',
                }}
              >
                {label}
                {isNotifications && unreadCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: 2,
                    right: 4,
                    minWidth: 16,
                    height: 16,
                    padding: '0 4px',
                    borderRadius: 8,
                    background: '#f87171',
                    color: '#fff',
                    fontSize: 10,
                    fontWeight: 700,
                    lineHeight: '16px',
                    textAlign: 'center',
                  }}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
          {displayName ? (
            <Link
              href="/me"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                padding: '4px 10px 4px 4px',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: pathname === '/me' ? 600 : 500,
                color: pathname === '/me' ? '#111827' : '#374151',
                background: pathname === '/me' ? '#e5e7eb' : '#f3f4f6',
                textDecoration: 'none',
                transition: 'background 0.1s',
                maxWidth: 160,
              }}
            >
              {photoUrl ? (
                <img src={photoUrl} alt="" style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
              ) : (
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#d1d5db', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#6b7280', flexShrink: 0 }}>
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</span>
            </Link>
          ) : (
            <Link
              href="/login"
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: pathname === '/login' ? 600 : 400,
                color: pathname === '/login' ? '#111827' : '#6b7280',
                background: pathname === '/login' ? '#f3f4f6' : 'transparent',
                textDecoration: 'none',
                transition: 'background 0.1s',
              }}
            >
              Login
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
