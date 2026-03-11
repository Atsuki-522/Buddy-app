'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';

const inputStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  marginTop: 4,
  padding: '8px 10px',
  border: '1px solid #d1d5db',
  borderRadius: 6,
  fontSize: 14,
};

export default function NewSessionPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [publicAreaLabel, setPublicAreaLabel] = useState('');
  const [requiresApproval, setRequiresApproval] = useState(true);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  function getLocation() {
    if (!navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setErrorMsg('');
      },
      () => setErrorMsg('Location permission denied.')
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (lat == null || lng == null) {
      setErrorMsg('Please allow location access first.');
      return;
    }
    setErrorMsg('');
    setLoading(true);
    try {
      const data = await apiFetch<{ session: { _id: string } }>('/sessions', {
        method: 'POST',
        body: {
          title,
          startAt: new Date(startAt).toISOString(),
          endAt: new Date(endAt).toISOString(),
          publicAreaLabel,
          requiresApproval,
          publicLocation: { lng, lat },
        },
      });
      router.push(`/sessions/${data.session._id}`);
    } catch (err) {
      const e = err as { error?: { code?: string; message?: string } };
      if (e?.error?.code === 'UNAUTHORIZED' || e?.error?.code === 'INVALID_TOKEN') {
        setErrorMsg('You must be logged in. Please sign in first.');
      } else {
        setErrorMsg(e?.error?.message ?? 'Failed to create session.');
      }
    } finally {
      setLoading(false);
    }
  }

  const isUnauth = errorMsg.includes('logged in');

  return (
    <main style={{ padding: 24, maxWidth: 560, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>Create Session</h1>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14 }}>
        <label style={{ fontSize: 14, fontWeight: 500 }}>
          Title *
          <input required value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />
        </label>

        <label style={{ fontSize: 14, fontWeight: 500 }}>
          Start
          <input required type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} style={inputStyle} />
        </label>

        <label style={{ fontSize: 14, fontWeight: 500 }}>
          End
          <input required type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} style={inputStyle} />
        </label>

        <label style={{ fontSize: 14, fontWeight: 500 }}>
          Area label (public)
          <input value={publicAreaLabel} onChange={(e) => setPublicAreaLabel(e.target.value)} placeholder="e.g. Downtown Vancouver" style={inputStyle} />
        </label>

        <label style={{ fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            checked={requiresApproval}
            onChange={(e) => setRequiresApproval(e.target.checked)}
          />
          Requires approval to join
        </label>

        <div>
          <button
            type="button"
            onClick={getLocation}
            style={{ padding: '7px 14px', borderRadius: 6, background: '#3b82f6', color: '#fff', fontWeight: 600, border: 'none', cursor: 'pointer', fontSize: 13 }}
          >
            Use my location
          </button>
          {lat != null && lng != null && (
            <span style={{ marginLeft: 10, fontSize: 13, color: '#6b7280' }}>
              {lat.toFixed(4)}, {lng.toFixed(4)}
            </span>
          )}
        </div>

        {errorMsg && (
          <p style={{ color: '#ef4444', fontSize: 14 }}>
            Error: {errorMsg}
            {isUnauth && (
              <> — <a href="/login" style={{ color: '#3b82f6', textDecoration: 'underline' }}>Sign in</a></>
            )}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{ padding: '10px 0', borderRadius: 8, background: loading ? '#9ca3af' : '#111827', color: '#fff', fontWeight: 700, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontSize: 15 }}
        >
          {loading ? 'Creating...' : 'Create Session'}
        </button>
      </form>
    </main>
  );
}
