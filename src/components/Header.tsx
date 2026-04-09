'use client';

import Link from 'next/link';
import { Bell } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useLocale } from '@/components/LocaleProvider';
import { apiFetch } from '@/lib/api';
import { getToken } from '@/lib/auth';

export default function Header() {
  const pathname = usePathname();
  const { t } = useLocale();
  const hasToken = !!getToken();
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const navLinks = [
    { href: '/sessions', label: t('navSessions') },
    { href: '/notifications', label: t('navNotifications') },
    { href: '/sessions/new', label: t('navCreate') },
  ];

  useEffect(() => {
    if (!hasToken) return;
    apiFetch<{ user: { displayName: string; photoUrl?: string | null } }>('/auth/me')
      .then((res) => { setDisplayName(res.user.displayName); setPhotoUrl(res.user.photoUrl ?? null); })
      .catch(() => setDisplayName(null));
    apiFetch<{ count: number }>('/notifications/unread-count')
      .then((res) => setUnreadCount(res.count))
      .catch(() => setUnreadCount(0));
  }, [hasToken, pathname]);

  return (
    <>
      <style>{`
        .hdr-inner { max-width: 720px; margin: 0 auto; padding: 0 24px; height: 56px; display: flex; align-items: center; justify-content: space-between; }
        .hdr-navlink { position: relative; padding: 6px 12px !important; border-radius: 8px; font-size: 14px !important; text-decoration: none; transition: background 0.1s; }
        .hdr-notif-label { display: inline; }
        .hdr-notif-icon { display: none; width: 16px; text-align: center; }
        .hdr-user-name { display: inline; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        @media (max-width: 640px) {
          .hdr-inner { padding: 0 12px; }
          .hdr-navlink { padding: 5px 8px !important; font-size: 13px !important; }
          .hdr-notif-label { display: none; }
          .hdr-notif-icon { display: inline-flex; }
          .hdr-user-name { display: none; }
        }
      `}</style>
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: '#fff',
        borderBottom: '1px solid #e5e7eb',
      }}>
        <div className="hdr-inner">
          <Link href="/" style={{ fontWeight: 800, fontSize: 16, color: '#111827', textDecoration: 'none', letterSpacing: '-0.3px', flexShrink: 0 }}>
            {t('appName')}
          </Link>

          <nav style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {navLinks.map(({ href, label }) => {
              const active = pathname === href || (href !== '/' && pathname.startsWith(href) && !(href === '/sessions' && pathname.startsWith('/sessions/new')));
              const isNotifications = href === '/notifications';
              return (
                <Link
                  key={href}
                  href={href}
                  className="hdr-navlink"
                  style={{
                    fontWeight: active ? 600 : 400,
                    color: active ? '#111827' : '#6b7280',
                    background: active ? '#f3f4f6' : 'transparent',
                  }}
                >
                  {isNotifications ? (
                    <>
                      <span className="hdr-notif-label">{label}</span>
                      <span className="hdr-notif-icon" aria-hidden="true"><Bell size={16} /></span>
                    </>
                  ) : label}
                  {isNotifications && hasToken && unreadCount > 0 && (
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
            {hasToken && displayName ? (
              <Link
                href="/me"
                className="hdr-navlink"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  padding: '4px 10px 4px 4px',
                  fontWeight: pathname === '/me' ? 600 : 500,
                  color: pathname === '/me' ? '#111827' : '#374151',
                  background: pathname === '/me' ? '#e5e7eb' : '#f3f4f6',
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
                <span className="hdr-user-name">{displayName}</span>
              </Link>
            ) : (
              <Link
                href="/login"
                className="hdr-navlink"
                style={{
                  fontWeight: pathname === '/login' ? 600 : 400,
                  color: pathname === '/login' ? '#111827' : '#6b7280',
                  background: pathname === '/login' ? '#f3f4f6' : 'transparent',
                }}
              >
                {t('login')}
              </Link>
            )}
          </nav>
        </div>
      </header>
    </>
  );
}
