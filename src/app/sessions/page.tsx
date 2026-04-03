'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';

const SessionsMap = dynamic(() => import('@/components/SessionsMap'), { ssr: false });
const PinMap = dynamic(() => import('@/components/PinMap'), { ssr: false });

type Session = {
  _id: string;
  title: string;
  startAt: string;
  publicAreaLabel?: string;
  publicLocation: { type: 'Point'; coordinates: [number, number] };
};

type SessionItem = {
  session: Session;
  distanceMeters: number;
};

export default function SessionsPage() {
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [locationText, setLocationText] = useState('');
  const [radiusKm, setRadiusKm] = useState(10);
  const [startAt, setStartAt] = useState('');
  const [withinHours, setWithinHours] = useState('');
  const [withinMin, setWithinMin] = useState('');
  const [limit, setLimit] = useState(20);
  const [items, setItems] = useState<SessionItem[]>([]);
  const [searchedRadius, setSearchedRadius] = useState<number | null>(null);
  const [searchedStartAt, setSearchedStartAt] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewLat, setPreviewLat] = useState<number | null>(null);
  const [previewLng, setPreviewLng] = useState<number | null>(null);
  const [previewMsg, setPreviewMsg] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => { setUserLat(pos.coords.latitude); setUserLng(pos.coords.longitude); },
      () => {}
    );
  }, []);

  function getLocation() {
    if (!navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setLocationText('');
        setErrorMsg('');
      },
      () => setErrorMsg('Location permission denied.')
    );
  }

  async function geocode(query: string): Promise<{ lat: number; lng: number } | null> {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await res.json();
    if (!data.length) return null;
    if (userLat != null && userLng != null) {
      let best = data[0];
      let bestDist = Infinity;
      for (const item of data) {
        const dLat = parseFloat(item.lat) - userLat;
        const dLng = parseFloat(item.lon) - userLng;
        const dist = dLat * dLat + dLng * dLng;
        if (dist < bestDist) { bestDist = dist; best = item; }
      }
      return { lat: parseFloat(best.lat), lng: parseFloat(best.lon) };
    }
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  }

  async function handlePreview() {
    setPreviewMsg('');
    setPreviewLat(null);
    setPreviewLng(null);
    if (!locationText.trim() && lat == null) {
      setPreviewMsg('Enter a location first.');
      return;
    }
    if (lat != null && lng != null && !locationText.trim()) {
      setPreviewLat(lat);
      setPreviewLng(lng);
      return;
    }
    setPreviewLoading(true);
    const result = await geocode(locationText.trim());
    setPreviewLoading(false);
    if (!result) {
      setPreviewMsg('Could not find that location.');
      return;
    }
    setPreviewLat(result.lat);
    setPreviewLng(result.lng);
  }

  async function handleSearch() {
    setErrorMsg('');
    setLoading(true);

    let searchLat = lat;
    let searchLng = lng;

    if (locationText.trim()) {
      // Always geocode when text is entered
      const result = await geocode(locationText.trim());
      if (!result) {
        setErrorMsg('Location not found. Try a different search term.');
        setLoading(false);
        return;
      }
      searchLat = result.lat;
      searchLng = result.lng;
      setLat(searchLat);
      setLng(searchLng);
    } else if (searchLat == null || searchLng == null) {
      setErrorMsg('Enter a location or click "Use my location".');
      setLoading(false);
      return;
    }

    try {
      const params = new URLSearchParams({
        lat: String(searchLat),
        lng: String(searchLng),
        radiusKm: String(radiusKm),
        limit: String(limit),
      });
      if (startAt) params.set('startAt', startAt);
      if (withinHours) params.set('startsWithinHours', withinHours);
      if (withinMin) params.set('startsWithinMin', withinMin);
      const data = await apiFetch<{ items: SessionItem[] }>(`/sessions?${params.toString()}`, { auth: false });
      setItems(data.items ?? []);
      setSearchedRadius(radiusKm);
      setSearchedStartAt(startAt);
    } catch (err) {
      const e = err as { error?: { message?: string } };
      setErrorMsg(e?.error?.message ?? 'Failed to load sessions.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <style>{`
        .sessions-search-row { display: flex; gap: 8px; }
        .sessions-results { margin-top: 20px; display: flex; gap: 16px; align-items: flex-start; flex-wrap: wrap; }
        .sessions-list { flex: 55 1 280px; min-width: 0; }
        .sessions-map { flex: 45 1 240px; }
        @media (max-width: 640px) {
          .sessions-search-row { flex-wrap: wrap; }
          .sessions-search-row input { flex: 1 1 100%; }
          .sessions-list { height: auto !important; }
          .sessions-list > div { height: auto !important; overflow-y: visible !important; }
        }
      `}</style>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>Find Sessions</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="sessions-search-row">
          <input
            type="text"
            placeholder="e.g. Vancouver, BC"
            value={locationText}
            onChange={(e) => { setLocationText(e.target.value); setLat(null); setLng(null); }}
            style={{ flex: 1, padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, outline: 'none', minWidth: 0 }}
          />
          <button
            type="button"
            onClick={getLocation}
            style={{ padding: '8px 14px', borderRadius: 8, background: '#eff6ff', color: '#3b82f6', fontWeight: 600, border: '1px solid #bfdbfe', cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap' }}
          >
            Use my location
          </button>
          <button
            type="button"
            onClick={handlePreview}
            disabled={previewLoading}
            style={{ padding: '8px 14px', borderRadius: 8, background: '#f0fdf4', color: '#16a34a', fontWeight: 600, border: '1px solid #bbf7d0', cursor: previewLoading ? 'not-allowed' : 'pointer', fontSize: 13, whiteSpace: 'nowrap' }}
          >
            {previewLoading ? '...' : 'Preview on map'}
          </button>
        </div>

        {previewMsg && (
          <p style={{ fontSize: 13, color: '#ef4444', margin: 0 }}>{previewMsg}</p>
        )}
        {previewLat != null && previewLng != null && (
          <PinMap lat={previewLat} lng={previewLng} height={200} />
        )}

        {lat != null && lng != null && (
          <p style={{ fontSize: 13, color: '#6b7280' }}>
            {locationText ? locationText : `${lat.toFixed(4)}, ${lng.toFixed(4)}`}
          </p>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
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

        <label style={{ fontSize: 13 }}>
          Start at (optional)
          <input
            type="datetime-local"
            lang="en"
            value={startAt}
            onChange={(e) => setStartAt(e.target.value)}
            style={{ display: 'block', width: '100%', marginTop: 4, padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14 }}
          />
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <label style={{ fontSize: 13 }}>
            Within hours
            <input
              type="number"
              min={0}
              placeholder="e.g. 2"
              value={withinHours}
              onChange={(e) => setWithinHours(e.target.value)}
              style={{ display: 'block', width: '100%', marginTop: 4, padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 6 }}
            />
          </label>
          <label style={{ fontSize: 13 }}>
            Within minutes
            <input
              type="number"
              min={0}
              placeholder="e.g. 30"
              value={withinMin}
              onChange={(e) => setWithinMin(e.target.value)}
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

      {/* 2-column layout: cards left, map right — always visible */}
      <div className="sessions-results">

        {/* Left: session cards */}
        <div className="sessions-list">
          {searchedRadius != null && (
            <div style={{ marginBottom: 10, fontSize: 13, color: '#6b7280' }}>
              <span>{items.length} session{items.length !== 1 ? 's' : ''} within {searchedRadius} km</span>
              {searchedStartAt && (
                <span> · sorted by closest to {new Date(searchedStartAt).toLocaleString('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              )}
            </div>
          )}
          {/* Scroll wrapper — only this scrolls */}
          <div style={{ height: 460, overflowY: 'auto', paddingRight: 4 }}>
            <div style={{ display: 'grid', gap: 12 }}>
              {items.length === 0 ? (
                <div style={{ padding: '28px 20px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', textAlign: 'center' }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#374151', marginBottom: 6 }}>No sessions found.</div>
                  <div style={{ fontSize: 13, color: '#9ca3af' }}>Try a wider radius or different time range.</div>
                </div>
              ) : (
                items.map(({ session, distanceMeters }) => {
                  const distLabel = distanceMeters >= 1000
                    ? `${(distanceMeters / 1000).toFixed(1)} km away`
                    : `${Math.round(distanceMeters)} m away`;
                  return (
                    <Link
                      key={session._id}
                      href={`/sessions/${session._id}`}
                      style={{ display: 'block', padding: '16px 18px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', textDecoration: 'none', color: 'inherit' }}
                    >
                      <div style={{ fontWeight: 700, fontSize: 15, color: '#111827', marginBottom: 6 }}>{session.title}</div>
                      <div style={{ fontSize: 13, color: '#6b7280', display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span>{new Date(session.startAt).toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {session.publicAreaLabel && <span>{session.publicAreaLabel}</span>}
                          <span style={{ color: '#9ca3af' }}>{distLabel}</span>
                        </div>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right: map — always shown */}
        <div className="sessions-map">
          <SessionsMap
            items={items}
            center={lat != null && lng != null ? [lat, lng] : null}
            height={300}
          />
        </div>

      </div>
    </main>
  );
}
