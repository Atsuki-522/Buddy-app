'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/components/LocaleProvider';
import { apiFetch, ApiError } from '@/lib/api';
import { setToken } from '@/lib/auth';

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

export default function RegisterPage() {
  const router = useRouter();
  const { t } = useLocale();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      const { token } = await apiFetch<{ token: string }>('/auth/register', {
        method: 'POST',
        body: { email, password, displayName },
        auth: false,
      });
      setToken(token);
      router.push('/sessions');
    } catch (err) {
      const { error } = err as ApiError;
      setErrorMsg(error?.message ?? t('registrationFailed'));
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
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24, color: '#111827' }}>{t('createAccount')}</h1>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <label style={labelStyle}>
            {t('displayName')}
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              autoComplete="name"
              style={inputStyle}
            />
          </label>

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
              autoComplete="new-password"
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
            {loading ? t('creatingAccount') : t('register')}
          </button>
        </form>

        <p style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: '#6b7280' }}>
          {t('alreadyHaveAccount')}{' '}
          <a href="/login" style={{ color: '#3b82f6', textDecoration: 'underline', fontWeight: 500 }}>
            {t('login')}
          </a>
        </p>
      </div>
    </main>
  );
}
