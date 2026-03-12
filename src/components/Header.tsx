'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_LINKS = [
  { href: '/sessions', label: 'Sessions' },
  { href: '/notifications', label: 'Notifications' },
  { href: '/sessions/new', label: 'Create' },
  { href: '/login', label: 'Login' },
];

export default function Header() {
  const pathname = usePathname();

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
            return (
              <Link
                key={href}
                href={href}
                style={{
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
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
