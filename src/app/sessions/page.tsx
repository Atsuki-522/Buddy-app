'use client';

import { useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';

type Session = {
  _id: string;
  title: string;
  startAt: string;
  publicAreaLabel?: string;
};

type SessionItem = {
  session: Session;
  distanceMeters: number;
};

export default function SessionsPage() {
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [radiusKm, setRadiusKm] = useState(5);
  const [startsWithinMin, setStartsWithinMin] = useState(4320);
  const [limit, setLimit] = useState(20);
  const [items, setItems] = useState<SessionItem[]>([]);
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

  async function handleSearch() {
    if (lat == null || lng == null) {
      setErrorMsg('Please allow location access first.');
      return;
    }
    setErrorMsg('');
    setLoading(true);
    try {
      const query = `lat=${lat}&lng=${lng}&radiusKm=${radiusKm}&startsWithinMin=${startsWithinMin}&limit=${limit}`;
      const data = await apiFetch<{ items: SessionItem[] }>(`/sessions?${query}`, { auth: false });
      setItems(data.items ?? []);
    } catch (err) {
      const e = err as { error?: { message?: string } };
      setErrorMsg(e?.error?.message ?? 'Failed to load sessions.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 640, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Find Sessions</h1>
        <Link href="/sessions/new" style={{ fontWeight: 600, color: '#3b82f6' }}>+ Create</Link>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button
          onClick={getLocation}
          style={{ padding: '8px 16px', borderRadius: 8, background: '#3b82f6', color: '#fff', fontWeight: 600, border: 'none', cursor: 'pointer' }}
        >
          Use my location
        </button>

        {lat != null && lng != null && (
          <p style={{ fontSize: 13, color: '#6b7280' }}>
            Location: {lat.toFixed(4)}, {lng.toFixed(4)}
          </p>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          <label style={{ fontSize: 13 }}>
            Radius (km)
            <input
              type="number"
              min={1}
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              style={{ display: 'block', width: '100%', marginTop: 4, padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 6 }}
            />
          </label>
          <label style={{ fontSize: 13 }}>
            Within (min)
            <input
              type="number"
              min={1}
              value={startsWithinMin}
              onChange={(e) => setStartsWithinMin(Number(e.target.value))}
              style={{ display: 'block', width: '100%', marginTop: 4, padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 6 }}
            />
          </label>
          <label style={{ fontSize: 13 }}>
            Limit
            <input
              type="number"
              min={1}
              max={50}
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              style={{ display: 'block', width: '100%', marginTop: 4, padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 6 }}
            />
          </label>
        </div>

        <button
          onClick={handleSearch}
          disabled={loading}
          style={{ padding: '8px 16px', borderRadius: 8, background: loading ? '#9ca3af' : '#111827', color: '#fff', fontWeight: 600, border: 'none', cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {errorMsg && (
        <p style={{ marginTop: 16, color: '#ef4444', fontSize: 14 }}>Error: {errorMsg}</p>
      )}

      <div style={{ marginTop: 20, display: 'grid', gap: 12 }}>
        {items.length === 0 && !loading && !errorMsg && (
          <p style={{ color: '#6b7280', fontSize: 14 }}>No sessions found. Try adjusting the filters.</p>
        )}
        {items.map(({ session, distanceMeters }) => (
          <Link
            key={session._id}
            href={`/sessions/${session._id}`}
            style={{ display: 'block', padding: 14, border: '1px solid #e5e7eb', borderRadius: 12, textDecoration: 'none', color: 'inherit' }}
          >
            <div style={{ fontWeight: 700, fontSize: 16 }}>{session.title}</div>
            <div style={{ marginTop: 4, fontSize: 13, color: '#6b7280' }}>
              {new Date(session.startAt).toLocaleString('en-CA')}
              {session.publicAreaLabel && ` • ${session.publicAreaLabel}`}
              {' • '}{Math.round(distanceMeters)}m away
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
