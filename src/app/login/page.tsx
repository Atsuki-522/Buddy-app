'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, signOut, useSession } from 'next-auth/react';
import { useLocale } from '@/components/LocaleProvider';
import { apiFetch, ApiError } from '@/lib/api';
import { setToken, removeToken } from '@/lib/auth';

const inputStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  marginTop: 6,
  padding: '10px 12px',
  border: '1px solid #d1d5db',
  borderRadius: 8,
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  color: '#374151',
};

export default function LoginPage() {
  const router = useRouter();
  const { t } = useLocale();
  const { data: session, status } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    const s = session as unknown as { jwt?: string } | null;
    if (status === 'authenticated' && s?.jwt) {
      setToken(s.jwt);
      apiFetch<{ user: unknown }>('/auth/me').then(() => {
        router.push('/sessions');
      }).catch(() => {
        removeToken();
        signOut({ redirect: false });
      });
    }
  }, [session, status, router]);

  async function handleGoogleLogin() {
    setGoogleLoading(true);
    await signIn('google');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      const { token } = await apiFetch<{ token: string }>('/auth/login', {
        method: 'POST',
        body: { email, password },
        auth: false,
      });
      setToken(token);
      router.push('/sessions');
    } catch (err) {
      const { error } = err as ApiError;
      setErrorMsg(error?.message ?? t('loginFailed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 400, paddingTop: 40 }}>
      <style>{`
        .auth-card { padding: 32px; }
        @media (max-width: 640px) { .auth-card { padding: 24px 20px; } }
      `}</style>
      <div className="auth-card" style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24, color: '#111827' }}>{t('login')}</h1>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <label style={labelStyle}>
            {t('email')}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            {t('password')}
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              style={inputStyle}
            />
          </label>

          {errorMsg && (
            <p style={{ fontSize: 13, color: '#ef4444', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px', margin: 0 }}>
              {errorMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{ padding: '11px 0', borderRadius: 8, background: loading ? '#9ca3af' : '#111827', color: '#fff', fontWeight: 600, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontSize: 14, marginTop: 4 }}
          >
            {loading ? t('signingIn') : t('continue')}
          </button>
        </form>

        <div style={{ margin: '20px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
          <span style={{ fontSize: 12, color: '#9ca3af' }}>{t('or')}</span>
          <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={googleLoading}
          style={{ width: '100%', padding: '11px 0', borderRadius: 8, background: '#fff', color: '#374151', fontWeight: 600, border: '1px solid #d1d5db', cursor: googleLoading ? 'not-allowed' : 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          {googleLoading ? t('redirecting') : t('signInWithGoogle')}
        </button>

        <p style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: '#6b7280' }}>
          {t('dontHaveAccount')}{' '}
          <a href="/register" style={{ color: '#3b82f6', textDecoration: 'underline', fontWeight: 500 }}>
            {t('register')}
          </a>
        </p>
      </div>
    </main>
  );
}
